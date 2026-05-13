import { ipcMain } from 'electron'
import { AutoclickerEngine } from './engine'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const RESOURCE_FOLDER = path.join(os.homedir(), 'soda', 'resource')

export function registerAutoclickerIPC(engine: AutoclickerEngine): void {
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
      const filepath = path.join(RESOURCE_FOLDER, `${filename}.json`)
      if (!fs.existsSync(filepath)) return false
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
      Object.assign(engine.config, data)
      engine.saveConfig()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('autoclicker:savePreset', (_e, args: { filename: string; displayName: string; Author: string; description: string }) => {
    try {
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
      const { shell } = require('electron')
      shell.openPath(RESOURCE_FOLDER)
    } catch { /* skip */ }
    return true
  })
}
