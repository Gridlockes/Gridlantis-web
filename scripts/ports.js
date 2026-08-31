/**
 * Reports which of the server's candidate ports are free, plus the usual
 * suspects the candidate list deliberately avoids.
 *
 *   npm run ports
 *
 * Useful when `npm start` lands somewhere unexpected and you want to know
 * what else on the machine is holding a port.
 */

import net from "node:net";

const CANDIDATES = [8137, 8231, 7412, 6543, 4519];

const COMMON = {
  3000: "Node / Create React App",
  3001: "second Node app",
  4200: "Angular",
  5000: "Flask, macOS AirPlay Receiver",
  5173: "Vite",
  5432: "PostgreSQL",
  6379: "Redis",
  8000: "Django, http.server",
  8080: "Tomcat, proxies",
  8888: "Jupyter",
  9000: "PHP-FPM, SonarQube",
};

function isFree(port) {
  return new Promise((resolve) => {
    const probe = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port, "0.0.0.0");
  });
}

const mark = (free) => (free ? "free" : "BUSY");

console.log("\nCandidate ports (server.js tries these in order):\n");
let firstFree = null;
for (const port of CANDIDATES) {
  const free = await isFree(port);
  if (free && firstFree === null) firstFree = port;
  console.log(`  ${String(port).padEnd(7)} ${mark(free)}`);
}

console.log("\nCommonly-used ports on dev machines:\n");
for (const [port, label] of Object.entries(COMMON)) {
  const free = await isFree(Number(port));
  console.log(`  ${port.padEnd(7)} ${mark(free).padEnd(5)} ${label}`);
}

console.log(
  firstFree
    ? `\nnpm start would use ${firstFree}.\n`
    : "\nAll candidates busy — the OS would assign a random free port.\n"
);
