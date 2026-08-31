/**
 * Builds a deployable bundle in dist/.
 *
 * Two flavours, because the two deploy targets want different things:
 *
 *   node scripts/package.js            -> dist/gridlantis-static.zip
 *        Just public/. Drag this into Cloudflare Pages / Netlify. No Node.
 *
 *   node scripts/package.js --server   -> dist/gridlantis-server.zip
 *        public/ + server.js + package.json + scripts/. Unzip on a host or
 *        VPS, `npm ci --omit=dev`, `npm start`, then point a tunnel at it.
 *
 * node_modules is never bundled — the target runs `npm ci` from the lockfile.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const withServer = process.argv.includes("--server");
const outName = withServer ? "gridlantis-server.zip" : "gridlantis-static.zip";
const outPath = path.join(DIST, outName);

fs.mkdirSync(DIST, { recursive: true });
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const output = fs.createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`\nBuilt ${path.relative(ROOT, outPath)} (${kb} KB)`);
  console.log(
    withServer
      ? "Unzip on the host, then: npm ci --omit=dev && npm start"
      : "Upload this to Cloudflare Pages, Netlify, or any static host."
  );
});

archive.on("warning", (err) => {
  if (err.code === "ENOENT") console.warn("warn:", err.message);
  else throw err;
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

if (withServer) {
  archive.directory(path.join(ROOT, "public"), "public");
  archive.directory(path.join(ROOT, "scripts"), "scripts");
  for (const f of ["server.js", "package.json", "package-lock.json"]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) archive.file(p, { name: f });
  }
} else {
  // Static host serves public/ as the web root, so flatten it.
  archive.directory(path.join(ROOT, "public"), false);
}

await archive.finalize();
