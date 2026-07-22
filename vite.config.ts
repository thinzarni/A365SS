import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const generateVersion = () => {
  return {
    name: 'generate-version',
    buildStart() {
      const versionInfo = { version: new Date().getTime().toString() };
      // Ensure public directory exists
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionInfo, null, 2));
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateVersion()],
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
