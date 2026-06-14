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

export function LeftClickerPage({ config, updateConfig }: Props) {
  if (!config) return null
  const l = config.left
  const [showRange, setShowRange] = useState(l.minCPS < l.averageCPS)
  const [localAvgCPS, setLocalAvgCPS] = useState(l.averageCPS)
  const [localMinCPS, setLocalMinCPS] = useState(l.minCPS)
  const gap = localAvgCPS - localMinCPS

  useEffect(() => { setLocalAvgCPS(l.averageCPS) }, [l.averageCPS])
  useEffect(() => { setLocalMinCPS(l.minCPS) }, [l.minCPS])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Left Clicker</h1>

      <Card>
        <CardHeader><CardTitle>Main</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={l.enabled} onCheckedChange={(v) => updateConfig(['left', 'enabled'], v)} />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <BindButton currentBind={l.bind} configPath={['left', 'bind']} onBindChange={updateConfig} label="Toggle Bind" />
            <div className="flex items-center gap-2">
              <Label>Mode</Label>
              <Select value={l.mode} onValueChange={(v) => updateConfig(['left', 'mode'], v)}>
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
              <Label>Average CPS: {l.averageCPS}</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowRange(!showRange)}
              >
                {showRange ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
            <Slider min={1} max={60} step={1} value={[localAvgCPS]} onValueChange={([v]) => setLocalAvgCPS(v[0])} onValueCommit={([v]) => { updateConfig(['left', 'averageCPS'], v); if (!showRange) updateConfig(['left', 'minCPS'], v) }} />
          </div>
          {showRange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Min CPS: {localMinCPS}</Label>
              </div>
              <Slider min={1} max={60} step={1} value={[localMinCPS]} onValueChange={([v]) => setLocalMinCPS(v[0])} onValueCommit={([v]) => updateConfig(['left', 'minCPS'], v)} />
              {gap < 4 && gap > 0 && (
                <p className="text-[10px] text-muted-foreground">a gap of at least 4 is recommended</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Block Hit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Block Hit</Label>
            <Switch checked={l.blockHit} onCheckedChange={(v) => updateConfig(['left', 'blockHit'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Chance: {l.blockHitChance}%</Label>
            <Slider min={1} max={100} step={1} value={[l.blockHitChance]} onValueCommit={([v]) => updateConfig(['left', 'blockHitChance'], v)} />
          </div>
          <BindButton currentBind={l.smartBH} configPath={['left', 'smartBH']} onBindChange={updateConfig} label="Smart BH" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Effects</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Shake Effect</Label>
            <Switch checked={l.shakeEffect} onCheckedChange={(v) => updateConfig(['left', 'shakeEffect'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Shake Force: {l.shakeEffectForce}</Label>
            <Slider min={1} max={20} step={1} value={[l.shakeEffectForce]} onValueCommit={([v]) => updateConfig(['left', 'shakeEffectForce'], v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Auto Rod</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto Rod</Label>
            <Switch checked={l.AutoRod} onCheckedChange={(v) => updateConfig(['left', 'AutoRod'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Chance: {l.AutoRodChance}%</Label>
            <Slider min={1} max={100} step={1} value={[l.AutoRodChance]} onValueCommit={([v]) => updateConfig(['left', 'AutoRodChance'], v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Advanced</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Only In Game</Label>
            <Switch checked={l.onlyWhenFocused} onCheckedChange={(v) => updateConfig(['left', 'onlyWhenFocused'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Work in Menus</Label>
            <Switch checked={l.workInMenus} onCheckedChange={(v) => updateConfig(['left', 'workInMenus'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>RMB Lock</Label>
            <Switch checked={l.RMBLock} onCheckedChange={(v) => updateConfig(['left', 'RMBLock'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Blatant Mode</Label>
            <Switch checked={l.blatant} onCheckedChange={(v) => updateConfig(['left', 'blatant'], v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>FullScreen Fix</Label>
            <Switch checked={l.fullscreenMode} onCheckedChange={(v) => updateConfig(['left', 'fullscreenMode'], v)} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Break Blocks</Label>
            <Select value={l.breakBlocks} onValueChange={(v) => updateConfig(['left', 'breakBlocks'], v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Full">Full</SelectItem>
                <SelectItem value="Shift With Click">Shift With Click</SelectItem>
                <SelectItem value="Shift No Click">Shift No Click</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label>// May cause issues with some clients. If the clicker isn't working this might be it.</Label>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
