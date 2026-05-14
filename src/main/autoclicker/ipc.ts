import { ipcMain, shell, BrowserWindow } from 'electron'
import { AutoclickerEngine } from './engine'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as logger from '../logger'

const RESOURCE_FOLDER = path.join(os.homedir(), 'soda', 'resource')
const LOG_FOLDER = path.join(os.homedir(), 'soda', 'logs')

// Preset filenames are user-controlled and get concatenated into a path. Lock
// them down to a safe charset so nothing can escape RESOURCE_FOLDER (e.g.
// `../../etc/passwd`).
const SAFE_FILENAME = /^[A-Za-z0-9_-]{1,64}$/

function isSafeFilename(name: unknown): name is string {
  return typeof name === 'string' && SAFE_FILENAME.test(name)
}

export function registerAutoclickerIPC(engine: AutoclickerEngine, settingsWindow?: BrowserWindow | null): void {
  ipcMain.handle('autoclicker:getConfig', () => {
    return engine.getConfig()
  })

  ipcMain.handle('autoclicker:getStatus', () => {
    return {
      focusedProcess: engine.focusedProcess,
      isGameFocused: engine.isGameFocused(),
      leftEnabled: engine.config.left.enabled,
      rightEnabled: engine.config.right.enabled,
      leftCPS: engine.config.left.averageCPS,
      rightCPS: engine.config.right.averageCPS,
      blatantLeft: engine.config.left.blatant,
      blatantRight: engine.config.right.blatant,
      hasBlockHit: engine.config.left.blockHit,
      hasSmartBH: engine.config.left.smartBH !== 0,
      hasShake: engine.config.left.shakeEffect,
      autoRod: engine.config.left.AutoRod,
      recorder: engine.config.recorder.enabled,
      discord: engine.config.misc.discordRichPresence,
      overlayPosition: engine.config.misc.overlayPosition,
      overlayLayout: engine.config.misc.overlayLayout,
      overlayEnabled: engine.config.overlay.enabled,
    }
  })

  ipcMain.handle('autoclicker:updateConfig', (_e, args: { path: string[]; value: unknown }) => {
    engine.updateConfig(args.path, args.value)
    if (args.path.length === 2 && args.path[0] === 'misc' && args.path[1] === 'windowName') {
      settingsWindow?.setTitle(String(args.value))
    }
    return true
  })

  ipcMain.handle('autoclicker:saveConfig', () => {
    engine.saveConfig()
    return true
  })

  ipcMain.handle('autoclicker:loadConfig', () => {
    engine.loadConfig()
    return true
  })

  ipcMain.handle('autoclicker:doRod', () => {
    engine.doRod()
    return true
  })

  ipcMain.handle('autoclicker:doPearl', () => {
    engine.doPearl()
    return true
  })

  ipcMain.handle('autoclicker:doPotion', () => {
    engine.doPotion()
    return true
  })

  ipcMain.handle('autoclicker:getConfigs', () => {
    const configs: { filename: string; displayName: string; Author: string; description: string }[] = []
    try {
      if (!fs.existsSync(RESOURCE_FOLDER)) return configs
      for (const filename of fs.readdirSync(RESOURCE_FOLDER)) {
        if (!filename.endsWith('.json')) continue
        try {
          const data = JSON.parse(fs.readFileSync(path.join(RESOURCE_FOLDER, filename), 'utf-8'))
          configs.push({
            filename: filename.replace('.json', ''),
            displayName: data.displayName || filename,
            Author: data.Author || 'Unknown',
            description: data.description || '',
          })
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return configs
  })

  ipcMain.handle('autoclicker:loadPreset', (_e, filename: string) => {
    try {
      if (!isSafeFilename(filename)) return false
      const filepath = path.join(RESOURCE_FOLDER, `${filename}.json`)
      if (!fs.existsSync(filepath)) return false
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
      // Deep merge per section so a preset that only customises e.g. `left`
      // doesn't blow away everything else.
      engine.applyPreset(data)
      engine.saveConfig()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('autoclicker:savePreset', (_e, args: { filename: string; displayName: string; Author: string; description: string }) => {
    try {
      if (!isSafeFilename(args?.filename)) return false
      if (!fs.existsSync(RESOURCE_FOLDER)) fs.mkdirSync(RESOURCE_FOLDER, { recursive: true })
      const cfg = engine.getConfig()
      cfg.filename = args.filename
      cfg.displayName = args.displayName
      cfg.Author = args.Author
      cfg.description = args.description
      fs.writeFileSync(path.join(RESOURCE_FOLDER, `${args.filename}.json`), JSON.stringify(cfg, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('autoclicker:openResourceFolder', () => {
    try {
      if (!fs.existsSync(RESOURCE_FOLDER)) fs.mkdirSync(RESOURCE_FOLDER, { recursive: true })
      shell.openPath(RESOURCE_FOLDER)
    } catch { /* skip */ }
    return true
  })

  ipcMain.handle('debug:openLogs', () => {
    try {
      if (!fs.existsSync(LOG_FOLDER)) fs.mkdirSync(LOG_FOLDER, { recursive: true })
      shell.openPath(LOG_FOLDER)
    } catch { /* skip */ }
    return true
  })

  ipcMain.handle('debug:toggle', () => logger.toggleRenderer())

  ipcMain.handle('debug:status', () => logger.isRendererEnabled())

  ipcMain.on('debug:log', (_e, level: string, ...args: unknown[]) => {
    logger.fromRenderer(level, ...args)
  })
}
