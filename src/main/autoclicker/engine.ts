import { AutoclickerConfig, DEFAULT_CONFIG, Macro, MacroAction } from './types'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { spawn } from 'child_process'
import { InputHelper } from './input-helper'
import { app } from 'electron'

const CONFIG_PATH = path.join(os.homedir(), 'soda', 'config.json')
const USER_RESOURCE = path.join(os.homedir(), 'soda', 'resource')
const PANIC_VK = 0x1B
const POLL_INTERVAL = 50
const VK_LMB = 0x01
const VK_RMB = 0x02
const VK_CTRL = 0x11

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export type ConfigUpdateCallback = (config: AutoclickerConfig) => void

// Per-section deep merge so a partial preset / saved file doesn't wipe other
// sections with `undefined`. Goes one level deep, which matches the actual
// config shape (top-level sections of plain objects).
function mergeConfig(defaults: AutoclickerConfig, data: Record<string, unknown>): AutoclickerConfig {
  const out: Record<string, unknown> = { ...(defaults as unknown as Record<string, unknown>) }
  for (const k of Object.keys(data)) {
    if (UNSAFE_KEYS.has(k)) continue
    const dv = (defaults as unknown as Record<string, unknown>)[k]
    const v = data[k]
    const dvIsObj = dv && typeof dv === 'object' && !Array.isArray(dv)
    const vIsObj = v && typeof v === 'object' && !Array.isArray(v)
    if (dvIsObj && vIsObj) {
      out[k] = { ...(dv as object), ...(v as object) }
    } else {
      out[k] = v
    }
  }
  return out as unknown as AutoclickerConfig
}

export class AutoclickerEngine {
  config: AutoclickerConfig = { ...DEFAULT_CONFIG }
  private running = false
  private input = new InputHelper()

  // Keyed by action id ("left", "right", "panic", etc.) rather than VK,
  // so two actions sharing the same key both fire on a fresh press.
  private prevBindStates: Record<string, boolean> = {}

  private lastBlockHitTime = 0
  private betterInputTimestamp = 0
  private strafeState = { a: false, d: false }
  private movementState = { w: false, a: false, s: false, d: false, jump: 0 }
  private recordCycleIndex = 0
  focusedProcess = ''
  private cursorVisible = false
  private smartBHActive = false
  private currentPotSlot = 0
  // Tracks whether autosprint itself is currently holding Ctrl down. We only
  // ever release Ctrl that we pressed — otherwise we'd cancel the user's
  // Ctrl+A / Ctrl+C / etc. in other windows.
  private sprintHoldingCtrl = false
  // Track held mouse buttons separately for left ('Full' / 'Shift With Click')
  // and right ('items' mode). Without this, disabling mid-hold leaves the
  // physical button stuck pressed at the OS level.
  private leftHoldingMouse = false
  private rightHoldingMouse = false
  // Set to true after the first successful window-listener poll so we know
  // an empty focusedProcess means "genuinely not Minecraft" vs "not checked yet".
  private windowPolledOnce = false

  // Hold-to-hide GUI: press the hideGUI bind for 3 seconds to toggle visibility.
  private hideGUIPressTime = 0
  private readonly HIDE_GUI_HOLD_MS = 3000

  private windowInterval: ReturnType<typeof setInterval> | null = null
  private bindPollInterval: ReturnType<typeof setInterval> | null = null

  onConfigUpdate: ConfigUpdateCallback | null = null
  onHideGUI: (() => void) | null = null

  private bootstrapResources(): void {
    try {
      if (fs.existsSync(USER_RESOURCE) && fs.readdirSync(USER_RESOURCE).length > 0) return
      const src = app.isPackaged
        ? path.join(process.resourcesPath!, 'resource')
        : path.join(__dirname, '..', '..', 'resource')
      if (!fs.existsSync(src)) { console.warn('[bootstrap] no bundled resources at', src); return }
      if (!fs.existsSync(USER_RESOURCE)) fs.mkdirSync(USER_RESOURCE, { recursive: true })
      for (const f of fs.readdirSync(src)) {
        const s = path.join(src, f)
        if (fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(USER_RESOURCE, f))
      }
      console.log('[bootstrap] copied', fs.readdirSync(USER_RESOURCE).length, 'resources')
    } catch (e) { console.error('[bootstrap] failed:', e) }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    console.log('[engine] start')

    this.bootstrapResources()
    this.loadConfig()

    try {
      await this.input.start()
    } catch (e) {
      console.error('[engine] input helper failed:', e)
    }
    if (!this.input.started) {
      console.warn('[engine] running without input helper')
    }

    this.startBindPollLoop()
    this.startWindowListener()
    this.startLeftClicker()
    this.startRightClicker()
    this.startSmartBH()
    this.startWTap()
    this.startAutoSprint()
    this.startBetterInput()
    this.startFastStop()
  }

  stop(): void {
    this.running = false
    if (this.windowInterval) clearInterval(this.windowInterval)
    if (this.bindPollInterval) clearInterval(this.bindPollInterval)
    this.releaseHeldInputs()
    this.input.stop()
  }

  /**
   * Release any inputs we're currently holding (mouse buttons from
   * Full/Shift-With-Click/items, Ctrl from autosprint) so the user doesn't
   * end up with a stuck button or modifier after panic / toggle-off / quit.
   * Synchronous fire-and-forget; safe to call from non-async contexts.
   */
  private releaseHeldInputs(): void {
    if (this.leftHoldingMouse) {
      this.input.mouseUp(1).catch(() => {})
      this.leftHoldingMouse = false
    }
    if (this.rightHoldingMouse) {
      this.input.mouseUp(2).catch(() => {})
      this.rightHoldingMouse = false
    }
    if (this.sprintHoldingCtrl) {
      this.input.keyUp(VK_CTRL).catch(() => {})
      this.sprintHoldingCtrl = false
    }
  }

  // ── Bind polling ──

  private startBindPollLoop(): void {
    this.bindPollInterval = setInterval(async () => {
      if (!this.input.started) {
        try { await this.input.start() } catch {}
        return
      }

      // Per-bind gating.
      //   'always'    — fires from anywhere. Reserved for binds that don't
      //                 synthesise input (panic, GUI hide, pot-cycle reset).
      //   'gameplay'  — fires only when Minecraft is focused AND the cursor
      //                 is hidden (in active gameplay). Anything that toggles
      //                 the clicker or types slot keys must use this so it
      //                 doesn't fire while the user is in chat / inventory /
      //                 anvil / sign / another app.
      const gameOk = this.isGameFocused() || (!this.windowPolledOnce && this.focusedProcess === '')
      const gameplayOk = gameOk && !this.cursorIsInMenu()

      type Gate = 'always' | 'gameplay'
      const checks: { id: string; vk: number; action: () => void; gate: Gate }[] = [
        { id: 'panic', vk: PANIC_VK, action: () => this.panic(), gate: 'always' },
        { id: 'hideGUI', vk: this.config.misc.bindHideGUI, action: () => this.onHideGUI?.(), gate: 'always' },
        { id: 'left', vk: this.config.left.bind, action: () => this.toggleLeft(), gate: 'gameplay' },
        { id: 'right', vk: this.config.right.bind, action: () => this.toggleRight(), gate: 'gameplay' },
        { id: 'rod', vk: this.config.misc.rodBind, action: () => this.doRod(), gate: 'gameplay' },
        { id: 'pearl', vk: this.config.misc.pearlBind, action: () => this.doPearl(), gate: 'gameplay' },
        { id: 'pot', vk: this.config.potions.potBind, action: () => this.doPotion(), gate: 'gameplay' },
        { id: 'potReset', vk: this.config.potions.potResetBind, action: () => { this.currentPotSlot = this.config.potions.lowestSlot }, gate: 'always' },
        ...this.config.macros.list.filter(m => m.bind).map((m, i) => ({
          id: `macro_${i}`, vk: m.bind, action: () => { this.runMacro(m).catch(() => {}) }, gate: 'gameplay' as Gate,
        })),
      ]

      const active = checks.filter(c => c.vk && (c.gate === 'always' || gameplayOk))
      if (active.length === 0) return

      // Batched: one stdio round-trip per poll tick instead of up to seven.
      const uniqueVks = Array.from(new Set(active.map(c => c.vk)))
      let states: boolean[] = []
      try { states = await this.input.getKeyStates(uniqueVks) }
      catch { return }
      const stateByVk = new Map<number, boolean>()
      uniqueVks.forEach((vk, i) => stateByVk.set(vk, !!states[i]))

      for (const c of active) {
        const held = stateByVk.get(c.vk) ?? false
        const prev = this.prevBindStates[c.id] ?? false
        this.prevBindStates[c.id] = held

        // hideGUI uses a 3-second hold instead of instant toggle
        if (c.id === 'hideGUI') {
          if (held && !prev) {
            this.hideGUIPressTime = Date.now()
          } else if (held && this.hideGUIPressTime && Date.now() - this.hideGUIPressTime >= this.HIDE_GUI_HOLD_MS) {
            this.hideGUIPressTime = 0
            try { c.action() } catch (e) { console.error('[bind:hideGUI] action threw:', e) }
          } else if (!held) {
            this.hideGUIPressTime = 0
          }
          continue
        }

        if (held && !prev) {
          try { c.action() } catch (e) { console.error(`[bind:${c.id}] action threw:`, e) }
        }
      }
    }, POLL_INTERVAL)
  }

  private toggleLeft(): void {
    const wouldEnable = !this.config.left.enabled
    if (wouldEnable) {
      if (this.config.left.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) return
      if (!this.config.left.workInMenus && this.cursorIsInMenu()) return
    }
    this.config.left.enabled = wouldEnable
    if (!wouldEnable && this.leftHoldingMouse) {
      this.input.mouseUp(1).catch(() => {})
      this.leftHoldingMouse = false
    }
    console.log(`[clicker] left ${this.config.left.enabled ? 'ENABLED' : 'DISABLED'}`)
    this.playToggleSound(this.config.left.enabled)
    this.emitUpdate()
  }

  private toggleRight(): void {
    const wouldEnable = !this.config.right.enabled
    if (wouldEnable) {
      if (this.config.right.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) return
      if (!this.config.right.workInMenus && this.cursorIsInMenu()) return
    }
    this.config.right.enabled = wouldEnable
    if (!wouldEnable && this.rightHoldingMouse) {
      this.input.mouseUp(2).catch(() => {})
      this.rightHoldingMouse = false
    }
    console.log(`[clicker] right ${this.config.right.enabled ? 'ENABLED' : 'DISABLED'}`)
    this.playToggleSound(this.config.right.enabled)
    this.emitUpdate()
  }

  private panic(): void {
    const was = this.config.left.enabled || this.config.right.enabled
    if (was) {
      this.config.left.enabled = false
      this.config.right.enabled = false
      this.releaseHeldInputs()
      console.log('[clicker] PANIC — all disabled')
      this.emitUpdate()
    }
  }

  isGameFocused(): boolean {
    if (this.config.misc.compatibilityMode) return true
    return this.focusedProcess.toLowerCase().includes('java') ||
           this.focusedProcess.toLowerCase().includes('az-launcher') ||
           this.focusedProcess.toLowerCase().includes('badlion') ||
           this.focusedProcess.toLowerCase().includes('feather')
  }

  /** True when MC is focused and the player is in gameplay (no menu/inventory/chat open). */
  private inActiveGameplay(): boolean {
    if (this.focusedProcess && !this.isGameFocused()) return false
    return !this.cursorIsInMenu()
  }

  private isFocused(section: string): boolean {
    const cfg = section === 'left' ? this.config.left : this.config.right
    if (cfg.onlyWhenFocused && !this.isGameFocused()) return false
    if (!cfg.workInMenus && this.cursorIsInMenu()) return false
    return true
  }

  private randomCPS(cfg: { averageCPS: number; minCPS: number }): number {
    if (cfg.minCPS < cfg.averageCPS) {
      return cfg.minCPS + Math.random() * (cfg.averageCPS - cfg.minCPS)
    }
    return cfg.averageCPS
  }

  private calculateDelay(cps: number, blatant: boolean): number {
    if (blatant) return 1000 / cps
    return Math.random() * (2000 / cps)
  }

  // ── Left clicker ──

  private async startLeftClicker(): Promise<void> {
    try {
      console.log('[L] loop started')
      while (this.running) {
        const cfg = this.config.left
        const delay = this.config.recorder.enabled
          ? this.getRecordedDelay()
          : this.calculateDelay(this.randomCPS(cfg), cfg.blatant)

        if (!cfg.enabled || this.smartBHActive) {
          if (this.leftHoldingMouse && !cfg.enabled) {
            try { await this.input.mouseUp(1) } catch {}
            this.leftHoldingMouse = false
          }
          await this.sleep(delay); continue
        }

        if (cfg.mode === 'Hold') {
          const lmb = await this.input.isKeyDown(VK_LMB)
          if (!lmb) { await this.sleep(5); continue }
        }

        if (cfg.RMBLock && await this.input.isKeyDown(VK_RMB)) { await this.sleep(10); continue }
        if (cfg.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) { await this.sleep(50); continue }
        if (!cfg.workInMenus && this.cursorIsInMenu()) { await this.sleep(50); continue }

        const breakMode = cfg.breakBlocks
        const shift = (breakMode === 'Shift No Click' || breakMode === 'Shift With Click') ? await this.input.isKeyDown(0x10) : false

        if (breakMode === 'Shift No Click' && shift) { await this.sleep(delay); continue }
        if (breakMode === 'Shift With Click' && shift) {
          await this.input.mouseDown(1)
          this.leftHoldingMouse = true
        } else if (breakMode === 'Full') {
          await this.input.mouseDown(1)
          this.leftHoldingMouse = true
        } else {
          if (this.leftHoldingMouse) {
            try { await this.input.mouseUp(1) } catch {}
            this.leftHoldingMouse = false
          }
          await this.input.mouseClick(1)
        }

        if (cfg.blockHit) {
          const lmb = await this.input.isKeyDown(VK_LMB)
          if (lmb && Math.random() <= cfg.blockHitChance / 100 && Date.now() - this.lastBlockHitTime >= 500) {
            this.lastBlockHitTime = Date.now()
            await this.input.windowRightClick()
          }
        }
        if (cfg.AutoRod && Math.random() <= cfg.AutoRodChance / 100) await this.doRod()
        if (cfg.shakeEffect) await this.input.cursorShake(cfg.shakeEffectForce)
        await this.sleep(delay)
      }
    } catch (err) {
      console.error('[L] LOOP CRASHED:', err)
    }
  }

  // ── Right clicker ──

  private async startRightClicker(): Promise<void> {
    try {
      console.log('[R] loop started')
      while (this.running) {
        const cfg = this.config.right
        const delay = this.calculateDelay(this.randomCPS(cfg), cfg.blatant)

        if (!cfg.enabled || this.smartBHActive) {
          if (this.rightHoldingMouse && !cfg.enabled) {
            try { await this.input.mouseUp(2) } catch {}
            this.rightHoldingMouse = false
          }
          await this.sleep(delay); continue
        }

        if (cfg.mode === 'Hold') {
          const rmb = await this.input.isKeyDown(VK_RMB)
          if (!rmb) { await this.sleep(10); continue }
        }

        if (cfg.LMBLock) {
          const lmb = await this.input.isKeyDown(VK_LMB)
          if (lmb) { await this.sleep(10); continue }
        }

        if (cfg.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) { await this.sleep(50); continue }
        if (!cfg.workInMenus && this.cursorIsInMenu()) { await this.sleep(50); continue }

        if (cfg.items) {
          await this.input.mouseDown(2)
          this.rightHoldingMouse = true
        } else {
          if (this.rightHoldingMouse) {
            try { await this.input.mouseUp(2) } catch {}
            this.rightHoldingMouse = false
          }
          await this.input.windowRightClick()
        }

        if (cfg.shakeEffect) {
          await this.input.cursorShake(cfg.shakeEffectForce)
        }
        await this.sleep(delay)
      }
    } catch (err) {
      console.error('[R] LOOP CRASHED:', err)
    }
  }

  // ── Smart BH ──

  private async startSmartBH(): Promise<void> {
    while (this.running) {
      const bind = this.config.left.smartBH
      if (!bind || !this.input.started) { await this.sleep(200); continue }

      const held = await this.input.isKeyDown(bind)
      if (!held || !this.isFocused('left')) {
        this.smartBHActive = false
        await this.sleep(100)
        continue
      }

      this.smartBHActive = true
      await this.input.mouseDown(1); await this.sleep(20); await this.input.mouseUp(1)
      await this.sleep(100)
      await this.input.mouseDown(2); await this.sleep(150)
      if (await this.input.isKeyDown(bind)) {
        await this.sleep(100); await this.input.mouseUp(2)
      } else {
        await this.input.mouseUp(2)
      }
      await this.sleep(60)
    }
  }

  // ── Macros ──

  async doRod(): Promise<void> {
    const m = this.config.misc
    const slotVK = 0x30 + parseInt(m.rodSlot || '2')
    const swordVK = 0x30 + parseInt(m.swordSlot || '1')
    await this.input.keyTap(slotVK)
    await this.sleep(m.rodDelay * 1000 / 10)
    await this.input.mouseClick(2)
    await this.sleep(m.rodDelay * 1000)
    await this.input.keyTap(swordVK)
  }

  async doPearl(): Promise<void> {
    const m = this.config.misc
    await this.input.keyTap(0x30 + parseInt(m.pearlSlot || '8'))
    await this.sleep(60)
    await this.input.mouseClick(2)
    await this.sleep(800)
    await this.input.keyTap(0x30 + parseInt(m.swordSlot || '1'))
  }

  async doPotion(): Promise<void> {
    const p = this.config.potions
    if (this.currentPotSlot < p.lowestSlot) this.currentPotSlot = p.lowestSlot
    if (this.currentPotSlot > p.highestSlot) { console.log('[potion] none left'); return }
    const swordVK = 0x30 + parseInt(this.config.misc.swordSlot || '1')
    await this.input.keyTap(0x30 + this.currentPotSlot)
    await this.sleep(p.throwDelay * 1000)
    await this.input.mouseDown(2); await this.sleep(20); await this.input.mouseUp(2)
    await this.sleep(600)
    await this.input.keyTap(swordVK)
    this.currentPotSlot++
  }

  // ── Recorder ──
  //
  // record entries are stored in SECONDS (e.g. 0.08 = 80ms between clicks),
  // so a fresh recording of 100ms gaps becomes `0.1` and the loop sleeps
  // `0.1 * 1000 * multiplier` ms.

  private getRecordedDelay(): number {
    const r = this.config.recorder.record
    if (r.length === 0) return 80
    const idx = this.recordCycleIndex % r.length
    this.recordCycleIndex++
    return r[idx] * 1000 * this.config.recorder.recordMultiplier
  }

  // ── Window listener ──

  private startWindowListener(): void {
    this.windowInterval = setInterval(async () => {
      try {
        const info = await this.input.getWindowInfo()
        this.focusedProcess = info.processName
        this.cursorVisible = info.cursorVisible
        this.windowPolledOnce = true
      } catch {
        this.focusedProcess = ''
        this.cursorVisible = false
      }
    }, 500)
  }

  private cursorIsInMenu(): boolean { return this.cursorVisible }

  // ── Macro execution ──

  private keyNameToVk(name: string): number {
    const map: Record<string, number> = {
      lmb: 0x01, rmb: 0x02, mmb: 0x04,
      backspace: 0x08, tab: 0x09, enter: 0x0D, shift: 0x10, ctrl: 0x11, alt: 0x12,
      esc: 0x1B, space: 0x20,
      left: 0x25, up: 0x26, right: 0x27, down: 0x28,
    }
    const lower = name.toLowerCase().replace(/["']/g, '')
    if (map[lower]) return map[lower]
    if (/^f\d{1,2}$/i.test(lower)) {
      const n = parseInt(lower.slice(1))
      if (n >= 1 && n <= 12) return 0x6F + n
    }
    if (/^[a-z]$/i.test(lower)) return lower.charCodeAt(0) - (lower >= 'a' ? 0x61 - 0x41 : 0x41) + 0x41
    if (/^\d$/i.test(lower)) return 0x30 + parseInt(lower)
    return parseInt(lower) || 0
  }

  private parseScriptLines(lines: string[], startIdx: number): { actions: MacroAction[]; nextIdx: number } {
    const actions: MacroAction[] = []
    const id = () => `script_${actions.length}_${Date.now()}`
    let i = startIdx
    while (i < lines.length) {
      const s = lines[i].trim()
      i++
      if (!s || s.startsWith('#')) continue

      // endif — pop back to the caller (handles nesting)
      if (/^endif\s*$/i.test(s)) break

      // if condition ... endif
      const ifMatch = s.match(/^if\s+(.+)$/i)
      if (ifMatch) {
        const { actions: body, nextIdx } = this.parseScriptLines(lines, i)
        i = nextIdx
        actions.push({
          id: id(), type: 'script_if', label: `If: ${ifMatch[1]}`,
          config: { condition: ifMatch[1].trim(), body },
        })
        continue
      }

      const delayMatch = s.match(/^delay\s*\(\s*(\d+)\s*\)$/i)
      if (delayMatch) { actions.push({ id: id(), type: 'delay', label: `Delay ${delayMatch[1]}ms`, config: { ms: parseInt(delayMatch[1]) } }); continue }

      // key("name") or key(0xNN) or key(N)
      let simpleKey = s.match(/^(key|tap)\s*\(\s*(0x[0-9a-f]+|\d+)\s*\)$/i)
      if (!simpleKey) simpleKey = s.match(/^(key|tap)\s*\(\s*['"](.+?)['"]\s*\)$/i)
      if (simpleKey) {
        const vk = simpleKey[2].startsWith('0x') ? parseInt(simpleKey[2]) : this.keyNameToVk(simpleKey[2])
        actions.push({ id: id(), type: 'key_tap', label: `Key ${vk}`, config: { vk } }); continue
      }

      // convert_key("name") — inline, returns VK code at parse time
      const convMatch = s.match(/convert_key\s*\(\s*['"](.+?)['"]\s*\)/i)
      if (convMatch) { const vk = this.keyNameToVk(convMatch[1]); actions.push({ id: id(), type: 'key_tap', label: `Key ${vk}`, config: { vk } }); continue }

      const clickMatch = s.match(/^click\s*\(\s*(\d+)\s*\)$/i)
      if (clickMatch) { actions.push({ id: id(), type: 'mouse_click', label: `Click ${clickMatch[1]}`, config: { button: parseInt(clickMatch[1]) } }); continue }

      // pitch(delta) / yaw(delta) — relative mouse move
      const pitchMatch = s.match(/^pitch\s*\(\s*(-?\d+)\s*\)$/i)
      if (pitchMatch) { actions.push({ id: id(), type: 'mouse_relative_move', label: `Pitch ${pitchMatch[1]}`, config: { dx: 0, dy: parseInt(pitchMatch[1]) } }); continue }
      const yawMatch = s.match(/^yaw\s*\(\s*(-?\d+)\s*\)$/i)
      if (yawMatch) { actions.push({ id: id(), type: 'mouse_relative_move', label: `Yaw ${yawMatch[1]}`, config: { dx: parseInt(yawMatch[1]), dy: 0 } }); continue }

      const holdMatch = s.match(/^hold\s*\(\s*(0x[0-9a-f]+|\d+)\s*,\s*(\d+)\s*\)$/i)
      if (holdMatch) {
        const vk = parseInt(holdMatch[1]); const ms = parseInt(holdMatch[2])
        actions.push({ id: id(), type: 'key_down', label: `Hold ${vk}`, config: { vk } })
        actions.push({ id: id(), type: 'delay', label: `Delay ${ms}ms`, config: { ms } })
        actions.push({ id: id(), type: 'key_up', label: `Release ${vk}`, config: { vk } })
        continue
      }
      const setSlotMatch = s.match(/^setslot\s*\(\s*(\d+)\s*\)$/i)
      if (setSlotMatch) { actions.push({ id: id(), type: 'key_tap', label: `Slot ${setSlotMatch[1]}`, config: { vk: 0x30 + parseInt(setSlotMatch[1]) } }); continue }
      const keyDownMatch = s.match(/^keydown\s*\(\s*(0x[0-9a-f]+|\d+)\s*\)$/i)
      if (keyDownMatch) { actions.push({ id: id(), type: 'key_down', label: `KeyDown ${keyDownMatch[1]}`, config: { vk: parseInt(keyDownMatch[1]) } }); continue }
      const keyUpMatch = s.match(/^keyup\s*\(\s*(0x[0-9a-f]+|\d+)\s*\)$/i)
      if (keyUpMatch) { actions.push({ id: id(), type: 'key_up', label: `KeyUp ${keyUpMatch[1]}`, config: { vk: parseInt(keyUpMatch[1]) } }); continue }
    }
    return { actions, nextIdx: i }
  }

  private parseScript(code: string): MacroAction[] {
    return this.parseScriptLines(code.split('\n'), 0).actions
  }

  private async execAction(action: MacroAction): Promise<void> {
    const { type, config } = action
    switch (type) {
      case 'delay':
        await this.sleep((config.ms as number) || 100)
        break
      case 'key_tap':
        await this.input.keyTap((config.vk as number) || 0)
        break
      case 'key_down':
        await this.input.keyDown((config.vk as number) || 0)
        break
      case 'key_up':
        await this.input.keyUp((config.vk as number) || 0)
        break
      case 'mouse_click':
        await this.input.mouseClick((config.button as number) || 1)
        break
      case 'mouse_down':
        await this.input.mouseDown((config.button as number) || 1)
        break
      case 'mouse_up':
        await this.input.mouseUp((config.button as number) || 1)
        break
      case 'rod': {
        const slot = (config.slot as string) || '2'
        const delay = (config.delay as number) || 200
        const swordSlot = this.config.misc.swordSlot || '1'
        await this.input.keyTap(0x30 + parseInt(slot))
        await this.sleep(delay)
        await this.input.mouseClick(2)
        await this.sleep(delay)
        await this.input.keyTap(0x30 + parseInt(swordSlot))
        break
      }
      case 'pearl': {
        const pSlot = (config.slot as string) || '8'
        const pSwordSlot = this.config.misc.swordSlot || '1'
        await this.input.keyTap(0x30 + parseInt(pSlot))
        await this.sleep(60)
        await this.input.mouseClick(2)
        await this.sleep(800)
        await this.input.keyTap(0x30 + parseInt(pSwordSlot))
        break
      }
      case 'potion': {
        const throwDelay = (config.throwDelay as number) || 700
        const potSwordSlot = this.config.misc.swordSlot || '1'
        if (this.currentPotSlot < this.config.potions.lowestSlot) this.currentPotSlot = this.config.potions.lowestSlot
        if (this.currentPotSlot > this.config.potions.highestSlot) { console.log('[macro/pot] none left'); return }
        await this.input.keyTap(0x30 + this.currentPotSlot)
        await this.sleep(throwDelay)
        await this.input.mouseClick(2)
        await this.sleep(600)
        await this.input.keyTap(0x30 + parseInt(potSwordSlot))
        this.currentPotSlot++
        break
      }
      case 'condition': {
        const condType = config.type as string
        const condVk = (config.vk as number) || 0
        if (condType === 'key_held') {
          if (!await this.input.isKeyDown(condVk)) throw new Error('condition: key not held')
        } else if (condType === 'key_not_held') {
          if (await this.input.isKeyDown(condVk)) throw new Error('condition: key held')
        } else if (condType === 'chance') {
          const chance = (config.chance as number) || 50
          if (Math.random() * 100 > chance) throw new Error('condition: chance failed')
        } else if (condType === 'mouse_held') {
          const btn = (config.button as number) || 1
          if (!await this.input.isKeyDown(btn === 1 ? 0x01 : 0x02)) throw new Error('condition: mouse not held')
        }
        break
      }
      case 'loop': {
        const count = (config.count as number) || 3
        const loopActions = (config.actions as MacroAction[]) || []
        for (let i = 0; i < count; i++) {
          for (const a of loopActions) await this.execAction(a)
        }
        break
      }
      case 'script_if': {
        const condition = (config.condition as string) || ''
        const body = (config.body as MacroAction[]) || []
        let pass = false
        const keyHeldMatch = condition.match(/^key_held\s*\(\s*(0x[0-9a-f]+|\d+)\s*\)$/i)
        if (keyHeldMatch) pass = await this.input.isKeyDown(parseInt(keyHeldMatch[1]))
        const keyNotHeldMatch = condition.match(/^key_not_held\s*\(\s*(0x[0-9a-f]+|\d+)\s*\)$/i)
        if (keyNotHeldMatch) pass = !await this.input.isKeyDown(parseInt(keyNotHeldMatch[1]))
        const chanceMatch = condition.match(/^chance\s*\(\s*(\d+)\s*\)$/i)
        if (chanceMatch) pass = Math.random() * 100 < parseInt(chanceMatch[1])
        const mouseHeldMatch = condition.match(/^mouse_held\s*\(\s*(\d+)\s*\)$/i)
        if (mouseHeldMatch) pass = await this.input.isKeyDown(parseInt(mouseHeldMatch[1]) === 1 ? 0x01 : 0x02)
        if (/^focused$/i.test(condition)) pass = this.isGameFocused()
        if (/^clicking_left$/i.test(condition)) pass = this.config.left.enabled
        if (/^clicking_right$/i.test(condition)) pass = this.config.right.enabled
        if (pass) { for (const a of body) await this.execAction(a) }
        break
      }
      case 'mouse_relative_move': {
        const dx = (config.dx as number) || 0
        const dy = (config.dy as number) || 0
        await this.input.mouseRelativeMove(dx, dy)
        break
      }
      case 'script': {
        const code = (config.code as string) || ''
        const parsed = this.parseScript(code)
        for (const a of parsed) await this.execAction(a)
        break
      }
    }
  }

  private async runMacro(macro: Macro): Promise<void> {
    console.log(`[macro] running "${macro.name}"`)
    try {
      for (const step of macro.steps) {
        for (const action of step.actions) {
          await this.execAction(action)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('condition:')) {
        console.log(`[macro] "${macro.name}": ${err.message}`)
      } else {
        console.error(`[macro] "${macro.name}" error:`, err)
      }
    }
  }

  // ── Movement ──
  //
  // All movement helpers gate on inActiveGameplay() (MC focused AND not in a
  // menu/inventory/chat/anvil/sign). Otherwise fastStop in particular would
  // type WASD keys into text fields.

  private async startWTap(): Promise<void> {
    while (this.running) {
      await this.sleep(10)
      const mv = this.config.movement
      if (!mv.autoWTap || !this.inActiveGameplay() || !(await this.input.isKeyDown(VK_LMB))) {
        await this.sleep(500); continue
      }
      const w = await this.input.isKeyDown(0x57)
      const a = await this.input.isKeyDown(0x41)
      const d = await this.input.isKeyDown(0x44)
      if (!(a || d) || !w) continue
      if (mv.wTapMode === 'chance' && Math.random() > mv.wTapValue / 100) continue
      await this.input.keyUp(0x57); await this.sleep(50); await this.input.keyDown(0x57)
      if (mv.wTapMode === 'delay') await this.sleep(Math.max(0, mv.wTapValue))
    }
  }

  private async startAutoSprint(): Promise<void> {
    while (this.running) {
      const enabled = this.config.movement.autoSprint
      if (!enabled || !this.inActiveGameplay()) {
        if (this.sprintHoldingCtrl) {
          await this.input.keyUp(VK_CTRL)
          this.sprintHoldingCtrl = false
        }
        await this.sleep(200)
        continue
      }
      await this.sleep(50)
      const moving = await this.input.isKeyDown(0x57) || await this.input.isKeyDown(0x41) || await this.input.isKeyDown(0x44)
      if (moving && !this.sprintHoldingCtrl) {
        await this.input.keyDown(VK_CTRL)
        this.sprintHoldingCtrl = true
      } else if (!moving && this.sprintHoldingCtrl) {
        await this.input.keyUp(VK_CTRL)
        this.sprintHoldingCtrl = false
      }
    }
  }

  private async startBetterInput(): Promise<void> {
    while (this.running) {
      if (!this.config.movement.betterInput || !this.inActiveGameplay()) { await this.sleep(100); continue }
      const a = await this.input.isKeyDown(0x41)
      const d = await this.input.isKeyDown(0x44)
      if (this.strafeState.a && d) { await this.input.keyUp(0x41); this.betterInputTimestamp = Date.now() }
      else if (this.strafeState.d && a) { await this.input.keyUp(0x44); this.betterInputTimestamp = Date.now() }
      this.strafeState.a = a; this.strafeState.d = d
      await this.sleep(10)
    }
  }

  private async startFastStop(): Promise<void> {
    while (this.running) {
      if (!this.config.movement.fastStop || !this.inActiveGameplay()) { await this.sleep(100); continue }
      if (await this.input.isKeyDown(0x20)) this.movementState.jump = Date.now()
      const w = await this.input.isKeyDown(0x57); const s = await this.input.isKeyDown(0x53)
      const a = await this.input.isKeyDown(0x41); const d = await this.input.isKeyDown(0x44)
      const grounded = Date.now() - this.movementState.jump > 700 && Date.now() - this.betterInputTimestamp > 700
      if (grounded) {
        if (!w && !s && this.movementState.w) await this.input.keyTap(0x53)
        if (!s && !w && this.movementState.s) await this.input.keyTap(0x57)
        if (!a && !d && this.movementState.a) await this.input.keyTap(0x44)
        if (!d && !a && this.movementState.d) await this.input.keyTap(0x41)
      }
      this.movementState.w = w; this.movementState.s = s; this.movementState.a = a; this.movementState.d = d
      await this.sleep(10)
    }
  }

  // ── Config ──

  loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
        this.config = mergeConfig(DEFAULT_CONFIG, data)
      }
    } catch {}
  }

  saveConfig(): void {
    try {
      const dir = path.dirname(CONFIG_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8')
    } catch (e) { console.error('[config] save failed:', e) }
  }

  /**
   * Merge a preset (or any partial config) into the live config without
   * clobbering sub-sections. Used by IPC preset loading.
   */
  applyPreset(data: Record<string, unknown>): void {
    this.config = mergeConfig(this.config, data)
    this.emitUpdate()
  }

  updateConfig(p: string[], value: unknown): void {
    for (const seg of p) {
      if (UNSAFE_KEYS.has(seg)) {
        console.warn('[config] rejected unsafe path segment:', seg)
        return
      }
    }
    let t: Record<string, unknown> = this.config as unknown as Record<string, unknown>
    for (let i = 0; i < p.length - 1; i++) t = t[p[i]] as Record<string, unknown>
    t[p[p.length - 1]] = value
    if (this.config.misc.saveSettings) this.saveConfig()
    this.emitUpdate()
  }

  getConfig(): AutoclickerConfig { return this.config }

  private emitUpdate(): void {
    try { this.onConfigUpdate?.(this.config) } catch {}
  }

  // ── Misc helpers ──

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, Math.max(0, ms))) }

  private playToggleSound(enabled: boolean): void {
    if (!this.config.misc.toggleSounds) return
    try {
      const file = enabled ? 'on.wav' : 'off.wav'
      const p = path.join(USER_RESOURCE, file)
      if (!fs.existsSync(p)) return
      if (process.platform === 'win32') {
        spawn('powershell', ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${p}').PlaySync()`], { stdio: 'ignore', windowsHide: true }).unref()
      } else if (process.platform === 'darwin') {
        spawn('afplay', [p], { stdio: 'ignore' }).unref()
      } else {
        spawn('aplay', [p], { stdio: 'ignore' }).unref()
      }
    } catch {}
  }
}
