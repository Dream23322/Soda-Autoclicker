import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BindButton } from "@/components/bind-button"
import { COLOR_PRESETS, applyColorPreset } from "@/lib/utils"

interface Props {
  config?: any
  updateConfig?: (path: string[], value: unknown) => void
}

function Settings({ config, updateConfig }: Props) {
  const [currentColor, setCurrentColor] = useState<string>("lime")

  useEffect(() => {
    const savedColor = localStorage.getItem("colorPreset") || "white"
    setCurrentColor(savedColor)
    applyColorPreset(savedColor as keyof typeof COLOR_PRESETS)
  }, [])

  const setConfig = (path: string[], value: unknown) => {
    if (updateConfig) updateConfig(path, value)
  }

  const handleColorChange = (colorName: string) => {
    setCurrentColor(colorName)
    applyColorPreset(colorName as keyof typeof COLOR_PRESETS)
  }

  const m = config?.misc

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold">
          <span className="text-primary">$</span> cat settings
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

          <BindButton
            currentBind={m?.bindHideGUI ?? 0}
            configPath={['misc', 'bindHideGUI']}
            onBindChange={setConfig}
            label="hide_gui"
          />

          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">console_faker</Label>
            <Select
              value={m?.consoleFaker ?? 'NullBind'}
              onValueChange={(v) => setConfig(['misc', 'consoleFaker'], v)}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NullBind">NullBind</SelectItem>
                <SelectItem value="Optimiser">Optimiser</SelectItem>
                <SelectItem value="CustomRGB">CustomRGB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── [ Rod Macro ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Rod Macro</h2>

          <BindButton
            currentBind={m?.rodBind ?? 0}
            configPath={['misc', 'rodBind']}
            onBindChange={setConfig}
            label="bind"
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">long_rod</Label>
            <Switch
              checked={m?.longRod ?? false}
              onCheckedChange={(v) => setConfig(['misc', 'longRod'], v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">slot</Label>
            <Select value={m?.rodSlot ?? '2'} onValueChange={(v) => setConfig(['misc', 'rodSlot'], v)}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1','2','3','4','5','6','7','8','9'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">delay (s)</Label>
            <Input
              type="number" step={0.1} min={0} max={2}
              value={m?.rodDelay ?? 0.2}
              onChange={(e) => setConfig(['misc', 'rodDelay'], parseFloat(e.target.value) || 0.2)}
              className="w-20 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── [ Pearl Macro ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Pearl Macro</h2>

          <BindButton
            currentBind={m?.pearlBind ?? 0}
            configPath={['misc', 'pearlBind']}
            onBindChange={setConfig}
            label="bind"
          />
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">slot</Label>
            <Select value={m?.pearlSlot ?? '8'} onValueChange={(v) => setConfig(['misc', 'pearlSlot'], v)}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1','2','3','4','5','6','7','8','9'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── [ Sword Slot ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Sword Slot</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs">switch_back_slot</Label>
            <Select value={m?.swordSlot ?? '1'} onValueChange={(v) => setConfig(['misc', 'swordSlot'], v)}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1','2','3','4','5','6','7','8','9'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
          {m && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">red: {m.red}</Label>
                <Slider min={0} max={255} step={1} value={[m.red]}
                  onValueChange={([v]) => setConfig(['misc', 'red'], v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">green: {m.green}</Label>
                <Slider min={0} max={255} step={1} value={[m.green]}
                  onValueChange={([v]) => setConfig(['misc', 'green'], v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">blue: {m.blue}</Label>
                <Slider min={0} max={255} step={1} value={[m.blue]}
                  onValueChange={([v]) => setConfig(['misc', 'blue'], v)} />
              </div>
            </>
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

      {/* ── [ Network ] ── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Network</h2>
          <div className="space-y-1">
            <Label className="text-xs">ping: {m?.ping ?? 230}ms</Label>
            <Slider min={1} max={1000} step={1} value={[m?.ping ?? 230]}
              onValueChange={([v]) => setConfig(['misc', 'ping'], v)} />
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

export default Settings
