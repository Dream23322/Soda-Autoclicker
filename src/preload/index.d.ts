import { ElectronAPI } from "@electron-toolkit/preload"

type WindowControlAction = "minimize" | "maximize" | "close"

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
