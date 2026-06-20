import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Immutable, hash-chained audit logger
// Each entry contains: timestamp, event, actor, details, prevHash, entryHash
// The entry hash covers all fields including prevHash, making tampering evident.
// ---------------------------------------------------------------------------

const AUDIT_LOG_PATH = path.resolve(
  __dirname,
  "../../storage/audit/handoff_audit.log"
);

export interface AuditEntry {
  timestamp: string;
  event: string;
  actor: string;
  fileId: string;
  details: string;
  prevHash: string;
  entryHash: string;
}

/**
 * Read the last entry hash from the log file.
 * Returns the genesis hash if no log exists yet.
 */
async function getLastHash(): Promise<string> {
  try {
    const content = await fs.readFile(AUDIT_LOG_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "GENESIS";
    const last = JSON.parse(lines[lines.length - 1]) as AuditEntry;
    return last.entryHash;
  } catch {
    return "GENESIS";
  }
}

/**
 * Hash all fields of an audit entry together to produce its chain hash.
 */
function hashEntry(entry: Omit<AuditEntry, "entryHash">): string {
  const data = JSON.stringify(entry);
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Append a tamper-evident audit entry to the local log file.
 * The entry links to the previous entry's hash, forming an immutable chain.
 */
export async function appendAuditLog(params: {
  event: string;
  actor: string;
  fileId: string;
  details: string;
}): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });

  const prevHash = await getLastHash();

  const entryWithoutHash: Omit<AuditEntry, "entryHash"> = {
    timestamp: new Date().toISOString(),
    event: params.event,
    actor: params.actor,
    fileId: params.fileId,
    details: params.details,
    prevHash,
  };

  const entryHash = hashEntry(entryWithoutHash);

  const fullEntry: AuditEntry = { ...entryWithoutHash, entryHash };

  await fs.appendFile(AUDIT_LOG_PATH, JSON.stringify(fullEntry) + "\n", "utf-8");

  console.log(`[AuditLog] ${params.event} recorded → hash: ${entryHash.slice(0, 16)}...`);
}

/**
 * Read all audit log entries (for display in the UI).
 */
export async function readAuditLog(): Promise<AuditEntry[]> {
  try {
    const content = await fs.readFile(AUDIT_LOG_PATH, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);
  } catch {
    return [];
  }
}
