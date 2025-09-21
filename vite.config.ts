
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
      }
    }
  },
  server: {
    // Listen on all network interfaces to allow ngrok/network access
    host: '0.0.0.0',

    // Add the ngrok host to allowedHosts
    allowedHosts: [
      '77a53a2db015.ngrok-free.app', // <-- PASTE YOUR NGROK HOSTNAME HERE
      'localhost',
      '127.0.0.1'
    ],
    
    // Hot Module Replacement (HMR) configuration for ngrok
    hmr: {
      // The HMR host should also be the ngrok URL
      host: '77a53a2db015.ngrok-free.app', // <-- PASTE YOUR NGROK HOSTNAME HERE, TOO
      protocol: 'wss', // Use secure WebSocket for HMR over the HTTPS ngrok tunnel
      clientPort: 443 // Default HTTPS port
    },

    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true, // Recommended for virtual hosts
        secure: false, // Important for proxying from HTTPS (ngrok) to HTTP (local)
      },
      // Add proxy for WebSocket connections
      '/socket.io': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true, // Ensures origin header is updated, improving proxy reliability
      },
    },

    port: 5173 // Your application's development port
  }
});