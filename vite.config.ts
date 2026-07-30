import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/xuyuan/',
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: '营养减重训练营',
          short_name: '减重营',
          description: '国网冀北综服中心营养减重训练营',
          theme_color: '#FF976A',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/xuyuan/',
          start_url: '/xuyuan/',
          icons: [
            {
              src: '/xuyuan/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/xuyuan/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/xuyuan/icon-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/xuyuan/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,ttf}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
