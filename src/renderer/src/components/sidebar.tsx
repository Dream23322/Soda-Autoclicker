import { useState, useEffect } from "react"
import { NavLink } from "react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, Settings, MousePointer2, MousePointer, Menu, HelpCircle, Play, FlaskConical, Zap, FileEdit, List, Code, Cloud } from "lucide-react"

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) setCollapsed(saved === "true")
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed))
  }, [collapsed])

  const navItems = [
    { to: "/", label: "Dashboard", icon: <Home size={16} /> },
    { to: "/left-clicker", label: "Left Clicker", icon: <MousePointer2 size={16} /> },
    { to: "/right-clicker", label: "Right Clicker", icon: <MousePointer size={16} /> },
    { to: "/recorder", label: "Recorder", icon: <Play size={16} /> },
    { to: "/movement", label: "Movement", icon: <Zap size={16} /> },
    { to: "/macros", label: "Macros", icon: <Code size={16} /> },
    { to: "/potions", label: "Potions", icon: <FlaskConical size={16} /> },
    { to: "/config-manager", label: "Configs", icon: <FileEdit size={16} /> },
    { to: "/misc", label: "Misc", icon: <List size={16} /> },
  ]

  const footerItems = [
    { to: "/cloud", label: "Cloud", icon: <Cloud size={16} /> },
    { to: "/help", label: "Help", icon: <HelpCircle size={16} /> },
    { to: "/settings", label: "Settings", icon: <Settings size={16} /> },
  ]

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex items-center rounded-none px-3 py-2 text-xs transition-all gap-2 border-l-2",
      isActive
        ? "bg-[#141414] text-primary border-l-primary"
        : "border-l-transparent hover:bg-[#141414] hover:text-foreground text-muted-foreground"
    )

  const collapsibleLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(linkClasses({ isActive }), "group")

  const LabelWrapper = ({ children }: { children: React.ReactNode }) => (
    <span
      className={cn(
        collapsed ? "hidden" : "whitespace-nowrap"
      )}
    >
      {children}
    </span>
  )

  const Tooltip = ({ text }: { text: string }) =>
    collapsed ? (
      <span
        className={cn(
          "invisible group-hover:visible pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50",
          "rounded-none bg-[#0d0d0d] border border-[#1a1a1a] text-foreground px-2 py-1 text-xs"
        )}
      >
        {text}
      </span>
    ) : null

  return (
    <aside
      className={cn(
        "left-0 top-[var(--titlebar-height)] h-full bg-background border-r border-[#1a1a1a] flex flex-col transition-[width] duration-200",
        collapsed ? "w-12" : "w-48"
      )}
    >
      <div className="flex items-center justify-between p-2 border-b border-[#1a1a1a]">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar" className="h-7 w-7 rounded-none">
          <Menu size={14} />
        </Button>
      </div>

      <nav className="flex flex-col gap-0.5 p-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={collapsibleLinkClasses} aria-label={collapsed ? label : undefined}>
            <span className="flex items-center justify-center w-4 h-4">{icon}</span>
            <LabelWrapper>{label}</LabelWrapper>
            <Tooltip text={label} />
          </NavLink>
        ))}
      </nav>

      <nav className="flex flex-col gap-0.5 p-1 mt-auto border-t border-[#1a1a1a]">
        {footerItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={collapsibleLinkClasses} aria-label={collapsed ? label : undefined}>
            <span className="flex items-center justify-center w-4 h-4">{icon}</span>
            <LabelWrapper>{label}</LabelWrapper>
            <Tooltip text={label} />
            {to === "/cloud" && !collapsed && (
              <span className="invisible group-hover:visible pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                rounded-none bg-[#0d0d0d] border border-[#1a1a1a] text-foreground px-2 py-1 text-[10px] whitespace-nowrap"
              >
                anonymous device ID only
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
