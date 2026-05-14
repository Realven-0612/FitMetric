import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'assets/app_icon.png', 'icon-192x192.svg', 'icon-512x512.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000 // 5 MB
        },
        manifest: {
          name: 'FitMetric',
          short_name: 'FitMetric',
          description: 'Your personal fitness and nutrition tracker',
          theme_color: '#0a0a0c',
          background_color: '#0a0a0c',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/assets/app_icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/assets/app_icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/icon-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
