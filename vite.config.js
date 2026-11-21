import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The release is ONE self-contained index.html (scripts, styles and fonts inlined) that works
// from a web server, from GitHub Pages, or opened straight from disk.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: { target: "es2022", assetsInlineLimit: 100_000_000, reportCompressedSize: false },
  test: { include: ["tests/unit/**/*.test.js"], environment: "node" },
});
