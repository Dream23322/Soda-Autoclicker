import { useEffect, useState, Component, ReactNode } from 'react'

class Safe extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e: Error) { console.error('[overlay] error:', e) }
  render() { return this.state.hasError ? null : this.props.children }
}

interface OverlayItem { t: string; v: any; l?: number; filled?: number; pct?: number }

function useOverlayState() {
  const [l, setL] = useState(false)
  const [r, setR] = useState(false)
  const [pos, setPos] = useState('top-right')
  const [layout, setLayout] = useState('horizontal')
  const [enabled, setEnabled] = useState(false)
  const [moduleItems, setModuleItems] = useState<OverlayItem[]>([])

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        // @ts-ignore
        const s = await window.electron.autoclicker.getStatus()
        if (!alive) return
        if (s) {
          setL(!!s.leftEnabled); setR(!!s.rightEnabled)
          if (s.overlayPosition) setPos(s.overlayPosition)
          if (s.overlayLayout) setLayout(s.overlayLayout)
          setEnabled(s.overlayEnabled !== false)
        }
      } catch {}
      try {
        // @ts-ignore
        const mt = await window.electron.autoclicker.getModuleOverlay()
        if (alive) setModuleItems(mt || [])
      } catch {}
    }
    poll()
    const id = setInterval(poll, 80)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return { l, r, pos, layout, enabled, moduleItems }
}

const POS_STYLES: Record<string, { top?: number; bottom?: number; left?: number; right?: number }> = {
  'top-left': { top: 4, left: 8 },
  'top-right': { top: 4, right: 8 },
  'bottom-left': { bottom: 4, left: 8 },
  'bottom-right': { bottom: 4, right: 8 },
}

function Dot({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 7px',
      background: on ? 'rgba(13,13,13,0.75)' : 'rgba(13,13,13,0.35)',
      border: on ? '0.5px solid color-mix(in srgb, var(--primary) 40%, transparent)' : '0.5px solid rgba(26,26,26,0.5)',
    }}>
      <span style={{
        display: 'inline-block', width: 6, height: 6,
        background: on ? 'var(--primary)' : '#333',
        boxShadow: on ? '0 0 5px var(--primary), 0 0 10px var(--primary)' : 'none',
        transition: 'all 0.2s',
      }} />
      <span style={{
        color: on ? '#c8c8c8' : '#585858',
        fontWeight: 700, fontSize: 10, lineHeight: '14px',
        transition: 'color 0.2s',
      }}>
        {label}
      </span>
    </div>
  )
}

export function StatusOverlay() {
  const { l, r, pos, layout, enabled, moduleItems } = useOverlayState()

  if (!enabled) return null

  const position = POS_STYLES[pos] ?? POS_STYLES['top-right']

  return (
    <Safe>
      <div style={{
        position: 'fixed',
        ...position,
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        gap: 4,
        fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code","Consolas",monospace',
        fontSize: 11, userSelect: 'none', pointerEvents: 'none',
      }}>
        <Dot label="L" on={l} />
        <Dot label="R" on={r} />
        {moduleItems.filter(i => i.t !== 'dot').length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(13,13,13,0.6)', padding: '2px 5px' }}>
            {moduleItems.filter(i => i.t !== 'dot').map((item, i) => {
              if (item.t === 'bar') {
                const pct = (item as any).v
                const len = (item as any).l || 10
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}>
                    <span style={{ width: len * 5 + 2, height: 6, background: '#1a1a1a', display: 'inline-flex', alignItems: 'center', padding: '0 1px' }}>
                      <span style={{ width: Math.round(pct * len * 5), height: 4, background: 'var(--primary)', transition: 'width 0.3s' }} />
                    </span>
                    <span style={{ color: '#585858', fontSize: 9 }}>{Math.round(pct * 100)}%</span>
                  </div>
                )
              }
              return <span key={i} style={{ fontSize: 10, lineHeight: '14px', color: '#c8c8c8', whiteSpace: 'nowrap' }}>{(item as any).v}</span>
            })}
          </div>
        )}
        {(() => {
          const dots = moduleItems.filter(i => i.t === 'dot')
          if (dots.length === 0) return null
          const cols = Math.ceil(Math.sqrt(dots.length))
          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 16px)`,
              gap: 3,
              background: 'rgba(13,13,13,0.6)',
              padding: '4px',
              placeItems: 'center',
            }}>
              {dots.map((item, i) => {
                const pct = (item as any).pct ?? 1
                return (
                  <div key={i} style={{
                    width: 12, height: 12,
                    background: `color-mix(in srgb, var(--primary) ${Math.round(pct * 100)}%, transparent)`,
                    boxShadow: pct > 0.5 ? `0 0 6px var(--primary), 0 0 12px var(--primary)` : 'none',
                    transition: 'all 0.08s',
                  }} />
                )
              })}
            </div>
          )
        })()}
      </div>
    </Safe>
  )
}
