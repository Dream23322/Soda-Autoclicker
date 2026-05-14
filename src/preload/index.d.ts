import { ElectronAPI } from "@electron-toolkit/preload"

type WindowControlAction = "minimize" | "maximize" | "close"

interface CloudItem {
  id: string
  type: "config" | "macro"
  name: string
  description: string
  version: number
  created_at: string
  updated_at: string
}

interface CloudApi {
  getUserId: () => Promise<string | null>
  setUserId: (userId: string) => Promise<boolean>
  getServerUrl: () => Promise<string>
  setServerUrl: (url: string) => Promise<boolean>
  register: () => Promise<string>
  sync: () => Promise<string | null>
  listItems: () => Promise<{ items: CloudItem[]; quota: { used: number; max: number } }>
  getQuota: () => Promise<{ used: number; max: number }>
  upload: (args: { type: "config" | "macro"; name: string; description: string; data: any; public?: boolean }) => Promise<{ id: string; type: string; name: string; description: string; version: number; public: boolean }>
  listPublicItems: () => Promise<{ items: Array<CloudItem & { downloads: number }> }>
  downloadPublicItem: (itemId: string) => Promise<CloudItem & { data: any; downloads: number }>
  downloadPublicAndSave: (itemId: string) => Promise<boolean>
  download: (itemId: string) => Promise<CloudItem & { data: any }>
  downloadAndSave: (itemId: string) => Promise<boolean>
  delete: (itemId: string) => Promise<boolean>
  syncAll: () => Promise<{ imported: number }>
}

interface AutoclickerApi {
  getConfig: () => Promise<any>
  updateConfig: (args: { path: string[]; value: unknown }) => Promise<boolean>
  saveConfig: () => Promise<boolean>
  loadConfig: () => Promise<boolean>
  doRod: () => Promise<boolean>
  doPearl: () => Promise<boolean>
  doPotion: () => Promise<boolean>
  getConfigs: () => Promise<Array<{ filename: string; displayName: string; Author: string; description: string }>>
  loadPreset: (filename: string) => Promise<boolean>
  savePreset: (args: { filename: string; displayName: string; Author: string; description: string }) => Promise<boolean>
  openResourceFolder: () => Promise<boolean>
  getStatus: () => Promise<{
    focusedProcess: string
    isGameFocused: boolean
    leftEnabled: boolean
    rightEnabled: boolean
    leftCPS: number
    rightCPS: number
    blatantLeft: boolean
    blatantRight: boolean
    hasBlockHit: boolean
    hasSmartBH: boolean
    hasShake: boolean
    autoRod: boolean
    recorder: boolean
    discord: boolean
    overlayPosition: string
    overlayLayout: string
    overlayEnabled: boolean
  }>
}

export interface SodaPreloadApi extends ElectronAPI {
  windowControl: (action: WindowControlAction) => void
  autoclicker: AutoclickerApi
  cloud: CloudApi
  ipc: {
    invoke: (channel: string, data?: any) => Promise<any>
    send: (channel: string, data?: any) => void
  }
}

declare global {
  interface Window {
    electron: SodaPreloadApi
  }
}
