import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isCustomer = mode === 'customer';

  return {
    build: {
      outDir: 'dist',
      emptyOutDir: !isCustomer,
      lib: {
        entry: isCustomer
          ? 'src/customerMain.js'
          : 'src/main.js',
        name: isCustomer
          ? 'CustomerCustomization'
          : 'SfpackCustomization',
        formats: ['iife'],
        fileName: () =>
          isCustomer
            ? 'customer-customization.js'
            : 'sfpack-customization.js',
      },
      minify: 'oxc',
      sourcemap: true,
    },
  };
});
