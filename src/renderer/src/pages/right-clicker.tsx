import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BindButton } from '@/components/bind-button'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

export function RightClickerPage({ config, updateConfig }: Props) {
  if (!config) return null
  const r = config.right
  const [showRange, setShowRange] = useState(r.minCPS < r.averageCPS)
  const [localAvgCPS, setLocalAvgCPS] = useState(r.averageCPS)
  const [localMinCPS, setLocalMinCPS] = useState(r.minCPS)
  const gap = localAvgCPS - localMinCPS

  useEffect(() => { setLocalAvgCPS(r.averageCPS) }, [r.averageCPS])
  useEffect(() => { setLocalMinCPS(r.minCPS) }, [r.minCPS])

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
                  <SelectItem value="ClickHold">Click + Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Average CPS: {r.averageCPS}</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowRange(!showRange)}
              >
                {showRange ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
            <Slider min={1} max={60} step={1} value={[localAvgCPS]} onValueChange={([v]) => setLocalAvgCPS(v[0])} onValueCommit={([v]) => { updateConfig(['right', 'averageCPS'], v); if (!showRange) updateConfig(['right', 'minCPS'], v) }} />
          </div>
          {showRange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Min CPS: {localMinCPS}</Label>
              </div>
              <Slider min={1} max={60} step={1} value={[localMinCPS]} onValueChange={([v]) => setLocalMinCPS(v[0])} onValueCommit={([v]) => updateConfig(['right', 'minCPS'], v)} />
              {gap < 4 && gap > 0 && (
                <p className="text-[10px] text-muted-foreground">a gap of at least 4 is recommended</p>
              )}
            </div>
          )}
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
            <Slider min={1} max={20} step={1} value={[r.shakeEffectForce]} onValueCommit={([v]) => updateConfig(['right', 'shakeEffectForce'], v)} />
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
            <Label>Fullscreen Fix</Label>
            <Switch checked={r.fullscreenMode} onCheckedChange={(v) => updateConfig(['right', 'fullscreenMode'], v)} />

          </div>
          <div className="flex items-center justify-between">
            <Label>Items Mode</Label>
            <Switch checked={r.items} onCheckedChange={(v) => updateConfig(['right', 'items'], v)} />
          </div>
          <Label>// May cause issues with some clients. If the clicker isn't working this might be it.</Label>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
