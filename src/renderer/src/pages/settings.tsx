import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BindButton } from "@/components/bind-button"
import { COLOR_PRESETS, applyColorPreset, applyCustomColor } from "@/lib/utils"
import type { CSSProperties } from "react"

interface Props {
  config?: any
  updateConfig?: (path: string[], value: unknown) => void
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function Settings({ config, updateConfig }: Props) {
  const [currentColor, setCurrentColor] = useState<string>("white")
  const restored = useRef(false)

  // Pull misc up here so handlers defined below can close over it without
  // hitting TDZ issues (lint complained about the previous ordering).
  const m = config?.misc
  const customHex = m ? rgbToHex(m.red ?? 0, m.green ?? 0, m.blue ?? 0) : '#000000'
  const swatchStyle: CSSProperties = { background: customHex }

  // Restore the saved theme once config is available. If the saved choice was
  // "custom", rebuild the hex from the persisted RGB and reapply it so the
  // custom theme actually survives across reloads.
  useEffect(() => {
    if (restored.current) return
    const saved = localStorage.getItem("colorPreset") || "white"

    if (saved === "custom") {
      if (!m) return
      restored.current = true
      applyCustomColor(rgbToHex(m.red ?? 0, m.green ?? 0, m.blue ?? 0))
      setCurrentColor("custom")
      return
    }

    restored.current = true
    setCurrentColor(saved)
    applyColorPreset(saved as keyof typeof COLOR_PRESETS)
  }, [m])

  const setConfig = (path: string[], value: unknown) => {
    if (updateConfig) updateConfig(path, value)
  }

  const handleColorChange = (colorName: string) => {
    setCurrentColor(colorName)
    applyColorPreset(colorName as keyof typeof COLOR_PRESETS)
  }

  const handleCustomSelect = () => {
    if (!m) return
    applyCustomColor(rgbToHex(m.red ?? 0, m.green 