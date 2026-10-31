// Verificação somente de leitura: não chama POST /assign e não consome a fila.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { API_BASE } from "../js/distribution-config.js";

const frontend = "https://grupotoccanteoficial.github.io/Link.toccante/";
const origin = new URL(frontend).origin;
const root = new URL("../", import.meta.url);
const options = () => ({ cache: "no-store", signal: AbortSignal.timeout(20000) });
async function listFiles(directory) {
  const entries = await readdir(new URL(directory, root), { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? listFiles(`${directory}${entry.name}/`) : `${directory}${entry.name}`));
  return files.flat();
}
const response = await fetch(frontend, options());
assert.equal(response.status, 200);
assert.equal(response.url, frontend);
const html = await response.text();
assert.deepEqual([...html.matchAll(/data-sector="([^\"]+)"/g)].map(match => match[1]), ["cerimonial", "musical", "buffet", "decoracao"]);
assert.equal((html.match(/class="service-contact">Conversar pelo WhatsApp/g) || []).length, 4);
assert.doesNotMatch(html, /Israel|Raiane|Marcela|Paulo|Renato|wa\.me\/|general-title/);

const files = ["index.html", ".nojekyll", ...await listFiles("assets/"), ...await listFiles("css/"), ...await listFiles("js/")];
const verified = await Promise.all(files.map(async file => {
  const res = await fetch(new URL(file, frontend), options());
  assert.equal(res.status, 200, `${file}: HTTP ${res.status}`);
  const remote = Buffer.from(await res.arrayBuffer());
  const local = await readFile(new URL(file, root));
  const textual = /\.(html|css|js|txt)$/.test(file);
  const digest = data => createHash("sha256").update(textual ? data.toString("utf8").replaceAll("\r\n", "\n") : data).digest("hex");
  assert.equal(digest(remote), digest(local), `${file}: publicação diferente do commit local`);
  return { file, status: res.status, matchesCommit: true };
}));
const health = await fetch(new URL("/health", API_BASE), options());
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: "ok", service: "toccante-round-robin" });
const cors = await fetch(new URL("/assign", API_BASE), { ...options(), method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
assert.equal(cors.status, 204);
assert.equal(cors.headers.get("Access-Control-Allow-Origin"), origin);
const video = await fetch(new URL("assets/video/toccante-abertura-1920x1080.mp4", frontend), { ...options(), headers: { Range: "bytes=0-1023" } });
assert.equal(video.status, 206);
await video.arrayBuffer();
console.log(JSON.stringify({ result: "PASS", frontend, backend: API_BASE, cards: 4, files: verified, health: 200, cors: 204, video: 206, assignmentMutations: 0 }, null, 2));
