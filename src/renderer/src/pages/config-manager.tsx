import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAutoclicker } from '@/hooks/use-autoclicker'

interface PresetInfo {
  filename: string
  displayName: string
  Author: string
  description: string
}

export function ConfigManagerPage() {
  const { config, loadConfig } = useAutoclicker()
  const [presets, setPresets] = useState<PresetInfo[]>([])
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [desc, setDesc] = useState('')
  const [fname, setFname] = useState('')

  const loadPresets = async () => {
    // @ts-ignore
    const list = await window.electron.autoclicker.getConfigs()
    setPresets(list)
  }

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPreset = async (filename: string) => {
    // @ts-ignore
    await window.electron.autoclicker.loadPreset(filename)
    loadConfig()
    loadPresets()
  }

  const savePreset = async () => {
    if (!fname) return
    // @ts-ignore
    await window.electron.autoclicker.savePreset({
      filename: fname,
      displayName: name || fname,
      Author: author || 'User',
      description: desc || '',
    })
    loadPresets()
  }

  const openFolder = async () => {
    // @ts-ignore
    await window.electron.autoclicker.openResourceFolder()
  }

  if (!config) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Config Manager</h1>

      <Card>
        <CardHeader><CardTitle>Current Config</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">Name: {config.displayName}</p>
          <p className="text-sm">Author: {config.Author}</p>
          <p className="text-sm">Description: {config.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Save Config</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={config.displayName} />
          </div>
          <div className="grid gap-2">
            <Label>Author</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={config.Author} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={config.description} />
          </div>
          <div className="grid gap-2">
            <Label>Filename</Label>
            <Input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="my-config" />
          </div>
          <Button onClick={savePreset}>Save Config</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Presets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No configs found</p>
          ) : (
            presets.map(p => (
              <div key={p.filename} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{p.displayName}</p>
                  <p className="text-xs text-muted-foreground">By {p.Author} — {p.description}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadPreset(p.filename)}>Load</Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={openFolder}>Open Config Folder</Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">Credits: 4urxra (Developer)</p>
    </div>
  )
}
