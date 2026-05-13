import { useEffect } from "react"
import { Routes, Route } from "react-router"

import HomePage from "@/pages/home"
import Settings from "@/pages/settings"
import HelpPage from "@/pages/help"
import { LeftClickerPage } from "@/pages/left-clicker"
import { RightClickerPage } from "@/pages/right-clicker"
import { RecorderPage } from "@/pages/recorder"
import { PotionsPage } from "@/pages/potions"
import { MovementPage } from "@/pages/movement"
import { ConfigManagerPage } from "@/pages/config-manager"

import Titlebar from "./components/titlebar"
import Sidebar from "./components/sidebar"

import { Toaster } from "@/components/ui/sonner"
import { useAutoclicker } from "@/hooks/use-autoclicker"
import { StatusOverlay } from "./overlay/status-overlay"

function RoutedApp() {
  const { config, updateConfig } = useAutoclicker()

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
            <Route path="/config-manager" element={<ConfigManagerPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<Settings config={config} updateConfig={updateConfig} />} />
          </Routes>
        </main>
      </div>
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
