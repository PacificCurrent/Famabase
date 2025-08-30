})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    // allow Replit preview domains
    allowedHosts: ['.replit.dev', '.replit.app', '.repl.co']
  }
})