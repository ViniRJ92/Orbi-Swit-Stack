/**
 * Build do renderer (interface React) via Vite. O processo principal
 * (src/main) continua compilado separadamente pelo tsc (ver tsconfig.json
 * e package.json -> scripts.build). Whats Control — Criado por Vini7
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const rootDir = import.meta.dirname;

export default defineConfig({
  root: resolve(rootDir, 'src/renderer'),
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(rootDir, 'dist/renderer'),
    emptyOutDir: true,
  },
});
