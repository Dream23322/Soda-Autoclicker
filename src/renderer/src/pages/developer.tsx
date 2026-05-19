import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BindButton } from '@/components/bind-button'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, HelpCircle, ArrowUp, ArrowDown, RefreshCw, Play, Square, FileCode } from 'lucide-react'
import { useAutoclicker } from '@/hooks/use-autoclicker'

interface MacroAction {
  id: string
  type: string
  label: string
  config: Record<string, unknown>
}

interface MacroStep {
  id: string
  label: string
  actions: MacroAction[]
}

interface Macro {
  name: string
  bind: number
  loop: boolean
  steps: MacroStep[]
}

interface Script {
  name: string
  code: string
  module: boolean
}

interface Props {
  config: any
  updateConfig: (path: string[], value: unknown) => void
}

const ACTION_PALETTE: { type: string; label: string; config: Record<string, unknown> }[] = [
  { type: 'delay', label: 'Delay', config: { ms: 100 } },
  { type: 'key_tap', label: 'Tap', config: { vk: 0 } },
  { type: 'key_down', label: 'Hold', config: { vk: 0 } },
  { type: 'key_up', label: 'Release', config: { vk: 0 } },
  { type: 'mouse_click', label: 'Click', config: { button: 1 } },
  { type: 'mouse_down', label: 'M-Down', config: { button: 1 } },
  { type: 'mouse_up', label: 'M-Up', config: { button: 1 } },
  { type: 'rod', label: 'Rod', config: { slot: '2', delay: 200 } },
  { type: 'pearl', label: 'Pearl', config: { slot: '8' } },
  { type: 'potion', label: 'Potion', config: { throwDelay: 700 } },
  { type: 'condition', label: 'If', config: { type: 'key_held', vk: 0 } },
  { type: 'loop', label: 'Loop', config: { count: 3, actions: [] } },
  { type: 'script', label: 'Script', config: { code: '' } },
]

let nextId = 1000
function uid() { return `m_${nextId++}_${Date.now()}` }

const KEY_NAMES: Record<number, string> = {
  0x01: 'LMB', 0x02: 'RMB', 0x04: 'MMB',
  0x08: 'Backspace', 0x09: 'Tab', 0x0D: 'Enter', 0x10: 'Shift',
  0x11: 'Ctrl', 0x12: 'Alt', 0x1B: 'Esc', 0x20: 'Space',
  0x25: '\u2190', 0x26: '\u2191', 0x27: '\u2192', 0x28: '\u2193',
  0x30: '0', 0x31: '1', 0x32: '2', 0x33: '3', 0x34: '4',
  0x35: '5', 0x36: '6', 0x37: '7', 0x38: '8', 0x39: '9',
  0x41: 'A', 0x42: 'B', 0x43: 'C', 0x44: 'D', 0x45: 'E',
  0x46: 'F', 0x47: 'G', 0x48: 'H', 0x49: 'I', 0x4A: 'J',
  0x4B: 'K', 0x4C: 'L', 0x4D: 'M', 0x4E: 'N', 0x4F: 'O',
  0x50: 'P', 0x51: 'Q', 0x52: 'R', 0x53: 'S', 0x54: 'T',
  0x55: 'U', 0x56: 'V', 0x57: 'W', 0x58: 'X', 0x59: 'Y', 0x5A: 'Z',
  0x60: 'Numpad0', 0x61: 'Numpad1', 0x62: 'Numpad2', 0x63: 'Numpad3',
  0x64: 'Numpad4', 0x65: 'Numpad5', 0x66: 'Numpad6', 0x67: 'Numpad7',
  0x68: 'Numpad8', 0x69: 'Numpad9',
  0x70: 'F1', 0x71: 'F2', 0x72: 'F3', 0x73: 'F4', 0x74: 'F5',
  0x75: 'F6', 0x76: 'F7', 0x77: 'F8', 0x78: 'F9', 0x79: 'F10',
  0x7A: 'F11', 0x7B: 'F12',
  0x90: 'NumLock', 0x91: 'ScrollLock',
  0xA0: 'LShift', 0xA1: 'RShift', 0xA2: 'LCtrl', 0xA3: 'RCtrl',
  0xA4: 'LAlt', 0xA5: 'RAlt',
  0xBF: '/?', 0xBA: ';:', 0xBB: '=+', 0xBC: ',<', 0xBD: '-_',
  0xBE: '.>', 0xDB: '[{', 0xDD: ']}', 0xDC: '\\|', 0xDE: '\'"',
}

function keyName(vk: number): string {
  if (vk === 0) return 'Click to bind'
  return KEY_NAMES[vk] || `0x${vk.toString(16).toUpperCase()}`
}

function KeyPicker({ value, onChange }: { value: number; onChange: (vk: number) => void }) {
  const [listening, setListening] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Label className="text-[10px]">Key</Label>
      <button
        className={`rounded border px-2 py-0.5 text-xs transition-colors min-w-[90px] ${
          listening ? 'border-primary text-primary' : 'border-[#333] text-muted-foreground hover:border-[#555]'
        }`}
        onClick={() => {
          if (listening) return
          setListening(true)
          const handler = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const code = e.keyCode || e.which
            if (code > 0) onChange(code)
            setListening(false)
            window.removeEventListener('keydown', handler)
          }
          window.addEventListener('keydown', handler, { once: true })
        }}
      >
        {listening ? 'Press a key...' : keyName(value)}
      </button>
    </div>
  )
}

const SCRIPT_SUGGESTIONS = [
  { text: '// comment', label: '// \u2014 Comment' },
  { text: 'delay(100)', label: 'delay(ms) \u2014 Wait' },
  { text: 'key(0x31)', label: 'key(vk) \u2014 Tap key' },
  { text: 'key("a")', label: 'key("name") \u2014 Tap key by name' },
  { text: "keydown('shift')", label: "keydown('name') \u2014 Hold key by name" },
  { text: 'keyup(0x31)', label: 'keyup(vk) \u2014 Release key' },
  { text: "keyup('space')", label: "keyup('name') \u2014 Release key by name" },
  { text: 'click(1)', label: 'click(btn) \u2014 Click mouse' },
  { text: "hold('ctrl',200)", label: "hold('name', ms) \u2014 Hold then release by name" },
  { text: 'setslot(1)', label: 'setslot(n) \u2014 Press hotbar slot' },
  { text: 'pitch(5)', label: 'pitch(delta) \u2014 Move mouse vertically' },
  { text: 'yaw(5)', label: 'yaw(delta) \u2014 Move mouse horizontally' },
  { text: '_delay: int = new_random(50,200)', label: 'Variable: random int' },
  { text: '_r: float = new_random(0,1).fix=5', label: 'Variable: random float' },
  { text: '_msg: str = "hello"', label: 'Variable: string' },
  { text: '_x: int = $_delay + 5', label: 'Variable: expression' },
  { text: '_x = $_x + 1', label: 'Assignment: runtime expression' },
  { text: 'if focused', label: 'if focused' },
  { text: 'if chance(50)', label: 'if chance(%)' },
  { text: 'if key_held(0x31)', label: 'if key_held(vk)' },
  { text: 'if key_not_held(0x31)', label: 'if key_not_held(vk)' },
  { text: 'if mouse_held(1)', label: 'if mouse_held(btn)' },
  { text: 'if clicking_left', label: 'if clicking_left' },
  { text: 'if clicking_right', label: 'if clicking_right' },
  { text: 'if $_running', label: 'if $_varname (truthy check)' },
  { text: 'endif', label: 'endif' },
  { text: 'overlay_text("hello")', label: 'overlay_text("text") \u2014 Show on overlay' },
  { text: 'loadingbar($_cps,20,10)', label: 'loadingbar(value,max,length) \u2014 Loading bar on overlay' },
  { text: 'overlay_dot("cps", 50)', label: 'overlay_dot("label", brightness) \u2014 Dot indicator' },
  { text: 'overlay_entry("cps", 1, "left")', label: 'overlay_entry("label", active, side) \u2014 Side entry' },
  { text: 'overlay_request_hide("left")', label: 'overlay_request_hide("side") \u2014 Hide side dots' },
  { text: 'overlay_clear', label: 'overlay_clear \u2014 Clear overlay text' },
  { text: '$_delay + random(10, 50)', label: 'Math: random(min, max)' },
  { text: 'sin($_v) * 100', label: 'Math: sin, cos, abs, floor, ceil, sqrt, clamp' },
  { text: '$fullscript', label: '$fullscript \u2014 Module mode (toggle on/off)' },
]

function ScriptEditor({ value, onChange, scriptsList }: { value: string; onChange: (v: string) => void; scriptsList?: Script[] }) {
  const [suggestions, setSuggestions] = useState<typeof SCRIPT_SUGGESTIONS>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<number | null>(null)

  const updateSuggestions = (text: string, cursor: number) => {
    const before = text.slice(0, cursor)
    const wordMatch = before.match(/(\S+)$/)
    const word = wordMatch ? wordMatch[1].toLowerCase() : ''
    if (!word || /[)"]$/.test(before)) {
      setSuggestions([])
      return
    }
    const filtered = SCRIPT_SUGGESTIONS.filter(s => s.text.toLowerCase().startsWith(word))
    setSuggestions(filtered)
    setSelectedIdx(0)
    setCursorPos(cursor)
  }

  const insert = (suggestion: string) => {
    const before = value.slice(0, cursorPos)
    const after = value.slice(cursorPos)
    const wordMatch = before.match(/(\S+)$/)
    if (!wordMatch) return
    const start = cursorPos - wordMatch[1].length
    const pos = start + suggestion.length + 1
    const newVal = value.slice(0, start) + suggestion + ' ' + after
    cursorRef.current = pos
    onChange(newVal)
    setSuggestions([])
  }

  useEffect(() => {
    if (textareaRef.current && cursorRef.current !== null) {
      textareaRef.current.setSelectionRange(cursorRef.current, cursorRef.current)
      cursorRef.current = null
    }
  }, [value])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return
    if (e.key === 'Tab' || (e.key === 'Enter' && suggestions.length > 0)) {
      e.preventDefault()
      insert(suggestions[selectedIdx].text)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setSuggestions([])
      return
    }
  }

  return (
    <div className="relative">
      {scriptsList && scriptsList.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <Label className="text-[10px] whitespace-nowrap">Insert script:</Label>
          <select
            className="bg-[#0d0d0d] border border-[#333] rounded px-1 py-0.5 text-[10px] text-muted-foreground flex-1"
            value=""
            onChange={e => {
              const script = scriptsList.find(s => s.name === e.target.value)
              if (script) onChange(script.code)
            }}
          >
            <option value="" disabled>Select...</option>
            {scriptsList.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="h-16 w-full rounded border border-[#333] bg-[#0d0d0d] p-1 text-[10px] font-mono text-muted-foreground"
        placeholder={'delay(500)\nkey(0x31)\nclick(2)\nhold(0x31,200)'}
        value={value}
        onChange={e => {
          cursorRef.current = e.target.selectionStart
          onChange(e.target.value)
          updateSuggestions(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={handleKeyDown}
        onSelect={e => updateSuggestions(value, (e.target as HTMLTextAreaElement).selectionStart)}
      />
      {suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-50 mt-0.5 rounded border border-[#333] bg-[#0d0d0d] shadow-2xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.text}
              className={`w-full px-2 py-1 text-left text-[10px] font-mono transition-colors ${
                i === selectedIdx ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-[#1a1a1a]'
              }`}
              onMouseDown={e => { e.preventDefault(); insert(s.text) }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ScriptingDocs({ onClose, onBack }: { onClose: () => void; onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="max-w-xl max-h-[80vh] overflow-y-auto rounded-lg border border-[#333] bg-[#0d0d0d] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">Scripting Reference</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <section>
            <h3 className="font-semibold text-foreground mb-1">Basic Commands</h3>
            <div className="space-y-1 text-[11px]">
              <p><code className="text-primary">//</code> {'\u2014'} Comments. Anything after // on a line is ignored.</p>
              <p><code className="text-primary">delay(ms)</code> {'\u2014'} Wait for X milliseconds. Accepts numbers, <code>$_var</code>, and math expressions.</p>
              <p><code className="text-primary">key(vk)</code> / <code>tap(vk)</code> {'\u2014'} Press and release a key. Accepts VK hex (<code>0x31</code>), numeric (<code>49</code>), name (<code>"shift"</code>), <code>$_var</code>, or <code>convert_key("a")</code>.</p>
              <p><code className="text-primary">keydown(vk)</code> {'\u2014'} Hold a key down. Same VK formats as <code>key()</code>.</p>
              <p><code className="text-primary">keyup(vk)</code> {'\u2014'} Release a held key. Same VK formats.</p>
              <p><code className="text-primary">click(button)</code> {'\u2014'} Click mouse (1=left, 2=right). Supports <code>$_var</code>.</p>
              <p><code className="text-primary">hold(vk, ms)</code> {'\u2014'} Hold a key for X ms then release. Same VK formats.</p>
              <p><code className="text-primary">setslot(n)</code> {'\u2014'} Press hotbar slot 1-9. Accepts <code>$_var</code>.</p>
              <p><code className="text-primary">pitch(delta)</code> {'\u2014'} Move mouse vertically (negative = up). Supports <code>$_var</code>.</p>
              <p><code className="text-primary">yaw(delta)</code> {'\u2014'} Move mouse horizontally (negative = left). Supports <code>$_var</code>.</p>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Variables</h3>
            <div className="space-y-1 text-[11px]">
              <p><code className="text-primary">_name: int = new_random(min, max)</code> {'\u2014'} Random integer between min and max (inclusive). Supports <code>$_var</code> and math in min/max.</p>
              <p><code className="text-primary">_name: float = new_random(min, max)</code> {'\u2014'} Random float between min and max.</p>
              <p><code className="text-primary">_name: float = new_random(0,1).fix=5</code> {'\u2014'} Float rounded to N decimal places.</p>
              <p><code className="text-primary">_name: str = "hello"</code> {'\u2014'} String variable declaration. Strings referenced by <code>$_name</code> in <code>overlay_text()</code>.</p>
              <p><code className="text-primary">_name: int = expression</code> {'\u2014'} Numeric variable from a math expression. Evaluated each time the script runs.</p>
              <p><code className="text-primary">_name = expression</code> {'\u2014'} Assign runtime expression result to existing variable. Example: <code>_count = $_count + 1</code>.</p>
              <p><code className="text-primary">$_varname</code> {'\u2014'} Reference a variable in any numeric parameter (delay, pitch, yaw, click, condition, etc.).</p>
            </div>
            <pre className="mt-2 rounded bg-[#0a0a0a] border border-[#222] p-2 text-[10px] font-mono text-muted-foreground">
{`// Randomised strafe with runtime counters
_delay: int = new_random(50, 150)
_yaw: int = new_random(8, 20)
_count: int = 0
delay($_delay)
_count = $_count + 1
yaw($_yaw + sin($_count))`}</pre>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Math &amp; Expressions</h3>
            <div className="space-y-1 text-[11px]">
              <p>Any parameter that accepts a number can use arithmetic expressions evaluated at runtime:</p>
              <p><code className="text-primary">random(min, max)</code> / <code>rnd(min, max)</code> {'\u2014'} Inline random number in any expression.</p>
              <p><code className="text-primary">sin(x), cos(x)</code> {'\u2014'} Sine and cosine (radians).</p>
              <p><code className="text-primary">abs(x)</code> {'\u2014'} Absolute value.</p>
              <p><code className="text-primary">floor(x), ceil(x)</code> {'\u2014'} Round down/up.</p>
              <p><code className="text-primary">sqrt(x)</code> {'\u2014'} Square root.</p>
              <p><code className="text-primary">clamp(v, lo, hi)</code> {'\u2014'} Constrain value between lo and hi.</p>
              <p>Standard <code>+ - * / ( )</code> operators work. Combine with <code>$_var</code> references.</p>
            </div>
            <pre className="mt-2 rounded bg-[#0a0a0a] border border-[#222] p-2 text-[10px] font-mono text-muted-foreground">
{`delay(abs($_count - 50) * 10)
yaw(clamp($_yaw, -20, 20))
delay(random(50, 150))`}</pre>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Conditions (if/endif)</h3>
            <div className="space-y-1 text-[11px]">
              <p><code className="text-primary">if key_held(vk)</code> {'\u2014'} Run block if key is held down. Accepts names and hex.</p>
              <p><code className="text-primary">if key_not_held(vk)</code> {'\u2014'} Run block if key is NOT held.</p>
              <p><code className="text-primary">if chance(percent)</code> {'\u2014'} Run block with X% probability.</p>
              <p><code className="text-primary">if mouse_held(button)</code> {'\u2014'} Run block if mouse button is held (1=left, 2=right).</p>
              <p><code className="text-primary">if focused</code> {'\u2014'} Run block if Minecraft is focused.</p>
              <p><code className="text-primary">if clicking_left</code> {'\u2014'} Run block if left clicker is enabled.</p>
              <p><code className="text-primary">if clicking_right</code> {'\u2014'} Run block if right clicker is enabled.</p>
              <p><code className="text-primary">if $_varname</code> {'\u2014'} Run block if variable is non-zero.</p>
              <p><code className="text-primary">endif</code> {'\u2014'} End an if block. Can nest conditions.</p>
            </div>
            <pre className="mt-2 rounded bg-[#0a0a0a] border border-[#222] p-2 text-[10px] font-mono text-muted-foreground">
{`if focused
  if chance(30)
    if $_hasRod
      setslot(3)
      click(1)
    endif
  endif
endif`}</pre>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Overlay Commands</h3>
            <div className="space-y-1 text-[11px]">
              <p><code className="text-primary">overlay_text("text" + $_var + "...")</code> {'\u2014'} Add a line of text to the overlay. Supports <code>$_var</code> (number and string), concatenation with <code>+</code>.</p>
              <p><code className="text-primary">loadingbar(value, max, length)</code> {'\u2014'} Display a loading bar. Example: <code>loadingbar($_cps, 20, 10)</code>. Accepts <code>$_var</code> and expressions.</p>
              <p><code className="text-primary">overlay_dot("label", brightness)</code> {'\u2014'} Display a colored dot indicator. Brightness 0-100, accepts expressions.</p>
              <p><code className="text-primary">overlay_entry("label", active, "side")</code> {'\u2014'} Text entry on left/right side of overlay. Active 1=on 0=off (accepts expressions). Side <code>"left"</code> or <code>"right"</code>.</p>
              <p><code className="text-primary">overlay_request_hide("side")</code> {'\u2014'} Request the overlay to hide L/R side dots. Side <code>"left"</code> or <code>"right"</code>.</p>
              <p><code className="text-primary">overlay_clear</code> {'\u2014'} Clear all overlay text, bars, and dots. Should be called at the start of each module loop iteration.</p>
            </div>
            <pre className="mt-2 rounded bg-[#0a0a0a] border border-[#222] p-2 text-[10px] font-mono text-muted-foreground">
{`overlay_clear
overlay_text("L: " + $_lCPS + " CPS")
overlay_dot("cps", clamp($_lCPS * 6, 0, 100))
overlay_entry("combo", $_combo > 5 ? 1 : 0, "right")
loadingbar($_lCPS, 20, 10)`}</pre>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">$fullscript Module Mode</h3>
            <p className="text-[11px]">Put <code>$fullscript</code> at the top of a script action to make it a toggleable background module. When the macro's bind key is pressed, the module starts/stops. While running it loops continuously and can use overlay commands to display information.</p>
            <pre className="mt-2 rounded bg-[#0a0a0a] border border-[#222] p-2 text-[10px] font-mono text-muted-foreground">
{`$fullscript
overlay_clear
_lCPS: int = new_random(8, 16)
_rCPS: int = new_random(6, 12)
if clicking_left
  overlay_text("L: " + $_lCPS + " CPS")
endif
if clicking_right
  overlay_text("R: " + $_rCPS + " CPS")
endif
delay(1000)`}</pre>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Standalone Module Scripts</h3>
            <p className="text-[11px]">Scripts created in the <strong>Scripts</strong> tab with <strong>module</strong> checked can be started/stopped from the Scripts tab. They loop continuously and support all commands including overlay, variables, conditions, and expressions. No <code>$fullscript</code> header needed \u2014 the module flag alone makes it a background script.</p>
            <p className="text-[11px]">Use the <strong>Insert script</strong> dropdown in a macro's Script action to copy a script's code into the action (embedding the script content directly).</p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Loop Mode</h3>
            <p className="text-[11px]">Enable the <strong>loop</strong> checkbox on a macro to make it run continuously when the bind is pressed. Press the bind again to stop. Variables like <code>new_random()</code> are re-evaluated each loop iteration.</p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">VK Codes (common)</h3>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span><code>"a"-"z"</code> = A-Z</span>
              <span><code>"0"-"9"</code> = Keys 0-9</span>
              <span><code>"f1"-"f12"</code> = F1-F12</span>
              <span><code>"shift"</code> = Shift</span>
              <span><code>"ctrl"</code> = Ctrl</span>
              <span><code>"alt"</code> = Alt</span>
              <span><code>"space"</code> = Space</span>
              <span><code>"enter"</code> = Enter</span>
              <span><code>"tab"</code> = Tab</span>
              <span><code>"esc"</code> = Escape</span>
              <span><code>"backspace"</code> = Backspace</span>
              <span><code>"lmb"/"rmb"/"mmb"</code> = Mouse buttons</span>
              <span><code>"left"/"right"/"up"/"down"</code> = Arrow keys</span>
              <span><code>0x31-0x39</code> = Raw VK 1-9</span>
              <span><code>0x41-0x5A</code> = Raw VK A-Z</span>
            </div>
          </section>
        </div>
        <div className="mt-4 flex gap-2">
          {onBack && <Button variant="outline" size="sm" onClick={onBack} className="text-xs">Back</Button>}
          <Button size="sm" onClick={onClose} className="text-xs flex-1">Got it</Button>
        </div>
      </div>
    </div>
  )
}

function MacroTutorial({ onClose, onDocs }: { onClose: () => void; onDocs: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="max-w-lg rounded-lg border border-[#333] bg-[#0d0d0d] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">Macro Tutorial</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><strong>1. Create a Macro</strong> {'\u2014'} Click "+ Add Macro" to add a new macro. Give it a name and bind key.</p>
          <p><strong>2. Add Steps</strong> {'\u2014'} Each macro has steps. Steps play in order from top to bottom.</p>
          <p><strong>3. Add Actions</strong> {'\u2014'} Click the action icons below a step to add actions to its timeline.</p>
          <p><strong>4. Configure</strong> {'\u2014'} Click the arrow on an action to expand its settings (delay time, key, button, etc.).</p>
          <p><strong>5. Reorder</strong> {'\u2014'} Use the up/down arrows on each action to reorder it within the step.</p>
          <p><strong>6. Built-in</strong> {'\u2014'} Rod, Pearl, and Potion actions are pre-configured. Just set your slot keys.</p>
           <p><strong>7. Logic</strong> {'\u2014'} Use <strong>Condition</strong> to check key states, <strong>Loop</strong> to repeat actions, and <strong>Script</strong> for custom commands.</p>
           <p><strong>8. Loop Mode</strong> {'\u2014'} Tick the <strong>loop</strong> checkbox to make the macro repeat continuously. Press the bind again to stop.</p>
           <p><strong>9. Variables</strong> {'\u2014'} Declare <code>_name: int = new_random(1,5)</code> and use <code>$_name</code> in commands. Each loop iteration gets fresh values.</p>
           <p><strong>10. Scripting</strong> {'\u2014'} See the <button onClick={onDocs} className="text-primary underline underline-offset-2">Scripting Reference</button> for all commands including <code>if/endif</code>, <code>chance</code>, <code>focused</code>, and more.</p>
           <p><strong>11. Insert Script</strong> {'\u2014'} In a Script action, use the <strong>Insert script</strong> dropdown to copy a script from the Scripts tab into the action.</p>
        </div>
        <Button className="mt-4 w-full" onClick={onClose}>Got it</Button>
      </div>
    </div>
  )
}

function ActionBlock({ action, onChange, onDelete, onMove, scriptsList }: {
  action: MacroAction
  onChange: (a: MacroAction) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
  scriptsList?: Script[]
}) {
  const [open, setOpen] = useState(false)

  const update = (key: string, val: unknown) => onChange({ ...action, config: { ...action.config, [key]: val } })

  const configFields = () => {
    switch (action.type) {
      case 'delay':
        return (
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">ms</Label>
            <Input type="number" min={1} max={30000} value={(action.config.ms as number) || 100} onChange={e => update('ms', parseInt(e.target.value) || 100)} className="h-6 w-20 text-xs" />
          </div>
        )
      case 'key_tap': case 'key_down': case 'key_up':
        return <KeyPicker value={(action.config.vk as number) || 0} onChange={vk => update('vk', vk)} />
      case 'mouse_click': case 'mouse_down': case 'mouse_up':
        return (
          <Select value={String((action.config.button as number) || 1)} onValueChange={v => update('button', parseInt(v))}>
            <SelectTrigger className="h-6 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Left</SelectItem>
              <SelectItem value="2">Right</SelectItem>
            </SelectContent>
          </Select>
        )
      case 'rod':
        return (
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Rod Slot</Label>
            <Input type="number" min={1} max={9} value={(action.config.slot as string) || '2'} onChange={e => update('slot', e.target.value)} className="h-6 w-12 text-xs" />
            <Label className="text-[10px]">Delay</Label>
            <Input type="number" min={1} value={(action.config.delay as number) || 200} onChange={e => update('delay', parseInt(e.target.value) || 200)} className="h-6 w-16 text-xs" />
          </div>
        )
      case 'pearl':
        return (
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Slot</Label>
            <Input type="number" min={1} max={9} value={(action.config.slot as string) || '8'} onChange={e => update('slot', e.target.value)} className="h-6 w-12 text-xs" />
          </div>
        )
      case 'potion':
        return (
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Throw Delay</Label>
            <Input type="number" min={1} value={(action.config.throwDelay as number) || 700} onChange={e => update('throwDelay', parseInt(e.target.value) || 700)} className="h-6 w-16 text-xs" />
          </div>
        )
      case 'condition':
        return (
          <div className="flex items-center gap-2">
            <Select value={(action.config.type as string) || 'key_held'} onValueChange={v => update('type', v)}>
              <SelectTrigger className="h-6 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="key_held">Key Held</SelectItem>
                <SelectItem value="key_not_held">Key Not Held</SelectItem>
                <SelectItem value="chance">Chance %</SelectItem>
                <SelectItem value="mouse_held">Mouse Held</SelectItem>
              </SelectContent>
            </Select>
            {(action.config.type === 'key_held' || action.config.type === 'key_not_held') && (
              <Input type="number" min={0} max={255} value={(action.config.vk as number) || 0} onChange={e => update('vk', parseInt(e.target.value) || 0)} className="h-6 w-16 text-xs" placeholder="VK" />
            )}
            {action.config.type === 'chance' && (
              <Input type="number" min={1} max={100} value={(action.config.chance as number) || 50} onChange={e => update('chance', parseInt(e.target.value) || 50)} className="h-6 w-16 text-xs" />
            )}
          </div>
        )
      case 'loop':
        return (
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Count</Label>
            <Input type="number" min={1} max={999} value={(action.config.count as number) || 3} onChange={e => update('count', parseInt(e.target.value) || 3)} className="h-6 w-16 text-xs" />
          </div>
        )
      case 'script':
        return (
          <ScriptEditor
            value={(action.config.code as string) || ''}
            onChange={v => update('code', v)}
            scriptsList={scriptsList}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="group relative rounded border border-[#2a2a2a] bg-[#111]">
      <div className="flex items-center gap-1 px-2 py-1">
        <span className="cursor-grab text-[#555] hover:text-[#999]"><GripVertical size={12} /></span>
        <button onClick={() => setOpen(!open)} className="text-[#555] hover:text-[#999]">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="text-[10px]">{action.label}</span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onMove(-1)} className="text-[#555] hover:text-[#999]"><ArrowUp size={10} /></button>
          <button onClick={() => onMove(1)} className="text-[#555] hover:text-[#999]"><ArrowDown size={10} /></button>
          <button onClick={onDelete} className="text-red-500/60 hover:text-red-400"><Trash2 size={10} /></button>
        </div>
      </div>
      {open && <div className="border-t border-[#2a2a2a] px-2 py-1.5 space-y-1">{configFields()}</div>}
    </div>
  )
}

function MacroStepEditor({ step, onChange, onDelete, scriptsList }: {
  step: MacroStep; onChange: (s: MacroStep) => void; onDelete: () => void; scriptsList?: Script[]
}) {
  const [expanded, setExpanded] = useState(true)

  const moveAction = (i: number, dir: -1 | 1) => {
    const a = [...step.actions]
    const j = i + dir
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]
    onChange({ ...step, actions: a })
  }

  return (
    <Card className="border-[#2a2a2a]">
      <CardContent className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-[#666] hover:text-[#999]">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Input value={step.label} onChange={e => onChange({ ...step, label: e.target.value })} className="h-6 text-xs flex-1" placeholder="Step label..." />
          <button onClick={onDelete} className="text-red-500/60 hover:text-red-400"><Trash2 size={12} /></button>
        </div>
        {expanded && (
          <div className="space-y-1 pl-4">
            {step.actions.map((action, i) => (
              <ActionBlock
                key={action.id}
                action={action}
                onChange={a => { const acts = [...step.actions]; acts[i] = a; onChange({ ...step, actions: acts }) }}
                onDelete={() => onChange({ ...step, actions: step.actions.filter((_, j) => j !== i) })}
                onMove={dir => moveAction(i, dir)}
                scriptsList={scriptsList}
              />
            ))}
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              {ACTION_PALETTE.map(p => (
                <button
                  key={p.type}
                  className="rounded border border-[#333] px-1.5 py-0.5 text-[9px] text-[#666] hover:border-primary hover:text-primary transition-colors"
                  onClick={() => onChange({
                    ...step,
                    actions: [...step.actions, { id: uid(), type: p.type, label: p.label, config: { ...p.config } }],
                  })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MacroEditor({ macro, index, onChange, onDelete, updateConfig, scriptsList }: {
  macro: Macro; index: number; onChange: (m: Macro) => void; onDelete: () => void
  updateConfig: (path: string[], value: unknown) => void
  scriptsList?: Script[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={macro.name} onChange={e => onChange({ ...macro, name: e.target.value })} className="h-7 text-sm font-bold flex-1" placeholder="Macro name..." />
        <Label className="text-[10px] shrink-0">Bind</Label>
        <div className="w-32">
          <BindButton
            currentBind={macro.bind}
            configPath={['macros', 'list', String(index), 'bind']}
            onBindChange={(p, v) => {
              onChange({ ...macro, bind: v as number })
              updateConfig(p, v)
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Label className="text-[10px] text-muted-foreground cursor-pointer">loop</Label>
          <input
            type="checkbox"
            checked={macro.loop}
            onChange={e => onChange({ ...macro, loop: e.target.checked })}
            className="accent-primary w-3 h-3 cursor-pointer"
          />
        </div>
        <button onClick={onDelete} className="text-red-500/60 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
      </div>

      <div className="space-y-2">
        {macro.steps.map((step, si) => (
          <MacroStepEditor
            key={step.id}
            step={step}
            onChange={s => { const st = [...macro.steps]; st[si] = s; onChange({ ...macro, steps: st }) }}
            onDelete={() => onChange({ ...macro, steps: macro.steps.filter((_, j) => j !== si) })}
            scriptsList={scriptsList}
          />
        ))}
        <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => onChange({
          ...macro,
          steps: [...macro.steps, { id: uid(), label: `Step ${macro.steps.length + 1}`, actions: [] }],
        })}>
          <Plus size={12} className="mr-1" /> Add Step
        </Button>
      </div>
    </div>
  )
}

function MacrosPanel({ config, updateConfig, scriptsList, onRefresh }: { config: any; updateConfig: (path: string[], value: unknown) => void; scriptsList: Script[]; onRefresh: () => void }) {
  const [showTutorial, setShowTutorial] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [selected, setSelected] = useState(0)

  const macros: Macro[] = config.macros?.list || []

  const updateMacros = (list: Macro[]) => updateConfig(['macros', 'list'], list)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Macros</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => onRefresh()} className="text-muted-foreground hover:text-primary cursor-pointer" title="Reload macros"><RefreshCw size={14} /></button>
          <button onClick={() => setShowDocs(true)} className="text-[9px] text-[#555] hover:text-[#999] underline underline-offset-2 transition-colors" title="Scripting Reference">
            Scripting Docs
          </button>
          <button onClick={() => setShowTutorial(true)} className="text-[#555] hover:text-[#999] transition-colors" title="Tutorial">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {showTutorial && <MacroTutorial onClose={() => setShowTutorial(false)} onDocs={() => { setShowTutorial(false); setShowDocs(true) }} />}
      {showDocs && <ScriptingDocs onClose={() => setShowDocs(false)} onBack={() => { setShowDocs(false); setShowTutorial(true) }} />}

      <div className="flex gap-4">
        <div className="w-48 shrink-0 space-y-1">
          {macros.map((m: Macro, i: number) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full rounded px-3 py-2 text-left text-xs transition-colors ${
                i === selected ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-[#111] text-muted-foreground hover:bg-[#1a1a1a] border border-transparent'
              }`}
            >
              <div className="font-medium">{m.name || 'Unnamed'}</div>
              <div className="text-[10px] text-[#555]">{m.steps.length} step{m.steps.length !== 1 ? 's' : ''} ${'\u00B7'} {m.steps.reduce((s: number, st: MacroStep) => s + st.actions.length, 0)} actions</div>
            </button>
          ))}
          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => {
            updateMacros([...macros, { name: 'New Macro', bind: 0, loop: false, steps: [{ id: uid(), label: 'Step 1', actions: [] }] }])
            setSelected(macros.length)
            onRefresh()
          }}>
            <Plus size={12} className="mr-1" /> Add Macro
          </Button>
        </div>

        <div className="flex-1">
          {macros.length > 0 && macros[selected] ? (
            <div className="space-y-3">
              <MacroEditor
                key={selected}
                macro={macros[selected]}
                index={selected}
                updateConfig={updateConfig}
                onChange={m => {
                  const list = [...macros]
                  list[selected] = m
                  updateMacros(list)
                  onRefresh()
                }}
                onDelete={() => {
                  const list = macros.filter((_, i) => i !== selected)
                  updateMacros(list)
                  if (selected >= list.length) setSelected(Math.max(0, list.length - 1))
                  onRefresh()
                }}
                scriptsList={scriptsList}
              />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No macros yet. Click "+ Add Macro" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScriptsPanel({ config, updateConfig, onRefresh }: { config: any; updateConfig: (path: string[], value: unknown) => void; onRefresh: () => void }) {
  const [selected, setSelected] = useState(0)
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({})

  const scripts: Script[] = config.scripts?.list || []

  const updateScripts = (list: Script[]) => updateConfig(['scripts', 'list'], list)

  const pollModuleStatus = async () => {
    try {
      const e = (window as any).electron
      const status = await e.autoclicker.getScriptModuleStatus()
      setModuleStatus(status || {})
    } catch {}
  }

  useEffect(() => {
    pollModuleStatus()
    const id = setInterval(pollModuleStatus, 2000)
    return () => clearInterval(id)
  }, [])

  const toggleModule = async (script: Script) => {
    try {
      const e = (window as any).electron
      if (moduleStatus[script.name]) {
        await e.autoclicker.stopScriptModule(script.name)
      } else {
        await e.autoclicker.startScriptModule(script.name)
      }
      pollModuleStatus()
    } catch {}
  }

  const current = scripts[selected]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Scripts</h2>
        <button onClick={() => onRefresh()} className="text-muted-foreground hover:text-primary cursor-pointer" title="Reload"><RefreshCw size={14} /></button>
      </div>

      <div className="flex gap-4">
        <div className="w-48 shrink-0 space-y-1">
          {scripts.map((s: Script, i: number) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full rounded px-3 py-2 text-left text-xs transition-colors ${
                i === selected ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-[#111] text-muted-foreground hover:bg-[#1a1a1a] border border-transparent'
              }`}
            >
              <div className="font-medium">{s.name || 'Unnamed'}</div>
              <div className="text-[10px] flex items-center gap-1 mt-0.5">
                {s.module && <span className="text-[8px] text-primary border border-primary/30 px-1">module</span>}
                {moduleStatus[s.name] && <span className="text-[8px] text-green-500 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> running</span>}
              </div>
            </button>
          ))}
          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => {
            updateScripts([...scripts, { name: 'New Script', code: '', module: false }])
            setSelected(scripts.length)
            onRefresh()
          }}>
            <Plus size={12} className="mr-1" /> Add Script
          </Button>
        </div>

        <div className="flex-1">
          {current ? (
            <Card className="border-[#2a2a2a]">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={current.name}
                    onChange={e => {
                      const list = [...scripts]
                      list[selected] = { ...current, name: e.target.value }
                      updateScripts(list)
                      onRefresh()
                    }}
                    className="h-7 text-sm font-bold flex-1"
                    placeholder="Script name..."
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Label className="text-[10px] text-muted-foreground cursor-pointer">module</Label>
                    <input
                      type="checkbox"
                      checked={current.module}
                      onChange={e => {
                        const list = [...scripts]
                        list[selected] = { ...current, module: e.target.checked }
                        updateScripts(list)
                        // If unchecking while running, stop the module
                        if (!e.target.checked && moduleStatus[current.name]) {
                          toggleModule(current)
                        }
                        onRefresh()
                      }}
                      className="accent-primary w-3 h-3 cursor-pointer"
                    />
                  </div>
                  {current.module && (
                    <Button
                      size="sm"
                      variant={moduleStatus[current.name] ? 'destructive' : 'default'}
                      className="h-6 text-[10px]"
                      onClick={() => toggleModule(current)}
                    >
                      {moduleStatus[current.name] ? <><Square size={10} className="mr-1" /> Stop</> : <><Play size={10} className="mr-1" /> Start</>}
                    </Button>
                  )}
                  <button onClick={() => {
                    const list = scripts.filter((_, i) => i !== selected)
                    if (moduleStatus[current.name]) toggleModule(current)
                    updateScripts(list)
                    if (selected >= list.length) setSelected(Math.max(0, list.length - 1))
                    onRefresh()
                  }} className="text-red-500/60 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Script Code</Label>
                  <ScriptEditor
                    value={current.code}
                    onChange={v => {
                      const list = [...scripts]
                      list[selected] = { ...current, code: v }
                      updateScripts(list)
                      onRefresh()
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No scripts yet. Click "+ Add Script" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Module Running Status */}
      {scripts.filter(s => s.module).length > 0 && (
        <Card>
          <CardContent className="pt-3 space-y-2">
            <h3 className="text-xs section-header font-bold">Module Scripts <span className="text-muted-foreground font-normal">(start/stop)</span></h3>
            <div className="space-y-1">
              {scripts.filter(s => s.module).map((s, i) => (
                <div key={i} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                  <div className="flex items-center gap-2">
                    <FileCode size={12} className="text-muted-foreground" />
                    <span className="text-xs">{s.name}</span>
                    <span className={`text-[9px] flex items-center gap-1 ${moduleStatus[s.name] ? 'text-green-500' : 'text-[#555]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${moduleStatus[s.name] ? 'bg-green-500' : 'bg-[#555]'} inline-block`} />
                      {moduleStatus[s.name] ? 'running' : 'stopped'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={moduleStatus[s.name] ? 'destructive' : 'default'}
                    className="h-6 text-[10px]"
                    onClick={() => toggleModule(s)}
                  >
                    {moduleStatus[s.name] ? <><Square size={10} className="mr-1" /> Stop</> : <><Play size={10} className="mr-1" /> Start</>}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function DeveloperPage({ config, updateConfig }: Props) {
  const { loadConfig } = useAutoclicker()
  const [activeTab, setActiveTab] = useState<'scripts' | 'macros'>('scripts')
  if (!config) return null

  const scripts: Script[] = config.scripts?.list || []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Developer</h1>

      <div className="flex items-center gap-4 border-b border-[#1a1a1a] pb-2">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`text-xs cursor-pointer pb-2 -mb-2 border-b-2 transition-colors ${
            activeTab === 'scripts' ? 'text-primary border-primary font-bold' : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Scripts
        </button>
        <button
          onClick={() => setActiveTab('macros')}
          className={`text-xs cursor-pointer pb-2 -mb-2 border-b-2 transition-colors ${
            activeTab === 'macros' ? 'text-primary border-primary font-bold' : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Macros
        </button>
      </div>

      {activeTab === 'scripts' && <ScriptsPanel config={config} updateConfig={updateConfig} onRefresh={loadConfig} />}
      {activeTab === 'macros' && <MacrosPanel config={config} updateConfig={updateConfig} scriptsList={scripts} onRefresh={loadConfig} />}
    </div>
  )
}
