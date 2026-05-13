import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as readline from 'readline'
import { app, dialog } from 'electron'

export class InputHelper {
  private proc: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private pendingMap = new Map<number, (value: unknown) => void>()
  private cmdId = 0
  started = false
  private installGuideShown = false

  async start(): Promise<void> {
    if (this.started) return

    const isDev = !app.isPackaged
    const projectRoot = isDev
      ? path.join(__dirname, '..', '..')
      : path.dirname(app.getPath('exe'))
    const scriptPath = path.join(projectRoot, 'helpers', 'input_helper.py')
    console.log('InputHelper: scriptPath =', scriptPath, '| dirname =', __dirname)

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
    const isWin = process.platform === 'win32'
    const steps = isWin
      ? [
          'Soda Autoclicker requires Python 3 to handle mouse and keyboard input.',
          '',
          'If Python is already installed, it may not be in your PATH.',
          'Try running "py" or "python" in a Command Prompt to verify.',
          '',
          'To install or fix Python:',
          '1. Download Python from https://www.python.org/downloads/ (Python 3.x)',
          '2. Run the installer',
          '3. CHECK "Add Python to PATH" at the bottom of the installer',
          '4. Click "Install Now" and wait for it to finish',
          '5. Restart Soda Autoclicker',
        ]
      : [
          'Soda Autoclicker requires Python 3 to handle mouse and keyboard input.',
          '',
          'Install Python 3 using your package manager:',
          '   Ubuntu/Debian: sudo apt install python3',
          '   Fedora: sudo dnf install python3',
          '   macOS: brew install python3',
          '',
          'Then restart Soda Autoclicker.',
        ]

    let detail = steps.join('\n')
    if (errors && errors.length > 0) {
      detail += '\n\n--- Diagnostics ---\n' + errors.join('\n')
    }

    dialog.showMessageBox({
      type: 'warning',
      title: 'Python Not Found',
      message: 'Soda Autoclicker requires Python 3 to handle mouse and keyboard input.',
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
  async keyDown(vk: number) { await this.send({ action: 'key_down', vk }) }
  async keyUp(vk: number) { await this.send({ action: 'key_up', vk }) }
  async cursorShake(force: number) { await this.send({ action: 'cursor_shake', force }) }
  async windowRightClick() { await this.send({ action: 'window_right_click' }) }

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
