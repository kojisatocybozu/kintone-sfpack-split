import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/main.js',
      name: 'SfpackCustomization',
      formats: ['iife'],
      fileName: () => 'sfpack-customization.js',
    },
    minify: false,
    sourcemap: true,
  },
});