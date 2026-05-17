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
  private macroCooldowns: Record<string, number> = {}
  private readonly MACRO_COOLDOWN_MS = 150
  /** Tracks whether a loop-enabled macro is currently running */
  private macroLoopActive: Record<string, boolean> = {}
  private _loggedBinds = false
  private macroLoopAbort: Record<string, boolean> = {}

  // ── $fullscript module system ──
  /** Registered modules: keyed by macro index, value = list of actions to loop */
  private modules: Record<string, MacroAction[]> = {}
  /** Whether each module is currently enabled */
  private moduleEnabled: Record<string, boolean> = {}
  /** Overlay items set by modules. Each item is { t:'text', v:string } or { t:'bar', v:number, l:number, filled:number }. */
  moduleOverlayText: any[] = []
  /** Sides where the default L/R indicator should be hidden when the clicker is off. Set by overlay_request_hide(). */
  overlayHideSides: Set<string> = new Set()
  /** Built-in keystrokes overlay — reads keys in one batch and updates overlay atomically */
  keystrokesInterval: ReturnType<typeof setInterval> | null = null
  /** The 7 VKs for the keystrokes grid (LMB, W, RMB, A, S, D, Space) */
  private readonly KS_VKS = [0x01, 0x57, 0x02, 0x41, 0x53, 0x44, 0x20]

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
  onOverlayUpdate: ((items: any[]) => void) | null = null

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
        if (!this.input.started) {
          this.windowPolledOnce = false
        }
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
        ...this.config.macros.list.reduce<{ id: string; vk: number; action: () => void; gate: Gate }[]>((acc, m, i) => {
          if (!m.bind) return acc
          const hasFullscript = m.steps.some(step =>
            step.actions.some(a => a.type === 'script' && (a.config.code as string || '').trimStart().startsWith('$fullscript'))
          )
          if (hasFullscript) {
            if (!this._loggedBinds) console.log(`[bind] registering module_${i} "${m.name}" vk=${m.bind}`)
            acc.push({ id: `module_${i}`, vk: m.bind, action: () => { console.log(`[bind] firing module_${i}`); this.toggleModule(i).catch(() => {}) }, gate: 'gameplay' as Gate })
          } else {
            acc.push({ id: `macro_${i}`, vk: m.bind, action: () => { this.runMacroAction(m, i).catch(() => {}) }, gate: 'gameplay' as Gate })
          }
          return acc
        }, []),
      ]

      const allBinds = checks.filter(c => c.vk).map(c => `${c.id}=${c.vk}`).join(', ')
      if (!this._loggedBinds) { console.log(`[bind] registered: ${allBinds}`); this._loggedBinds = true }

      const active = checks.filter(c => c.vk && (c.gate === 'always' || gameplayOk))
      if (active.length === 0) {
        console.log(`[bind] no active binds — gameplayOk=${gameplayOk} gameOk=${gameOk} focused="${this.focusedProcess}" cursorVis=${this.cursorVisible} windowPolled=${this.windowPolledOnce}`)
        return
      }

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

        // Skip macro binds during cooldown (only for non-loop toggles)
        if (c.id.startsWith('macro_')) {
          const mi = parseInt(c.id.slice(6))
          const isLoop = !isNaN(mi) && this.config.macros.list[mi]?.loop
          if (!isLoop && this.macroCooldowns[c.id] && Date.now() < this.macroCooldowns[c.id]) continue
        }

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
          try {
            if (c.id.startsWith('macro_')) {
              const mi = parseInt(c.id.slice(6))
              const isLoop = !isNaN(mi) && this.config.macros.list[mi]?.loop
              if (!isLoop) this.macroCooldowns[c.id] = Date.now() + this.MACRO_COOLDOWN_MS
            }
            c.action()
          } catch (e) { console.error(`[bind:${c.id}] action threw:`, e) }
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

  private pushOverlay(): void {
    this.onOverlayUpdate?.([...this.moduleOverlayText])
  }

  // ── Built-in keystrokes overlay ──

  /**
   * Enable the keystrokes overlay.  Reads 7 key states (LMB, W, RMB, A, S, D, Space)
   * in ONE batched round-trip and atomically replaces moduleOverlayText so there's
   * never a frame where the overlay sees an empty or partial array.
   */
  startKeystrokes(): void {
    if (this.keystrokesInterval) return
    console.log('[ks] starting')
    this.keystrokesInterval = setInterval(async () => {
      try {
        const states = await this.input.getKeyStates(this.KS_VKS)
        const dot = (held: boolean) => held ? 100 : 5
        this.moduleOverlayText = [
          { t: 'dot', v: '●', pct: dot(states[0]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[1]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[2]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[3]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[4]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[5]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[6]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[6]) / 100 },
          { t: 'dot', v: '●', pct: dot(states[6]) / 100 },
        ]
        this.pushOverlay()
      } catch {
        // input helper down — keep last frame rather than clearing
      }
    }, 30)
  }

  stopKeystrokes(): void {
    if (this.keystrokesInterval) {
      clearInterval(this.keystrokesInterval)
      this.keystrokesInterval = null
      this.moduleOverlayText = []
      this.pushOverlay()
      console.log('[ks] stopped')
    }
  }

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

  // Runtime script variable storage
  private scriptVars: Record<string, number> = {}
  private scriptStrVars: Record<string, string> = {}

  /** Resolve a value to a string. Handles $_var references (checks string vars
   *  first, falls back to number vars), or strips surrounding quotes. */
  private resolveStrVal(val: string): string {
    const t = val.trim()
    const varMatch = t.match(/^\$(_[a-zA-Z_]\w*)$/)
    if (varMatch) {
      const name = varMatch[1]
      if (name in this.scriptStrVars) return this.scriptStrVars[name]
      if (name in this.scriptVars) return String(this.scriptVars[name])
      return ''
    }
    const quoted = t.match(/^['"](.*)['"]$/)
    if (quoted) return quoted[1]
    return t
  }

  /** Resolve a config value at runtime. Accepts raw numbers, $var references,
   *  convert_key("name"), 'namedKey' strings, 0xNN hex, or plain numeric strings. */
  private resolveVal(v: unknown): number {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      if (v.startsWith('$_')) {
        const raw = this.scriptVars[v.slice(1)]
        if (raw !== undefined) return raw
        return 0
      }
      const named = v.match(/^'(.*)'\s*$/)
      if (named) return this.keyNameToVk(named[1])
      const convMatch = v.match(/^convert_key\s*\(\s*['"](.+?)['"]\s*\)$/i)
      if (convMatch) return this.keyNameToVk(convMatch[1])
      if (/^0x[0-9a-f]+$/i.test(v)) return parseInt(v)
      const n = parseInt(v)
      if (!isNaN(n)) return n
      return 0
    }
    return 0
  }

  /** Resolve a named module state to 1 (enabled) or 0 (disabled). */
  private getModuleState(name: string): number {
    switch (name.toLowerCase()) {
      case 'left': return this.config.left.enabled ? 1 : 0
      case 'right': return this.config.right.enabled ? 1 : 0
      case 'wtap': return this.config.movement.autoWTap ? 1 : 0
      case 'autorod': return this.config.left.AutoRod ? 1 : 0
      case 'potions': return this.config.potions.enabled ? 1 : 0
      default: return 0
    }
  }

  /** Evaluate a simple arithmetic expression with $_var references and basic
   *  math (+, -, *, /, %, parentheses).  Safe from injection: only operates on
   *  $var values, not the full JS environment.
   *  Built-in functions: rnd(min,max), sin(x), cos(x), abs(x), floor(x), clamp(v,lo,hi), get_state('name') */
  private evalExpr(expr: string): number {
    const t = expr.trim()
    if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t)

    // Resolve $_var references
    let resolved = t.replace(/\$(_[a-zA-Z_]\w*)/g, (_, name) => {
      return String(this.scriptVars[name] ?? '0')
    })

    // Evaluate random() / rnd(min, max) at runtime — matches up to nested parens via simple heuristic
    resolved = resolved.replace(/\br(?:nd|andom)\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi, (_, minStr, maxStr) => {
      const min = this.evalExpr(minStr)
      const max = this.evalExpr(maxStr)
      return String(min + Math.random() * (max - min))
    })

    // Resolve get_state('name') calls — reads config state at runtime
    resolved = resolved.replace(/\bget_state\s*\(\s*'([^']+)'\s*\)/g, (_, name) => {
      return String(this.getModuleState(name))
    })

    // Map math function names for new Function
    resolved = resolved
      .replace(/\bsin\s*\(/g, 'Math.sin(')
      .replace(/\bcos\s*\(/g, 'Math.cos(')
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\bfloor\s*\(/g, 'Math.floor(')
      .replace(/\bceil\s*\(/g, 'Math.ceil(')
      .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
      .replace(/\bclamp\s*\(/g, '_clamp(')

    try {
      const fn = new Function(`"use strict"; var _clamp=function(v,l,u){return v<l?l:v>u?u:v}; return (${resolved})`)
      const r = fn()
      return typeof r === 'number' && !isNaN(r) ? r : 0
    } catch {
      return 0
    }
  }

  private parseScriptLines(lines: string[], startIdx: number): { actions: MacroAction[]; nextIdx: number } {
    const actions: MacroAction[] = []
    const id = () => `script_${actions.length}_${Date.now()}`
    let i = startIdx
    while (i < lines.length) {
      const s = lines[i].trim()
      i++
      if (!s || s.startsWith('//')) continue

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

      // Variable declaration: _name: type = new_random(min, max).fix=N or _name: type = value
      const varNewRandom = s.match(/^(_[a-zA-Z_]\w*)\s*:\s*(int|float)\s*=\s*new_random\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*(?:\.fix\s*=\s*(\d+))?\s*$/i)
      if (varNewRandom) {
        actions.push({
          id: id(), type: 'var_set', label: `Var ${varNewRandom[1]}`,
          config: { name: varNewRandom[1], min: varNewRandom[3].trim(), max: varNewRandom[4].trim(), fix: varNewRandom[5] ? parseInt(varNewRandom[5]) : undefined, mode: 'random', type: varNewRandom[2] },
        })
        continue
      }
      // String variable: _name: str = "value"
      const varStr = s.match(/^(_[a-zA-Z_]\w*)\s*:\s*str\s*=\s*['"](.*?)['"]\s*$/i)
      if (varStr) {
        actions.push({
          id: id(), type: 'var_set_str', label: `Str ${varStr[1]}`,
          config: { name: varStr[1], value: varStr[2] },
        })
        continue
      }

      // _name: type = expression (plain number, variable ref, or math expression)
      const varExpr = s.match(/^(_[a-zA-Z_]\w*)\s*:\s*(int|float)\s*=\s*(.+)$/i)
      if (varExpr) {
        const expr = varExpr[3].trim()
        // If it's just a plain number, use the simple path
        if (/^\d+(\.\d+)?$/.test(expr)) {
          actions.push({
            id: id(), type: 'var_set', label: `Var ${varExpr[1]}`,
            config: { name: varExpr[1], value: parseFloat(expr), mode: 'plain', exprKind: 'literal' },
          })
        } else {
          // Expression — evaluated at runtime via var_assign
          actions.push({
            id: id(), type: 'var_assign', label: `Var ${varExpr[1]}`,
            config: { name: varExpr[1], expr, exprKind: 'decl' },
          })
        }
        continue
      }

      // Assignment: _name = expression
      const assignMatch = s.match(/^(_[a-zA-Z_]\w*)\s*=\s*(.+)$/i)
      if (assignMatch) {
        actions.push({
          id: id(), type: 'var_assign', label: `Assign ${assignMatch[1]}`,
          config: { name: assignMatch[1], expr: assignMatch[2].trim() },
        })
        continue
      }

      const delayMatch = s.match(/^delay\s*\(\s*(.+)\s*\)$/i)
      if (delayMatch) {
        actions.push({ id: id(), type: 'delay', label: `Delay ${delayMatch[1].trim()}ms`, config: { ms: delayMatch[1].trim() } }); continue
      }

      // key("name") or key(0xNN) or key(N) or key($var) or key(convert_key("name"))
      let simpleKey = s.match(/^(key|tap)\s*\(\s*(0x[0-9a-f]+|\d+|\$_[\w]+)\s*\)$/i)
      if (!simpleKey) simpleKey = s.match(/^(key|tap)\s*\(\s*['"](.+?)['"]\s*\)$/i)
      if (!simpleKey) simpleKey = s.match(/^(key|tap)\s*\(\s*convert_key\s*\(\s*['"](.+?)['"]\s*\)\s*\)$/i)
      if (simpleKey) {
        let raw: string
        if (simpleKey[2].startsWith('$_')) raw = simpleKey[2]
        else if (simpleKey[2].startsWith('0x')) raw = simpleKey[2]
        else raw = `'${simpleKey[2]}'` // named key ref — resolve at exec time
        actions.push({ id: id(), type: 'key_tap', label: `Key ${raw}`, config: { vk: raw } }); continue
      }

      const clickMatch = s.match(/^click\s*\(\s*(\d+|\$_[\w]+)\s*\)$/i)
      if (clickMatch) { actions.push({ id: id(), type: 'mouse_click', label: `Click ${clickMatch[1]}`, config: { button: clickMatch[1] } }); continue }

      const pitchMatch = s.match(/^pitch\s*\(\s*(-?\d+|\$_[\w]+)\s*\)$/i)
      if (pitchMatch) { actions.push({ id: id(), type: 'mouse_relative_move', label: `Pitch ${pitchMatch[1]}`, config: { dx: '0', dy: pitchMatch[1] } }); continue }
      const yawMatch = s.match(/^yaw\s*\(\s*(-?\d+|\$_[\w]+)\s*\)$/i)
      if (yawMatch) { actions.push({ id: id(), type: 'mouse_relative_move', label: `Yaw ${yawMatch[1]}`, config: { dx: yawMatch[1], dy: '0' } }); continue }

      // hold — supports hex VK, raw number, $var, convert_key("name"), and 'name' string
      let holdMatch = s.match(/^hold\s*\(\s*((?:0x[0-9a-f]+|\d+|\$_[\w]+|convert_key\s*\(\s*['"][^'"]+['"]\s*\)))\s*,\s*(\d+|\$_[\w]+)\s*\)$/i)
      if (!holdMatch) holdMatch = s.match(/^hold\s*\(\s*'([^']+)'\s*,\s*(\d+|\$_[\w]+)\s*\)$/i)
      if (holdMatch) {
        const vk = holdMatch[1].startsWith('\'') ? `'${holdMatch[1].replace(/'/g, '')}'` : holdMatch[1]
        actions.push({ id: id(), type: 'key_down', label: `Hold ${vk}`, config: { vk } })
        actions.push({ id: id(), type: 'delay', label: `Delay ${holdMatch[2]}ms`, config: { ms: holdMatch[2] } })
        actions.push({ id: id(), type: 'key_up', label: `Release ${vk}`, config: { vk } })
        continue
      }
      const setSlotMatch = s.match(/^setslot\s*\(\s*(\d+)\s*\)$/i)
      if (setSlotMatch) { const n = parseInt(setSlotMatch[1]); actions.push({ id: id(), type: 'key_tap', label: `Slot ${n}`, config: { vk: String(0x30 + n) } }); continue }

      // overlay_text("text") and overlay_clear
      const overlayTextMatch = s.match(/^overlay_text\s*\(\s*(.+)\s*\)$/i)
      if (overlayTextMatch) { actions.push({ id: id(), type: 'overlay_text', label: `Overlay`, config: { expr: overlayTextMatch[1] } }); continue }
      const overlayBarMatch = s.match(/^loadingbar\s*\(\s*(\d+|\$_[\w]+)\s*,\s*(\d+|\$_[\w]+)\s*,\s*(\d+|\$_[\w]+)\s*\)$/i)
      if (overlayBarMatch) { actions.push({ id: id(), type: 'overlay_bar', label: 'LoadingBar', config: { value: overlayBarMatch[1], max: overlayBarMatch[2], len: overlayBarMatch[3] } }); continue }
      if (/^overlay_clear\s*$/i.test(s)) { actions.push({ id: id(), type: 'overlay_clear', label: 'Clear Overlay', config: {} }); continue }

      const hideMatch = s.match(/^overlay_request_hide\s*\(\s*['"](left|right)['"]\s*\)$/i)
      if (hideMatch) { actions.push({ id: id(), type: 'overlay_request_hide', label: `Hide: ${hideMatch[1]}`, config: { side: hideMatch[1] } }); continue }

      const dotMatch = s.match(/^overlay_dot\s*\(\s*['"](.+?)['"]\s*,\s*(.+)\s*\)$/i)
      if (dotMatch) { actions.push({ id: id(), type: 'overlay_dot', label: `Dot: ${dotMatch[1]}`, config: { label: dotMatch[1], brightness: dotMatch[2].trim() } }); continue }

      let entryMatch = s.match(/^overlay_entry\s*\(\s*['"](.+?)['"]\s*,\s*([^,]+?)\s*,\s*(.+)\s*\)$/i)
      if (entryMatch) { actions.push({ id: id(), type: 'overlay_entry', label: `Entry: ${entryMatch[1]}`, config: { label: entryMatch[1], active: entryMatch[2].trim(), side: entryMatch[3].trim() } }); continue }
      entryMatch = s.match(/^overlay_entry\s*\(\s*(\$_[a-zA-Z_]\w*)\s*,\s*([^,]+?)\s*,\s*(.+)\s*\)$/i)
      if (entryMatch) { actions.push({ id: id(), type: 'overlay_entry', label: `Entry: ${entryMatch[1]}`, config: { label: entryMatch[1], active: entryMatch[2].trim(), side: entryMatch[3].trim() } }); continue }

      let keyDownMatch = s.match(/^keydown\s*\(\s*((?:0x[0-9a-f]+|\d+|\$_[\w]+|convert_key\s*\(\s*['"][^'"]+['"]\s*\)))\s*\)$/i)
      if (!keyDownMatch) keyDownMatch = s.match(/^keydown\s*\(\s*'([^']+)'\s*\)$/i)
      if (keyDownMatch) { const vk = keyDownMatch[1].startsWith('\'') ? `'${keyDownMatch[1].replace(/'/g, '')}'` : keyDownMatch[1]; actions.push({ id: id(), type: 'key_down', label: `KeyDown ${vk}`, config: { vk } }); continue }
      let keyUpMatch = s.match(/^keyup\s*\(\s*((?:0x[0-9a-f]+|\d+|\$_[\w]+|convert_key\s*\(\s*['"][^'"]+['"]\s*\)))\s*\)$/i)
      if (!keyUpMatch) keyUpMatch = s.match(/^keyup\s*\(\s*'([^']+)'\s*\)$/i)
      if (keyUpMatch) { const vk = keyUpMatch[1].startsWith('\'') ? `'${keyUpMatch[1].replace(/'/g, '')}'` : keyUpMatch[1]; actions.push({ id: id(), type: 'key_up', label: `KeyUp ${vk}`, config: { vk } }); continue }
    }
    return { actions, nextIdx: i }
  }

  private parseScript(code: string): MacroAction[] {
    return this.parseScriptLines(code.split('\n'), 0).actions
  }

  private async execAction(action: MacroAction): Promise<void> {
    const { type, config } = action
    switch (type) {
      case 'delay': {
        const rawDelay = typeof config.ms === 'string' ? config.ms : String(config.ms ?? '100')
        const delayMs = this.evalExpr(rawDelay) || 100
        console.log(`[exec] delay(${delayMs}) from "${rawDelay}"`)
        await this.sleep(delayMs)
        break
      }
      case 'key_tap':
        await this.input.windowKeyTap(this.resolveVal(config.vk) || 0)
        break
      case 'key_down':
        await this.input.keyDown(this.resolveVal(config.vk) || 0)
        break
      case 'key_up':
        await this.input.keyUp(this.resolveVal(config.vk) || 0)
        break
      case 'mouse_click':
        await this.input.mouseClick(this.resolveVal(config.button) || 1)
        break
      case 'mouse_down':
        await this.input.mouseDown(this.resolveVal(config.button) || 1)
        break
      case 'mouse_up':
        await this.input.mouseUp(this.resolveVal(config.button) || 1)
        break
      case 'rod': {
        const slot = (config.slot as string) || '2'
        const delay = this.resolveVal(config.delay) || 200
        const swordSlot = this.config.misc.swordSlot || '1'
        await this.input.windowKeyTap(0x30 + parseInt(slot))
        await this.sleep(delay)
        await this.input.mouseClick(2)
        await this.sleep(delay)
        await this.input.windowKeyTap(0x30 + parseInt(swordSlot))
        break
      }
      case 'pearl': {
        const pSlot = (config.slot as string) || '8'
        const pSwordSlot = this.config.misc.swordSlot || '1'
        await this.input.windowKeyTap(0x30 + parseInt(pSlot))
        await this.sleep(60)
        await this.input.mouseClick(2)
        await this.sleep(800)
        await this.input.windowKeyTap(0x30 + parseInt(pSwordSlot))
        break
      }
      case 'potion': {
        const throwDelay = this.resolveVal(config.throwDelay) || 700
        const potSwordSlot = this.config.misc.swordSlot || '1'
        if (this.currentPotSlot < this.config.potions.lowestSlot) this.currentPotSlot = this.config.potions.lowestSlot
        if (this.currentPotSlot > this.config.potions.highestSlot) { console.log('[macro/pot] none left'); return }
        await this.input.windowKeyTap(0x30 + this.currentPotSlot)
        await this.sleep(throwDelay)
        await this.input.mouseClick(2)
        await this.sleep(600)
        await this.input.windowKeyTap(0x30 + parseInt(potSwordSlot))
        this.currentPotSlot++
        break
      }
      case 'condition': {
        const condType = config.type as string
        const condVk = this.resolveVal(config.vk) || 0
        if (condType === 'key_held') {
          if (!await this.input.isKeyDown(condVk)) throw new Error('condition: key not held')
        } else if (condType === 'key_not_held') {
          if (await this.input.isKeyDown(condVk)) throw new Error('condition: key held')
        } else if (condType === 'chance') {
          const chance = this.resolveVal(config.chance) || 50
          if (Math.random() * 100 > chance) throw new Error('condition: chance failed')
        } else if (condType === 'mouse_held') {
          const btn = this.resolveVal(config.button) || 1
          if (!await this.input.isKeyDown(btn === 1 ? 0x01 : 0x02)) throw new Error('condition: mouse not held')
        }
        break
      }
      case 'var_set': {
        const name = config.name as string
        const mode = (config.mode as string) || 'random'
        let val: number
        if (mode === 'plain') {
          val = (config.value as number) || 0
        } else {
          const rawMin = config.min as string
          const rawMax = config.max as string
          const min = this.resolveVal(rawMin) || 0
          const max = this.resolveVal(rawMax) || 1
          const fix = config.fix as number | undefined
          if (config.type === 'int') {
            val = Math.floor(Math.random() * (max - min + 1)) + min
          } else {
            val = Math.random() * (max - min) + min
            if (fix !== undefined) val = parseFloat(val.toFixed(fix))
          }
        }
        this.scriptVars[name] = val
        console.log(`[exec] var_set ${name}=${val} (mode=${mode} min=${config.min} max=${config.max} scriptKeys=[${Object.keys(this.scriptVars).join(',')}])`)
        break
      }
      case 'var_assign': {
        const vName = config.name as string
        const rawExpr = (config.expr as string) || ''
        const val = this.evalExpr(rawExpr)
        console.log(`[exec] ${vName} = ${rawExpr} → ${val}`)
        this.scriptVars[vName] = val
        break
      }
      case 'var_set_str': {
        const svName = config.name as string
        const svVal = (config.value as string) || ''
        this.scriptStrVars[svName] = svVal
        console.log(`[exec] ${svName}: str = "${svVal}"`)
        break
      }
      case 'loop': {
        const count = this.resolveVal(config.count) || 3
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
        const kvMatch = condition.match(/^key_held\s*\(\s*(.+)\s*\)$/i)
        if (kvMatch) {
          const vk = this.resolveVal(kvMatch[1].startsWith('\'') ? kvMatch[1] : (isNaN(parseInt(kvMatch[1])) ? `'${kvMatch[1]}'` : kvMatch[1]))
          pass = vk ? await this.input.isKeyDown(vk) : false
        }
        const knMatch = condition.match(/^key_not_held\s*\(\s*(.+)\s*\)$/i)
        if (knMatch) {
          const vk = this.resolveVal(knMatch[1].startsWith('\'') ? knMatch[1] : (isNaN(parseInt(knMatch[1])) ? `'${knMatch[1]}'` : knMatch[1]))
          pass = vk ? !await this.input.isKeyDown(vk) : false
        }
        const chanceMatch = condition.match(/^chance\s*\(\s*(\d+)\s*\)$/i)
        if (chanceMatch) pass = Math.random() * 100 < parseInt(chanceMatch[1])
        const mhMatch = condition.match(/^mouse_held\s*\(\s*(.+)\s*\)$/i)
        if (mhMatch) {
          const btn = this.resolveVal(mhMatch[1]) || 1
          pass = await this.input.isKeyDown(btn === 1 ? 0x01 : 0x02)
        }
        if (/^focused$/i.test(condition)) pass = this.isGameFocused()
        if (/^clicking_left$/i.test(condition)) pass = this.config.left.enabled
        if (/^clicking_right$/i.test(condition)) pass = this.config.right.enabled
        const varCond = condition.match(/^\$(_[a-zA-Z_]\w*)$/)
        if (varCond) pass = (this.scriptVars[varCond[1]] ?? 0) !== 0
        if (pass) { for (const a of body) await this.execAction(a) }
        break
      }
      case 'mouse_relative_move': {
        const dx = this.resolveVal(config.dx) || 0
        const dy = this.resolveVal(config.dy) || 0
        console.log(`[exec] mouse_move(${dx}, ${dy}) from dx=${JSON.stringify(config.dx)} dy=${JSON.stringify(config.dy)}`)
        await this.input.mouseRelativeMove(dx, dy)
        break
      }
      case 'script': {
        const code = (config.code as string) || ''
        console.log(`[script] parsing: "${code.split('\n')[0]}"`)
        const savedVars = { ...this.scriptVars }
        const savedStrVars = { ...this.scriptStrVars }
        const parsed = this.parseScript(code)
        console.log(`[script] parsed ${parsed.length} actions`)
        for (const a of parsed) {
          console.log(`[script] -> ${a.type}${a.type === 'var_set' ? ' name='+a.config.name : ''}${a.type === 'delay' ? ' ms='+a.config.ms : ''}${a.type === 'mouse_relative_move' ? ' dx='+a.config.dx : ''}`)
          await this.execAction(a)
        }
        this.scriptVars = savedVars
        this.scriptStrVars = savedStrVars
        break
      }
      case 'overlay_text': {
        const expr = (config.expr as string) || ''
        // Evaluate expression: split by +, resolve each part
        const resolved = expr.split('+').map(p => p.trim()).map(p => {
          if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'")))
            return p.slice(1, -1)
          const m = p.match(/^\$_([a-zA-Z_]\w*)$/)
          if (m) {
            const name = m[1]
            if (name in this.scriptStrVars) return this.scriptStrVars[name]
            const v = this.scriptVars[name]
            return v !== undefined ? String(v) : ''
          }
          return p
        }).join('')
        if (resolved) this.moduleOverlayText.push({ t: 'text', v: resolved })
        break
      }
      case 'overlay_bar': {
        const raw = this.resolveVal(config.value as string || config.value as number) || 0
        const max = this.resolveVal(config.max as string || config.max as number) || 1
        const len = this.resolveVal(config.len as string || config.len as number) || 10
        const pct = Math.min(raw / max, 1)
        const filled = Math.round(pct * len)
        this.moduleOverlayText.push({ t: 'bar', v: pct, l: len, filled })
        break
      }
      case 'overlay_clear': {
        this.moduleOverlayText = []
        break
      }
      case 'overlay_dot': {
        const label = (config.label as string) || ''
        const raw = (config.brightness as string) || '100'
        const brightness = this.evalExpr(raw)
        const pct = Math.min(Math.max(brightness, 0), 100) / 100
        console.log(`[exec] overlay_dot("${label}", ${raw}) → ${brightness} → pct=${pct}`)
        this.moduleOverlayText.push({ t: 'dot', v: label, pct })
        break
      }
      case 'overlay_entry': {
        const eLabelRaw = (config.label as string) || ''
        const eRaw = (config.active as string) || '0'
        const eSideRaw = (config.side as string) || 'left'
        const eLabel = this.resolveStrVal(eLabelRaw)
        const eActive = this.evalExpr(eRaw)
        let eSide = 'left'
        const sideResolved = this.resolveStrVal(eSideRaw)
        if (sideResolved === 'left' || sideResolved === 'right') {
          eSide = sideResolved
        } else {
          eSide = this.evalExpr(eSideRaw) > 0 ? 'right' : 'left'
        }
        this.moduleOverlayText.push({ t: 'entry', v: eLabel, a: eActive > 0, side: eSide })
        break
      }
      case 'overlay_request_hide': {
        const hideSide = (config.side as string) || 'left'
        this.overlayHideSides.add(hideSide)
        break
      }
    }
  }

  private async toggleModule(index: number): Promise<void> {
    const key = `module_${index}`
    const macro = this.config.macros.list[index]
    if (!macro) { console.log(`[module] no macro at index ${index}`); return }

    // Check ALL actions for $fullscript
    let foundFullscript = false
    for (const step of macro.steps) {
      for (const action of step.actions) {
        const code = (action.config.code as string) || ''
        if (code.trimStart().startsWith('$fullscript')) { foundFullscript = true; break }
      }
      if (foundFullscript) break
    }
    if (!foundFullscript) { console.log(`[module] "${macro.name}" has no $fullscript action`); return }

    if (this.moduleEnabled[key]) {
      this.moduleEnabled[key] = false
      this.moduleOverlayText = []
      this.overlayHideSides.clear()
      this.pushOverlay()
      console.log(`[module] "${macro.name}" disabled`)
      return
    }

    // Find and parse the $fullscript action
    for (const step of macro.steps) {
      for (const action of step.actions) {
        if (action.type === 'script') {
          const code = (action.config.code as string) || ''
          if (code.trimStart().startsWith('$fullscript')) {
            const body = code.replace(/^\$fullscript\s*\r?\n/i, '')
            this.modules[key] = this.parseScript(body)
            this.moduleEnabled[key] = true
            console.log(`[module] "${macro.name}" enabled`)
            this.runModule(key).catch(() => {})
            return
          }
        }
      }
    }
  }

  private async runModule(key: string): Promise<void> {
    const actions = this.modules[key]
    if (!actions) return
    while (this.moduleEnabled[key]) {
      // Module MUST call overlay_clear as its first action if it wants to
      // replace overlay content.  We no longer nuke moduleOverlayText here
      // so there's no frame where the overlay polls an empty array.
      for (const a of actions) {
        if (!this.moduleEnabled[key]) break
        await this.execAction(a)
      }
      this.pushOverlay()
      if (!this.moduleEnabled[key]) break
    }
  }

  private async runMacroAction(macro: Macro, index: number): Promise<void> {
    if (macro.loop) {
      const key = `macro_${index}`
      if (this.macroLoopActive[key]) {
        // Toggle off
        this.macroLoopActive[key] = false
        this.macroLoopAbort[key] = true
        console.log(`[macro] "${macro.name}" loop stopped`)
      } else {
        // Toggle on and start looping
        this.macroLoopActive[key] = true
        this.macroLoopAbort[key] = false
        console.log(`[macro] "${macro.name}" loop started`)
        this.runMacroLoop(macro, key).catch(() => {})
      }
    } else {
      await this.runMacro(macro)
    }
  }

  private async runMacroLoop(macro: Macro, key: string): Promise<void> {
    while (this.macroLoopActive[key]) {
      this.moduleOverlayText = []
      this.macroLoopAbort[key] = false
      await this.runMacro(macro)
      this.pushOverlay()
      if (this.macroLoopAbort[key]) break
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

  emitUpdate(): void {
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
