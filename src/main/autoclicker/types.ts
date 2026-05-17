export interface LeftClickerConfig {
  enabled: boolean
  mode: 'Hold' | 'Always'
  bind: number
  averageCPS: number
  minCPS: number
  onlyWhenFocused: boolean
  breakBlocks: 'None' | 'Full' | 'Shift With Click' | 'Shift No Click'
  RMBLock: boolean
  blockHit: boolean
  blockHitChance: number
  smartBH: number
  shakeEffect: boolean
  shakeEffectForce: number
  soundPath: string
  workInMenus: boolean
  blatant: boolean
  AutoRod: boolean
  AutoRodChance: number
}

export interface RightClickerConfig {
  enabled: boolean
  mode: 'Hold' | 'Always'
  bind: number
  averageCPS: number
  minCPS: number
  onlyWhenFocused: boolean
  LMBLock: boolean
  shakeEffect: boolean
  shakeEffectForce: number
  soundPath: string
  workInMenus: boolean
  blatant: boolean
  items: boolean
}

export interface RecorderConfig {
  enabled: boolean
  record: number[]
  recordMultiplier: number
}

export interface OverlayConfig {
  enabled: boolean
  onlyWhenFocused: boolean
  x: number
  y: number
}

export interface MiscConfig {
  saveSettings: boolean
  bindHideGUI: number
  windowName: string
  discordRichPresence: boolean
  switchDelay: number
  rodBind: number
  rodDelay: number
  rodSlot: string
  pearlBind: number
  pearlSlot: string
  swordSlot: string
  red: number
  green: number
  blue: number
  toggleSounds: boolean
  compatibilityMode: boolean
  overlayPosition: string
  overlayLayout: string
}

export interface PotionsConfig {
  enabled: boolean
  potBind: number
  throwDelay: number
  potResetBind: number
  lowestSlot: number
  highestSlot: number
}

export interface MovementConfig {
  autoWTap: boolean
  wTapMode: 'chance' | 'delay'
  wTapValue: number
  autoSprint: boolean
  betterInput: boolean
  fastStop: boolean
}

// ── Macro system ──

export type MacroActionType =
  | 'delay'
  | 'key_tap' | 'key_down' | 'key_up'
  | 'mouse_click' | 'mouse_down' | 'mouse_up'
  | 'mouse_relative_move'
  | 'rod' | 'pearl' | 'potion'
  | 'condition' | 'loop' | 'script' | 'script_if' | 'var_set' | 'var_assign' | 'var_set_str' | 'overlay_text' | 'overlay_clear' | 'overlay_bar' | 'overlay_dot' | 'overlay_entry' | 'overlay_request_hide'

export interface MacroAction {
  id: string
  type: MacroActionType
  label: string
  config: Record<string, unknown>
}

export interface Macro {
  name: string
  bind: number
  loop: boolean
  steps: MacroStep[]
}

export interface MacroStep {
  id: string
  label: string
  actions: MacroAction[]
}

export interface MacrosConfig {
  list: Macro[]
}

export const DEFAULT_MACROS: MacrosConfig = {
  list: [
    {
      name: 'Rod',
      bind: 0,
      loop: false,
      steps: [
        {
          id: 'rod_1', label: 'Rod Macro',
          actions: [
            { id: 'rod_swap', type: 'key_tap', label: 'Press Sword Slot', config: { vk: 0x32 } },
            { id: 'rod_delay_1', type: 'delay', label: 'Wait 50ms', config: { ms: 50 } },
            { id: 'rod_click', type: 'mouse_click', label: 'Right Click', config: { button: 2 } },
            { id: 'rod_delay_2', type: 'delay', label: 'Wait (rodDelay)', config: { ms: 200 } },
            { id: 'rod_swap_back', type: 'key_tap', label: 'Press Sword Slot', config: { vk: 0x31 } },
          ],
        },
      ],
    },
    {
      name: 'Pearl',
      bind: 0,
      loop: false,
      steps: [
        {
          id: 'pearl_1', label: 'Pearl Macro',
          actions: [
            { id: 'pearl_swap', type: 'key_tap', label: 'Press Pearl Slot', config: { vk: 0x38 } },
            { id: 'pearl_delay_1', type: 'delay', label: 'Wait 60ms', config: { ms: 60 } },
            { id: 'pearl_click', type: 'mouse_click', label: 'Right Click', config: { button: 2 } },
            { id: 'pearl_delay_2', type: 'delay', label: 'Wait 800ms', config: { ms: 800 } },
            { id: 'pearl_swap_back', type: 'key_tap', label: 'Press Sword Slot', config: { vk: 0x31 } },
          ],
        },
      ],
    },
    {
      name: 'Potion',
      bind: 0,
      loop: false,
      steps: [
        {
          id: 'pot_1', label: 'Potion Macro',
          actions: [
            { id: 'pot_swap', type: 'key_tap', label: 'Press Pot Slot', config: { vk: 0x34 } },
            { id: 'pot_delay_1', type: 'delay', label: 'Wait (throwDelay)', config: { ms: 700 } },
            { id: 'pot_click', type: 'mouse_click', label: 'Right Click', config: { button: 2 } },
            { id: 'pot_delay_2', type: 'delay', label: 'Wait 600ms', config: { ms: 600 } },
            { id: 'pot_swap_back', type: 'key_tap', label: 'Press Sword Slot', config: { vk: 0x31 } },
          ],
        },
      ],
    },
  ],
}

export interface AutoclickerConfig {
  left: LeftClickerConfig
  right: RightClickerConfig
  recorder: RecorderConfig
  overlay: OverlayConfig
  misc: MiscConfig
  potions: PotionsConfig
  movement: MovementConfig
  macros: MacrosConfig
  filename: string
  displayName: string
  description: string
  Author: string
}

export type AutoclickerStatus = {
  leftEnabled: boolean
  rightEnabled: boolean
  avgCPS: number
  uptime: number
}

export const DEFAULT_CONFIG: AutoclickerConfig = {
  left: {
    enabled: false,
    mode: 'Hold',
    bind: 0,
    averageCPS: 18,
    minCPS: 18,
    onlyWhenFocused: true,
    breakBlocks: 'None',
    RMBLock: false,
    blockHit: false,
    blockHitChance: 20,
    smartBH: 0,
    shakeEffect: false,
    shakeEffectForce: 5,
    soundPath: 'None',
    workInMenus: false,
    blatant: false,
    AutoRod: false,
    AutoRodChance: 10,
  },
  right: {
    enabled: false,
    mode: 'Hold',
    bind: 0,
    averageCPS: 12,
    minCPS: 12,
    onlyWhenFocused: true,
    LMBLock: false,
    shakeEffect: false,
    shakeEffectForce: 5,
    soundPath: 'None',
    workInMenus: false,
    blatant: false,
    items: false,
  },
  recorder: {
    enabled: false,
    record: [0.08],
    recordMultiplier: 1.1,
  },
  overlay: {
    enabled: false,
    onlyWhenFocused: true,
    x: 0,
    y: 0,
  },
  misc: {
    saveSettings: true,
    bindHideGUI: 0,
    windowName: 'soda-autoclicker',
    discordRichPresence: false,
    switchDelay: 0.1,
    rodBind: 0,
    rodDelay: 0.2,
    rodSlot: '2',
    pearlBind: 0,
    pearlSlot: '8',
    swordSlot: '1',
    red: 0,
    green: 0,
    blue: 0,
    toggleSounds: true,
    compatibilityMode: false,
    overlayPosition: 'top-right',
    overlayLayout: 'horizontal',
  },
  potions: {
    enabled: false,
    potBind: 0,
    throwDelay: 0.7,
    potResetBind: 0,
    lowestSlot: 1,
    highestSlot: 9,
  },
  movement: {
    autoWTap: false,
    wTapMode: 'chance',
    wTapValue: 30,
    autoSprint: false,
    betterInput: false,
    fastStop: false,
  },
  macros: DEFAULT_MACROS,
  filename: 'config',
  displayName: 'Default',
  description: 'Default Config',
  Author: 'User',
}

export const VK_MAP: Record<string, number> = {
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
}
