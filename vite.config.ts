import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MindWhack Neural Arena',
        short_name: 'MindWhack',
        description: 'Design, build, and play custom brainstorming levels in the ultimate neural arena.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || "")
  }
});
