import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Cloud, Download, Trash2, Upload, RefreshCw, User, AlertCircle, Info, Globe, Lock, Eye } from "lucide-react"
import { useAutoclicker } from "@/hooks/use-autoclicker"

interface CloudItem {
  id: string
  type: "config" | "macro"
  name: string
  description: string
  version: number
  created_at: string
  updated_at: string
}

interface PublicItem extends CloudItem {
  downloads: number
}

export function CloudPage() {
  const { config } = useAutoclicker()
  const [userId, setUserId] = useState<string | null>(null)
  const [serverUrl, setServerUrlState] = useState("")
  const [items, setItems] = useState<CloudItem[]>([])
  const [publicItems, setPublicItems] = useState<PublicItem[]>([])
  const [quota, setQuota] = useState({ used: 0, max: 5 })
  const [loading, setLoading] = useState(true)
  const [pasteUuid, setPasteUuid] = useState("")
  const [editServer, setEditServer] = useState(false)
  const [error, setError] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [sharePublic, setSharePublic] = useState(false)
  const [activeTab, setActiveTab] = useState<"mine" | "community">("mine")

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
          setUserId(null)
          setItems([])
          setQuota({ used: 0, max: 5 })
        }
      } else {
        setItems([])
        setQuota({ used: 0, max: 5 })
      }
    } catch (e: any) {
      setError(e.message || "Connection failed")
    }
    setLoading(false)
  }, [])

  const loadPublic = useCallback(async () => {
    try {
      const e = (window as any).electron
      const data = await e.cloud.listPublicItems()
      setPublicItems(data.items || [])
    } catch {}
  }, [])

  useEffect(() => { loadAll(); loadPublic() }, [loadAll, loadPublic])

  const handleRegister = async () => {
    setLoading(true)
    try {
      const e = (window as any).electron
      await e.cloud.register()
      await loadAll()
    } catch (e: any) {
      setError(e.message || "Registration failed")
    }
    setLoading(false)
  }

  const handleLink = async () => {
    if (!pasteUuid.trim()) return
    setLoading(true)
    try {
      const e = (window as any).electron
      const synced = await e.cloud.sync(pasteUuid.trim())
      if (!synced) {
        setError("Device ID not found on server. Register a new one.")
        setLoading(false)
        return
      }
      setPasteUuid("")
      await loadAll()
    } catch (e: any) {
      setError(e.message || "Failed to link")
    }
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!config) return
    setError("")
    try {
      const e = (window as any).electron
      const name = config.displayName || "My Config"
      const desc = config.description || ""
      await e.cloud.upload({ type: "config", name, description: desc, data: config, public: sharePublic })
      await loadAll()
      if (sharePublic) await loadPublic()
    } catch (e: any) {
      setError(e.message || "Upload failed")
    }
  }

  const handleDownload = async (item: CloudItem) => {
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.downloadAndSave(item.id)
      if (activeTab === "community") await loadPublic()
    } catch (e: any) {
      setError(e.message || "Download failed")
    }
  }

  const handleDownloadPublic = async (item: PublicItem) => {
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.downloadPublicAndSave(item.id)
      await loadPublic()
    } catch (e: any) {
      setError(e.message || "Download failed")
    }
  }

  const handleDelete = async (itemId: string) => {
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.delete(itemId)
      await loadAll()
      await loadPublic()
    } catch (e: any) {
      setError(e.message || "Delete failed")
    }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    setError("")
    try {
      const e = (window as any).electron
      await e.cloud.syncAll()
      await loadAll()
      setSyncing(false)
    } catch (e: any) {
      setError(e.message || "Sync failed")
      setSyncing(false)
    }
  }

  const shortId = userId ? `${userId.slice(0, 4)}...${userId.slice(-4)}` : null

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Connecting...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold">
          <span className="text-primary">$</span> soda@cloud
        </h1>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={() => setActiveTab("mine")}
            className={`text-xs cursor-pointer ${activeTab === "mine" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            my items
          </button>
          <span className="text-muted-foreground text-[10px]">|</span>
          <button
            onClick={() => setActiveTab("community")}
            className={`text-xs cursor-pointer ${activeTab === "community" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            community
          </button>
        </div>
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h2 className="text-sm section-header font-bold">Account</h2>
          {userId ? (
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">device:</span>
              <code className="text-foreground">{shortId}</code>
              <span className="text-muted-foreground">
                ({quota.used}/{quota.max})
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">No account linked. Cloud configs are stored per-device anonymously.</p>
              <div className="flex gap-2">
                <Button size="sm" className="text-xs" onClick={handleRegister}>
                  <Cloud className="w-3 h-3 mr-1" /> Register Device
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste existing device ID"
                  value={pasteUuid}
                  onChange={(e) => setPasteUuid(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
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
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                    const e = (window as any).electron
                    await e.cloud.setServerUrl(serverUrl)
                    setEditServer(false)
                    await loadAll()
                  }}>save</Button>
                </div>
              ) : (
                <>
                  <code className="text-foreground text-[10px]">{serverUrl}</code>
                  <button onClick={() => setEditServer(true)} className="text-muted-foreground hover:text-primary text-[10px] underline ml-auto">change</button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* My Items Tab */}
      {activeTab === "mine" && userId && (
        <>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm section-header font-bold">Actions</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" className="text-xs" onClick={handleUpload} disabled={quota.used >= quota.max || !config}>
                  <Upload className="w-3 h-3 mr-1" /> Upload Current
                </Button>
                {config && (
                  <div className="flex items-center gap-2 text-xs">
                    <Switch id="share-public" checked={sharePublic} onCheckedChange={setSharePublic} />
                    <Label htmlFor="share-public" className="flex items-center gap-1 text-muted-foreground cursor-pointer">
                      {sharePublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {sharePublic ? "public" : "private"}
                    </Label>
                  </div>
                )}
                <Button size="sm" variant="secondary" className="text-xs" onClick={handleSyncAll} disabled={syncing}>
                  <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync All
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { loadAll(); loadPublic() }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <h2 className="text-sm section-header font-bold">
                My Items <span className="text-muted-foreground font-normal">({quota.used}/{quota.max})</span>
              </h2>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-[#1a1a1a]">
                  No cloud items yet. Upload a config to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold">{item.type}</span>
                          {(item as any).public ? <Globe className="w-2.5 h-2.5 text-primary" /> : <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                          <p className="text-xs font-bold truncate">{item.name}</p>
                          {item.version > 1 && <span className="text-[10px] text-muted-foreground">v{item.version}</span>}
                        </div>
                        {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => handleDownload(item)} className="p-1 text-muted-foreground hover:text-primary cursor-pointer" title="Download">
                          <Download className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Community Tab */}
      {activeTab === "community" && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h2 className="text-sm section-header font-bold">Community</h2>
            {publicItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-[#1a1a1a]">
                No shared configs yet. Be the first to share!
              </p>
            ) : (
              <div className="space-y-2">
                {publicItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-[#1a1a1a] bg-[#0d0d0d] p-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">{item.type}</span>
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" /> {item.downloads || 0}
                        </span>
                      </div>
                      {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
                    </div>
                    <button
                      onClick={() => handleDownloadPublic(item)}
                      className="p-1 text-muted-foreground hover:text-primary cursor-pointer ml-2"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center space-y-1">
        <button onClick={() => setShowPrivacy(true)} className="text-[10px] text-muted-foreground hover:text-primary underline underline-offset-2 cursor-pointer inline-flex items-center gap-1">
          <Info className="w-2.5 h-2.5" /> privacy
        </button>
      </div>

      {/* Privacy Statement Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-primary">privacy statement</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">last updated May 2026 &middot; soda.roraaaa.dev</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <p>Soda Cloud is designed with privacy first. This document explains exactly what data is stored, transmitted, and logged when you use the cloud sync feature.</p>
            <h3 className="text-sm font-bold text-primary">device identity</h3>
            <p>When you register, a <strong>random UUID v4</strong> is generated locally on your machine and stored in <code className="text-[10px] bg-[#0d0d0d] px-1">~/soda/user.json</code>. This UUID is the only identifier sent to the server. It contains <strong>no personal information</strong> — no username, email, IP (in storage), hardware ID, or machine name. You can view and delete this file at any time.</p>
            <h3 className="text-sm font-bold text-primary">stored data</h3>
            <p>When you upload a config or macro, the server stores exactly these fields:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">user ID</strong> — the anonymous UUID</li>
              <li><strong className="text-foreground">type</strong> — config or macro</li>
              <li><strong className="text-foreground">name</strong> — display name you provide</li>
              <li><strong className="text-foreground">description</strong> — optional text</li>
              <li><strong className="text-foreground">data</strong> — full config JSON or macro script</li>
              <li><strong className="text-foreground">public flag</strong> — whether you chose to share it publicly</li>
              <li><strong className="text-foreground">timestamps</strong> — created_at and updated_at (UTC)</li>
            </ul>
            <h3 className="text-sm font-bold text-primary">what is NOT stored</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>passwords, emails, or any account credentials</li>
              <li>IP addresses in the database (server logs may temporarily contain IPs)</li>
              <li>hardware identifiers, MAC addresses, or system information</li>
              <li>browsing history, keystroke timings, or screen captures</li>
              <li>credit card or payment information or location data</li>
            </ul>
            <h3 className="text-sm font-bold text-primary">public sharing</h3>
            <p>If you mark an item as <strong>public</strong>, its name, description, type, and data become visible to anyone who browses the community page. Your anonymous user ID is <strong>not</strong> exposed alongside public items — shared content is listed without attribution to protect your privacy.</p>
            <h3 className="text-sm font-bold text-primary">server logs</h3>
            <p>The server keeps temporary access logs via systemd-journald. These may include request timestamp, HTTP method, path, status code, response size, and source IP address. Logs are never sold, shared, or persisted beyond a rotating buffer.</p>
            <h3 className="text-sm font-bold text-primary">third parties</h3>
            <p>Soda Cloud does <strong>not</strong> use any third-party analytics, tracking, telemetry, or advertising services. The only network request is to the server you configure.</p>
            <h3 className="text-sm font-bold text-primary">your control</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>view all stored items in the cloud dashboard</li>
              <li>download or delete individual items</li>
              <li>toggle public/private on items</li>
              <li>generate a new anonymous device ID by deleting <code className="text-[10px] bg-[#0d0d0d] px-1">~/soda/user.json</code></li>
              <li>stop using cloud sync entirely — the app works fully offline without it</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
