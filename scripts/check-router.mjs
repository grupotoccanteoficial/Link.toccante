// Teste de integração: consome atribuições técnicas, mas nunca abre/envia WhatsApp.
// Por padrão, aceita apenas localhost. Produção exige --allow-live-assignment.
import assert from "node:assert/strict";
import { specialists, messages } from "../backend/config.js";

const base = new URL(process.argv[2]);
if (!["127.0.0.1", "localhost"].includes(base.hostname) && !process.argv.includes("--allow-live-assignment")) throw new Error("Teste remoto exige --allow-live-assignment");
const origin = "https://grupotoccanteoficial.github.io";
const phoneToId = new Map(specialists.map(p => [p.whatsapp, p.id]));
const input = (sector = "buffet", sessionId = crypto.randomUUID(), requestId = crypto.randomUUID()) => ({ sector, sessionId, requestId });
async function post(body, requestOrigin = origin) {
  return fetch(new URL("/assign", base), { method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
}
async function allocation(body) {
  const response = await post(body);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  const data = await response.json();
  const url = new URL(data.url);
  assert.equal(url.searchParams.get("text"), messages[body.sector]);
  assert.equal(data.requestId, body.requestId);
  return { ...data, id: phoneToId.get(url.pathname.slice(1)) };
}

const health = await fetch(new URL("/health", base), { signal: AbortSignal.timeout(10000) });
assert.equal(health.status, 200);
const seven = [];
const inputs = [];
for (let i = 0; i < 7; i++) { const body = input(); inputs.push(body); seven.push(await allocation(body)); }
const order = specialists.map(p => p.id);
for (let i = 1; i < seven.length; i++) assert.equal(seven[i].id, order[(order.indexOf(seven[i - 1].id) + 1) % order.length]);

const session = input();
const repeated = await Promise.all(Array.from({ length: 20 }, () => allocation(session)));
assert.equal(new Set(repeated.map(r => r.url)).size, 1);
const switched = await allocation(input("decoracao", session.sessionId));
if (repeated[0].id !== "renato") assert.equal(switched.id, repeated[0].id);
assert.notEqual(switched.id, "renato");

// Reutiliza uma sessão de Buffet atribuída ao Renato e prova a inelegibilidade.
const renatoIndex = seven.findIndex(r => r.id === "renato");
assert.ok(renatoIndex >= 0);
const noRenato = await allocation(input("musical", inputs[renatoIndex].sessionId));
assert.notEqual(noRenato.id, "renato");

const concurrent = await Promise.all(Array.from({ length: 30 }, () => allocation(input())));
const counts = Object.fromEntries(order.map(id => [id, concurrent.filter(r => r.id === id).length]));
assert.ok(Object.values(counts).every(count => count === 6));
assert.equal((await post(input(), "https://example.org")).status, 403);
assert.equal((await post({ ...input(), sector: "invalido" })).status, 400);
console.log(JSON.stringify({ result: "PASS", runtime: base.origin, sequential: seven.map(r => r.id), duplicateRequests: repeated.length, concurrentAssignments: counts, sessionReuse: true, renatoExcludedOutsideBuffet: true, corsAndValidation: true }, null, 2));
