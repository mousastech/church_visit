CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  visit_date TEXT NOT NULL,
  service TEXT NOT NULL,
  notes TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitors_owner_date
ON visitors (owner_id, visit_date);
