import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat-new': {
        target: 'https://iam.omnicloudapi.com/api',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://a365.omnicloudapi.com',
          'Referer': 'https://a365.omnicloudapi.com/'
        }
      },
      // Only proxy specific chat API endpoints, not the /chat page
      '^/chat/(listbyID|messages|attachment|conversation-id)': {
        target: 'https://iam.omnicloudapi.com/api',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://a365.omnicloudapi.com',
          'Referer': 'https://a365.omnicloudapi.com/'
        }
      },
    }
  },
  preview: {
    proxy: {
      '/chat-new': {
        target: 'https://iam.omnicloudapi.com/api',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://a365.omnicloudapi.com',
          'Referer': 'https://a365.omnicloudapi.com/'
        }
      },
      '^/chat/(listbyID|messages|attachment|conversation-id)': {
        target: 'https://iam.omnicloudapi.com/api',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://a365.omnicloudapi.com',
          'Referer': 'https://a365.omnicloudapi.com/'
        }
      },
    },
    allowedHosts: true
  },
  // Expose the real WebSocket server URL to the browser.
  // This bypasses Vite's dev proxy (which conflicts with HMR WebSockets).
  define: {
    // The chat WS endpoint: replace https → wss at the real host
    'import.meta.env.VITE_WS_URL': JSON.stringify(
      process.env.VITE_WS_URL || 'wss://iam.omnicloudapi.com/api'
    ),
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
