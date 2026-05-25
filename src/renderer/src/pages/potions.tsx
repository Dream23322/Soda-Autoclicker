import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { BindButton } from '@/components/bind-button'

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

export function PotionsPage({ config, updateConfig }: Props) {
  if (!config) return null
  const p = config.potions

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Potions</h1>

      <Card>
        <CardHeader><CardTitle>Potion Thrower</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Auto-throws potions in sequence. Lowest Slot cycles to Highest Slot.</p>
          <div className="flex items-center justify-between">
            <Label>Enable Potions</Label>
            <Switch checked={p.enabled} onCheckedChange={(v) => updateConfig(['potions', 'enabled'], v)} />
          </div>
          <BindButton currentBind={p.potBind} configPath={['potions', 'potBind']} onBindChange={updateConfig} label="Throw Bind" />
          <BindButton currentBind={p.potResetBind} configPath={['potions', 'potResetBind']} onBindChange={updateConfig} label="Reset Bind" />
          <div className="space-y-2">
            <Label>Lowest Slot: {p.lowestSlot}</Label>
            <Slider min={1} max={9} step={1} value={[p.lowestSlot]} onValueCommit={([v]) => updateConfig(['potions', 'lowestSlot'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Highest Slot: {p.highestSlot}</Label>
            <Slider min={1} max={9} step={1} value={[p.highestSlot]} onValueCommit={([v]) => updateConfig(['potions', 'highestSlot'], v)} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Throw Delay (s)</Label>
            <Input type="number" step={0.1} min={0} max={2} value={p.throwDelay}
              onChange={(e) => updateConfig(['potions', 'throwDelay'], parseFloat(e.target.value) || 0.7)}
              className="w-20" />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
