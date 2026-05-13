import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as readline from 'readline'
import { app } from 'electron'

export class InputHelper {
  private proc: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private pendingMap = new Map<number, (value: unknown) => void>()
  private cmdId = 0
  started = false

  async start(): Promise<void> {
    if (this.started) return

    const isDev = !app.isPackaged
    const projectRoot = isDev
      ? path.join(__dirname, '..', '..')
      : path.dirname(app.getPath('exe'))
    const scriptPath = path.join(projectRoot, 'helpers', 'input_helper.py')
    console.log('InputHelper: scriptPath =', scriptPath, '| dirname =', __dirname)

    const pythonExe = 'python'

    this.proc = spawn(pythonExe, ['-u', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

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
  async keyDown(vk: number) { await this.send({ action: 'key_down', vk }) }
  async keyUp(vk: number) { await this.send({ action: 'key_up', vk }) }
  async cursorShake(force: number) { await this.send({ action: 'cursor_shake', force }) }

  async isKeyDown(vk: number): Promise<boolean> {
    const r = await this.send({ action: 'get_key_state', vk }, true) as any
    return r?.ok ? !!r.held : false
  }

  async getForegroundProcess(): Promise<string> {
    const r = await this.send({ action: 'get_foreground_process' }, true) as any
    return r?.ok && r.process_name ? r.process_name : ''
  }

  async getCursorHandle(): Promise<number> {
    const r = await this.send({ action: 'get_cursor_info' }, true) as any
    return r?.ok ? (r.cursor_handle ?? 0) : 0
  }
}
