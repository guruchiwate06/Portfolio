import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const adminPassword = env.ADMIN_PASSWORD || 'admin_secret_pass_2026';
  const adminPassHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__ADMIN_PASS_HASH__': JSON.stringify(adminPassHash),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/portfolio-data.json', '**/server.ts', '**/.data/**'],
      },
    },
  };
});
