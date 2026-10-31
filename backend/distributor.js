import { specialists, eligiblePositions, SESSION_TTL_MS } from "./config.js";

export class AssignmentConflict extends Error {}

// D1 batch é uma transação: nenhum outro pedido pode intercalar estas instruções.
// Não há leitura de ponteiro seguida de uma escrita independente no JavaScript.
export async function assign(db, { sessionId, requestId, sector }, now = Date.now()) {
  const positions = eligiblePositions(sector);
  if (!positions.length) throw new Error("Nenhum especialista elegível.");
  const placeholders = positions.map(() => "(?)").join(",");
  const inList = positions.map(() => "?").join(",");
  const allocationId = crypto.randomUUID();
  const count = specialists.length;
  const allocation = db.prepare(`
    WITH eligible(position) AS (VALUES ${placeholders})
    INSERT INTO allocations (id, session_id, specialist_position, initial_sector, assigned_at, expires_at, sequence)
    SELECT ?, ?, e.position, ?, ?, ?, q.total_allocations + 1
    FROM queue_state q CROSS JOIN eligible e
    WHERE q.id = 1
      AND NOT EXISTS (SELECT 1 FROM assignment_requests WHERE request_id = ? AND expires_at > ?)
      AND NOT EXISTS (
        SELECT 1 FROM visitor_sessions
        WHERE session_id = ? AND expires_at > ? AND specialist_position IN (${inList})
      )
    ORDER BY ((e.position - q.next_position + ?) % ?) LIMIT 1
  `).bind(...positions, allocationId, sessionId, sector, now, now + SESSION_TTL_MS, requestId, now, sessionId, now, ...positions, count, count);

  const idempotency = db.prepare(`
    INSERT INTO assignment_requests (request_id, session_id, sector, allocation_id, expires_at)
    SELECT ?, ?, ?, allocation_id, expires_at FROM visitor_sessions
    WHERE session_id = ? AND expires_at > ? AND specialist_position IN (${inList})
    ON CONFLICT(request_id) DO UPDATE SET
      session_id = excluded.session_id, sector = excluded.sector,
      allocation_id = excluded.allocation_id, expires_at = excluded.expires_at
    WHERE assignment_requests.expires_at <= ?
  `).bind(requestId, sessionId, sector, sessionId, now, ...positions, now);

  const result = db.prepare(`
    SELECT a.id, a.specialist_position, a.expires_at, a.sequence
    FROM assignment_requests r JOIN allocations a ON a.id = r.allocation_id
    WHERE r.request_id = ? AND r.session_id = ? AND r.sector = ? AND r.expires_at > ?
  `).bind(requestId, sessionId, sector, now);

  const batch = await db.batch([allocation, idempotency, result]);
  const row = batch[2].results[0];
  if (!row) throw new AssignmentConflict("Chave de solicitação já utilizada em outro contexto.");
  // Repetir um pedido que ficou inelegível após mudança de configuração falha sem avançar a fila.
  if (!positions.includes(row.specialist_position)) throw new AssignmentConflict("Solicitação não elegível.");
  return { ...row, reused: row.id !== allocationId };
}

export async function consumeRateLimit(db, keys, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const statements = keys.map(({ key }) => db.prepare(`
    INSERT INTO rate_limits (bucket_key, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket_key) DO UPDATE SET hits = hits + 1 RETURNING hits
  `).bind(`${key}:${minute}`, (minute + 2) * 60000));
  const result = await db.batch(statements);
  return keys.every(({ limit }, index) => result[index].results[0].hits <= limit);
}

export async function cleanup(db, now = Date.now()) {
  await db.batch([
    db.prepare("DELETE FROM assignment_requests WHERE request_id IN (SELECT request_id FROM assignment_requests WHERE expires_at <= ? LIMIT 5000)").bind(now),
    db.prepare("DELETE FROM visitor_sessions WHERE session_id IN (SELECT session_id FROM visitor_sessions WHERE expires_at <= ? LIMIT 5000)").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE bucket_key IN (SELECT bucket_key FROM rate_limits WHERE expires_at <= ? LIMIT 5000)").bind(now),
    db.prepare(`DELETE FROM allocations WHERE id IN (
      SELECT a.id FROM allocations a WHERE a.expires_at < ?
      AND NOT EXISTS (SELECT 1 FROM assignment_requests r WHERE r.allocation_id = a.id)
      AND NOT EXISTS (SELECT 1 FROM visitor_sessions s WHERE s.allocation_id = a.id) LIMIT 5000
    )`).bind(now - 86400000),
  ]);
}
