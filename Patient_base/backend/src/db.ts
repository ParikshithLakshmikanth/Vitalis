/**
 * db.ts
 * SQLite database setup using better-sqlite3.
 * The backend stores ONLY encrypted ciphertext — zero-knowledge about
 * the actual medical data.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'vault.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Encrypted Vault Records Table
// The backend CANNOT read ciphertext without the patient's private key
db.exec(`
  CREATE TABLE IF NOT EXISTS vault_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    encrypted_iv TEXT NOT NULL,
    encrypted_ciphertext TEXT NOT NULL,
    wrapped_vault_key TEXT NOT NULL,
    encryption_public_key_jwk TEXT NOT NULL,
    signing_public_key_jwk TEXT NOT NULL,
    record_type TEXT NOT NULL DEFAULT 'prescription',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// Audit Log Table — records every access attempt and signature verification
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    action TEXT NOT NULL,
    success INTEGER NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    details TEXT
  );
`);

export default db;
