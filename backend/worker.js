import { messages, whatsappUrl } from "./config.js";
import { assign, consumeRateLimit, cleanup, AssignmentConflict } from "./distributor.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SITE_ORIGIN = "https://grupotoccanteoficial.github.io";
const json = (data, status, origin, extras = {}) => Response.json(data, { status, headers: {
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin",
  ...(origin ? { "Access-Control-Allow-Origin": origin } : {}), ...extras,
} });

async function readInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) throw new Error("content-type");
  if (Number(request.headers.get("Content-Length") || 0) > 1024) throw new Error("size");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  let size = 0;
  const chunks = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1024) { await reader.cancel(); throw new Error("size"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const input = JSON.parse(new TextDecoder().decode(bytes));
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "requestId,sector,sessionId") throw new Error("shape");
  if (typeof input.sessionId !== "string" || typeof input.requestId !== "string" || typeof input.sector !== "string" || !UUID.test(input.sessionId) || !UUID.test(input.requestId) || !Object.hasOwn(messages, input.sector)) throw new Error("values");
  return { sessionId: input.sessionId.toLowerCase(), requestId: input.requestId.toLowerCase(), sector: input.sector };
}

async function privateIpKey(ip, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature), value => value.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get("Origin");
    const allowed = origin === SITE_ORIGIN || (env.ALLOW_LOCALHOST === "true" && ["http://127.0.0.1:4175", "http://localhost:4175"].includes(origin));
    const corsOrigin = allowed ? origin : null;
    if (path === "/health" && request.method === "GET") {
      try {
        const state = await env.DB.prepare("SELECT id FROM queue_state WHERE id = 1").first();
        if (!state) throw new Error("unavailable");
        return json({ status: "ok", service: "toccante-round-robin" }, 200, corsOrigin);
      } catch { return json({ status: "unavailable" }, 503, corsOrigin); }
    }
    if (path !== "/assign") return json({ error: "not_found" }, 404, corsOrigin);
    if (!allowed) return json({ error: "origin_not_allowed" }, 403, null);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", Vary: "Origin",
    } });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, corsOrigin, { Allow: "POST, OPTIONS" });
    if (!env.DB || typeof env.RATE_LIMIT_SECRET !== "string" || env.RATE_LIMIT_SECRET.length < 32) return json({ error: "service_unavailable" }, 503, corsOrigin);
    let input;
    try { input = await readInput(request); } catch { return json({ error: "invalid_request" }, 400, corsOrigin); }
    try {
      const ip = request.headers.get("CF-Connecting-IP");
      const keys = [{ key: `session:${input.sessionId}`, limit: 30 }];
      if (ip) keys.push({ key: `ip:${await privateIpKey(ip, env.RATE_LIMIT_SECRET)}`, limit: 120 });
      if (!await consumeRateLimit(env.DB, keys)) return json({ error: "too_many_requests" }, 429, corsOrigin, { "Retry-After": "60" });
      const assignment = await assign(env.DB, input);
      return json({ url: whatsappUrl(assignment.specialist_position, input.sector), expiresAt: assignment.expires_at, requestId: input.requestId }, 200, corsOrigin);
    } catch (error) {
      if (error instanceof AssignmentConflict) return json({ error: "request_conflict" }, 409, corsOrigin);
      // Não registrar telefones, identificadores de visitantes, IPs ou credenciais.
      console.error("toccante_assignment_failed");
      if (env.ALLOW_LOCALHOST === "true") console.error(error.message);
      return json({ error: "service_unavailable" }, 503, corsOrigin);
    }
  },
  async scheduled(_event, env) { await cleanup(env.DB); },
};
