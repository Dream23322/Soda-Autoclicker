import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BindButton } from "@/components/bind-button"

interface Props {
  config?: any
  updateConfig?: (path: string[], value: unknown) => void
}

function MiscPage({ config, updateConfig }: Props) {
  const setConfig = (path: string[], value: unknown) => {
    if (updateConfig) updateConfig(path, value)
  }

  const m = config?.misc

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold">
          <span className="text-primary">$</span> cat misc
        </h1>
      </div>

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

export default MiscPage
