import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface BindButtonProps {
  currentBind: number
  configPath: string[]
  onBindChange: (path: string[], value: unknown) => void
  label?: string
}

export function BindButton({ currentBind, configPath, onBindChange, label }: BindButtonProps) {
  const [listening, setListening] = useState(false)
  const [displayLabel, setDisplayLabel] = useState('')
  const listenerRef = useRef<((e: KeyboardEvent) => void) | null>(null)

  useEffect(() => {
    if (currentBind && currentBind > 0) {
      const key = String.fromCharCode(currentBind).toUpperCase()
      setDisplayLabel(key || '?')
    } else {
      setDisplayLabel('Click to Bind')
    }
  }, [currentBind])

  const startListening = () => {
    setListening(true)
    setDisplayLabel('...')

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const key = e.key.toUpperCase()
      const code = key.length === 1 ? key.charCodeAt(0) : e.keyCode

      if (code > 0) {
        onBindChange(configPath, code)
        setDisplayLabel(key)
      }
      setListening(false)
      window.removeEventListener('keydown', handler)
      listenerRef.current = null
    }

    listenerRef.current = handler
    window.addEventListener('keydown', handler)
  }

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener('keydown', listenerRef.current)
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={startListening}
        disabled={listening}
        className="min-w-[120px]"
      >
        {displayLabel}
      </Button>
    </div>
  )
}
