import { defineConfig } from 'vite'

export default defineConfig({
  // Serve from root directory
  root: '.',
  server: {
    port: 4500,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:    'index.html',
        video:   'video.html',
        success: 'success.html',
      },
    },
  },
})
