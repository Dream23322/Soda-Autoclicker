import { AutoclickerConfig, DEFAULT_CONFIG } from './types'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { InputHelper } from './input-helper'
import { app } from 'electron'

const CONFIG_PATH = path.join(os.homedir(), 'soda', 'config.json')
const USER_RESOURCE = path.join(os.homedir(), 'soda', 'resource')
const PANIC_VK = 0x1B
const POLL_INTERVAL = 50
const VK_LMB = 0x01
const VK_RMB = 0x02

export type ConfigUpdateCallback = (config: AutoclickerConfig) => void

export class AutoclickerEngine {
  config: AutoclickerConfig = { ...DEFAULT_CONFIG }
  private running = false
  private input = new InputHelper()

  private prevBindStates: Record<number, boolean> = {}

  private lastBlockHitTime = 0
  private betterInputTimestamp = 0
  private strafeState = { a: false, d: false }
  private movementState = { w: false, a: false, s: false, d: false, jump: 0 }
  private recordCycleIndex = 0
  focusedProcess = ''
  private cursorHandle = 0
  private smartBHActive = false
  private currentPotSlot = 0

  private windowInterval: ReturnType<typeof setInterval> | null = null
  private bindPollInterval: ReturnType<typeof setInterval> | null = null

  onConfigUpdate: ConfigUpdateCallback | null = null

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
    this.input.stop()
  }

  // ── Bind polling ──

  private startBindPollLoop(): void {
    this.bindPollInterval = setInterval(async () => {
      if (!this.input.started) {
        try { await this.input.start() } catch {}
        return
      }

      const gameOk = this.isGameFocused() || this.focusedProcess === ''
      const menuOk = !this.cursorIsInMenu()
      const inputOk = gameOk && menuOk

      const checks: { vk: number; action: () => void }[] = [
        { vk: this.config.left.bind, action: () => this.toggleLeft() },
        { vk: this.config.right.bind, action: () => this.toggleRight() },
        { vk: PANIC_VK, action: () => this.panic() },
        { vk: inputOk ? this.config.misc.rodBind : 0, action: () => this.doRod() },
        { vk: inputOk ? this.config.misc.pearlBind : 0, action: () => this.doPearl() },
        { vk: inputOk ? this.config.potions.potBind : 0, action: () => this.doPotion() },
        { vk: this.config.potions.potResetBind, action: () => { this.currentPotSlot = this.config.potions.lowestSlot } },
      ]

      for (const { vk, action } of checks) {
        if (!vk) continue
        try {
          const held = await this.input.isKeyDown(vk)
          const prev = this.prevBindStates[vk] ?? false
          this.prevBindStates[vk] = held
          if (held && !prev) action()
        } catch {}
      }
    }, POLL_INTERVAL)
  }

  private toggleLeft(): void {
    if (this.config.left.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) return
    if (!this.config.left.workInMenus && this.cursorIsInMenu()) return
    this.config.left.enabled = !this.config.left.enabled
    console.log(`[clicker] left ${this.config.left.enabled ? 'ENABLED' : 'DISABLED'}`)
    this.emitUpdate()
  }

  private toggleRight(): void {
    if (this.config.right.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) return
    if (!this.config.right.workInMenus && this.cursorIsInMenu()) return
    this.config.right.enabled = !this.config.right.enabled
    console.log(`[clicker] right ${this.config.right.enabled ? 'ENABLED' : 'DISABLED'}`)
    this.emitUpdate()
  }

  private panic(): void {
    const was = this.config.left.enabled || this.config.right.enabled
    if (was) {
      this.config.left.enabled = false
      this.config.right.enabled = false
      console.log('[clicker] PANIC — all disabled')
      this.emitUpdate()
    }
  }

  isGameFocused(): boolean {
    return this.focusedProcess.toLowerCase().includes('java') ||
           this.focusedProcess.toLowerCase().includes('az-launcher')
  }

  private isFocused(section: string): boolean {
    const cfg = section === 'left' ? this.config.left : this.config.right
    if (cfg.onlyWhenFocused && !this.isGameFocused()) return false
    return true
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
          : this.calculateDelay(cfg.averageCPS, cfg.blatant)

        if (!cfg.enabled || this.smartBHActive) { await this.sleep(delay); continue }

        if (cfg.mode === 'Hold') {
          const lmb = await this.input.isKeyDown(VK_LMB)
          if (!lmb) { await this.sleep(5); continue }
        }

        if (cfg.RMBLock && await this.input.isKeyDown(VK_RMB)) { console.log('[L] blocked by RMBLock'); await this.sleep(10); continue }
        if (cfg.onlyWhenFocused && this.focusedProcess && !this.isGameFocused()) { await this.sleep(50); continue }
        if (!cfg.workInMenus && this.cursorIsInMenu()) { await this.sleep(50); continue }

        console.log('[L] pass all checks -> click')
        const breakMode = cfg.breakBlocks
        const shift = (breakMode === 'Shift No Click' || breakMode === 'Shift With Click') ? await this.input.isKeyDown(0x10) : false

        if (breakMode === 'Shift No Click' && shift) { await this.sleep(delay); continue }
        if (breakMode === 'Shift With Click' && shift) {
          await this.input.mouseDown(1); console.log('[L] mouseDown Shift')
        } else if (breakMode === 'Full') {
          await this.input.mouseDown(1); console.log('[L] mouseDown Full')
        } else {
          console.log('[L] calling mouseClick(1)...')
          await this.input.mouseClick(1)
          console.log('[L] mouseClick(1) returned OK')
        }

        if (cfg.blockHit) {
          const lmb = await this.input.isKeyDown(VK_LMB)
          if (lmb && Math.random() <= cfg.blockHitChance / 100 && Date.now() - this.lastBlockHitTime >= 500) {
            this.lastBlockHitTime = Date.now()
            await this.input.mouseDown(2); await this.sleep(20); await this.input.mouseUp(2)
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
        const delay = this.calculateDelay(cfg.averageCPS, cfg.blatant)

        if (!cfg.enabled || this.smartBHActive) { await this.sleep(delay); continue }

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

        console.log('[R] pass all checks -> click')
        if (cfg.items) {
          await this.input.mouseDown(2); console.log('[R] mouseDown items')
        } else {
          console.log('[R] calling mouseClick(2)...')
          await this.input.mouseClick(2)
          console.log('[R] mouseClick(2) returned OK')
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
        const [proc, cursor] = await Promise.all([
          this.input.getForegroundProcess(),
          this.input.getCursorHandle(),
        ])
        this.focusedProcess = proc
        this.cursorHandle = cursor
      } catch { this.focusedProcess = ''; this.cursorHandle = 0 }
    }, 500)
  }

  private cursorIsInMenu(): boolean { return this.cursorHandle > 50000 && this.cursorHandle < 100000 }

  // ── Movement ──

  private async startWTap(): Promise<void> {
    while (this.running) {
      await this.sleep(10)
      const mv = this.config.movement
      if (!mv.autoWTap || !this.isFocused('left') || !(await this.input.isKeyDown(VK_LMB))) {
        await this.sleep(500); continue
      }
      const w = await this.input.isKeyDown(0x57)
      const a = await this.input.isKeyDown(0x41)
      const d = await this.input.isKeyDown(0x44)
      if (!(a || d) || !w) continue
      if (mv.wTapMode === 'chance' && Math.random() > mv.wTapValue / 100) continue
      await this.input.keyUp(0x57); await this.sleep(50); await this.input.keyDown(0x57)
    }
  }

  private async startAutoSprint(): Promise<void> {
    while (this.running) {
      if (!this.config.movement.autoSprint || !this.isFocused('left')) { await this.sleep(500); continue }
      await this.sleep(50)
      const moving = await this.input.isKeyDown(0x57) || await this.input.isKeyDown(0x41) || await this.input.isKeyDown(0x44)
      const ctrl = await this.input.isKeyDown(0x11)
      if (moving && !ctrl) await this.input.keyDown(0x11)
      else if (!moving && ctrl) await this.input.keyUp(0x11)
    }
  }

  private async startBetterInput(): Promise<void> {
    while (this.running) {
      if (!this.config.movement.betterInput || !this.isFocused('left')) { await this.sleep(100); continue }
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
      if (!this.config.movement.fastStop || !this.isFocused('left')) { await this.sleep(100); continue }
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
        this.config = { ...DEFAULT_CONFIG, ...data }
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

  updateConfig(p: string[], value: unknown): void {
    let t: Record<string, unknown> = this.config as unknown as Record<string, unknown>
    for (let i = 0; i < p.length - 1; i++) t = t[p[i]] as Record<string, unknown>
    t[p[p.length - 1]] = value
    if (this.config.misc.saveSettings) this.saveConfig()
    this.emitUpdate()
  }

  getConfig(): AutoclickerConfig { return this.config }

  private emitUpdate(): void { this.onConfigUpdate?.({ ...this.config }) }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
