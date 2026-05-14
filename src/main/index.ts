import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { AutoclickerEngine } from "./autoclicker/engine"
import { registerAutoclickerIPC } from "./autoclicker/ipc"
import { enable as enableLogger } from "./logger"
import { startDiscord, stopDiscord } from "./discord"

enableLogger()

const autoclickerEngine = new AutoclickerEngine()
let tray: Tray | null = null
let isQuitting = false

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

	settingsWindow.setTitle(autoclickerEngine.config.misc.windowName || 'soda-autoclicker')

	settingsWindow.on("close", (e) => {
		if (isQuitting) return
		e.preventDefault()
		settingsWindow?.hide()
	})

	settingsWindow.on("closed", () => {
		settingsWindow = null
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
		if (isQuitting) return
		e.preventDefault()
		overlayWindow?.hide()
	})

	overlayWindow.on("closed", () => {
		overlayWindow = null
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
		showSettingsWindow()
	})
}

function showSettingsWindow(): void {
	if (!settingsWindow || settingsWindow.isDestroyed()) {
		createSettingsWindow()
	}
	if (!overlayWindow || overlayWindow.isDestroyed()) {
		createOverlayWindow()
		setTimeout(() => overlayWindow?.showInactive(), 1500)
	} else {
		overlayWindow?.showInactive()
	}
	if (!tray) createTray()
	if (!settingsWindow) return
	if (settingsWindow.isMinimized()) settingsWindow.restore()
	settingsWindow.show()
	settingsWindow.focus()
}

function createTray(): void {
	try {
		const size = 16
		const buf = Buffer.alloc(size * size * 4)
		for (let i = 0; i < size * size; i++) {
			const o = i * 4
			buf[o] = 0x7c; buf[o + 1] = 0x9c; buf[o + 2] = 0xed; buf[o + 3] = 0xff
		}
		const icon = nativeImage.createFromBitmap(buf, { width: size, height: size })
		tray = new Tray(icon)
		tray.setToolTip('Soda Autoclicker')
		const ctxMenu = Menu.buildFromTemplate([
			{ label: 'Show', click: () => showSettingsWindow() },
			{ type: 'separator' },
			{ label: 'Quit', click: () => { isQuitting = true; app.quit() } },
		])
		tray.setContextMenu(ctxMenu)
		tray.on('double-click', () => showSettingsWindow())
	} catch (err) {
		console.error('[tray] failed to create:', err)
	}
}

app.on("before-quit", () => {
	isQuitting = true
})

app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.4urxra.soda")

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	autoclickerEngine.start()

	createSettingsWindow()
	createOverlayWindow()
	createTray()

	registerAutoclickerIPC(autoclickerEngine, settingsWindow)
	autoclickerEngine.onHideGUI = () => {
		if (settingsWindow?.isVisible()) {
			settingsWindow?.hide()
			overlayWindow?.hide()
			tray?.destroy()
			tray = null
		} else {
			showSettingsWindow()
			if (!tray) createTray()
		}
	}

	startDiscord(() => ({
		enabled: autoclickerEngine.config.misc.discordRichPresence,
		leftEnabled: autoclickerEngine.config.left.enabled,
		rightEnabled: autoclickerEngine.config.right.enabled,
		leftCPS: autoclickerEngine.config.left.averageCPS,
		rightCPS: autoclickerEngine.config.right.averageCPS,
		recording: autoclickerEngine.config.recorder.enabled,
	}))

	setTimeout(() => overlayWindow?.showInactive(), 1500)

	app.on("activate", function () {
		showSettingsWindow()
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit()
})

app.on("will-quit", () => {
	stopDiscord()
	autoclickerEngine.stop()
	tray?.destroy()
	tray = null
})

ipcMain.on("window-control", (event, action: "minimize" | "maximize" | "close") => {
	const win = BrowserWindow.fromWebContents(event.sender)
	if (!win) return
	switch (action) {
		case "minimize": win.hide(); break
		case "maximize": win.isMaximized() ? win.unmaximize() : win.maximize(); break
		case "close": win.hide(); break
	}
})
