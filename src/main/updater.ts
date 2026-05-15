import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { app } from 'electron'

const UPDATE_URL = 'https://clicks.roraaaa.dev/api/update'
const CURRENT_VERSION = app.getVersion()

export interface UpdateInfo {
  version: string | null
  downloadUrl: string | null
  notes: string | null
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(UPDATE_URL, { method: 'GET' })
    if (!res.ok) return null
    const data: UpdateInfo = await res.json()
    if (!data.version || data.version === CURRENT_VERSION) return null
    return data
  } catch {
    return null
  }
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION
}

export async function downloadAndInstall(
  downloadUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const tmpDir = app.getPath('temp')
  const fileName = downloadUrl.split('/').pop() || 'soda-update.exe'
  const destPath = path.join(tmpDir, fileName)

  const res = await fetch(downloadUrl)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)

  const total = parseInt(res.headers.get('content-length') || '0')
  const reader = res.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (total && onProgress) {
      onProgress(Math.round((received / total) * 100))
    }
  }

  const buffer = Buffer.concat(chunks)
  fs.writeFileSync(destPath, buffer)

  if (onProgress) onProgress(100)

  if (process.platform === 'win32') {
    spawn(destPath, [], { detached: true, stdio: 'ignore' }).unref()
  } else if (process.platform === 'darwin') {
    spawn('open', [destPath], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [destPath], { detached: true, stdio: 'ignore' }).unref()
  }

  app.quit()
}
