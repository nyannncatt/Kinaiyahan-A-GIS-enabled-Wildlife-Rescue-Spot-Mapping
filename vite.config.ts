import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: false,
      timeout: 30000,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
});
