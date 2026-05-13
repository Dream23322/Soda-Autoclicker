import { useEffect, useState, Component, ReactNode } from 'react'

class Safe extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e: Error) { console.error('[overlay] error:', e) }
  render() { return this.state.hasError ? null : this.props.children }
}

function useOverlayState() {
  const [l, setL] = useState(false)
  const [r, setR] = useState(false)
  const [pos, setPos] = useState('top-right')
  const [layout, setLayout] = useState('horizontal')
  const [enabled, setEnabled] = useState(false)

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
    }
    poll()
    const id = setInterval(poll, 300)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return { l, r, pos, layout, enabled }
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
  const { l, r, pos, layout, enabled } = useOverlayState()

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
      </div>
    </Safe>
  )
}
