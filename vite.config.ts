import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// VITE_TARGET=web（既定）：GitHub Pages 用（dist-web/）、VITE_TARGET=artifact：claude.ai 用（dist/）
export default defineConfig(({ mode }) => {
  const target = process.env.VITE_TARGET || 'web';
  return {
    base: './',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    publicDir: target === 'web' ? 'public' : false,
    build: { outDir: target === 'web' ? 'dist-web' : 'dist', target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
  };
});
