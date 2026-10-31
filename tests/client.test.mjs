import assert from "node:assert/strict";
import test from "node:test";
import { createRequestStore, requestDestination, SESSION_KEY } from "../js/distribution-client.js";

test("identificadores sobrevivem ao recarregamento; repetição reaproveita chave sem guardar especialista", () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
  const first = createRequestStore(storage).forSector("musical", 1000);
  const secondStore = createRequestStore(storage);
  assert.deepEqual(secondStore.forSector("musical", 2000), first);
  const buffet = secondStore.forSector("buffet", 3000);
  assert.equal(buffet.sessionId, first.sessionId);
  assert.notEqual(buffet.requestId, first.requestId);
  assert.deepEqual(Object.keys(first).sort(), ["requestId", "sector", "sessionId"]);
  const later = secondStore.forSector("buffet", 3000 + 30 * 60000);
  assert.notEqual(later.requestId, buffet.requestId);
  assert.equal(later.sessionId, buffet.sessionId);
  assert.ok(!records.get(SESSION_KEY).includes("specialist"));
});

test("armazenamento indisponível ainda reaproveita a chave em memória", () => {
  const storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
  const store = createRequestStore(storage);
  assert.deepEqual(store.forSector("buffet"), store.forSector("buffet"));
});

test("frontend envia somente dados mínimos e aceita somente o WhatsApp retornado para a solicitação", async () => {
  const input = createRequestStore().forSector("buffet");
  const url = "https://wa.me/5531983031736?text=Ol%C3%A1!";
  let received;
  const fetcher = async (_url, options) => {
    received = options;
    return Response.json({ url, requestId: input.requestId });
  };
  assert.equal(await requestDestination("https://router.example", input, fetcher), url);
  assert.deepEqual(JSON.parse(received.body), input);
  assert.equal(received.credentials, "omit");
  assert.equal(received.method, "POST");
  await assert.rejects(requestDestination("https://router.example", input, async () => Response.json({ url: "https://evil.example", requestId: input.requestId })));
  await assert.rejects(requestDestination("https://router.example", input, async () => new Response("", { status: 503 })));
});
