// PARCHXA dev server. Zero dependencies. Usage: node tools/serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || process.argv[2]) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function fileFor(pathname) {
  const target = resolve(ROOT, "." + pathname);
  if (!target.startsWith(ROOT)) return null;
  if (!existsSync(target) || !statSync(target).isFile()) return null;
  return target;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const clean = decodeURIComponent(pathname).replace(/\/$/, "/index.html");
  const file = fileFor(clean) || fileFor(clean + ".html") || fileFor(clean + "/index.html");
  if (!file) {
    // Mirror GitHub Pages: serve the custom 404 page when it exists, else a plain 404.
    const notFound = fileFor("/404.html");
    if (notFound) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      res.end(await readFile(notFound));
    } else {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 Not found");
    }
    return;
  }
  try {
    const body = await readFile(file);
    const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
    res.writeHead(200, { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("500 Server error");
  }
}).listen(PORT, () => console.log(`PARCHXA dev server running at http://localhost:${PORT}/`));
