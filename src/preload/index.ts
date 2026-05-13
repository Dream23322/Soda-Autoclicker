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
