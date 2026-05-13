import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const LOG_DIR = path.join(os.homedir(), 'soda', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'logs.txt')

let stream: fs.WriteStream | null = null
let rendererEnabled = false

function getStream(): fs.WriteStream {
  if (!stream) {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    stream = fs.createWriteStream(LOG_FILE, { flags: 'a' })
  }
  return stream
}

function formatArgs(args: unknown[]): string {
  return args.map(a => {
    try {
      return typeof a === 'string' ? a : JSON.stringify(a)
    } catch {
      return String(a)
    }
  }).join(' ')
}

function write(level: string, msg: string): void {
  const ts = new Date().toISOString()
  try {
    getStream().write(`[${ts}] [${level}] ${msg}\n`)
  } catch {}
}

function patchConsole(): void {
  const origLog = console.log
  console.log = (...args) => { origLog.apply(console, args); write('LOG', formatArgs(args)) }

  const origWarn = console.warn
  console.warn = (...args) => { origWarn.apply(console, args); write('WARN', formatArgs(args)) }

  const origError = console.error
  console.error = (...args) => { origError.apply(console, args); write('ERROR', formatArgs(args)) }
}

export function enable(): void {
  write('INFO', '--- Session Start ---')
  patchConsole()
}

export function toggleRenderer(): boolean {
  rendererEnabled = !rendererEnabled
  write('INFO', `Renderer logging ${rendererEnabled ? 'enabled' : 'disabled'}`)
  return rendererEnabled
}

export function isRendererEnabled(): boolean { return rendererEnabled }

export function fromRenderer(level: string, ...args: unknown[]): void {
  if (!rendererEnabled) return
  write('RENDERER/' + level.toUpperCase(), formatArgs(args))
}
