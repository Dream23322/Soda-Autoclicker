// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'   // or whatever plugins you use

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',          // bind to all interfaces
    port: 8081,               // the port you want
    // Optional: set https, hmr, etc.
  }
})
