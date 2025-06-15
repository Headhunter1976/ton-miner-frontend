import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Importujemy nowy plugin
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  // Dodajemy plugin tailwindcss() do listy
  plugins: [
    react(), 
    tailwindcss(),
    nodePolyfills({
      // Włącz polyfills dla określonych modułów Node.js
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Włącz polyfill dla wbudowanych modułów Node.js
      protocolImports: true,
    })
  ],
  
  // Serwer deweloperski
  server: {
    // Wyłączamy CSP dla testów
    // headers: {
    //   'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https://*.githubusercontent.com https://*.tonapi.io https://*.tonkeeper.com https://*.mytonwallet.org wss://* ws://* http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://*; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;"
    // }
  },
  
  // Definiujemy globalne zmienne
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  
  // Konfiguracja aliasów dla Node.js polyfills
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
    },
  },
  
  // Optymalizacja zależności
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'crypto-browserify',
      'stream-browserify',
      'assert',
      'stream-http',
      'https-browserify',
      'os-browserify',
      'url'
    ],
  },
  
  // Dodatkowa konfiguracja build
  build: {
    rollupOptions: {
      plugins: [
        {
          name: 'node-polyfills',
          config(config) {
            if (!config.define) config.define = {};
            config.define.global = 'globalThis';
          }
        }
      ]
    }
  }
})