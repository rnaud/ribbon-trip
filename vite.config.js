import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the GitHub Pages build works from /ribbon-trip/.
  base: './',
  build: {
    // three.js is the only large dependency; keep it in its own long-lived chunk.
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
