import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useAutoclicker } from '@/hooks/use-autoclicker'

interface Props {
  config: any
}

function estimateBlatantness(cfg: any): { level: string; risk: string; color: string; bars: string } {
  if (!cfg) return { level: 'unknown', risk: 'N/A', color: '#585858', bars: '··' }
  const l = cfg.left
  let score = 0
  if (l.blatant) score += 4
  if (l.averageCPS > 20) score += 2
  if (l.averageCPS > 14) score += 1
  if (l.shakeEffect) score -= 1
  if (l.blockHit) score -= 1
  if (l.AutoRod) score -= 1
  if (l.breakBlocks !== 'None') score += 1
  if (l.onlyWhenFocused) score -= 1

  const bars = score >= 5 ? '███' : score >= 3 ? '██' : score >= 1 ? '█' : '▁'
  if (score >= 5) return { level: 'blatant', risk: 'HIGH', color: '#ff3355', bars }
  if (score >= 3) return { level: 'suspicious', risk: 'MOD', color: '#ff8800', bars }
  if (score >= 1) return { level: 'careful', risk: 'LOW', color: '#ffcc00', bars }
  return { level: 'stealth', risk: 'MIN', color: 'var(--primary)', bars }
}

export default function HomePage({ config: _config }: Props) {
  const { config, getStatus } = useAutoclicker()
  const [status, setStatus] = useState<any>(null)
  const [presets, setPresets] = useState<any[]>([])
  const effectiveConfig = config || _config

  useEffect(() => {
    getStatus().then(setStatus)
    const interval = setInterval(() => getStatus().then(setStatus), 2000)
    return () => clearInterval(interval)
  }, [getStatus])

  useEffect(() => {
    ;(window as any).electron?.autoclicker?.getConfigs().then(setPresets).catch(() => {})
  }, [])

  const loadPreset = async (filename: string) => {
    try {
      // @ts-ignore
      await window.electron.autoclicker.loadPreset(filename)
      window.location.reload()
    } catch {}
  }

  const blatant = estimateBlatantness(effectiveConfig)

  return (
    <div className="space-y-4 max-w-xl mx-auto pt-4">

      {/* Header */}
      <div className="text-center border border-[#1a1a1a] p-3">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">$</span> soda-autoclicker <span className="text-muted-foreground">v2.0.1-beta</span>
        </p>
      </div>

      {/* Game + Config row */}
      <div className="flex gap-3">
        <Card className="flex-1">
          <CardContent className="pt-3 pb-3 space-y-1">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Game</p>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-none ${status?.isGameFocused ? 'bg-primary' : 'bg-[#333]'}`} />
              <span className="text-sm font-bold">{status?.isGameFocused ? 'found' : 'not_found'}</span>
            </div>
            {status?.focusedProcess && (
              <p className="text-[10px] text-muted-foreground">{status.focusedProcess}</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex-[2]">
          <CardContent className="pt-3 pb-3 space-y-1">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Config</p>
            <p className="text-sm font-bold truncate">{effectiveConfig?.displayName || 'default'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{effectiveConfig?.description || ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Blatant meter */}
      <Card>
        <CardContent className="pt-3 pb-3 space-y-1">
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Detection Profile</p>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold tracking-widest" style={{ color: blatant.color }}>{blatant.bars}</span>
            <span className="text-sm font-bold" style={{ color: blatant.color }}>{blatant.level}</span>
            <span className="text-[10px] text-muted-foreground">risk: {blatant.risk}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quicklaunch configs */}
      <div>
        <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-2">Quicklaunch</p>
        {presets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-[#1a1a1a]">no configs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.filename}
                onClick={() => loadPreset(p.filename)}
                className="text-left border border-[#1a1a1a] bg-[#0d0d0d] hover:bg-[#141414] hover:border-[#333] transition-colors p-3 cursor-pointer"
              >
                <p className="text-xs font-bold truncate">{p.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.description || p.Author || ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Credits */}
      <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-[#1a1a1a]">
        developed by 4urxra
      </p>
    </div>
  )
}
