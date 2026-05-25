import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const DEFAULT_SERVER = 'https://clicks.roraaaa.dev'
const USER_FILE = path.join(os.homedir(), 'soda', 'user.json')

interface CloudItem {
  id: string
  type: 'config' | 'macro' | 'script'
  name: string
  description: string
  version: number
  created_at: string
  updated_at: string
}

interface CloudItemFull extends CloudItem {
  data: any
}

interface ListResponse {
  items: CloudItem[]
  quota: { used: number; max: number }
}

interface SyncResponse {
  items: CloudItemFull[]
}

interface PublicItem {
  id: string
  type: 'config' | 'macro' | 'script'
  name: string
  description: string
  version: number
  downloads: number
  created_at: string
  updated_at: string
}

interface PublicListResponse {
  items: PublicItem[]
}

let dataCache: { userId?: string; serverUrl?: string } | null = null

function readData(): { userId?: string; serverUrl?: string } {
  if (dataCache) return dataCache
  try {
    dataCache = JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'))
    return dataCache!
  } catch {
    dataCache = {}
    return dataCache
  }
}

function writeData(data: { userId?: string; serverUrl?: string }): void {
  fs.mkdirSync(path.dirname(USER_FILE), { recursive: true })
  const existing = readData()
  dataCache = { ...existing, ...data }
  fs.writeFileSync(USER_FILE, JSON.stringify(dataCache, null, 2))
}

function readUserId(): string | null {
  return readData().userId || null
}

function readServerUrl(): string {
  return readData().serverUrl || DEFAULT_SERVER
}

async function apiFetch(apiPath: string, options: RequestInit = {}): Promise<any> {
  const base = readServerUrl()
  const url = `${base}/api${apiPath}`
  const userId = readUserId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (userId) headers['x-user-id'] = userId

  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function registerUser(): Promise<string> {
  const data = await apiFetch('/user/register', { method: 'POST' })
  writeData({ userId: data.userId })
  return data.userId
}

export async function syncUser(userId?: string): Promise<string | null> {
  const uid = userId || readUserId()
  if (!uid) return null
  try {
    const data = await apiFetch('/user/sync', {
      method: 'POST',
      body: JSON.stringify({ userId: uid }),
    })
    if (userId) writeData({ userId })
    return data.userId
  } catch {
    return null
  }
}

export async function listItems(): Promise<ListResponse> {
  return apiFetch('/items')
}

export async function getQuota(): Promise<{ used: number; max: number }> {
  return apiFetch('/items/quota')
}

export async function uploadItem(type: 'config' | 'macro' | 'script', name: string, description: string, data: any, isPublic = false): Promise<{ id: string; type: string; name: string; description: string; version: number; public: boolean }> {
  return apiFetch('/items', {
    method: 'POST',
    body: JSON.stringify({ type, name, description, data, public: isPublic }),
  })
}

export async function listPublicItems(): Promise<PublicItem[]> {
  const data: PublicListResponse = await apiFetch('/items/public')
  return data.items
}

export async function downloadPublicItem(itemId: string): Promise<CloudItemFull> {
  return apiFetch(`/items/public/${itemId}`)
}

export async function downloadItem(itemId: string): Promise<CloudItemFull> {
  return apiFetch(`/items/${itemId}`)
}

export async function updateItem(itemId: string, fields: { name?: string; description?: string; data?: any; isPublic?: boolean }): Promise<CloudItem & { public: boolean }> {
  return apiFetch(`/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
}

export async function deleteItem(itemId: string): Promise<void> {
  await apiFetch(`/items/${itemId}`, { method: 'DELETE' })
}

export async function syncAll(): Promise<CloudItemFull[]> {
  const data: SyncResponse = await apiFetch('/items/sync/all')
  return data.items
}

export function getStoredUserId(): string | null {
  return readUserId()
}

export function setStoredUserId(userId: string): void {
  writeData({ userId })
}

export function getServerUrl(): string {
  return readServerUrl()
}

export function setServerUrl(url: string): void {
  writeData({ serverUrl: url })
}
