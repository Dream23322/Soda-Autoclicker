import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'

interface GuideStep {
  selector?: string
  title: string
  description: string
  navigateTo?: string
  autoClick?: boolean
}

const STEPS: GuideStep[] = [
  {
    title: 'Welcome to Soda Autoclicker',
    description: 'This guide will walk you through every page and feature. You can skip at any time with the Skip button or click the background to exit.',
  },
  {
    selector: 'a[href="/"]',
    title: 'Dashboard',
    description: 'Your home base. See game status, your current config, detection risk profile, and launch presets or module scripts with one click.',
    navigateTo: '/',
  },
  {
    selector: 'a[href="/left-clicker"]',
    title: 'Left Clicker',
    description: 'Configure auto-clicking for the left mouse button. Adjust CPS, choose Hold or Always mode, enable block hitting, AutoRod, jitter shake, and more.',
    navigateTo: '/left-clicker',
  },
  {
    selector: 'a[href="/right-clicker"]',
    title: 'Right Clicker',
    description: 'Set up right-click automation with CPS randomization, item mode, LMB lock, and shake effect.',
    navigateTo: '/right-clicker',
  },
  {
    selector: 'a[href="/recorder"]',
    title: 'Recorder',
    description: 'Record your natural clicking pattern and replay it. Uses your real click timing for undetectable autoclicking.',
    navigateTo: '/recorder',
  },
  {
    selector: 'a[href="/movement"]',
    title: 'Movement',
    description: 'W-tap, auto-sprint, SOCD cleaner (better input), and fast-stop. Movement assistance for PvP.',
    navigateTo: '/movement',
  },
  {
    selector: 'a[href="/developer"]',
    title: 'Developer',
    description: 'Two powerful tools: Scripts for writing automation code with rich syntax support, and Macros for building step-by-step visual action sequences.',
    navigateTo: '/developer',
  },
  {
    selector: '[data-guide="scripts-tab"]',
    title: 'Scripts Tab',
    description: 'Write custom automation using commands like delay(), key(), click(), pitch(), and variables. Use autocomplete (Ctrl+Space) and see live syntax errors.',
  },
  {
    selector: '[data-guide="macros-tab"]',
    title: 'Macros Tab',
    description: 'Build visual macro sequences step by step. Add Delay, Tap, Hold, Click, Rod, Pearl, Condition, Loop, and Script actions. Reorder with drag handles.',
    autoClick: true,
  },
  {
    selector: '[data-guide="scripting-docs"]',
    title: 'Scripting Reference',
    description: 'Full documentation for all script commands: variables, math expressions, conditions (if/endif), overlay commands, and VK key codes.',
    autoClick: true,
  },
  {
    selector: 'a[href="/cloud"]',
    title: 'Cloud',
    description: 'Sync your configs and macros across devices. Upload, download, and share presets with the community.',
    navigateTo: '/cloud',
  },
  {
    selector: 'a[href="/settings"]',
    title: 'Settings',
    description: 'Customize window title, overlay appearance (position, layout, colors), toggle sounds, Discord Rich Presence, and compatibility mode.',
    navigateTo: '/settings',
  },
  {
    title: 'You\'re all set!',
    description: 'You have completed the guide. Explore the app freely — the sidebar takes you to any page. Join the Discord if you need help.',
  },
]

interface Props {
  onClose: () => void
}

export default function GuideMode({ onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const step = STEPS[stepIdx]

  // Navigate when step requires a different route
  useEffect(() => {
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo)
    }
  }, [stepIdx])

  // Find and measure the target element
  useEffect(() => {
    if (!step.selector) { setRect(null); return }

    const autoClickedRef = { current: false }

    const find = () => {
      const el = document.querySelector(step.selector!) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setRect(el.getBoundingClientRect())
        if (step.autoClick && !autoClickedRef.current) {
          autoClickedRef.current = true
          setTimeout(() => el.click(), 400)
        }
        return true
      }
      return false
    }

    if (!find()) {
      clearInterval(pollRef.current)
      pollRef.current = setInterval(() => {
        if (find()) clearInterval(pollRef.current)
      }, 200)
    }

    return () => { clearInterval(pollRef.current) }
  }, [stepIdx, step.selector, step.autoClick, location.pathname])

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1)
    else onClose()
  }

  const goPrev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  const isFirst = stepIdx === 0
  const isLast = stepIdx === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
      {/* Spotlight */}
      {rect && (
        <div
          className="absolute transition-all duration-500 ease-in-out"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 4,
            boxShadow: '0 0 0 3px rgba(124, 156, 237, 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.55)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 max-w-sm w-full px-4"
        style={{ bottom: '2rem', pointerEvents: 'auto' }}
      >
        <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4 shadow-2xl">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1 mb-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === stepIdx ? 'w-6 bg-primary' : i < stepIdx ? 'w-1 bg-primary/40' : 'w-1 bg-[#333]'}`}
              />
            ))}
          </div>

          <h3 className="text-sm font-bold mb-1">{step.title}</h3>
          <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">{step.description}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-[10px] text-[#555] hover:text-foreground transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={goNext}
                className="text-[10px] bg-primary text-primary-foreground px-3 py-1 font-bold cursor-pointer border-none"
              >
                {isLast ? 'Done' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
