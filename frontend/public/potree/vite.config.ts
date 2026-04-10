import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for assets
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/upload': 'http://localhost:3000', // Redirige las solicitudes de /upload a tu backend
    },
  },
});
