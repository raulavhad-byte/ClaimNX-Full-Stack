import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss()
    ],
    build: {
      // Source maps make original module sources easy to inspect. Keep them
      // disabled for every production artifact.
      sourcemap: false,
      minify: 'esbuild',
      reportCompressedSize: false,
      esbuild: {
        legalComments: 'none',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
