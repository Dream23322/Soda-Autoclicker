import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Pencil, Check, X } from 'lucide-react'
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

const QUICKLAUNCH_KEY = 'quicklaunchPresets'
const MAX_QUICKLAUNCH = 6

function loadSelection(): string[] {
  try {
    const raw = localStorage.getItem(QUICKLAUNCH_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr)
      ? arr.filter((x: unknown) => typeof x === 'string').slice(0, MAX_QUICKLAUNCH)
      : []
  } catch {
    return []
  }
}

function saveSelection(filenames: string[]): void {
  try {
    localStorage.setItem(QUICKLAUNCH_KEY, JSON.stringify(filenames.slice(0, MAX_QUICKLAUNCH)))
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
  const { config, getStatus } = useAutoclicker()
  const [status, setStatus] = useState<any>(null)
  const [presets, setPresets] = useState<PresetInfo[]>([])
  const [selection, setSelection] = useState<string[]>(loadSelection())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const [updateInfo, setUpdateInfo] = useState<{ version: string; downloadUrl: string; notes: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const effectiveConfig = config || _config

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

  const loadPreset = async (filename: string): Promise<void> => {
    try {
      // @ts-ignore
      await window.electron.autoclicker.loadPreset(filename)
      window.location.reload()
    } catch {}
  }

  const startEdit = (): void => {
    const seed = selection.length > 0
      ? selection.filter(f => presets.some(p => p.filename === f))
      : presets.slice(0, MAX_QUICKLAUNCH).map(p => p.filename)
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

  const toggleDraft = (filename: string): void => {
    setDraft(prev => {
      if (prev.includes(filename)) return prev.filter(f => f !== filename)
      if (prev.length >= MAX_QUICKLAUNCH) return prev
      return [...prev, filename]
    })
  }

  // Hide filenames that no longer exist, fall back to first 6 if nothing picked
  const byName = new Map<string, PresetInfo>(presets.map(p => [p.filename, p]))
  const visiblePresets: PresetInfo[] = selection.length > 0
    ? selection.map(f => byName.get(f)).filter((p): p is PresetInfo => p !== undefined)
    : presets.slice(0, MAX_QUICKLAUNCH)

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
      {updateInfo && (
        <div className="border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary">update available — v{updateInfo.version}</p>
            {updateInfo.notes && <p className="text-[10px] text-muted-foreground truncate">{updateInfo.notes}</p>}
          </div>
          <button
            onClick={async () => {
              setUpdating(true)
              try {
                const e = (window as any).electron
                const result = await e.update.downloadAndInstall(updateInfo.downloadUrl)
                if (!result.ok) console.error('Update failed:', result.error)
              } catch (e) { console.error('Update failed:', e) }
              setUpdating(false)
            }}
            disabled={updating}
            className="flex-shrink-0 text-xs bg-primary text-primary-foreground px-3 py-1.5 font-bold cursor-pointer disabled:opacity-50 border-none"
          >
            {updating ? 'downloading...' : 'update'}
          </button>
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
          {!editing && presets.length > 0 && (
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
              <button
                onClick={saveEdit}
                className="text-primary hover:opacity-80 cursor-pointer"
                title="Save"
                aria-label="Save quicklaunch"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={cancelEdit}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Cancel"
                aria-label="Cancel edit"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          presets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-[#1a1a1a]">no configs to pick from</p>
          ) : (
            <div className="space-y-1 border border-[#1a1a1a] bg-[#0d0d0d] p-2 max-h-72 overflow-y-auto">
              {presets.map(p => {
                const checked = draft.includes(p.filename)
                const disabled = !checked && draft.length >= MAX_QUICKLAUNCH
                return (
                  <label
                    key={p.filename}
                    className={`flex items-center gap-2 p-1.5 cursor-pointer hover:bg-[#141414] ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleDraft(p.filename)}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{p.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.description || p.Author || ''}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )
        ) : visiblePresets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-[#1a1a1a]">no configs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visiblePresets.map((p: PresetInfo) => (
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
