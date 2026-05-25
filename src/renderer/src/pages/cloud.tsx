import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Cloud, Download, Trash2, RefreshCw, User, AlertCircle, Info, Globe, Lock, Eye, Search } from "lucide-react"

import { useAutoclicker } from "@/hooks/use-autoclicker"

const DEFAULT_MACRO_NAMES = new Set(["Rod", "Pearl", "Potion"])

export function CloudPage() {
  const { config, loadConfig } = useAutoclicker()
  const [userId, setUserId] = useState<string | null>(null)
  const [serverUrl, setServerUrlState] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [publicItems, setPublicItems] = useState<any[]>([])
  const [localConfigs, setLocalConfigs] = useState<any[]>([])
  const [quota, setQuota] = useState({ used: 0, max: 5 })
  const [loading, setLoading] = useState(true)
  const [pasteUuid, setPasteUuid] = useState("")
  const [editServer, setEditServer] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [error, setError] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [downloadedId, setDownloadedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"mine" | "community">("mine")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "newest" | "oldest" | "type" | "downloads">("newest")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Upload dialog
  const [uploadDialog, setUploadDialog] = useState(false)
  const [uploadData, setUploadData] = useState<any>(null)
  const [uploadType, setUploadType] = useState<"config" | "macro" | "script">("config")
  const [uploadName, setUploadName] = useState("")
  const [uploadDesc, setUploadDesc] = useState("")
  const [uploadPublic, setUploadPublic] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadAll = useCallback(async () => {
    setError("")
    try {
      const e = (window as any).electron
      const uid = await e.cloud.getUserId()
      setUserId(uid)
      const sv = await e.cloud.getServerUrl()
      setServerUrlState(sv)
      if (uid) {
        const synced = await e.cloud.sync()
        if (synced) {
          const data = await e.cloud.listItems()
          setItems(data.items)
          setQuota(data.quota)
        } else {
          setUserId(null); setItems([]); setQuota({ used: 0, max: 5 })
        }
      } else {
        setItems([]); setQuota({ used: 0, max: 5 })
      }
    } catch (e: any) { setError(e.message || "Connection failed") }
    setLoading(false)
  }, [])

  const loadLocal = useCallback(async () => {
    try {
      const e = (window as any).electron
      const configs = (await e.autoclicker.getConfigs()) || []
      setLocalConfigs(configs.filter((c: any) => !c.builtin))
    } catch {}
  }, [])

  const loadPublic = useCallback(async () => {
    try {
      const e = (window as any).electron
      const data = await e.cloud.listPublicItems()
      setPublicItems(data.items || [])
    } catch {}
  }, [])

  useEffect(() => { loadAll(); loadLocal(); loadPublic() }, [loadAll, loadLocal, loadPublic])
  useEffect(() => {
    ;(window as any).electron?.debug?.status().then((on: boolean) => setDebugMode(on)).catch(() => {})
  }, [])

  const openUpload = (data: any, type: "config" | "macro" | "script", name: string, desc?: string) => {
    setUploadData(data)
    setUploadType(type)
    setUploadName(name)
    setUploadDesc(desc || "")
    setUploadPublic(false)
    setUploadDialog(true)
  }

  const confirmUpload = async () => {
    if (!uploadData || !uploadName.trim()) return
    setUploading(true); setError("")
    try {
      const e = (window as any).electron
      await e.cloud.upload({ type: uploadType, name: uploadName.trim(), description: uploadDesc.trim(), data: uploadData, public: uploadPublic })
      setUploadDialog(false)
      await loadAll()
      if (uploadPublic) await loadPublic()
    } catch (err: any) { setError(err.message || "Upload failed") }
    setUploading(false)
  }

  const uploadCurrentConfig = async (isPublic: boolean) => {
    if (!config || quota.used >= quota.max) return
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.upload({ type: "config", name: config.displayName || "My Config", description: config.description || "", data: config, public: isPublic })
      await loadAll()
      if (isPublic) await loadPublic()
    } catch (err: any) { setError(err.message || "Upload failed") }
  }

  const uploadMacro = async (macro: any, isPublic: boolean) => {
    if (quota.used >= quota.max) return
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.upload({ type: "macro", name: macro.name || "Untitled Macro", description: "", data: macro, public: isPublic })
      await loadAll()
      if (isPublic) await loadPublic()
    } catch (err: any) { setError(err.message || "Upload failed") }
  }

  const uploadScript = async (script: any, isPublic: boolean) => {
    if (quota.used >= quota.max) return
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.upload({ type: "script", name: script.name || "Untitled Script", description: "", data: script, public: isPublic })
      await loadAll()
      if (isPublic) await loadPublic()
    } catch (err: any) { setError(err.message || "Upload failed") }
  }

  const uploadLocalConfig = async (filename: string) => {
    try {
      const e = (window as any).electron
      const data = await e.autoclicker.getConfigData(filename)
      if (!data) { setError("Could not read config"); return }
      openUpload(data, "config", data.displayName || filename, data.description)
    } catch (err: any) { setError(err.message || "Failed to read config") }
  }

  const handleRegister = async () => {
    setLoading(true)
    try { const e = (window as any).electron; await e.cloud.register(); await loadAll() } catch (e: any) { setError(e.message || "Registration failed") }
    setLoading(false)
  }

  const handleLink = async () => {
    if (!pasteUuid.trim()) return
    setLoading(true)
    try {
      const e = (window as any).electron
      const synced = await e.cloud.sync(pasteUuid.trim())
      if (!synced) { setError("Device ID not found on server"); setLoading(false); return }
      setPasteUuid(""); await loadAll()
    } catch (e: any) { setError(e.message || "Failed to link") }
    setLoading(false)
  }

  const handleSyncAll = async () => {
    setSyncing(true); setError("")
    try { const e = (window as any).electron; await e.cloud.syncAll(); await loadAll() } catch (e: any) { setError(e.message || "Sync failed") }
    setSyncing(false)
  }

  const shortId = userId ? `${userId.slice(0, 4)}...${userId.slice(-4)}` : null
  const userMacros = ((config as any)?.macros?.list || []).filter((m: any) => !DEFAULT_MACRO_NAMES.has(m.name) || m.bind !== 0)
  const userScripts = ((config as any)?.scripts?.list || [])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        break
      case "newest":
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        break
      case "type":
        result.sort((a, b) => (a.type || "").localeCompare(b.type || ""))
        break
    }
    return result
  }, [items, search, sortBy])

  const merged = useMemo(() => {
    const ownIds = new Set(items.filter((i: any) => i.public).map((i: any) => i.id))
    const m = [
      ...items.filter((i: any) => i.public).map((i: any) => ({ ...i, downloads: 0, _yours: true })),
      ...publicItems.filter((i: any) => !ownIds.has(i.id)).map((i: any) => ({ ...i, _yours: false })),
    ]
    if (search.trim()) {
      const q = search.toLowerCase()
      return m.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case "name":
        m.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        break
      case "newest":
        m.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case "oldest":
        m.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        break
      case "type":
        m.sort((a, b) => (a.type || "").localeCompare(b.type || ""))
        break
      case "downloads":
        m.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        break
    }
    return m
  }, [items, publicItems, search, sortBy])

  if (loading) return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Connecting...</p></div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold"><span className="text-primary">$</span> soda@cloud</h1>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button onClick={() => setActiveTab("mine")} className={`text-xs cursor-pointer ${activeTab === "mine" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}>my items</button>
          <span className="text-muted-foreground text-[10px]">|</span>
          <button onClick={() => { setActiveTab("community"); loadPublic() }} className={`text-xs cursor-pointer ${activeTab === "community" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}>community</button>
        </div>
      </div>

      {/* Account */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Account</h2>
          {userId ? (
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">device:</span>
              <code className="text-foreground">{shortId}</code>
              <span className="text-muted-foreground">({quota.used}/{quota.max})</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">No account linked. Cloud configs are stored per-device anonymously.</p>
              <div className="flex gap-2">
                <Button size="sm" className="text-xs" onClick={handleRegister}><Cloud className="w-3 h-3 mr-1" /> Register Device</Button>
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Paste existing device ID" value={pasteUuid} onChange={(e) => setPasteUuid(e.target.value)} className="h-8 text-xs flex-1" />
                <Button size="sm" variant="outline" className="text-xs" onClick={handleLink} disabled={!pasteUuid.trim()}>Link</Button>
              </div>
            </div>
          )}
          <div className="border-t border-[#1a1a1a] pt-3">
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="text-muted-foreground">server:</span>
              {editServer ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input value={serverUrl} onChange={(e) => setServerUrlState(e.target.value)} className="h-7 text-[10px] flex-1" />
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { const e = (window as any).electron; await e.cloud.setServerUrl(serverUrl); setEditServer(false); await loadAll() }}>save</Button>
                </div>
              ) : (
                <><code className="text-foreground text-[10px]">{serverUrl}</code>{debugMode && <button onClick={() => setEditServer(true)} className="text-muted-foreground hover:text-primary text-[10px] underline ml-auto">change</button>}</>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-400 text-[10px] underline">dismiss</button>
        </div>
      )}

      {/* My Items */}
      {activeTab === "mine" && userId && (
        <>
          {/* Configs to upload */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm section-header font-bold">Configs</h2>
              <div className="space-y-1">
                {/* Current config (always shown) */}
                {config && (
                  <div className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">active</span>
                      <p className="text-xs font-bold truncate">{config.displayName || "current config"}</p>
                      {config.description && <p className="text-[10px] text-muted-foreground truncate">{config.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => openUpload(config, "config", config.displayName || "current config", config.description)} disabled={quota.used >= quota.max}>upload</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => {
                        uploadCurrentConfig(true)
                      }} disabled={quota.used >= quota.max}>share</Button>
                    </div>
                  </div>
                )}
                {/* Saved configs from resource folder */}
                {localConfigs.map((lc: any) => (
                  <div key={lc.filename} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">config</span>
                      <p className="text-xs font-bold truncate">{lc.displayName}</p>
                      {lc.description && <p className="text-[10px] text-muted-foreground truncate">{lc.description}</p>}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-2" onClick={() => uploadLocalConfig(lc.filename)} disabled={quota.used >= quota.max}>upload</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scripts / Macros */}
          {userMacros.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h2 className="text-sm section-header font-bold">Scripts / Macros</h2>
                <div className="space-y-1">
                  {userMacros.map((macro: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">macro</span>
                        <p className="text-xs font-bold truncate">{macro.name || `macro ${i + 1}`}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => openUpload(macro, "macro", macro.name || "untitled")} disabled={quota.used >= quota.max}>upload</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => uploadMacro(macro, true)} disabled={quota.used >= quota.max}>share</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scripts */}
          {userScripts.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h2 className="text-sm section-header font-bold">Scripts</h2>
                <div className="space-y-1">
                  {userScripts.map((script: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">script</span>
                        <p className="text-xs font-bold truncate">{script.name || `script ${i + 1}`}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => openUpload(script, "script", script.name || "untitled")} disabled={quota.used >= quota.max}>upload</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => uploadScript(script, true)} disabled={quota.used >= quota.max}>share</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cloud Items */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm section-header font-bold">Cloud Items <span className="text-muted-foreground font-normal">({quota.used}/{quota.max})</span></h2>
              {items.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search items..."
                      className="h-7 text-[10px] pl-6"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-[#0d0d0d] border border-[#333] rounded px-1 py-0.5 text-[10px] text-muted-foreground h-7"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                  </select>
                </div>
              )}
              {filteredItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-[#1a1a1a]">{items.length === 0 ? "No cloud items yet. Upload a config, macro, or script above." : "No items match your search."}</p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold">{item.type}</span>
                          {item.public ? <Globe className="w-2.5 h-2.5 text-primary" /> : <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          {item.version > 1 && <span className="text-[10px] text-muted-foreground">v{item.version}</span>}
                        </div>
                        {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={async () => {
                          try { const e = (window as any).electron; await e.cloud.downloadAndSave(item.id); setDownloadedId(item.id); loadConfig(); setTimeout(() => setDownloadedId(null), 3000) }
                          catch (e: any) { setError(e.message || "Download failed") }
                        }} className="p-1 text-muted-foreground hover:text-primary cursor-pointer" title="Download"><Download className="w-3 h-3" /></button>
                        {downloadedId === item.id && <p className="text-[10px] text-foreground mt-1">// downloaded successfully</p>}
                        <button onClick={() => setDeleteConfirmId(item.id)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={handleSyncAll} disabled={syncing}><RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync All</Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { loadAll(); loadLocal(); loadPublic() }}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
          </div>
        </>
      )}

      {/* Community */}
      {activeTab === "community" && (
        <>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm section-header font-bold">Community</h2>
              {merged.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search community items..."
                      className="h-7 text-[10px] pl-6"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-[#0d0d0d] border border-[#333] rounded px-1 py-0.5 text-[10px] text-muted-foreground h-7"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="downloads">Downloads</option>
                  </select>
                </div>
              )}
              {merged.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-[#1a1a1a]">No shared items yet. Mark something as public to share it.</p>
              ) : (
                <div className="space-y-2">
                  {merged.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold">{item.type}</span>
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          {item._yours && <span className="text-[8px] text-primary border border-primary/30 px-1">yours</span>}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {item.downloads || 0}</span>
                        </div>
                        {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
                      </div>
                      <button onClick={async () => {
                        try {
                          const e = (window as any).electron
                          if (item._yours) { await e.cloud.downloadAndSave(item.id) }
                          else { await e.cloud.downloadPublicAndSave(item.id) }
                          setDownloadedId(item.id)
                          loadConfig()
                          setTimeout(() => setDownloadedId(null), 3000)
                          await loadPublic()
                        } catch (e: any) { setError(e.message || "Download failed") }
                      }} className="p-1 text-muted-foreground hover:text-primary cursor-pointer ml-2" title="Download"><Download className="w-3 h-3" /></button>
                      {downloadedId === item.id && <p className="text-[10px] text-foreground mt-1">// downloaded successfully</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-center">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => loadPublic()}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
          </div>
        </>
      )}

      <div className="text-center">
        <button onClick={() => setShowPrivacy(true)} className="text-[10px] text-muted-foreground hover:text-primary underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"><Info className="w-2.5 h-2.5" /> privacy</button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-primary">delete item</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">This will permanently delete this item from the cloud. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-8" onClick={() => setDeleteConfirmId(null)}>cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8 bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!deleteConfirmId) return
              try {
                const e = (window as any).electron
                await e.cloud.delete(deleteConfirmId)
                setDeleteConfirmId(null)
                await loadAll()
                await loadPublic()
              } catch (e: any) { setError(e.message || "Delete failed"); setDeleteConfirmId(null) }
            }}>delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-primary">upload to cloud</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">Set a name, description, and visibility</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">name</Label>
              <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} className="h-8 text-xs" placeholder="My Config" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">description</Label>
              <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} className="w-full rounded border border-[#333] bg-[#0d0d0d] p-2 text-xs text-foreground" placeholder="Optional description" rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="dialog-public" checked={uploadPublic} onCheckedChange={setUploadPublic} />
              <Label htmlFor="dialog-public" className="text-xs flex items-center gap-1 cursor-pointer">
                {uploadPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {uploadPublic ? "public (visible in community)" : "private"}
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setUploadDialog(false)} disabled={uploading}>cancel</Button>
            <Button size="sm" className="text-xs" onClick={confirmUpload} disabled={uploading || !uploadName.trim()}>{uploading ? "uploading..." : "upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-primary">privacy statement</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">last updated May 2026</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <p>Soda Cloud is designed with privacy first. A random UUID is generated locally and stored in <code className="text-[10px] bg-[#0d0d0d] px-1">~/soda/user.json</code>. This UUID is the only identifier sent to the server.</p>
            <h3 className="text-sm font-bold text-primary">stored data</h3>
             <p>Uploaded configs/macros/scripts store: anonymous UUID, type (config/macro/script), name, description, data, public flag, and timestamps.</p>
            <h3 className="text-sm font-bold text-primary">not stored</h3>
            <p>No passwords, emails, IPs (in DB), hardware IDs, location, or payment info.</p>
            <h3 className="text-sm font-bold text-primary">your control</h3>
            <p>You can view, download, or delete all items at any time. Stop using cloud sync anytime — the app works fully offline.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
