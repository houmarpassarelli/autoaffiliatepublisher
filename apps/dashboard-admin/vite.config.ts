// apps/dashboard-admin/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Servidor de desenvolvimento do dashboard.
// As chamadas ao backend passam por proxy para evitar CORS e para que o código
// do cliente use sempre caminhos relativos, iguais em desenvolvimento e em produção.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
      '/health': { target: 'http://localhost:3333', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3333', ws: true },
    },
  },
});
