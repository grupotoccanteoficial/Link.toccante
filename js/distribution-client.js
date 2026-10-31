export const SESSION_KEY = "toccante-distribution-session-v1";
const WINDOW_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A sessão contém apenas identificadores. Nunca guarda o ponteiro nem escolhe pessoas.
export function createRequestStore(storage, uuid = () => crypto.randomUUID()) {
  let memory;
  return {
    forSector(sector, now = Date.now()) {
      if (!memory) {
        try { memory = JSON.parse(storage?.getItem(SESSION_KEY) || "null"); } catch { /* armazenamento opcional */ }
      }
      if (typeof memory?.sessionId !== "string" || !UUID.test(memory.sessionId)) memory = { sessionId: uuid() };
      const previous = memory.lastRequest;
      if (!previous || previous.sector !== sector || typeof previous.id !== "string" || !UUID.test(previous.id) || !Number.isFinite(previous.createdAt) || now - previous.createdAt >= WINDOW_MS || now < previous.createdAt) {
        memory.lastRequest = { id: uuid(), sector, createdAt: now };
      }
      try { storage?.setItem(SESSION_KEY, JSON.stringify(memory)); } catch { /* mantém identificadores em memória */ }
      return { sessionId: memory.sessionId, requestId: memory.lastRequest.id, sector };
    },
  };
}

export async function requestDestination(apiBase, input, fetcher = fetch) {
  const base = new URL(apiBase);
  if (base.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("config");
  const response = await fetcher(new URL("/assign", base), {
    method: "POST", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 429) throw new Error("rate_limit");
  if (!response.ok) throw new Error("unavailable");
  const result = await response.json();
  const target = new URL(result.url);
  if (result.requestId !== input.requestId || target.origin !== "https://wa.me" || !/^\/55\d{11}$/.test(target.pathname) || !target.searchParams.get("text") || target.username || target.password || target.hash) throw new Error("destination");
  return target.href;
}
