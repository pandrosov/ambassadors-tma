import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    // Разрешаем все хосты для работы с cloudflare туннелем
    allowedHosts: [
      'localhost',
      '.trycloudflare.com',
      '.ngrok-free.app',
      '.ngrok.app',
    ],
    // Настраиваем HMR для работы через туннель
    hmr: {
      // Отключаем HMR через WebSocket для работы через cloudflare
      // В Telegram Mini Apps HMR не критичен
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      // Отключаем HMR если запущено через cloudflare
      clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 5173,
    },
  },
  build: {
    outDir: 'dist',
  },
});

