import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

export function RecorderPage({ config, updateConfig }: Props) {
  if (!config?.recorder) return <p className="text-xs text-muted-foreground p-4">loading...</p>
  const r = config.recorder
  const [recording, setRecording] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const rec = r.record ?? []
  const mult = r.recordMultiplier ?? 1
  const avgCps = rec.length > 0
    ? Math.round((rec.length / (rec.reduce((a: number, b: number) => a + b, 0) || 1)) * mult * 100) / 100
    : 0

  const startRecording = () => {
    setRecording(true)
    setClickCount(0)
    const recorded: number[] = []
    let lastTime = Date.now()

    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return
      const now = Date.now()
      recorded.push(now - lastTime)
      lastTime = now
      setClickCount(recorded.length)
    }

    window.addEventListener('mousedown', handler)

    // Auto-stop after 10 seconds or manual stop
    const checkInterval = setInterval(() => {
      if (!recording) {
        clearInterval(checkInterval)
        window.removeEventListener('mousedown', handler)
        if (recorded.length < 2) {
          recorded.length = 0
          recorded.push(0.08)
        } else {
          recorded[0] = 0
          recorded.pop()
        }
        updateConfig(['recorder', 'record'], recorded)
      }
    }, 100)

    // Store cleanup
    ;(window as any).__recorderCleanup = () => {
      clearInterval(checkInterval)
      window.removeEventListener('mousedown', handler)
      if (recorded.length < 2) {
        recorded.length = 0
        recorded.push(0.08)
      } else {
        recorded[0] = 0
        recorded.pop()
      }
      updateConfig(['recorder', 'record'], recorded)
    }
  }

  const stopRecording = () => {
    setRecording(false)
    if ((window as any).__recorderCleanup) {
      ;(window as any).__recorderCleanup()
      ;(window as any).__recorderCleanup = null
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recorder</h1>

      <Card>
        <CardHeader><CardTitle>Recorder</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Records your legit clicking pattern to replay. Click Start, click naturally, then Stop.
          </p>
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={!!r.enabled} onCheckedChange={(v) => updateConfig(['recorder', 'enabled'], v)} />
          </div>
          <div className="space-y-2">
            <Label>Multiplier: {(r.recordMultiplier ?? 1).toFixed(2)}x</Label>
            <Slider min={0.5} max={2.5} step={0.1} value={[r.recordMultiplier ?? 1]}
              onValueChange={([v]) => updateConfig(['recorder', 'recordMultiplier'], Math.round(v * 100) / 100)} />{/*  */}
          </div>
          <div className="flex gap-2">
            <Button onClick={startRecording} disabled={recording}>Start Recording</Button>
            <Button onClick={stopRecording} disabled={!recording} variant="outline">Stop Recording</Button>
          </div>
          {recording && <p className="text-sm text-primary">Recording... Clicks: {clickCount}</p>}
          <p className="text-sm text-muted-foreground">Average CPS: {avgCps}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
