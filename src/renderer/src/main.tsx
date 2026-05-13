import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { HashRouter as Router } from "react-router"
import { applyColorPreset, COLOR_PRESETS } from "./lib/utils"
import { ErrorBoundary } from "./components/error-boundary"

// Apply saved color preset on app startup
const savedColor = localStorage.getItem("colorPreset") || "lime"
applyColorPreset(savedColor as keyof typeof COLOR_PRESETS)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <Router>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  </StrictMode>
)
