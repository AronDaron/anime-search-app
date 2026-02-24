import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite config specifically for browser-only development (bypassing Electron requirements)
export default defineConfig({
    root: 'src/renderer',
    base: './',
    resolve: {
        alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src')
        }
    },
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        open: false,
        strictPort: true,
        proxy: {
            '/graphql': {
                target: 'https://graphql.anilist.co',
                changeOrigin: true
            }
        }
    }
});
