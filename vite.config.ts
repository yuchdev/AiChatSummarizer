import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        ui: resolve(__dirname, 'src/ui/ui.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'popup') return 'popup/popup.js';
          if (chunkInfo.name === 'ui') return 'ui/ui.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'ui/ui.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    {
      name: 'copy-assets',
      writeBundle() {
        // Copy manifest
        const manifest = JSON.parse(
          readFileSync(resolve(__dirname, 'src/manifest.json'), 'utf-8')
        );
        mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
        writeFileSync(
          resolve(__dirname, 'dist/manifest.json'),
          JSON.stringify(manifest, null, 2)
        );
        
        // Copy icons
        mkdirSync(resolve(__dirname, 'dist/icons'), { recursive: true });
        const icons = ['icon-16.png', 'icon-48.png', 'icon-128.png'];
        icons.forEach(icon => {
          const iconPath = resolve(__dirname, 'src/icons', icon);
          const destPath = resolve(__dirname, 'dist/icons', icon);
          try {
            copyFileSync(iconPath, destPath);
          } catch (err) {
            console.warn(`Warning: Could not copy ${icon}`);
          }
        });

        // Copy HTML files
        mkdirSync(resolve(__dirname, 'dist/popup'), { recursive: true });
        mkdirSync(resolve(__dirname, 'dist/ui'), { recursive: true });
        
        copyFileSync(
          resolve(__dirname, 'src/popup/popup.html'),
          resolve(__dirname, 'dist/popup/popup.html')
        );
        
        copyFileSync(
          resolve(__dirname, 'src/ui/ui.html'),
          resolve(__dirname, 'dist/ui/ui.html')
        );
      },
    },
  ],
});
