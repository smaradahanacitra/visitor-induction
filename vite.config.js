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
        main:            'index.html',
        registration:    'visitor-registration.html',
        video:           'video.html',
        success:         'success.html',
        admin_login:     'admin/login.html',
        admin_dashboard: 'admin/dashboard.html',
      },
    },
  },
})
