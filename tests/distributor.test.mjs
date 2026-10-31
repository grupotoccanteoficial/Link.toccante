import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assign, consumeRateLimit, cleanup, AssignmentConflict } from "../backend/distributor.js";
import { specialists, SESSION_TTL_MS } from "../backend/config.js";
import { TestD1 } from "./d1-test-adapter.mjs";

const input = (sector = "buffet", sessionId = crypto.randomUUID(), requestId = crypto.randomUUID()) => ({ sector, sessionId, requestId });
const setup = context => { const db = new TestD1(); context.after(() => db.close()); return db; };

test("Buffet percorre os cinco especialistas e reinicia na ordem fornecida", async context => {
  const db = setup(context);
  const people = [];
  for (let i = 0; i < 7; i++) people.push(specialists[(await assign(db, input())).specialist_position].id);
  assert.deepEqual(people, ["israel", "raiane", "marcela", "paulo", "renato", "israel", "raiane"]);
});

test("a fila é única entre vertentes e reproduz o exemplo misto", async context => {
  const db = setup(context);
  const people = [];
  for (const sector of ["cerimonial", "musical", "buffet", "decoracao", "musical", "cerimonial", "buffet"]) {
    people.push(specialists[(await assign(db, input(sector))).specialist_position].id);
  }
  assert.deepEqual(people, ["israel", "raiane", "marcela", "paulo", "israel", "raiane", "marcela"]);
});

test("Renato é ignorado fora de Buffet e sua posição não fica reservada", async context => {
  const db = setup(context);
  for (let i = 0; i < 4; i++) await assign(db, input());
  assert.equal((await assign(db, input("musical"))).specialist_position, 0);
  assert.equal((await assign(db, input("buffet"))).specialist_position, 1);
  for (let i = 0; i < 40; i++) assert.notEqual((await assign(db, input(["cerimonial", "musical", "decoracao"][i % 3]))).specialist_position, 4);
});

test("sessão reaproveita o mesmo especialista por 30 minutos, inclusive entre setores", async context => {
  const db = setup(context);
  const session = crypto.randomUUID();
  const now = 1000000;
  const first = await assign(db, input("cerimonial", session), now);
  for (const sector of ["musical", "buffet", "decoracao"]) {
    const result = await assign(db, input(sector, session), now + SESSION_TTL_MS - 1);
    assert.equal(result.id, first.id);
    assert.equal(result.expires_at, first.expires_at);
  }
  assert.equal(db.state().total_allocations, 1);
  const next = await assign(db, input("buffet", session), now + SESSION_TTL_MS);
  assert.equal(next.specialist_position, 1);
  assert.notEqual(next.id, first.id);
});

test("sessão atribuída ao Renato recebe novo elegível ao mudar de Buffet", async context => {
  const db = setup(context);
  for (let i = 0; i < 4; i++) await assign(db, input());
  const session = crypto.randomUUID();
  assert.equal((await assign(db, input("buffet", session))).specialist_position, 4);
  const musical = await assign(db, input("musical", session));
  assert.equal(musical.specialist_position, 0);
  assert.equal((await assign(db, input("buffet", session))).id, musical.id);
  assert.equal(db.state().total_allocations, 6);
});

test("repetições concorrentes da mesma chave consomem somente uma posição", async context => {
  const db = setup(context);
  const request = input();
  const results = await Promise.all(Array.from({ length: 25 }, () => assign(db, request)));
  assert.equal(new Set(results.map(row => row.id)).size, 1);
  assert.equal(db.rows("allocations").length, 1);
  assert.equal(db.state().total_allocations, 1);
});

test("cliques concorrentes com chaves diferentes na mesma sessão também são reaproveitados", async context => {
  const db = setup(context);
  const session = crypto.randomUUID();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => assign(db, input(i % 2 ? "musical" : "buffet", session))));
  assert.equal(new Set(results.map(row => row.id)).size, 1);
  assert.equal(db.state().total_allocations, 1);
});

test("100 sessões simultâneas recebem sequências únicas e consecutivas", async context => {
  const db = setup(context);
  const sectors = ["cerimonial", "musical", "buffet", "decoracao", "buffet"];
  const results = await Promise.all(Array.from({ length: 100 }, (_, i) => assign(db, input(sectors[i % sectors.length]))));
  assert.equal(new Set(results.map(row => row.sequence)).size, 100);
  assert.equal(db.state().total_allocations, 100);
  let position = 0;
  const rows = db.rows("allocations").sort((a, b) => a.sequence - b.sequence);
  for (const [index, row] of rows.entries()) {
    if (position === 4 && row.initial_sector !== "buffet") position = 0;
    assert.equal(row.sequence, index + 1);
    assert.equal(row.specialist_position, position);
    position = (position + 1) % 5;
  }
});

test("chave idempotente pertence à sessão e à vertente; conflitos não avançam a fila", async context => {
  const db = setup(context);
  const request = input("musical");
  await assign(db, request);
  await assert.rejects(assign(db, { ...request, sessionId: crypto.randomUUID() }), AssignmentConflict);
  await assert.rejects(assign(db, { ...request, sector: "buffet" }), AssignmentConflict);
  assert.equal(db.state().total_allocations, 1);
  assert.equal(db.rows("assignment_requests").length, 1);
});

test("falha após inserir atribuição reverte ponteiro, sessão e registro", async context => {
  const db = setup(context);
  db.failAllocation = true;
  await assert.rejects(assign(db, input()));
  assert.equal(db.state().total_allocations, 0);
  assert.equal(db.state().next_position, 0);
  assert.equal(db.rows("allocations").length, 0);
  assert.equal(db.rows("visitor_sessions").length, 0);
});

test("o ponteiro persiste ao reabrir o armazenamento", async () => {
  const folder = mkdtempSync(join(tmpdir(), "toccante-rr-test-"));
  const path = join(folder, "test.sqlite");
  let db = new TestD1(path);
  try {
    await assign(db, input());
    await assign(db, input());
    db.close();
    db = new TestD1(path, false);
    assert.equal((await assign(db, input())).specialist_position, 2);
  } finally { db.close(); rmSync(folder, { recursive: true }); }
});

test("limites e limpeza não reinicializam nem consomem a fila", async context => {
  const db = setup(context);
  const keys = [{ key: "session:test", limit: 2 }];
  assert.equal(await consumeRateLimit(db, keys, 1000000), true);
  assert.equal(await consumeRateLimit(db, keys, 1000000), true);
  assert.equal(await consumeRateLimit(db, keys, 1000000), false);
  assert.equal(db.state().total_allocations, 0);
  await assign(db, input(), 1000000);
  await cleanup(db, 1000000 + 3 * 86400000);
  assert.equal(db.rows("allocations").length, 0);
  assert.equal(db.rows("assignment_requests").length, 0);
  assert.equal(db.rows("visitor_sessions").length, 0);
  assert.equal(db.rows("rate_limits").length, 0);
  assert.equal(db.state().total_allocations, 1);
  assert.equal((await assign(db, input(), 1000000 + 3 * 86400000)).specialist_position, 1);
});
