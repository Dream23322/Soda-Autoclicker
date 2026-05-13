import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BindButton } from '@/components/bind-button'

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

export function RightClickerPage({ config, updateConfig }: Props) {
  if (!config) return null
  const r = config.right

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Right Clicker</h1>

      <Card>
        <CardHeader><CardTitle>Main</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={r.enabled} onCheckedChange={(v) => updateConfig(['right', 'enabled'], v)} />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <BindButton currentBind={r.bind} configPath={['right', 'bind']} onBindChange={updateConfig} label="Toggle Bind" />
            <div className="flex items-center gap-2">
              <Label>Mode</Label>
              <Select value={r.mode} onValueChange={(v) => updateConfig(['right', 'mode'], v)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hold">Hold</SelectItem>
                  <SelectItem value="Always">Always</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Average CPS: {r.averageCPS}</Label>
            <Slider min={1} max={60} step={1} value={[r.averageCPS]} onValueChange={([v]) => updateConfig(['right', 'averageCPS'], v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Effects</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Shake Effect</Label>
            <Switch checked={r.shakeEffect} onCheckedChange={(v) => updateConfig(['right', 'shakeEffect'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Shake Force: {r.shakeEffectForce}</Label>
            <Slider min={1} max={20} step={1} value={[r.shakeEffectForce]} onValueChange={([v]) => updateConfig(['right', 'shakeEffectForce'], v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Advanced</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Only In Game</Label>
            <Switch checked={r.onlyWhenFocused} onCheckedChange={(v) => updateConfig(['right', 'onlyWhenFocused'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Work in Menus</Label>
            <Switch checked={r.workInMenus} onCheckedChange={(v) => updateConfig(['right', 'workInMenus'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>LMB Lock</Label>
            <Switch checked={r.LMBLock} onCheckedChange={(v) => updateConfig(['right', 'LMBLock'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Blatant Mode</Label>
            <Switch checked={r.blatant} onCheckedChange={(v) => updateConfig(['right', 'blatant'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Items Mode</Label>
            <Switch checked={r.items} onCheckedChange={(v) => updateConfig(['right', 'items'], v)} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
