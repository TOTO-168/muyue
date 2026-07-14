import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/muyue/' : '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
