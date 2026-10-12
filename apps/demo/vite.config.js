// vite.config.js — Vite development and static-build configuration for the interactive demo.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { defineConfig } from "vite";

const demoRoot = import.meta.dirname;

// The demo depends on "sparkline-mini-charts": "workspace:*" (packages/core). Vite
// resolves it through the package `exports`, so dev and build both run the built dist/.
const require = createRequire(import.meta.url);
const libraryManifestPath = require.resolve("sparkline-mini-charts/package.json");
const libraryDir = dirname(libraryManifestPath);

// The demo's version badge and GitHub links come from the library's package.json, so they never drift.
const pkg = JSON.parse(readFileSync(libraryManifestPath, "utf8"));
const githubUrl = String(pkg.repository?.url ?? "")
  .replace(/^git\+/, "")
  .replace(/\.git$/, "");

// Without packages/core/dist/ the import of "sparkline-mini-charts/register" would fail
// with a bare resolution error (or, in dev, leave every chart an empty unknown element):
// stop with the fix instead.
function requireLibraryBuild() {
  return {
    name: "demo-require-library-build",
    buildStart() {
      const entry = resolve(libraryDir, pkg.exports["./register"].import.default);
      if (!existsSync(entry)) {
        throw new Error(
          `${relative(process.cwd(), entry)} is missing: build the library first (\`pnpm build\` at the repository root).`,
        );
      }
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
  root: demoRoot,
  build: {
    emptyOutDir: true,
    outDir: resolve(demoRoot, "dist"),
    rolldownOptions: {
      output: {
        // No assets/ folder, so the relative paths keep working from any base path.
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js",
      },
    },
  },
  plugins: [requireLibraryBuild()],
});
