// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    build: {
        outDir: '../dist',
        rollupOptions: {
            input: {
                main: 'src/main.js'
            },
            output: {
                entryFileNames: 'js/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    server: {
        port: 3000,
        open: true
    }
});
