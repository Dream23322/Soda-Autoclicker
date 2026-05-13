// electron.vite.config.ts
import { resolve } from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  // ---- main process -------------------------------------------------------
  main: {
    resolve: {
      alias: [
        { find: /^@\/types/, replacement: resolve(__dirname, "src/types") },
        { find: "@", replacement: resolve(__dirname, "src/renderer/src") }
      ]
    },
    plugins: [externalizeDepsPlugin()]
  },

  // ---- preload script ----------------------------------------------------
  preload: {
    plugins: [externalizeDepsPlugin()]
  },

  // ---- renderer (Vite) ---------------------------------------------------
  renderer: {
    resolve: {
      alias: [
        { find: /^@\/types/, replacement: resolve("src/types") },
        { find: "@", replacement: resolve("src/renderer/src") }
      ]
    },
    plugins: [react(), tailwindcss()],
    // <‑‑ ADD THIS SECTION
    server: {
      host: "0.0.0.0",   // listen on all network interfaces
      port: 8081         // optional – use whatever port you prefer
      // hmr: { overlay: false }  // example of other server options
    }
    // <‑‑ END ADDITION
  }
})
