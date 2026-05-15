import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as readline from 'readline'
import { app, dialog } from 'electron'

export class InputHelper {
  private proc: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private pendingMap = new Map<number, (value: unknown) => void>()
  private cmdId = 0
  started = false
  private installGuideShown = false
  // One-shot warning when the bundled helper is older than the engine and
  // doesn't recognise the batched get_key_states action. We fall back to
  // per-vk isKeyDown so the user isn't dead in the water, but they should
  // rebuild the helper to drop the extra round-trips.
  private warnedStaleBatch = false

  async start(): Promise<void> {
    // Kill any stale helper from a previous run to prevent orphan processes.
    this.stop()
    try { spawn('taskkill', ['/f', '/im', 'input_helper.exe'], { windowsHide: true }).unref() } catch {}
    if (this.started) return

    const isDev = !app.isPackaged
    const helpersDir = isDev
      ? path.join(__dirname, '..', '..', 'helpers')
      : path.join(process.resourcesPath, 'helpers')
    const exePath = path.join(helpersDir, 'input_helper.exe')
    const scriptPath = path.join(helpersDir, 'input_helper.py')

    // Try the bundled .exe first, then fall back to running the .py via Python
    if (fs.existsSync(exePath)) {
      console.log('InputHelper: spawning bundled exe at', exePath)
      try {
        this.proc = spawn(exePath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
        let stderrBuf = ''
        this.proc.stderr?.on('data', (d: Buffer) => { stderrBuf += d.toString() })
        await new Promise<void>((resolve, reject) => {
          const onError = (err: Error) => { cleanup(); reject(err) }
          const onExit = (code: number | null) => {
            if (code !== null) { cleanup(); reject(new Error(`exited with code ${code} — stderr: ${stderrBuf.trim()}`)) }
          }
          const cleanup = () => {
            this.proc?.off('error', onError)
            this.proc?.off('exit', onExit)
          }
          this.proc!.once('error', onError)
          this.proc!.once('exit', onExit)
          setTimeout(() => { cleanup(); resolve() }, 300)
        })
      } catch (err) {
        console.error(`InputHelper: bundled exe failed — ${err instanceof Error ? err.message : String(err)}`)
        this.proc?.kill()
        this.proc = null
      }
    }

    if (!this.proc) {
      console.log('InputHelper: no bundled exe, trying python at', scriptPath)
      const pythonExes = process.platform === 'win32'
        ? ['py', 'python', 'python3']
        : ['python3', 'python']

      const errors: string[] = []

      for (const pythonExe of pythonExes) {
        let stderrBuf = ''
        try {
          this.proc = spawn(pythonExe, ['-u', scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
          })
          this.proc.stderr?.on('data', (d: Buffer) => { stderrBuf += d.toString() })
          await new Promise<void>((resolve, reject) => {
            const onError = (err: Error) => { cleanup(); reject(err) }
            const onExit = (code: number | null) => {
              if (code !== null) { cleanup(); reject(new Error(`exited with code ${code}`)) }
            }
            const cleanup = () => {
              this.proc?.off('error', onError)
              this.proc?.off('exit', onExit)
            }
            this.proc!.once('error', onError)
            this.proc!.once('exit', onExit)
            setTimeout(() => { cleanup(); resolve() }, 300)
          })
          break
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const stderr = stderrBuf.trim()
          const detail = stderr ? `${msg} — stderr: ${stderr}` : msg
          errors.push(`  ${pythonExe}: ${detail}`)
          console.error(`InputHelper: ${pythonExe} failed — ${detail}`)
          this.proc?.kill()
          this.proc = null
          if (pythonExe === pythonExes[pythonExes.length - 1]) {
            if (!this.installGuideShown) {
              this.installGuideShown = true
              this.showInstallGuide(errors)
            }
          }
        }
      }
    }

    if (!this.proc) return

    this.proc.stderr?.on('data', (d: Buffer) => console.error('InputHelper stderr:', d.toString().trim()))
    this.proc.on('error', (err) => console.error('InputHelper: spawn error:', err.message))
    this.proc.on('exit', (code) => {
      console.log('InputHelper: Python exited with code', code)
      this.started = false
      this.proc = null
    })

    this.rl = readline.createInterface({ input: this.proc.stdout!, crlfDelay: Infinity })
    this.rl.on('line', (line: string) => {
      try {
        const result = JSON.parse(line.trim())
        const id = result.id
        if (id !== undefined && this.pendingMap.has(id)) {
          const resolve = this.pendingMap.get(id)!
          this.pendingMap.delete(id)
          resolve(result)
        }
      } catch {}
    })

    await new Promise<void>((r) => setTimeout(r, 800))

    if (this.proc && this.proc.exitCode === null && !this.proc.killed) {
      this.started = true
      console.log('InputHelper: started successfully')
    } else {
      console.error('InputHelper: failed to start')
    }
  }

  stop(): void {
    this.proc?.kill()
    this.proc = null
    this.rl?.close()
    this.rl = null
    this.started = false
  }

  private showInstallGuide(errors?: string[]): void {
    let detail = 'The input helper executable could not start.\n'

    if (app.isPackaged) {
      detail +=
        'This usually means your antivirus quarantined the file or the installation is corrupted.\n' +
        'Try reinstalling Soda Autoclicker, and make sure your antivirus allows it.'
    }

    if (errors && errors.length > 0) {
      detail += '\n\n--- Diagnostics ---\n' + errors.join('\n')
    }

    dialog.showMessageBox({
      type: 'warning',
      title: 'Input Helper Failed',
      message: 'Soda Autoclicker could not start its input helper.',
      detail,
    })
  }

  private async send(cmd: Record<string, unknown>, needsResponse = false): Promise<unknown> {
    if (!this.proc || !this.proc.stdin || !this.started) {
      return { ok: false, error: 'not started' }
    }

    if (!needsResponse) {
      try { this.proc.stdin.write(JSON.stringify(cmd) + '\n') }
      catch { this.started = false }
      return { ok: true }
    }

    return new Promise((resolve) => {
      this.cmdId++
      const id = this.cmdId
      cmd.id = id
      this.pendingMap.set(id, resolve)

      try { this.proc!.stdin!.write(JSON.stringify(cmd) + '\n') }
      catch (err) {
        this.pendingMap.delete(id)
        this.started = false
        resolve({ ok: false, error: String(err) })
        return
      }

      setTimeout(() => {
        if (this.pendingMap.has(id)) {
          this.pendingMap.delete(id)
          resolve({ ok: false, error: 'timeout' })
        }
      }, 3000)
    })
  }

  async mouseClick(b: number) { await this.send({ action: 'mouse_click', button: b }) }
  async mouseDown(b: number) { await this.send({ action: 'mouse_down', button: b }) }
  async mouseUp(b: number) { await this.send({ action: 'mouse_up', button: b }) }
  async keyTap(vk: number) { await this.send({ action: 'key_tap', vk }) }
  async windowKeyTap(vk: number) { await this.send({ action: 'window_key_tap', vk }) }
  async keyDown(vk: number) { await this.send({ action: 'key_down', vk }) }
  async keyUp(vk: number) { await this.send({ action: 'key_up', vk }) }
  async cursorShake(force: number) { await this.send({ action: 'cursor_shake', force }) }
  async windowRightClick() { await this.send({ action: 'window_right_click' }) }

  async isKeyDown(vk: number): Promise<boolean> {
    const r = await this.send({ action: 'get_key_state', vk }, true) as any
    return r?.ok ? !!r.held : false
  }

  /**
   * Batched: query several VKs in a single round-trip. Returns parallel boolean array.
   * If the helper is too old to recognise the action (stale bundled .exe), falls back
   * to per-vk isKeyDown so binds keep working until it's rebuilt.
   */
  async getKeyStates(vks: number[]): Promise<boolean[]> {
    if (vks.length === 0) return []
    const r = await this.send({ action: 'get_key_states', vks }, true) as any
    if (r?.ok && Array.isArray(r.held)) return r.held.map((v: unknown) => !!v)
    if (!this.warnedStaleBatch) {
      this.warnedStaleBatch = true
      console.warn('InputHelper: batched get_key_states unavailable (stale helper exe?). Falling back to per-vk isKeyDown. Rebuild with `npm run build:win` to drop the fallback.')
    }
    return Promise.all(vks.map(vk => this.isKeyDown(vk)))
  }

  async getForegroundProcess(): Promise<string> {
    const r = await this.send({ action: 'get_foreground_process' }, true) as any
    return r?.ok && r.process_name ? r.process_name : ''
  }

  async getCursorHandle(): Promise<number> {
    const r = await this.send({ action: 'get_cursor_info' }, true) as any
    return r?.ok ? (r.cursor_handle ?? 0) : 0
  }

  async mouseRelativeMove(dx: number, dy: number): Promise<void> {
    await this.send({ action: 'mouse_relative_move', dx, dy })
  }

  /** Batched: process name + cursor info in one round-trip. */
  async getWindowInfo(): Promise<{ processName: string; cursorHandle: number; cursorVisible: boolean }> {
    const r = await this.send({ action: 'get_window_info' }, true) as any
    if (!r?.ok) return { processName: '', cursorHandle: 0, cursorVisible: false }
    return {
      processName: r.process_name ?? '',
      cursorHandle: r.cursor_handle ?? 0,
      cursorVisible: !!r.cursor_visible,
    }
  }
}
