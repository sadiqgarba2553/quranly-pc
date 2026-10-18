import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' ? '/' : '/quranly/',
  define: mode === 'desktop' ? { 'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(''), 'import.meta.env.VITE_HADITH_API_KEY': JSON.stringify('') } : {},
  plugins: [react()],
  build: {
    // Target modern browsers (iPad Safari 15+, Chrome 90+) — skip unnecessary polyfills
    target: 'es2020',
    cssTarget: mode === 'desktop' ? 'chrome120' : ['chrome90', 'safari15'],
    // CSS code splitting — each lazy route only loads its own CSS
    cssCodeSplit: true,
    // No sourcemaps in production for smaller bundles
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor-utils';
          }
        },
      },
    },
  },
}));
