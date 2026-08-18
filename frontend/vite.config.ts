import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiProxyTarget = env.VITE_CLAIMNX_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      // A LAN browser uses this same-origin path. Vite sends it to the API
      // running on this computer, rather than the visitor's localhost.
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
        },
      },
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
