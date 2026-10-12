// vite.config.demo.js — Vite development and static-build configuration for the interactive demo.

import fs from "node:fs";
import { extname, resolve, sep } from "node:path";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;
const distDir = resolve(projectRoot, "dist");

// The demo's version badge and GitHub links come from package.json, so they never drift.
const pkg = JSON.parse(fs.readFileSync(resolve(projectRoot, "package.json"), "utf8"));
const githubUrl = String(pkg.repository?.url ?? "")
  .replace(/^git\+/, "")
  .replace(/\.git$/, "");

/** Content types of the files the dev server serves from dist/. */
const CONTENT_TYPES = Object.freeze({
  ".js": "text/javascript",
  ".cjs": "text/javascript",
  ".map": "application/json",
});

/**
 * Resolves a `/lib/...` request path to a file inside dist/, or null when it points
 * outside dist/ or at nothing.
 *
 * @param {string} url Request URL relative to the `/lib` mount point.
 * @returns {string | null}
 */
function resolveLibraryFile(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
  const filePath = resolve(distDir, `.${pathname}`);
  if (!filePath.startsWith(distDir + sep)) return null;
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : null;
}

// The demo loads the library only from the built dist/, in development and in
// production alike, through ./lib/register.js.
function demoLibraryPlugin() {
  return {
    name: "demo-library-plugin",
    // In dev: serve /lib/ from dist/; a missing file is a 404, never the page.
    configureServer(server) {
      server.middlewares.use("/lib", (req, res) => {
        const filePath = resolveLibraryFile(req.url ?? "/");
        if (!filePath) {
          server.config.logger.warn(`[demo] /lib${req.url} not found in dist/. Run \`pnpm build\` first.`);
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.setHeader("Content-Type", CONTENT_TYPES[extname(filePath)] ?? "text/plain");
        res.end(fs.readFileSync(filePath));
      });
    },

    // Load the library before app.js: module scripts run in document order, so the
    // charts are defined when the demo code starts.
    transformIndexHtml: {
      order: "post",
      handler() {
        return [
          {
            tag: "script",
            attrs: { type: "module", src: "./lib/register.js" },
            injectTo: "head-prepend",
          },
        ];
      },
    },
    // In build: copy dist/ to dist-demo/lib/
    closeBundle() {
      const dest = resolve(projectRoot, "dist-demo/lib");
      if (!fs.existsSync(resolve(distDir, "register.js"))) {
        throw new Error("dist/register.js is missing: run `pnpm build` before `pnpm build:demo`.");
      }
      fs.cpSync(distDir, dest, { recursive: true });
      console.log(`\n✅ Copied library from ${distDir} to ${dest}`);
    },
  };
}

export default defineConfig({
  base: "./",
  // The demo routes with the URL hash, so no history fallback: an unknown path is a
  // 404 in dev and preview, as on Vercel (vercel.json has no catch-all rewrite).
  appType: "mpa",
  // `import.meta.env.*` defines are also replaced as %NAME% in index.html.
  define: {
    "import.meta.env.SMC_VERSION": JSON.stringify(pkg.version),
    "import.meta.env.SMC_GITHUB_URL": JSON.stringify(githubUrl),
  },
  root: resolve(projectRoot, "demo"),
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(projectRoot, "dist-demo"),
    rolldownOptions: {
      // Keep the ./lib/ files out of the bundle: they are copied from dist/ as they are.
      external: [/^\.\/lib\/.*/],
      output: {
        // No assets/ folder, so the relative paths keep working from any base path.
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js",
      },
    },
  },
  plugins: [demoLibraryPlugin()],
});
