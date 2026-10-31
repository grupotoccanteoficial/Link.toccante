CREATE TABLE queue_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_position INTEGER NOT NULL DEFAULT 0 CHECK (next_position >= 0),
  total_allocations INTEGER NOT NULL DEFAULT 0 CHECK (total_allocations >= 0)
);
INSERT INTO queue_state (id, next_position, total_allocations) VALUES (1, 0, 0);

CREATE TABLE allocations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  specialist_position INTEGER NOT NULL CHECK (specialist_position >= 0),
  initial_sector TEXT NOT NULL CHECK (initial_sector IN ('cerimonial', 'musical', 'buffet', 'decoracao')),
  assigned_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > assigned_at),
  sequence INTEGER NOT NULL UNIQUE
);
CREATE INDEX allocations_expiry ON allocations (expires_at);

CREATE TABLE visitor_sessions (
  session_id TEXT PRIMARY KEY,
  allocation_id TEXT NOT NULL REFERENCES allocations(id),
  specialist_position INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX visitor_sessions_expiry ON visitor_sessions (expires_at);
CREATE INDEX visitor_sessions_allocation ON visitor_sessions (allocation_id);

CREATE TABLE assignment_requests (
  request_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('cerimonial', 'musical', 'buffet', 'decoracao')),
  allocation_id TEXT NOT NULL REFERENCES allocations(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX assignment_requests_expiry ON assignment_requests (expires_at);
CREATE INDEX assignment_requests_allocation ON assignment_requests (allocation_id);

-- A inserção, o avanço do ponteiro e a atualização da sessão são indivisíveis.
CREATE TRIGGER advance_queue_after_allocation
AFTER INSERT ON allocations
BEGIN
  UPDATE queue_state
    SET next_position = NEW.specialist_position + 1,
        total_allocations = NEW.sequence
    WHERE id = 1;
  INSERT INTO visitor_sessions (session_id, allocation_id, specialist_position, expires_at)
    VALUES (NEW.session_id, NEW.id, NEW.specialist_position, NEW.expires_at)
    ON CONFLICT(session_id) DO UPDATE SET
      allocation_id = excluded.allocation_id,
      specialist_position = excluded.specialist_position,
      expires_at = excluded.expires_at;
END;

CREATE TABLE rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX rate_limits_expiry ON rate_limits (expires_at);
