import assert from "node:assert/strict";
import test from "node:test";
import worker from "../backend/worker.js";
import { TestD1 } from "./d1-test-adapter.mjs";
import { messages } from "../backend/config.js";

const origin = "https://grupotoccanteoficial.github.io";
const valid = () => ({ sessionId: crypto.randomUUID(), requestId: crypto.randomUUID(), sector: "musical" });
const setup = context => { const DB = new TestD1(); context.after(() => DB.close()); return { DB, RATE_LIMIT_SECRET: "test-only-secret-with-more-than-32-characters" }; };
const request = (body = valid(), requestOrigin = origin, overrides = {}) => new Request("https://test.invalid/assign", {
  method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.10" }, body: JSON.stringify(body), ...overrides,
});

test("API retorna WhatsApp e mensagem sem nome pessoal e libera somente a origem autorizada", async context => {
  const env = setup(context);
  const input = valid();
  const response = await worker.fetch(request(input), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const data = await response.json();
  const url = new URL(data.url);
  assert.equal(url.pathname, "/5531983031736");
  assert.equal(url.searchParams.get("text"), messages.musical);
  assert.equal(data.requestId, input.requestId);
  assert.deepEqual(Object.keys(data).sort(), ["expiresAt", "requestId", "url"]);
});

test("preflight permitido não distribui cliente", async context => {
  const env = setup(context);
  const response = await worker.fetch(new Request("https://test.invalid/assign", { method: "OPTIONS", headers: { Origin: origin } }), env);
  assert.equal(response.status, 204);
  assert.equal(env.DB.state().total_allocations, 0);
});

test("origens externas, requisições sem origem e método GET são recusados sem atribuição", async context => {
  const env = setup(context);
  assert.equal((await worker.fetch(request(valid(), "https://example.org"), env)).status, 403);
  assert.equal((await worker.fetch(new Request("https://test.invalid/assign", { method: "POST", body: "{}" }), env)).status, 403);
  assert.equal((await worker.fetch(new Request("https://test.invalid/assign", { headers: { Origin: origin } }), env)).status, 405);
  assert.equal(env.DB.state().total_allocations, 0);
});

test("vertente, UUIDs, formato, chaves extras e tamanho são validados no servidor", async context => {
  const env = setup(context);
  const bodies = [
    { ...valid(), sector: "outro" }, { ...valid(), requestId: "invalid" }, { ...valid(), sessionId: 10 },
    { ...valid(), sector: ["buffet"] }, { ...valid(), whatsapp: "5599999999999" }, null, [],
    { ...valid(), padding: "x".repeat(1100) },
  ];
  for (const body of bodies) assert.equal((await worker.fetch(request(body), env)).status, 400);
  assert.equal((await worker.fetch(request(valid(), origin, { headers: { Origin: origin, "Content-Type": "text/plain" } }), env)).status, 400);
  assert.equal(env.DB.state().total_allocations, 0);
});

test("reutilizar chave em outra sessão é conflito, sem consumir posição", async context => {
  const env = setup(context);
  const input = valid();
  await worker.fetch(request(input), env);
  const response = await worker.fetch(request({ ...input, sessionId: crypto.randomUUID() }), env);
  assert.equal(response.status, 409);
  assert.equal(env.DB.state().total_allocations, 1);
});

test("limite por sessão é validado no servidor e não muda a atribuição", async context => {
  const env = setup(context);
  const input = valid();
  for (let i = 0; i < 30; i++) assert.equal((await worker.fetch(request(input), env)).status, 200);
  const response = await worker.fetch(request(input), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(env.DB.state().total_allocations, 1);
  assert.ok(!JSON.stringify(env.DB.rows("rate_limits")).includes("192.0.2.10"));
});

test("falha do armazenamento não devolve contato fixo nem destino falso", async context => {
  const env = setup(context);
  env.DB.failAllocation = true;
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "service_unavailable" });
  assert.equal(env.DB.state().total_allocations, 0);
});

test("health verifica o banco sem avançar o ponteiro", async context => {
  const env = setup(context);
  const response = await worker.fetch(new Request("https://test.invalid/health"), env);
  assert.equal(response.status, 200);
  assert.equal(env.DB.state().total_allocations, 0);
});
