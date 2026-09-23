/**
 * Pre-launch gate. Walks every .html file in public/ and verifies that each
 * internal href/src actually resolves on disk. Exits non-zero on failure so
 * `npm run package` refuses to build a bundle with dead links in it.
 *
 * External URLs (http/https/mailto/tel) and in-page anchors are skipped —
 * this only checks things you ship.
 *
 * Not every shipped path is a file. `public/_redirects` sends some of them
 * elsewhere — the download links leave for GitHub Releases, because Pages
 * refuses files over 25 MiB. Those resolve on the live site and never on
 * disk, so the redirect sources count as valid targets too; without that
 * this gate fails the deploy over links that work.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const REF_PATTERN = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

/**
 * Source paths declared in public/_redirects, as a matcher.
 *
 * Only the first column matters here — whether a rule exists at all, not
 * where it goes. A trailing /* is Cloudflare's splat, so it matches the
 * prefix; everything else must match exactly.
 */
function loadRedirects() {
  const file = path.join(PUBLIC_DIR, "_redirects");
  if (!fs.existsSync(file)) return { exact: new Set(), prefixes: [] };

  const exact = new Set();
  const prefixes = [];

  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const [from] = line.split(/\s+/);
    if (!from || !from.startsWith("/")) continue;

    if (from.endsWith("/*")) prefixes.push(from.slice(0, -1));
    else exact.add(from);
  }

  return { exact, prefixes };
}

const redirects = loadRedirects();

const isRedirected = (ref) => {
  const clean = ref.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return (
    redirects.exact.has(clean) ||
    redirects.prefixes.some((prefix) => clean.startsWith(prefix))
  );
};

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
let redirected = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const seen = new Set();

  for (const [, ref] of html.matchAll(REF_PATTERN)) {
    if (isExternal(ref) || seen.has(ref)) continue;
    seen.add(ref);

    if (isRedirected(ref)) {
      redirected++;
      continue;
    }

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

console.log(
  `Checked ${checked} internal references across ${htmlFiles.length} pages` +
    (redirected ? `, and skipped ${redirected} handled by _redirects.` : "."),
);

if (broken.length) {
  console.error(`\n${broken.length} broken reference(s):\n`);
  for (const { page, ref } of broken) {
    console.error(`  ${page.padEnd(22)} -> ${ref}`);
  }
  console.error("\nFix these or remove the references before packaging.\n");
  process.exit(1);
}

console.log("All internal references resolve.");
