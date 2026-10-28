import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".woff2": "font/woff2" };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/Link\.toccante(?=\/|$)/, "");
    const file = resolve(root, `.${pathname === "/" || pathname === "" ? "/index.html" : pathname}`);
    if (!file.startsWith(root + sep) && file !== resolve(root, "index.html")) throw new Error("Invalid path");
    const info = await stat(file);
    const body = await readFile(file);
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(range[2] ? Number(range[2]) : info.size - 1, info.size - 1);
      if (start > end || start >= info.size) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return; }
      res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
      res.end(body.subarray(start, end + 1));
    } else { res.writeHead(200, { "Content-Length": info.size }); res.end(body); }
  } catch { res.writeHead(404).end("Not found"); }
}).listen(4175, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4175/Link.toccante/"));
