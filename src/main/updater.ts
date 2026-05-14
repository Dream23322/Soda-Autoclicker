import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { spawn } from 'child_process'
import { app } from 'electron'
import { getServerUrl } from './cloud-sync'

const CURRENT_VERSION = app.getVersion()

interface UpdateInfo {
  version: string | null
  downloadUrl: string | null
  notes: string | null
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const base = getServerUrl()
    const res = await fetch(`${base}/api/update`, { method: 'GET' })
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

export async function downloadAndInstall(downloadUrl: string): Promise<void> {
  const tmpDir = app.getPath('temp')
  const fileName = downloadUrl.split('/').pop() || 'soda-update.exe'
  const destPath = path.join(tmpDir, fileName)

  // Download the installer
  const res = await fetch(downloadUrl)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)

  // Spawn the installer and quit
  if (process.platform === 'win32') {
    spawn(destPath, [], {
      detached: true,
      stdio: 'ignore',
    }).unref()
  } else if (process.platform === 'darwin') {
    spawn('open', [destPath], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [destPath], { detached: true, stdio: 'ignore' }).unref()
  }

  app.quit()
}
