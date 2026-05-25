import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BindButton } from "@/components/bind-button"

const SLOT_OPTIONS = ['1','2','3','4','5','6','7','8','9']

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

      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Rod Macro</h2>

          <BindButton
            currentBind={m?.rodBind ?? 0}
            configPath={['misc', 'rodBind']}
            onBindChange={setConfig}
            label="bind"
          />
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">slot</Label>
            <Select value={m?.rodSlot ?? '2'} onValueChange={(v) => setConfig(['misc', 'rodSlot'], v)}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map(s => (
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
                {SLOT_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Sword Slot</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs">switch_back_slot</Label>
            <Select value={m?.swordSlot ?? '1'} onValueChange={(v) => setConfig(['misc', 'swordSlot'], v)}>
              <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MiscPage
