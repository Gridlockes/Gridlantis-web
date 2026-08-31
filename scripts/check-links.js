/**
 * Pre-launch gate. Walks every .html file in public/ and verifies that each
 * internal href/src actually resolves on disk. Exits non-zero on failure so
 * `npm run package` refuses to build a bundle with dead links in it.
 *
 * External URLs (http/https/mailto/tel) and in-page anchors are skipped —
 * this only checks things you ship.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const REF_PATTERN = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

const isExternal = (ref) =>
  /^(https?:)?\/\//i.test(ref) ||
  /^(mailto|tel|data|javascript):/i.test(ref) ||
  ref.startsWith("#") ||
  ref.startsWith("/cdn-cgi");

function resolveRef(ref, fromFile) {
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return null;
  return clean.startsWith("/")
    ? path.join(PUBLIC_DIR, clean)
    : path.join(path.dirname(fromFile), clean);
}

const htmlFiles = fs
  .readdirSync(PUBLIC_DIR)
  .filter((f) => f.endsWith(".html"))
  .map((f) => path.join(PUBLIC_DIR, f));

const broken = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const seen = new Set();

  for (const [, ref] of html.matchAll(REF_PATTERN)) {
    if (isExternal(ref) || seen.has(ref)) continue;
    seen.add(ref);

    const target = resolveRef(ref, file);
    if (!target) continue;
    checked++;

    // Mirror the server's `extensions: ["html"]` fallback.
    const exists =
      fs.existsSync(target) ||
      (!path.extname(target) && fs.existsSync(`${target}.html`));

    if (!exists) {
      broken.push({ page: path.basename(file), ref });
    }
  }
}

console.log(`Checked ${checked} internal references across ${htmlFiles.length} pages.`);

if (broken.length) {
  console.error(`\n${broken.length} broken reference(s):\n`);
  for (const { page, ref } of broken) {
    console.error(`  ${page.padEnd(22)} -> ${ref}`);
  }
  console.error("\nFix these or remove the references before packaging.\n");
  process.exit(1);
}

console.log("All internal references resolve.");
