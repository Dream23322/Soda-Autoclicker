import { useState, useEffect, useCallback } from 'react'

export interface AutoclickerConfig {
  left: {
    enabled: boolean; mode: string; bind: number; averageCPS: number; minCPS: number
    onlyWhenFocused: boolean; breakBlocks: string; RMBLock: boolean
    blockHit: boolean; blockHitChance: number; bhType: string
    smartBH: number; shakeEffect: boolean; shakeEffectForce: number
    soundPath: string; workInMenus: boolean; blatant: boolean
    AutoRod: boolean; AutoRodChance: number
  }
  right: {
    enabled: boolean; mode: string; bind: number; averageCPS: number; minCPS: number
    onlyWhenFocused: boolean; LMBLock: boolean; shakeEffect: boolean
    shakeEffectForce: number; soundPath: string; workInMenus: boolean
    blatant: boolean; items: boolean
  }
  recorder: { enabled: boolean; record: number[]; recordMultiplier: number }
  misc: {
    saveSettings: boolean; guiHidden: boolean; bindHideGUI: number; holdToHideGUI: boolean; windowName: string
    discordRichPresence: boolean; switchDelay: number
    rodBind: number; longRod: boolean; rodDelay: number; rodSlot: string
    pearlBind: number; pearlSlot: string; swordSlot: string; theme: string
    red: number; green: number; blue: number; toggleSounds: boolean; compatibilityMode: boolean; ping: number
  }
  potions: {
    enabled: boolean; potBind: number; throwDelay: number
    switchBackSlot: string; potResetBind: number; lowestSlot: number; highestSlot: number
  }
  movement: {
    autoWTap: boolean; wTapMode: string; wTapValue: number
    autoSprint: boolean; betterInput: boolean; fastStop: boolean
  }
  displayName: string; description: string; Author: string
}

export function useAutoclicker() {
  const [config, setConfig] = useState<AutoclickerConfig | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      // @ts-ignore
      if (!window.electron?.autoclicker?.getConfig) return
      // @ts-ignore
      const cfg = await window.electron.autoclicker.getConfig()
      if (cfg) setConfig(cfg)
    } catch (err) {
      console.warn('useAutoclicker: failed to load config', err)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const updateConfig = useCallback(async (path: string[], value: unknown) => {
    // @ts-ignore
    await window.electron.autoclicker.updateConfig({ path, value })
    // Optimistically update local state
    setConfig(prev => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      let target: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]] as Record<string, unknown>
      }
      target[path[path.length - 1]] = value
      return next
    })
  }, [])

  const doRod = useCallback(async () => {
    // @ts-ignore
    await window.electron.autoclicker.doRod()
  }, [])

  const doPearl = useCallback(async () => {
    // @ts-ignore
    await window.electron.autoclicker.doPearl()
  }, [])

  const doPotion = useCallback(async () => {
    // @ts-ignore
    await window.electron.autoclicker.doPotion()
  }, [])

  const getStatus = useCallback(async () => {
    try {
      // @ts-ignore
      if (!window.electron?.autoclicker?.getStatus) return null
      // @ts-ignore
      return await window.electron.autoclicker.getStatus()
    } catch { return null }
  }, [])

  return { config, updateConfig, doRod, doPearl, doPotion, loadConfig, getStatus }
}
