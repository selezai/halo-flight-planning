import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    // Use babel for JSX transformation
    babel: {
      plugins: ['@babel/plugin-transform-react-jsx'],
    },
    // Apply the loader to both .js and .jsx files
    include: '**/*.{js,jsx}',
  })],
  server: {
    proxy: {
      // Proxy API requests to the local proxy server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy CDN requests to the local proxy server
      '/cdn': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Dedicated proxy for OpenAIP to avoid conflicts and ensure resolution
      '/openaip': {
        target: 'https://api.core.openaip.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openaip/, '/api'),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: [
      'src/**/*.js',
      'src/**/*.jsx'
    ]
  },
})
