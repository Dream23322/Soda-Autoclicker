export interface LeftClickerConfig {
  enabled: boolean
  mode: 'Hold' | 'Always'
  bind: number
  averageCPS: number
  onlyWhenFocused: boolean
  breakBlocks: 'None' | 'Full' | 'Shift With Click' | 'Shift No Click'
  RMBLock: boolean
  blockHit: boolean
  blockHitChance: number
  bhType: 'V1' | 'V2' | 'V3'
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
  guiHidden: boolean
  bindHideGUI: number
  windowName: string
  discordRichPresence: boolean
  switchDelay: number
  rodBind: number
  longRod: boolean
  rodDelay: number
  rodSlot: string
  pearlBind: number
  pearlSlot: string
  swordSlot: string
  theme: string
  red: number
  green: number
  blue: number
  toggleSounds: boolean
  compatibilityMode: boolean
  ping: number
  overlayPosition: string
  overlayLayout: string
}

export interface PotionsConfig {
  enabled: boolean
  potBind: number
  throwDelay: number
  switchBackSlot: string
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

export interface AutoclickerConfig {
  left: LeftClickerConfig
  right: RightClickerConfig
  recorder: RecorderConfig
  overlay: OverlayConfig
  misc: MiscConfig
  potions: PotionsConfig
  movement: MovementConfig
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
    onlyWhenFocused: true,
    breakBlocks: 'None',
    RMBLock: false,
    blockHit: false,
    blockHitChance: 20,
    bhType: 'V2',
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
    guiHidden: false,
    bindHideGUI: 0,
    windowName: 'soda-autoclicker',
    discordRichPresence: false,
    switchDelay: 0.1,
    rodBind: 0,
    longRod: false,
    rodDelay: 0.2,
    rodSlot: '2',
    pearlBind: 0,
    pearlSlot: '8',
    swordSlot: '1',
    theme: 'lightblue',
    red: 0,
    green: 0,
    blue: 0,
    toggleSounds: true,
    compatibilityMode: false,
    ping: 230,
    overlayPosition: 'top-right',
    overlayLayout: 'horizontal',
  },
  potions: {
    enabled: false,
    potBind: 0,
    throwDelay: 0.7,
    switchBackSlot: '1',
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
  filename: 'config',
  displayName: 'Default',
  description: 'Default Config',
  Author: 'User',
}

export const VK_MAP: Record<string, number> = {
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
}
