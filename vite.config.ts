import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Polyfill Node.js built-ins for browser compatibility
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
      // Mock network modules that don't exist in browser to prevent build errors
      // The app logic handles the runtime failure of these gracefully
      dgram: resolve(__dirname, './src/mocks/dgram.js'), 
      net: resolve(__dirname, './src/mocks/net.js'),
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});