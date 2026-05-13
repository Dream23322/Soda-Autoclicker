import { Button } from "@/components/ui/button"
import { X, Square, Minus } from "lucide-react"

function Titlebar() {
  const handleWindowControl = (action: "minimize" | "maximize" | "close") => {
    ;(window as any).electron?.ipcRenderer?.send("window-control", action)
  }

  const headerStyle = {
    WebkitAppRegion: "drag",
    userSelect: "none",
    height: 36,
    "--titlebar-height": "36px",
  } as any

  const buttonContainerStyle = {
    WebkitAppRegion: "no-drag",
  } as any

  return (
    <header
      className="flex items-center justify-between px-3 select-none bg-background border-b border-[#1a1a1a]"
      style={headerStyle}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary font-bold text-sm">$</span>
        <span className="text-xs font-bold tracking-wide">soda-autoclicker</span>
        <span className="text-[10px] text-muted-foreground">v2.0.0-beta</span>
      </div>

      <div className="flex items-center gap-0" style={buttonContainerStyle}>
        <Button variant="ghost" size="icon" onClick={() => handleWindowControl("minimize")} className="h-7 w-7 rounded-none hover:bg-[#141414]">
          <Minus size={12} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleWindowControl("maximize")} className="h-7 w-7 rounded-none hover:bg-[#141414]">
          <Square size={12} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleWindowControl("close")} className="h-7 w-7 rounded-none hover:bg-destructive hover:text-destructive-foreground">
          <X size={12} />
        </Button>
      </div>
    </header>
  )
}

export default Titlebar
