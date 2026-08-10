// vite.config.demo.js — Vite development and static-build configuration for the interactive demo.

import { resolve } from "node:path";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;

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
  },
});
