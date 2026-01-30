
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Force new file names to bust cache
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      },
      external: ['gsap', 'gsap/ScrollTrigger', '@yudiel/react-qr-scanner']
    }
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger'],
    exclude: ['@yudiel/react-qr-scanner']
  },
  server: {
    // Listen on localhost for development
    host: 'localhost',
    port: 5173,

    // Simplified HMR configuration for local development
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },

    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Add proxy for WebSocket connections
      '/socket.io': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    }
  }
});