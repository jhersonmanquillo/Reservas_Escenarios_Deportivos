const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbFile = path.resolve(process.cwd(), process.env.DB_FILE || './backend/data/reservas.sqlite');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','usuario','deportivo')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS scenarios (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL UNIQUE,
 sport_type TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK(capacity > 0),
 location TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS opening_hours (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
 weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 open_time TEXT NOT NULL,
 close_time TEXT NOT NULL,
 UNIQUE(scenario_id, weekday),
 CHECK(open_time < close_time)
);
CREATE TABLE IF NOT EXISTS blocks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_by INTEGER NOT NULL REFERENCES users(id),
 CHECK(starts_at < ends_at)
);
CREATE TABLE IF NOT EXISTS reservations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Reservada' CHECK(status IN ('Reservada','Cancelada','Completada','Inasistencia')),
 cancellation_reason TEXT,
 outcome_note TEXT,
 outcome_by INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK(starts_at < ends_at)
);
CREATE INDEX IF NOT EXISTS idx_reservations_scenario_time ON reservations(scenario_id, starts_at, ends_at, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_time ON reservations(user_id, starts_at, status);
CREATE INDEX IF NOT EXISTS idx_blocks_scenario_time ON blocks(scenario_id, starts_at, ends_at);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_id INTEGER REFERENCES users(id),
 action TEXT NOT NULL,
 entity TEXT NOT NULL,
 entity_id INTEGER,
 detail TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
module.exports = db;
