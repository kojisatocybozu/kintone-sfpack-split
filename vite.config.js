import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isCustomer =
    mode === 'customer' || mode === 'customer-prod';

  const isProduction =
    mode === 'deal-prod' || mode === 'customer-prod';

  return {
    build: {
      outDir: isProduction ? 'dist-prod' : 'dist',
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
      minify: isProduction,
      sourcemap: !isProduction,
    },
  };
});
