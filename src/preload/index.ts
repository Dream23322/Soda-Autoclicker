import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

const INVOKE_CHANNELS: Set<string> = new Set([
	"autoclicker:getConfig",
	"autoclicker:updateConfig",
	"autoclicker:saveConfig",
	"autoclicker:loadConfig",
	"autoclicker:doRod",
	"autoclicker:doPearl",
	"autoclicker:doPotion",
	"autoclicker:getConfigs",
	"autoclicker:loadPreset",
	"autoclicker:savePreset",
	"autoclicker:openResourceFolder",
	"autoclicker:getConfigData",
	"autoclicker:getStatus",
	"autoclicker:getModuleOverlay",
	"autoclicker:startScriptModule",
	"autoclicker:stopScriptModule",
	"autoclicker:getScriptModuleStatus",
	"autoclicker:toggleKeystrokes",
	"autoclicker:validateScript",
	"cloud:getUserId",
	"cloud:setUserId",
	"cloud:getServerUrl",
	"cloud:setServerUrl",
	"cloud:register",
	"cloud:sync",
	"cloud:listItems",
	"cloud:getQuota",
	"cloud:upload",
	"cloud:listPublicItems",
	"cloud:downloadPublicItem",
	"cloud:downloadPublicAndSave",
	"cloud:download",
	"cloud:downloadAndSave",
	"cloud:delete",
	"cloud:syncAll",
	"update:check",
	"update:currentVersion",
	"debug:toggle",
	"debug:status",
	"debug:openLogs",
])

const SEND_CHANNELS: Set<string> = new Set(["window-control", "debug:log", "update:startDownload", "theme:update"])
const LISTEN_CHANNELS: Set<string> = new Set(["overlay:update", "theme:update", "scriptConsole"])

function assertAllowed(set: Set<string>, channel: string): void {
	if (!set.has(channel)) throw new Error(`Blocked IPC channel: ${channel}`)
}

const api = {
	...electronAPI,

	windowControl: (action: "minimize" | "maximize" | "close") => ipcRenderer.send("window-control", action),

	autoclicker: {
		getConfig: () => ipcRenderer.invoke("autoclicker:getConfig"),
		updateConfig: (args: { path: string[]; value: unknown }) => ipcRenderer.invoke("autoclicker:updateConfig", args),
		saveConfig: () => ipcRenderer.invoke("autoclicker:saveConfig"),
		loadConfig: () => ipcRenderer.invoke("autoclicker:loadConfig"),
		doRod: () => ipcRenderer.invoke("autoclicker:doRod"),
		doPearl: () => ipcRenderer.invoke("autoclicker:doPearl"),
		doPotion: () => ipcRenderer.invoke("autoclicker:doPotion"),
		getConfigs: () => ipcRenderer.invoke("autoclicker:getConfigs"),
		loadPreset: (filename: string) => ipcRenderer.invoke("autoclicker:loadPreset", filename),
		savePreset: (args: { filename: string; displayName: string; Author: string; description: string }) =>
			ipcRenderer.invoke("autoclicker:savePreset", args),
		openResourceFolder: () => ipcRenderer.invoke("autoclicker:openResourceFolder"),
		getConfigData: (filename: string) => ipcRenderer.invoke("autoclicker:getConfigData", filename),
		getStatus: () => ipcRenderer.invoke("autoclicker:getStatus"),
		getModuleOverlay: () => ipcRenderer.invoke("autoclicker:getModuleOverlay"),
		startScriptModule: (name: string) => ipcRenderer.invoke("autoclicker:startScriptModule", name),
		stopScriptModule: (name: string) => ipcRenderer.invoke("autoclicker:stopScriptModule", name),
		getScriptModuleStatus: () => ipcRenderer.invoke("autoclicker:getScriptModuleStatus"),
		toggleKeystrokes: () => ipcRenderer.invoke("autoclicker:toggleKeystrokes"),
		validateScript: (code: string) => ipcRenderer.invoke("autoclicker:validateScript", code),
	},

	update: {
		check: () => ipcRenderer.invoke("update:check"),
		currentVersion: () => ipcRenderer.invoke("update:currentVersion"),
		startDownload: (downloadUrl: string) => ipcRenderer.send("update:startDownload", downloadUrl),
		onProgress: (callback: (percent: number) => void) => {
			const handler = (_e: any, percent: number) => callback(percent)
			ipcRenderer.on("update:progress", handler)
			return () => ipcRenderer.removeListener("update:progress", handler)
		},
		onError: (callback: (error: string) => void) => {
			const handler = (_e: any, error: string) => callback(error)
			ipcRenderer.on("update:error", handler)
			return () => ipcRenderer.removeListener("update:error", handler)
		},
	},

	cloud: {
		getUserId: () => ipcRenderer.invoke("cloud:getUserId"),
		setUserId: (userId: string) => ipcRenderer.invoke("cloud:setUserId", userId),
		getServerUrl: () => ipcRenderer.invoke("cloud:getServerUrl"),
		setServerUrl: (url: string) => ipcRenderer.invoke("cloud:setServerUrl", url),
		register: () => ipcRenderer.invoke("cloud:register"),
		sync: (userId?: string) => ipcRenderer.invoke("cloud:sync", userId),
		listItems: () => ipcRenderer.invoke("cloud:listItems"),
		getQuota: () => ipcRenderer.invoke("cloud:getQuota"),
		upload: (args: { type: "config" | "macro"; name: string; description: string; data: any; public?: boolean }) =>
			ipcRenderer.invoke("cloud:upload", args),
		listPublicItems: () => ipcRenderer.invoke("cloud:listPublicItems"),
		downloadPublicItem: (itemId: string) => ipcRenderer.invoke("cloud:downloadPublicItem", itemId),
		downloadPublicAndSave: (itemId: string) => ipcRenderer.invoke("cloud:downloadPublicAndSave", itemId),
		download: (itemId: string) => ipcRenderer.invoke("cloud:download", itemId),
		downloadAndSave: (itemId: string) => ipcRenderer.invoke("cloud:downloadAndSave", itemId),
		delete: (itemId: string) => ipcRenderer.invoke("cloud:delete", itemId),
		syncAll: () => ipcRenderer.invoke("cloud:syncAll"),
	},

	debug: {
		toggle: () => ipcRenderer.invoke("debug:toggle"),
		status: () => ipcRenderer.invoke("debug:status"),
		log: (level: string, ...args: unknown[]) => ipcRenderer.send("debug:log", level, ...args),
		openLogs: () => ipcRenderer.invoke("debug:openLogs"),
	},

	scriptConsole: {
		on: (callback: (data: { moduleName: string; level: string; message: string; timestamp: number }) => void) => {
			const handler = (_e: any, data: any) => callback(data)
			ipcRenderer.on("scriptConsole", handler)
			return () => ipcRenderer.removeListener("scriptConsole", handler)
		},
	},

	ipc: {
		invoke: (channel: string, data?: any) => {
			assertAllowed(INVOKE_CHANNELS, channel)
			return ipcRenderer.invoke(channel, data)
		},
		send: (channel: string, data?: any) => {
			assertAllowed(SEND_CHANNELS, channel)
			ipcRenderer.send(channel, data)
		},
		on: (channel: string, callback: (...args: any[]) => void) => {
			if (!LISTEN_CHANNELS.has(channel)) throw new Error(`Blocked IPC channel: ${channel}`)
			ipcRenderer.on(channel, (_e, ...args) => callback(...args))
		},
		removeListener: (channel: string, callback: (...args: any[]) => void) => {
			ipcRenderer.removeListener(channel, callback)
		},
	},
}

if (process.contextIsolated) {
	try { contextBridge.exposeInMainWorld("electron", api) }
	catch { (window as any).electron = api }
} else {
	(window as any).electron = api
}