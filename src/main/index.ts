import { app, shell, BrowserWindow, ipcMain, screen } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { AutoclickerEngine } from "./autoclicker/engine"
import { registerAutoclickerIPC } from "./autoclicker/ipc"

const autoclickerEngine = new AutoclickerEngine()

let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

function createSettingsWindow(): void {
	settingsWindow = new BrowserWindow({
		width: 1200,
		height: 710,
		minWidth: 1200,
		minHeight: 710,
		show: false,
		frame: false,
		autoHideMenuBar: true,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	})

	settingsWindow.on("ready-to-show", () => {
		settingsWindow?.show()
	})

	settingsWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: "deny" }
	})

	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		settingsWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
	} else {
		settingsWindow.loadFile(join(__dirname, "../renderer/index.html"))
	}
}

function createOverlayWindow(): void {
	const display = screen.getPrimaryDisplay()
	const { x, y, width, height } = display.bounds

	overlayWindow = new BrowserWindow({
		x, y, width, height,
		show: false,
		frame: false,
		transparent: true,
		hasShadow: false,
		resizable: false,
		skipTaskbar: true,
		focusable: false,
		alwaysOnTop: true,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
			contextIsolation: true,
			nodeIntegration: false,
		},
	})

	overlayWindow.setAlwaysOnTop(true, "screen-saver")
	overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

	overlayWindow.webContents.on("did-finish-load", () => {
		overlayWindow?.setIgnoreMouseEvents(true, { forward: true })
	})

	overlayWindow.on("close", (e) => {
		e.preventDefault()
		overlayWindow?.hide()
	})

	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		overlayWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}?overlay=1`)
	} else {
		overlayWindow.loadFile(join(__dirname, "../renderer/index.html"), {
			query: { overlay: "1" },
		})
	}
}

const gotLock: boolean = app.requestSingleInstanceLock()
if (!gotLock) { app.quit() } else {
	app.on("second-instance", () => {
		if (settingsWindow) {
			if (settingsWindow.isMinimized()) settingsWindow.restore()
			settingsWindow.focus()
		}
	})
}

app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.4urxra.soda")

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	registerAutoclickerIPC(autoclickerEngine)
	autoclickerEngine.start()

	createSettingsWindow()
	createOverlayWindow()

	setTimeout(() => overlayWindow?.showInactive(), 1500)

	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) {
			createSettingsWindow()
		}
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit()
})

app.on("will-quit", () => {
	autoclickerEngine.stop()
})

ipcMain.on("window-control", (event, action: "minimize" | "maximize" | "close") => {
	const win = BrowserWindow.fromWebContents(event.sender)
	if (!win) return
	switch (action) {
		case "minimize": win.minimize(); break
		case "maximize": win.isMaximized() ? win.unmaximize() : win.maximize(); break
		case "close": win.hide(); break
	}
})
