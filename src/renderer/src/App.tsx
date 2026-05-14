import { useEffect, useState, useRef, useCallback } from "react"
import { Routes, Route } from "react-router"

import HomePage from "@/pages/home"
import Settings from "@/pages/settings"
import MiscPage from "@/pages/misc"
import { CloudPage } from "@/pages/cloud"
import HelpPage from "@/pages/help"
import { LeftClickerPage } from "@/pages/left-clicker"
import { RightClickerPage } from "@/pages/right-clicker"
import { RecorderPage } from "@/pages/recorder"
import { PotionsPage } from "@/pages/potions"
import { MovementPage } from "@/pages/movement"
import { MacrosPage } from "@/pages/macros"
import { ConfigManagerPage } from "@/pages/config-manager"

import Titlebar from "./components/titlebar"
import Sidebar from "./components/sidebar"

import { Toaster } from "@/components/ui/sonner"
import { useAutoclicker } from "@/hooks/use-autoclicker"
import { StatusOverlay } from "./overlay/status-overlay"

let consolePatched = false

function patchRendererLogs(): void {
  if (consolePatched) return
  consolePatched = true
  const dbg = (window as any).electron?.debug
  if (!dbg) return

  const origLog = console.log
  console.log = (...args) => { origLog.apply(console, args); dbg.log('log', ...args) }

  const origWarn = console.warn
  console.warn = (...args) => { origWarn.apply(console, args); dbg.log('warn', ...args) }

  const origError = console.error
  console.error = (...args) => { origError.apply(console, args); dbg.log('error', ...args) }
}

function SecretMenu() {
  const [rendererOn, setRendererOn] = useState(false)

  useEffect(() => {
    ;(window as any).electron?.debug?.status().then((on: boolean) => setRendererOn(on))
  }, [])

  const toggle = async () => {
    const on = await (window as any).electron?.debug?.toggle()
    setRendererOn(on)
    if (on) patchRendererLogs()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-lg border border-[#333] bg-[#0d0d0d] p-4 shadow-2xl">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#666]">Debug</h3>
      <p className="text-[10px] text-[#555] mb-2">Main process logs always active</p>
      <label className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Forward Renderer Logs</span>
        <button
          onClick={toggle}
          className={`relative h-5 w-9 rounded-full transition-colors ${rendererOn ? 'bg-primary' : 'bg-[#333]'}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${rendererOn ? 'translate-x-4' : ''}`}
          />
        </button>
      </label>
      <p
        className="mt-2 text-[10px] text-[#555] cursor-pointer hover:text-[#888] transition-colors"
        onClick={() => (window as any).electron?.debug?.openLogs()}
      >
        ~/soda/logs/logs.txt
      </p>
    </div>
  )
}

function RoutedApp() {
  const { config, updateConfig } = useAutoclicker()
  const [showSecret, setShowSecret] = useState(false)
  const arrowCount = useRef(0)
  const arrowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown') return
    clearTimeout(arrowTimer.current)
    arrowCount.current++
    arrowTimer.current = setTimeout(() => { arrowCount.current = 0; setShowSecret(false) }, 1000)
    if (arrowCount.current >= 3) {
      arrowCount.current = 0
      clearTimeout(arrowTimer.current)
      setShowSecret(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <Routes>
            <Route path="/" element={<HomePage config={config} />} />
            <Route path="/left-clicker" element={<LeftClickerPage config={config} updateConfig={updateConfig} />} />
            <Route path="/right-clicker" element={<RightClickerPage config={config} updateConfig={updateConfig} />} />
            <Route path="/recorder" element={<RecorderPage config={config} updateConfig={updateConfig} />} />
            <Route path="/potions" element={<PotionsPage config={config} updateConfig={updateConfig} />} />
            <Route path="/movement" element={<MovementPage config={config} updateConfig={updateConfig} />} />
            <Route path="/macros" element={<MacrosPage config={config} updateConfig={updateConfig} />} />
            <Route path="/config-manager" element={<ConfigManagerPage />} />
            <Route path="/misc" element={<MiscPage config={config} updateConfig={updateConfig} />} />
            <Route path="/cloud" element={<CloudPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<Settings config={config} updateConfig={updateConfig} />} />
          </Routes>
        </main>
      </div>
      {showSecret && <SecretMenu />}
      <Toaster richColors closeButton />
    </div>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const isOverlay = params.get("overlay") === "1"

  useEffect(() => {
    if (!isOverlay) return
    document.documentElement.style.backgroundColor = "transparent"
    document.body.style.backgroundColor = "transparent"
    document.body.style.margin = "0"
    document.body.style.overflow = "hidden"
  }, [isOverlay])

  return isOverlay ? <StatusOverlay /> : <RoutedApp />
}



export default App
