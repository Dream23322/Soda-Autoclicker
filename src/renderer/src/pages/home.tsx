import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Pencil, Check, X, FileEdit, Code, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAutoclicker } from '@/hooks/use-autoclicker'

interface Props {
  config: any
}

interface PresetInfo {
  filename: string
  displayName: string
  Author?: string
  description?: string
}

interface QuicklaunchSlot {
  type: 'config' | 'script'
  id: string
}

const QUICKLAUNCH_KEY = 'quicklaunchPresets'
const MAX_QUICKLAUNCH = 6

function loadSelection(): QuicklaunchSlot[] {
  try {
    const raw = localStorage.getItem(QUICKLAUNCH_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    if (arr.length > 0 && typeof arr[0] === 'string') {
      const migrated = arr.filter((x: unknown) => typeof x === 'string').map((f: string) => ({ type: 'config' as const, id: f }))
      try { localStorage.setItem(QUICKLAUNCH_KEY, JSON.stringify(migrated.slice(0, MAX_QUICKLAUNCH))) } catch {}
      return migrated.slice(0, MAX_QUICKLAUNCH)
    }
    return arr.filter((x: unknown) => x && typeof x === 'object' && (x as any).type && (x as any).id)
      .map((x: any) => ({ type: x.type, id: x.id }))
      .slice(0, MAX_QUICKLAUNCH)
  } catch {
    return []
  }
}

function saveSelection(slots: QuicklaunchSlot[]): void {
  try {
    localStorage.setItem(QUICKLAUNCH_KEY, JSON.stringify(slots.slice(0, MAX_QUICKLAUNCH)))
  } catch {}
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

  const bars = score >= 5 ? '███' : score >= 3 ? '██ ' : score >= 1 ? '█' : '▁'
  if (score >= 5) return { level: 'blatant', risk: 'HIGH', color: '#ff3355', bars }
  if (score >= 3) return { level: 'suspicious', risk: 'MOD', color: '#ff8800', bars }
  if (score >= 1) return { level: 'careful', risk: 'LOW', color: '#ffcc00', bars }
  return { level: 'stealth', risk: 'MIN', color: 'var(--primary)', bars }
}

export default function HomePage({ config: _config }: Props) {
  const { config, loadConfig, getStatus, updateConfig } = useAutoclicker()
  const [status, setStatus] = useState<any>(null)
  const [presets, setPresets] = useState<PresetInfo[]>([])
  const [selection, setSelection] = useState<QuicklaunchSlot[]>(loadSelection())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<QuicklaunchSlot[]>([])
  const [updateInfo, setUpdateInfo] = useState<{ version: string; downloadUrl: string; notes: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateError, setUpdateError] = useState("")
  const effectiveConfig = config || _config
  const scripts: { name: string; module: boolean }[] = effectiveConfig?.scripts?.list || []
  const moduleScripts = scripts.filter(s => s.module)

  useEffect(() => {
    const e = (window as any).electron
    e?.update?.currentVersion().then((v: string) => {
      const el = document.getElementById('app-version')
      if (el) el.textContent = 'v' + v
    }).catch(() => {})
    e?.update?.check().then((info: any) => {
      if (info?.version) setUpdateInfo(info)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    getStatus().then(setStatus)
    const interval = setInterval(() => getStatus().then(setStatus), 2000)
    return () => clearInterval(interval)
  }, [getStatus])

  useEffect(() => {
    ;(window as any).electron?.autoclicker?.getConfigs().then(setPresets).catch(() => {})
  }, [])

  const handleFullStart = async () => {
    const e = (window as any).electron
    for (const slot of selection) {
      if (slot.type === 'config') {
        try { await e.autoclicker.loadPreset(slot.id) } catch {}
      } else {
        try { await e.autoclicker.startScriptModule(slot.id) } catch {}
      }
    }
    await loadConfig()
    for (const slot of selection) {
      if (slot.type === 'config') {
        updateConfig(['left', 'enabled'], true)
        updateConfig(['right', 'enabled'], true)
      }
    }
  }

  const loadPreset = async (filename: string): Promise<void> => {
    try {
      // @ts-ignore
      await window.electron.autoclicker.loadPreset(filename)
      await loadConfig()
    } catch {}
  }

  const startEdit = (): void => {
    const seed = selection.length > 0
      ? selection.filter(s =>
          (s.type === 'config' && presets.some(p => p.filename === s.id)) ||
          (s.type === 'script' && moduleScripts.some(sc => sc.name === s.id))
        )
      : [
          ...presets.slice(0, MAX_QUICKLAUNCH).map(p => ({ type: 'config' as const, id: p.filename })),
          ...moduleScripts.slice(0, MAX_QUICKLAUNCH).map(s => ({ type: 'script' as const, id: s.name })),
        ].slice(0, MAX_QUICKLAUNCH)
    setDraft(seed)
    setEditing(true)
  }

  const cancelEdit = (): void => {
    setEditing(false)
  }

  const saveEdit = (): void => {
    saveSelection(draft)
    setSelection(draft)
    setEditing(false)
  }

  const toggleDraft = (slot: QuicklaunchSlot): void => {
    setDraft(prev => {
      const idx = prev.findIndex(s => s.type === slot.type && s.id === slot.id)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      if (prev.length >= MAX_QUICKLAUNCH) return prev
      return [...prev, slot]
    })
  }

  // Resolve visible slots, falling back to first 6 available items
  const byName = new Map<string, PresetInfo>(presets.map(p => [p.filename, p]))
  const scriptByName = new Map<string, { name: string; module: boolean }>(moduleScripts.map(s => [s.name, s]))
  const visibleSlots: ({ type: 'config' | 'script'; id: string; displayName: string; description?: string })[] =
    selection.length > 0
      ? selection.map(slot => {
          if (slot.type === 'config') {
            const p = byName.get(slot.id)
            return p ? { type: 'config' as const, id: slot.id, displayName: p.displayName, description: p.description || p.Author } : null
          }
          const s = scriptByName.get(slot.id)
          return s ? { type: 'script' as const, id: slot.id, displayName: s.name } : null
        }).filter((x): x is NonNullable<typeof x> => x !== null)
      : [
          ...presets.slice(0, MAX_QUICKLAUNCH).map(p => ({ type: 'config' as const, id: p.filename, displayName: p.displayName, description: p.description || p.Author })),
          ...moduleScripts.slice(0, MAX_QUICKLAUNCH).map(s => ({ type: 'script' as const, id: s.name, displayName: s.name })),
        ].slice(0, MAX_QUICKLAUNCH)

  const blatant = estimateBlatantness(effectiveConfig)
  const blatantColor: CSSProperties = { color: blatant.color }

  return (
    <div className="space-y-4 max-w-xl mx-auto pt-4">

      {/* Header */}
      <div className="text-center border border-[#1a1a1a] p-3">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">$</span> soda-autoclicker <span className="text-muted-foreground" id="app-version">v2.0.3-beta</span>
        </p>
      </div>

      {/* Update banner */}
      {updateInfo && !updateError && (
        <div className="border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">update available — v{updateInfo.version}</p>
              {updateInfo.notes && <p className="text-[10px] text-muted-foreground truncate">{updateInfo.notes}</p>}
            </div>
            {!updating && (
              <button
                onClick={() => {
                  setUpdating(true)
                  setDownloadProgress(0)
                  const e = (window as any).electron
                  const cleanup = e.update.onProgress((pct: number) => {
                    if (pct === -1) { /* app will quit */ }
                    else setDownloadProgress(pct)
                  })
                  e.update.onError((err: string) => {
                    setUpdateError(err)
                    setUpdating(false)
                    cleanup()
                  })
                  e.update.startDownload(updateInfo.downloadUrl)
                }}
                className="flex-shrink-0 text-xs bg-primary text-primary-foreground px-3 py-1.5 font-bold cursor-pointer border-none"
              >
                update
              </button>
            )}
          </div>
          {updating && (
            <div className="w-full bg-[#1a1a1a] h-2 mt-1">
              <div
                className="bg-primary h-2 transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
          {updating && downloadProgress > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">{downloadProgress}%</p>
          )}
        </div>
      )}
      {updateError && (
        <div className="border border-red-500/30 bg-red-500/5 p-3 flex items-center justify-between gap-2">
          <p className="text-xs text-red-500">update failed: {updateError}</p>
          <button onClick={() => setUpdateError("")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none">dismiss</button>
        </div>
      )}

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
            <span className="text-xl font-bold tracking-widest" style={blatantColor}>{blatant.bars}</span>
            <span className="text-sm font-bold" style={blatantColor}>{blatant.level}</span>
            <span className="text-[10px] text-muted-foreground">risk: {blatant.risk}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quicklaunch */}
      <div className="group">
        <div className="flex items-center justify-between mb-2 h-4">
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Quicklaunch</p>
          <div className="flex items-center gap-2">
            {!editing && visibleSlots.length > 0 && selection.length > 0 && (
              <button
                onClick={handleFullStart}
                className="text-[10px] text-primary hover:opacity-80 cursor-pointer flex items-center gap-1"
                title="Start all quicklaunch items"
              >
                <Play size={10} /> Full Start
              </button>
            )}
            {!editing && (presets.length > 0 || moduleScripts.length > 0) && (
              <button
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-primary cursor-pointer"
                title="Edit quicklaunch"
                aria-label="Edit quicklaunch"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{draft.length}/{MAX_QUICKLAUNCH}</span>
                <button onClick={saveEdit} className="text-primary hover:opacity-80 cursor-pointer" title="Save" aria-label="Save quicklaunch">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground cursor-pointer" title="Cancel" aria-label="Cancel edit">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-1 border border-[#1a1a1a] bg-[#0d0d0d] p-2 max-h-72 overflow-y-auto">
            {presets.map(p => {
              const checked = draft.some(s => s.type === 'config' && s.id === p.filename)
              const disabled = !checked && draft.length >= MAX_QUICKLAUNCH
              return (
                <label key={`cfg:${p.filename}`}
                  className={`flex items-center gap-2 p-1.5 cursor-pointer hover:bg-[#141414] ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <input type="checkbox" checked={checked} disabled={disabled}
                    onChange={() => toggleDraft({ type: 'config', id: p.filename })}
                    className="accent-primary"
                  />
                  <FileEdit size={12} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.description || p.Author || ''}</p>
                  </div>
                </label>
              )
            })}
            {moduleScripts.map(s => {
              const checked = draft.some(sl => sl.type === 'script' && sl.id === s.name)
              const disabled = !checked && draft.length >= MAX_QUICKLAUNCH
              return (
                <label key={`scr:${s.name}`}
                  className={`flex items-center gap-2 p-1.5 cursor-pointer hover:bg-[#141414] ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <input type="checkbox" checked={checked} disabled={disabled}
                    onChange={() => toggleDraft({ type: 'script', id: s.name })}
                    className="accent-primary"
                  />
                  <Code size={12} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{s.name}</p>
                  </div>
                  <span className="text-[8px] text-primary border border-primary/30 px-1 shrink-0">module</span>
                </label>
              )
            })}
            {presets.length === 0 && moduleScripts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">no configs or module scripts available</p>
            )}
          </div>
        ) : visibleSlots.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-[#1a1a1a]">no quicklaunch items</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visibleSlots.map(slot => (
              <button
                key={`${slot.type}:${slot.id}`}
                onClick={() => slot.type === 'config' ? loadPreset(slot.id) : (window as any).electron?.autoclicker?.startScriptModule(slot.id)}
                className="text-left border border-[#1a1a1a] bg-[#0d0d0d] hover:bg-[#141414] hover:border-[#333] transition-colors p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {slot.type === 'config' ? (
                    <FileEdit size={14} className="text-muted-foreground shrink-0" />
                  ) : (
                    <Code size={14} className="text-primary shrink-0" />
                  )}
                  <p className="text-xs font-bold truncate">{slot.displayName}</p>
                </div>
                {slot.type === 'config' && slot.description && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{slot.description}</p>
                )}
                {slot.type === 'script' && (
                  <span className="text-[8px] text-primary border border-primary/30 px-1 mt-0.5 inline-block">module</span>
                )}
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
