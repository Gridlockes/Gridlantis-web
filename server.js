/**
 * Static server for the Gridlantis site.
 *
 * Why this exists: a tunnel (cloudflared / ngrok / Tailscale Funnel) needs a
 * process listening on a local port. This is that process. It does NOT change
 * how your pages are written — the HTML stays HTML.
 *
 *   npm install && npm start
 *   cloudflared tunnel --url http://localhost:3000
 */

import express from "express";
import compression from "compression";
import helmet from "helmet";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

// Port selection, in priority order:
//   1. --port 8137        explicit CLI flag
//   2. PORT=8137          environment variable
//   3. first free port from CANDIDATES below
//   4. an OS-assigned ephemeral port (always works)
//
// Deliberately avoids the usual suspects: 3000/3001 (Node, CRA), 4200
// (Angular), 5000 (Flask, macOS AirPlay Receiver), 5173 (Vite), 8000
// (Django), 8080 (Tomcat, proxies), 8888 (Jupyter), 9000 (PHP-FPM).
const CANDIDATES = [8137, 8231, 7412, 6543, 4519];

function explicitPort() {
  const flagIndex = process.argv.indexOf("--port");
  const raw =
    flagIndex !== -1 ? process.argv[flagIndex + 1] : process.env.PORT;
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    console.error(`Invalid port "${raw}" — must be an integer 0-65535.`);
    process.exit(1);
  }
  return n;
}

/** Resolves true if nothing is listening on `port`. */
function isFree(port) {
  return new Promise((resolve) => {
    const probe = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port, "0.0.0.0");
  });
}

async function choosePort() {
  const explicit = explicitPort();
  if (explicit !== null) {
    if (explicit === 0 || (await isFree(explicit))) return explicit;
    console.error(
      `Port ${explicit} is already in use. Omit --port/PORT to auto-select.`
    );
    process.exit(1);
  }

  for (const port of CANDIDATES) {
    if (await isFree(port)) return port;
  }

  console.warn("All candidate ports busy — asking the OS for a free one.");
  return 0; // 0 tells the kernel to assign any available port
}

const app = express();

// Behind a tunnel/proxy, trust the forwarded headers so req.protocol is right.
app.set("trust proxy", 1);

app.use(compression());

// helmet's default CSP would block your CDN fonts/icons. Loosened to match
// what the pages actually load. Tighten this if you drop the CDNs.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://www.googletagmanager.com",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.google-analytics.com", "https://formspree.io", "https://www.googletagmanager.com"],
        mediaSrc: ["'self'", "https://assets.mixkit.co"],
        formAction: ["'self'", "https://formspree.io"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Filenames here carry no content hash (/css/banner.css, not banner.abc123.css),
// so "immutable" is a lie the browser takes literally: it will keep serving a
// year-old stylesheet and never even revalidate. That silently breaks edits to
// CSS/JS for every returning visitor. Only truly stable binary assets get the
// long cache; code revalidates against the ETag on every load (a 304 is cheap).
const IMMUTABLE = /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|glb)$/i;

function cacheControl(filePath) {
  if (filePath.endsWith(".html")) return "no-cache";
  if (IMMUTABLE.test(filePath)) return "public, max-age=31536000, immutable";
  return "public, max-age=0, must-revalidate";
}

// Serve /about instead of /about.html, and cache assets harder than pages.
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      res.setHeader("Cache-Control", cacheControl(filePath));
    },
  })
);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"), (err) => {
    if (err) res.status(404).type("txt").send("404 — page not found");
  });
});

const port = await choosePort();

const server = app.listen(port, () => {
  // With port 0 the kernel picks, so read back what we actually got.
  const actual = server.address().port;
  console.log(`\n  Serving ${path.relative(process.cwd(), PUBLIC_DIR)}/`);
  console.log(`  http://localhost:${actual}\n`);
  console.log(`  Tunnel:  cloudflared tunnel --url http://localhost:${actual}`);
  console.log(`  Stop:    Ctrl+C\n`);
});

// EADDRINUSE can still fire if something grabs the port between the probe
// and the bind. Fail loudly rather than dying with an opaque stack trace.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${port} was taken in the last moment. Retry.\n`);
    process.exit(1);
  }
  throw err;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
