import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

import fs from 'fs';

function portfolioPersistencePlugin() {
  return {
    name: 'portfolio-persistence-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';
        if (!url.startsWith('/api/portfolio') && !url.startsWith('/api/health')) {
          return next();
        }
        const dataFilePath = path.resolve(__dirname, 'portfolio-data.json');

        // GET /api/health
        if (req.method === 'GET' && (url === '/api/health' || url === '/api/health/')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, mode: 'vite-dev-persistence' }));
          return;
        }

        // GET /api/portfolio
        if (req.method === 'GET' && (url === '/api/portfolio' || url === '/api/portfolio/')) {
          try {
            if (fs.existsSync(dataFilePath)) {
              const data = fs.readFileSync(dataFilePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            }
          } catch (e) {
            console.error('[vite-plugin] Error reading portfolio-data.json', e);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({}));
          return;
        }

        // POST /api/portfolio/:key
        if (req.method === 'POST' && url.startsWith('/api/portfolio/')) {
          const key = url.replace('/api/portfolio/', '').split('?')[0];
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              let currentData: Record<string, any> = {};
              if (fs.existsSync(dataFilePath)) {
                currentData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
              }
              currentData[key] = parsed.value;
              fs.writeFileSync(dataFilePath, JSON.stringify(currentData, null, 2), 'utf-8');
              console.log(`[vite-plugin] Persisted ${key} to portfolio-data.json`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, key }));
            } catch (err: any) {
              console.error('[vite-plugin] Error writing portfolio-data.json', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const adminPassword = env.ADMIN_PASSWORD || 'guru1976';
  const adminPassHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  return {
    plugins: [react(), tailwindcss(), portfolioPersistencePlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__ADMIN_PASS_HASH__': JSON.stringify(adminPassHash),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase/')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/motion-dom')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/ogl/')) {
              return 'vendor-ogl';
            }
            if (id.includes('node_modules/@simplewebauthn/')) {
              return 'vendor-webauthn';
            }
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')
            ) {
              return 'vendor-react';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/portfolio-data.json', '**/server.ts', '**/.data/**'],
      },
    },
  };
});
