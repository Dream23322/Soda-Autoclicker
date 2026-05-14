const DISCORD_APP_ID = '1400790093312032808'

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
let DiscordRPC: any = null
try { DiscordRPC = require('discord-rpc') } catch { DiscordRPC = null }

let client: any = null
let connected = false
let connecting = false
let startTimestamp = Date.now()
let tickInterval: ReturnType<typeof setInterval> | null = null
let currentProvider: PresenceProvider | null = null

export type PresenceSnapshot = {
  enabled: boolean
  leftEnabled: boolean
  rightEnabled: boolean
  leftCPS: number
  rightCPS: number
  recording: boolean
}

export type PresenceProvider = () => PresenceSnapshot

function connect(): void {
  if (!DiscordRPC || !DISCORD_APP_ID || client || connecting) return
  connecting = true
  try { DiscordRPC.register(DISCORD_APP_ID) } catch { /* ok */ }
  client = new DiscordRPC.Client({ transport: 'ipc' })

  client.on('ready', () => {
    connected = true
    connecting = false
    console.log('[discord] connected')
    if (currentProvider) push(currentProvider())
  })
  client.on('disconnected', () => { connected = false })

  client.login({ clientId: DISCORD_APP_ID }).catch((e: unknown) => {
    connecting = false
    console.warn('[discord] login failed (is Discord running?):', (e as Error)?.message ?? e)
    try { client?.destroy?.() } catch { /* ok */ }
    client = null
  })
}

function disconnect(): void {
  try { client?.clearActivity?.() } catch { /* ok */ }
  try { client?.destroy?.() } catch { /* ok */ }
  client = null
  connected = false
  connecting = false
}

function push(p: PresenceSnapshot): void {
  if (!client || !connected) return

  let details = 'Idle'
  if (p.recording) details = 'Recording click pattern'
  else if (p.leftEnabled && p.rightEnabled) details = 'Clicking L + R'
  else if (p.leftEnabled) details = 'Left-clicking'
  else if (p.rightEnabled) details = 'Right-clicking'

  const parts: string[] = []
  if (p.leftEnabled) parts.push(`L ${Math.round(p.leftCPS)} CPS`)
  if (p.rightEnabled) parts.push(`R ${Math.round(p.rightCPS)} CPS`)
  const state = parts.length ? parts.join('   ') : 'Standing by'

  try {
    client.setActivity({
      details,
      state,
      startTimestamp,
      largeImageKey: 'soda',
      largeImageText: 'Soda Autoclicker',
      instance: false,
    })
  } catch (e) {
    console.warn('[discord] setActivity failed:', (e as Error)?.message ?? e)
  }
}

export function startDiscord(getPresence: PresenceProvider): void {
  if (!DiscordRPC) {
    console.warn('[discord] discord-rpc package missing — run `npm install`')
    return
  }
  if (!DISCORD_APP_ID) {
    console.warn('[discord] no Application ID configured — RPC disabled. Set DISCORD_APP_ID in src/main/discord.ts.')
    return
  }

  currentProvider = getPresence
  startTimestamp = Date.now()

  // Tick every 15s: connect/disconnect based on toggle, push fresh state
  // when connected. Discord rate-limits to ~5 updates / 20s so 15s is safe.
  tickInterval = setInterval(() => {
    const p = getPresence()
    if (!p.enabled) {
      if (client) disconnect()
      return
    }
    if (!client) { connect(); return }
    if (connected) push(p)
  }, 15_000)

  // Don't wait 15s on first launch.
  const p = getPresence()
  if (p.enabled) connect()
}

export function stopDiscord(): void {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  currentProvider = null
  disconnect()
}
