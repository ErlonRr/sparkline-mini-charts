// vite.config.demo.js — Vite development and static-build configuration for the interactive demo.

import fs from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;

function demoLibraryPlugin() {
  return {
    name: 'demo-library-plugin',
    // In dev: serve /lib/ mapping to ../dist/
    configureServer(server) {
      server.middlewares.use('/lib', (req, res, next) => {
        const filePath = resolve(projectRoot, "dist", req.url.slice(1).split('?')[0]);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', filePath.endsWith('.js') ? 'application/javascript' : 'text/plain');
          res.end(fs.readFileSync(filePath));
        } else {
          next();
        }
      });
    },
    // Prevent Vite from bundling the script by injecting it post-build
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'module', src: './lib/register.js' },
            injectTo: 'head'
          }
        ];
      }
    },
    // In build: copy dist/ to dist-demo/lib/
    closeBundle() {
      const src = resolve(projectRoot, "dist");
      const dest = resolve(projectRoot, "dist-demo/lib");
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`\n✅ Copied library from ${src} to ${dest}`);
      }
    }
  };
}

export default defineConfig({
  base: "./",
  root: resolve(projectRoot, "demo"),
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(projectRoot, "dist-demo"),
    rollupOptions: {
      // Evita che rollup provi a bundlare i file importati da ./lib/
      external: [
        /^\.\/lib\/.*/,
      ],
      output: {
        // Rimuove la cartella assets/ per mantenere i percorsi relativi funzionanti e puliti
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js"
      }
    }
  },
  plugins: [
    demoLibraryPlugin()
  ]
});
