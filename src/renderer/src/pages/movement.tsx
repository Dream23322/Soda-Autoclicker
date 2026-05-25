import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

export function MovementPage({ config, updateConfig }: Props) {
  if (!config) return null
  const mv = config.movement

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Movement</h1>

      <Card>
        <CardHeader><CardTitle>W-Tap</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Auto W-Taps when clicking. Helps keep combos.</p>
          <div className="flex items-center justify-between">
            <Label>Auto W-Tap</Label>
            <Switch checked={mv.autoWTap} onCheckedChange={(v) => updateConfig(['movement', 'autoWTap'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Value: {mv.wTapValue}{mv.wTapMode === 'chance' ? '%' : 'ms'}</Label>
            <Slider min={1} max={100} step={1} value={[mv.wTapValue]} onValueCommit={([v]) => updateConfig(['movement', 'wTapValue'], v)} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Mode</Label>
            <Select value={mv.wTapMode} onValueChange={(v) => updateConfig(['movement', 'wTapMode'], v)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chance">Chance</SelectItem>
                <SelectItem value="delay">Delay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sprint</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Auto Sprint</Label>
            <Switch checked={mv.autoSprint} onCheckedChange={(v) => updateConfig(['movement', 'autoSprint'], v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Better Input (SOCD)</Label>
            <Switch checked={mv.betterInput} onCheckedChange={(v) => updateConfig(['movement', 'betterInput'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Fast Stop</Label>
            <Switch checked={mv.fastStop} onCheckedChange={(v) => updateConfig(['movement', 'fastStop'], v)} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
