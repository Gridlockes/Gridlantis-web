/**
 * Diagnoses 404s and startup failures.
 *
 *   npm run doctor
 *
 * Checks, in the order things actually break:
 *   1. dependencies installed
 *   2. public/ exists and holds the pages
 *   3. index.html is where the server expects it
 *   4. filename case matches what pages link to
 *   5. stray web files left in the project root
 *   6. zero-byte files
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const problems = [];
const notes = [];

const ls = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

console.log("\n─── Gridlantis doctor ───\n");

// -------------------------------------------------------------- 1. deps
if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  problems.push(
    "Dependencies are not installed.\n" +
      "     Fix: npm install\n" +
      "     Without this, `npm start` fails with ERR_MODULE_NOT_FOUND."
  );
} else {
  notes.push("dependencies installed");
}

if (!fs.existsSync(path.join(ROOT, "package-lock.json"))) {
  notes.push("no package-lock.json yet — `npm ci` will not work until you run `npm install` once");
}

// -------------------------------------------------------------- 2. public/
if (!fs.existsSync(PUBLIC_DIR)) {
  problems.push("public/ does not exist.\n     Fix: ./reorganize.sh");
}

const publicFiles = ls(PUBLIC_DIR);
const publicPages = publicFiles.filter((f) => f.endsWith(".html"));

// -------------------------------------------------------------- 3. index
if (!publicFiles.includes("index.html")) {
  const atRoot = fs.existsSync(path.join(ROOT, "index.html"));
  problems.push(
    "public/index.html is MISSING — this is why / returns 404.\n" +
      (atRoot
        ? "     index.html is sitting in the project root instead.\n" +
          "     The server only serves public/. Fix: ./reorganize.sh"
        : "     Fix: restore index.html into public/")
  );
} else {
  notes.push("public/index.html found");
}

// -------------------------------------------------------------- 4. case
const linked = new Set();
for (const page of publicPages) {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, page), "utf8");
  for (const [, ref] of html.matchAll(/href="([A-Za-z0-9_.-]+\.html)"/g)) {
    linked.add(ref);
  }
}

const lowerMap = new Map(publicFiles.map((f) => [f.toLowerCase(), f]));
for (const want of linked) {
  if (publicFiles.includes(want)) continue;
  const actual = lowerMap.get(want.toLowerCase());
  if (actual) {
    problems.push(
      `CASE MISMATCH: pages link to "${want}" but the file is "${actual}".\n` +
        "     Works on macOS/Windows, 404s on Linux and Cloudflare.\n" +
        "     Fix: ./reorganize.sh"
    );
  } else {
    problems.push(`Linked page "${want}" does not exist anywhere in public/.`);
  }
}

// -------------------------------------------------------------- 5. assets
// Catches the case that produced this check: a stylesheet or module sitting in
// the wrong folder, so the page requests /css/x.css and gets a 404.
const assetRefs = new Map(); // ref -> pages referencing it
for (const page of publicPages) {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, page), "utf8");
  const pattern =
    /(?:<link[^>]+href|<script[^>]+src)\s*=\s*["']([^"']+\.(?:css|js))["']/gi;
  for (const [, ref] of html.matchAll(pattern)) {
    if (/^(https?:)?\/\//i.test(ref)) continue; // external CDN
    if (!assetRefs.has(ref)) assetRefs.set(ref, []);
    assetRefs.get(ref).push(page);
  }
}

for (const [ref, pages] of assetRefs) {
  // Cloudflare injects this at its edge when email obfuscation is on. It never
  // exists as a real file, and off Cloudflare the obfuscated addresses stay
  // broken. Worth its own message rather than "file missing".
  if (ref.startsWith("/cdn-cgi/")) {
    problems.push(
      `Cloudflare email-protection artifact in ${pages.join(", ")}.\n` +
        "     This script only exists on Cloudflare's edge. Off it, the\n" +
        "     obfuscated mailto: links are dead. Replace the data-cfemail\n" +
        "     spans with plain mailto: addresses and delete the script tag."
    );
    continue;
  }

  const target = ref.startsWith("/")
    ? path.join(PUBLIC_DIR, ref)
    : path.join(PUBLIC_DIR, ref);
  if (fs.existsSync(target)) continue;

  const base = path.basename(ref);
  // Is it somewhere else in the project? Then it's misplaced, not missing.
  let foundAt = null;
  const search = (dir, depth = 0) => {
    if (foundAt || depth > 3 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".git") continue;
      const p = path.join(dir, entry);
      if (fs.statSync(p).isDirectory()) search(p, depth + 1);
      else if (entry === base) { foundAt = p; return; }
    }
  };
  search(ROOT);

  problems.push(
    `Asset "${ref}" is referenced by ${pages.join(", ")} but not found at public${ref}.\n` +
      (foundAt
        ? `     It exists at ${path.relative(ROOT, foundAt)} — wrong folder.\n` +
          `     Fix: mv ${path.relative(ROOT, foundAt)} public${ref}`
        : "     The file is missing entirely.")
  );
}

// -------------------------------------------------------------- 6. strays
const WEB_EXT = /\.(html|png|jpe?g|svg|ico|glb|webmanifest|webp|css)$/i;
const strays = ls(ROOT).filter(
  (f) => WEB_EXT.test(f) && fs.statSync(path.join(ROOT, f)).isFile()
);
if (strays.length) {
  problems.push(
    `${strays.length} web file(s) stranded in the project root (never served):\n` +
      strays.map((f) => `       ${f}`).join("\n") +
      "\n     Fix: ./reorganize.sh"
  );
}

// -------------------------------------------------------------- 7. empties
const empties = [];
for (const dir of [ROOT, PUBLIC_DIR]) {
  for (const f of ls(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile() && fs.statSync(p).size === 0) {
      empties.push(path.relative(ROOT, p));
    }
  }
}
if (empties.length) {
  notes.push(
    `${empties.length} zero-byte file(s): ${empties.join(", ")} — these render as broken images`
  );
}

// -------------------------------------------------------------- report
console.log(`public/ contains ${publicFiles.length} file(s), ${publicPages.length} page(s).`);
if (publicPages.length) console.log(`  pages: ${publicPages.join(", ")}`);
console.log();

if (notes.length) {
  console.log("Notes:");
  for (const n of notes) console.log(`  · ${n}`);
  console.log();
}

if (problems.length === 0) {
  console.log("No problems found. If you still get 404s, the URL itself may be");
  console.log("wrong — check the path against the page list above.\n");
  process.exit(0);
}

console.log(`${problems.length} problem(s) found:\n`);
problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}\n`));
process.exit(1);
