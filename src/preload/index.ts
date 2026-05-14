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
	"autoclicker:getStatus",
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
	"update:downloadAndInstall",
	"debug:toggle",
	"debug:status",
	"debug:openLogs",
])

const SEND_CHANNELS: Set<string> = new Set(["window-control", "debug:log"])

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
		getStatus: () => ipcRenderer.invoke("autoclicker:getStatus"),
	},

	update: {
		check: () => ipcRenderer.invoke("update:check"),
		currentVersion: () => ipcRenderer.invoke("update:currentVersion"),
		downloadAndInstall: (downloadUrl: string) => ipcRenderer.invoke("update:downloadAndInstall", downloadUrl),
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

	ipc: {
		invoke: (channel: string, data?: any) => {
			assertAllowed(INVOKE_CHANNELS, channel)
			return ipcRenderer.invoke(channel, data)
		},
		send: (channel: string, data?: any) => {
			assertAllowed(SEND_CHANNELS, channel)
			ipcRenderer.send(channel, data)
		},
	},
}

if (process.contextIsolated) {
	try { contextBridge.exposeInMainWorld("electron", api) }
	catch { (window as any).electron = api }
} else {
	(window as any).electron = api
}
