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

  // Restore the saved theme once config is available. If the saved choice was
  // "custom", rebuild the hex from the persisted RGB and reapply it so the
  // custom theme actually survives across reloads.
  useEffect(() => {
    if (restored.current) return
    const saved = localStorage.getItem("colorPreset") || "white"

    if (saved === "custom") {
      if (!config?.misc) return
      restored.current = true
      const hex = rgbToHex(config.misc.red ?? 0, config.misc.green ?? 0, config.misc.blue ?? 0)
      applyCustomColor(hex)
      setCurrentColor("custom")
      return
    }

    restored.current = true
    setCurrentColor(saved)
    applyColorPreset(saved as keyof typeof COLOR_PRESETS)
  }, [config])

  const setConfig = (path: string[], value: unknown) => {
    if (updateConfig) updateConfig(path, value)
  }

  const handleColorChange = (colorName: string) => {
    setCurrentColor(colorName)
    applyColorPreset(colorName as keyof typeof COLOR_PRESETS)
  }

  const handleCustomSelect = () => {
    if (!m) return
    const hex = rgbToHex(m.red ?? 0, m.green ?? 0, m.blue ?? 0)
    applyCustomColor(hex)
    setCurrentColor("custom")
  }

  const handleCustomPick = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    setConfig(['misc', 'red'], r)
    setConfig(['misc', 'green'], g)
    setConfig(['misc', 'blue'], b)
    applyCustomColor(hex)
    setCurrentColor('custom')
  }

  const m = config?.misc
  const customHex = m ? rgbToHex(m.red ?? 0, m.green ?? 0, m.blue ?? 0) : '#000000'
  const swatchStyle: CSSProperties = { background: customHex }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold">
          <span className="text-primary">$</span> nano settings
        </h1>
      </div>

      {/* ── [ General ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">General</h2>

          <div className="flex items-center justify-between">
            <Label className="text-xs">toggle_sounds</Label>
            <Switch
              checked={m?.toggleSounds ?? false}
              onCheckedChange={(v) => setConfig(['misc', 'toggleSounds'], v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">discord_rpc</Label>
            <Switch
              checked={m?.discordRichPresence ?? false}
              onCheckedChange={(v) => setConfig(['misc', 'discordRichPresence'], v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">save_settings</Label>
            <Switch
              checked={m?.saveSettings ?? false}
              onCheckedChange={(v) => setConfig(['misc', 'saveSettings'], v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">compatibility_mode</Label>
            <Switch
              checked={m?.compatibilityMode ?? false}
              onCheckedChange={(v) => setConfig(['misc', 'compatibilityMode'], v)}
            />
          </div>

          <BindButton
            currentBind={m?.bindHideGUI ?? 0}
            configPath={['misc', 'bindHideGUI']}
            onBindChange={setConfig}
            label="hide_gui"
          />

          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">window_name</Label>
            <Input
              type="text"
              value={m?.windowName ?? 'soda-autoclicker'}
              onChange={(e) => setConfig(['misc', 'windowName'], e.target.value)}
              className="w-40 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── [ Theme ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Theme</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COLOR_PRESETS).map(([key, value]) => (
              <Button
                key={key}
                variant={currentColor === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleColorChange(key)}
                className="text-xs h-7"
              >
                {value.label}
              </Button>
            ))}
            {m && (
              <Button
                variant={currentColor === "custom" ? "default" : "outline"}
                size="sm"
                onClick={handleCustomSelect}
                className="text-xs h-7 flex items-center gap-1.5"
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-border"
                  style={swatchStyle}
                />
                Custom
              </Button>
            )}
          </div>
          {m && (
            <div className="flex items-center gap-3">
              <Label className="text-xs">pick</Label>
              <input
                type="color"
                value={customHex}
                onChange={(e) => handleCustomPick(e.target.value)}
                className="w-10 h-10 p-0.5 rounded cursor-pointer border border-border bg-transparent"
              />
              <span className="text-[10px] text-muted-foreground">
                {customHex.toUpperCase()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── [ Overlay ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Overlay</h2>
          <div className="flex items-center justify-between">
            <Label className="text-xs">visible</Label>
            <Switch
              checked={config?.overlay?.enabled ?? false}
              onCheckedChange={(v) => setConfig(['overlay', 'enabled'], v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">position</Label>
            <Select value={m?.overlayPosition ?? 'top-right'} onValueChange={(v) => setConfig(['misc', 'overlayPosition'], v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top-right">top-right</SelectItem>
                <SelectItem value="top-left">top-left</SelectItem>
                <SelectItem value="bottom-right">bottom-right</SelectItem>
                <SelectItem value="bottom-left">bottom-left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">layout</Label>
            <Select value={m?.overlayLayout ?? 'horizontal'} onValueChange={(v) => setConfig(['misc', 'overlayLayout'], v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">side by side</SelectItem>
                <SelectItem value="vertical">stacked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

export default Settings
