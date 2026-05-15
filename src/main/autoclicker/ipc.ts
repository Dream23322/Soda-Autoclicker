import { ipcMain, shell, BrowserWindow } from 'electron'
import { AutoclickerEngine } from './engine'
import * as path from 'path'
import { checkForUpdate, downloadAndInstall, getCurrentVersion } from '../updater'
import * as fs from 'fs'
import * as os from 'os'
import * as logger from '../logger'
import * as cloud from '../cloud-sync'

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
    const configs: { filename: string; displayName: string; Author: string; description: string; builtin?: boolean }[] = []
    try {
      if (!fs.existsSync(RESOURCE_FOLDER)) return configs
      for (const filename of fs.readdirSync(RESOURCE_FOLDER)) {
        if (!filename.endsWith('.json')) continue
        try {
          const fname = filename.replace('.json', '')
          const data = JSON.parse(fs.readFileSync(path.join(RESOURCE_FOLDER, filename), 'utf-8'))
          configs.push({
            filename: fname,
            displayName: data.displayName || fname,
            Author: data.Author || 'Unknown',
            description: data.description || '',
            builtin: BUNDLED_PRESETS.has(fname) || data.Author === '4urxra',
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
      // Strip ephemeral `enabled` flags so loading a preset never silently
      // turns the clicker on. The user explicitly toggles after load.
      stripEphemeralFlags(data)
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
      // Deep clone so we never mutate the live config.
      const cfg = JSON.parse(JSON.stringify(engine.getConfig()))
      // Don't bake `enabled: true` into a shared preset — otherwise loading
      // it would auto-start the clicker on whoever imports it.
      stripEphemeralFlags(cfg)
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

  const BUNDLED_PRESETS = new Set(['hypixelbw', 'hypixelbridge', 'hypixelduels', 'hypixelskywars', 'maxed', 'mmc'])

  ipcMain.handle('autoclicker:getConfigData', (_e, filename: string) => {
    try {
      if (!isSafeFilename(filename)) return null
      const filepath = path.join(RESOURCE_FOLDER, `${filename}.json`)
      if (!fs.existsSync(filepath)) return null
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    } catch { return null }
  })

  ipcMain.handle('autoclicker:openResourceFolder', () => {
    try {
      if (!fs.existsSync(RESOURCE_FOLDER)) fs.mkdirSync(RESOURCE_FOLDER, { recursive: true })
      shell.openPath(RESOURCE_FOLDER)
    } catch { /* skip */ }
    return true
  })

  ipcMain.handle('autoclicker:getModuleOverlay', () => {
    return engine.moduleOverlayText
  })

  ipcMain.handle('debug:openLogs', () => {
    try {
      if (!fs.existsSync(LOG_FOLDER)) fs.mkdirSync(LOG_FOLDER, { recursive: true })
      shell.openPath(LOG_FOLDER)
    } catch { /* skip */ }
    return true
  })

  // ── Update IPC ──

  ipcMain.handle('update:check', async () => {
    return checkForUpdate()
  })

  ipcMain.handle('update:currentVersion', () => {
    return getCurrentVersion()
  })

  ipcMain.on('update:startDownload', async (event, downloadUrl: string) => {
    try {
      await downloadAndInstall(downloadUrl, (percent) => {
        event.sender.send('update:progress', percent)
      })
      event.sender.send('update:progress', -1) // -1 = done, quit
    } catch (e: any) {
      event.sender.send('update:error', e.message || 'Download failed')
    }
  })

  ipcMain.handle('debug:toggle', () => logger.toggleRenderer())

  ipcMain.handle('debug:status', () => logger.isRendererEnabled())

  ipcMain.on('debug:log', (_e, level: string, ...args: unknown[]) => {
    logger.fromRenderer(level, ...args)
  })

  // ── Cloud IPC ──

  ipcMain.handle('cloud:getUserId', () => {
    return cloud.getStoredUserId()
  })

  ipcMain.handle('cloud:setUserId', (_e, userId: string) => {
    cloud.setStoredUserId(userId)
    return true
  })

  ipcMain.handle('cloud:getServerUrl', () => {
    return cloud.getServerUrl()
  })

  ipcMain.handle('cloud:setServerUrl', (_e, url: string) => {
    cloud.setServerUrl(url)
    return true
  })

  ipcMain.handle('cloud:register', async () => {
    return cloud.registerUser()
  })

  ipcMain.handle('cloud:sync', async (_e, userId?: string) => {
    return cloud.syncUser(userId)
  })

  ipcMain.handle('cloud:listItems', async () => {
    return cloud.listItems()
  })

  ipcMain.handle('cloud:getQuota', async () => {
    return cloud.getQuota()
  })

  ipcMain.handle('cloud:upload', async (_e, args: { type: 'config' | 'macro'; name: string; description: string; data: any; public?: boolean }) => {
    return cloud.uploadItem(args.type, args.name, args.description, args.data, args.public)
  })

  ipcMain.handle('cloud:listPublicItems', async () => {
    return cloud.listPublicItems()
  })

  ipcMain.handle('cloud:downloadPublicItem', async (_e, itemId: string) => {
    return cloud.downloadPublicItem(itemId)
  })

  ipcMain.handle('cloud:downloadPublicAndSave', async (_e, itemId: string) => {
    try {
      const item = await cloud.downloadPublicItem(itemId)
      if (item.type === 'config') {
        const safeName = item.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
        const filepath = path.join(RESOURCE_FOLDER, `${safeName}.json`)
        const cfg = typeof item.data === 'object' ? item.data : JSON.parse(item.data)
        cfg.filename = safeName
        cfg.displayName = item.name
        cfg.description = item.description || ''
        fs.writeFileSync(filepath, JSON.stringify(cfg, null, 2), 'utf-8')
      } else if (item.type === 'macro') {
        const macro = typeof item.data === 'object' ? item.data : JSON.parse(item.data)
        macro.name = item.name
        // Merge into the engine's macro list
        engine.config.macros.list.push(macro)
        engine.saveConfig()
        engine.emitUpdate()
      }
      return true
    } catch (e) {
      console.error('[cloud] downloadPublicAndSave failed:', e)
      throw e
    }
  })

  ipcMain.handle('cloud:download', async (_e, itemId: string) => {
    return cloud.downloadItem(itemId)
  })

  ipcMain.handle('cloud:downloadAndSave', async (_e, itemId: string) => {
    try {
      const item = await cloud.downloadItem(itemId)
      if (item.type === 'config') {
        const safeName = item.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
        const filepath = path.join(RESOURCE_FOLDER, `${safeName}.json`)
        const cfg = typeof item.data === 'object' ? item.data : JSON.parse(item.data)
        cfg.filename = safeName
        cfg.displayName = item.name
        cfg.description = item.description || ''
        cfg.cloudId = item.id
        fs.writeFileSync(filepath, JSON.stringify(cfg, null, 2), 'utf-8')
      } else if (item.type === 'macro') {
        const macro = typeof item.data === 'object' ? item.data : JSON.parse(item.data)
        macro.name = item.name
        engine.config.macros.list.push(macro)
        engine.saveConfig()
        engine.emitUpdate()
      }
      return true
    } catch (e) {
      console.error('[cloud] downloadAndSave failed:', e)
      throw e
    }
  })

  ipcMain.handle('cloud:delete', async (_e, itemId: string) => {
    await cloud.deleteItem(itemId)
    return true
  })

  ipcMain.handle('cloud:syncAll', async () => {
    const items = await cloud.syncAll()
    let imported = 0
    for (const item of items) {
      if (item.type === 'config') {
        const safeName = item.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
        const filepath = path.join(RESOURCE_FOLDER, `${safeName}.json`)
        const cfg = typeof item.data === 'object' ? item.data : JSON.parse(item.data)
        cfg.filename = safeName
        cfg.displayName = item.name
        cfg.description = item.description || ''
        cfg.cloudId = item.id
        fs.writeFileSync(filepath, JSON.stringify(cfg, null, 2), 'utf-8')
        imported++
      }
      // Macros are handled separately — the user can merge them via cloud page UI
    }
    return { imported }
    })

  function stripEphemeralFlags(cfg: Record<string, any>): void {
    if (cfg?.left && typeof cfg.left === 'object') cfg.left.enabled = false
    if (cfg?.right && typeof cfg.right === 'object') cfg.right.enabled = false
    if (cfg?.recorder && typeof cfg.recorder === 'object') cfg.recorder.enabled = false
    if (cfg?.potions && typeof cfg.potions === 'object') cfg.potions.enabled = false
  }
}
