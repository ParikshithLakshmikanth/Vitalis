/**
 * vault.ts — Hono router
 * Zero-knowledge vault: stores and retrieves E2EE ciphertext only.
 */

import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { vaultRecords, auditLog } from '../db/schema.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

const vault = new Hono();

// ─── POST /store ──────────────────────────────────────────────────────────────

vault.post('/store', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const {
    patient_id,
    encrypted_iv,
    encrypted_ciphertext,
    wrapped_vault_key,
    encryption_public_key_jwk,
    signing_public_key_jwk,
    record_type,
  } = body;

  if (
    !patient_id || !encrypted_iv || !encrypted_ciphertext ||
    !wrapped_vault_key || !encryption_public_key_jwk || !signing_public_key_jwk
  ) {
    return c.json({ error: 'Missing required fields for vault storage.' }, 400);
  }

  const id = uuidv4();

  try {
    await db.insert(vaultRecords).values({
      id,
      patientId: patient_id,
      encryptedIv: encrypted_iv,
      encryptedCiphertext: encrypted_ciphertext,
      wrappedVaultKey: wrapped_vault_key,
      encryptionPublicKeyJwk: encryption_public_key_jwk,
      signingPublicKeyJwk: signing_public_key_jwk,
      recordType: record_type ?? 'prescription',
    });

    await db.insert(auditLog).values({
      id: uuidv4(),
      patientId: patient_id,
      action: 'STORE_RECORD',
      success: 1,
      details: { record_id: id, record_type: record_type ?? 'prescription' },
    });

    console.log(`[Vault] ✅ Encrypted record stored — patient: ${patient_id} | id: ${id}`);
    return c.json({ id, message: 'Encrypted record stored successfully.' }, 201);
  } catch (err: any) {
    console.error('[Vault] ❌ Failed to store record:', err.message);
    return c.json({ error: 'Internal server error.' }, 500);
  }
});

// ─── GET /:patient_id ─────────────────────────────────────────────────────────

vault.get('/:patient_id', async (c) => {
  const patientId = c.req.param('patient_id');

  try {
    const records = await db
      .select()
      .from(vaultRecords)
      .where(eq(vaultRecords.patientId, patientId))
      .orderBy(desc(vaultRecords.createdAt));

    await db.insert(auditLog).values({
      id: uuidv4(),
      patientId,
      action: 'FETCH_RECORDS',
      success: 1,
      details: { count: records.length },
    });

    // Map camelCase Drizzle fields back to snake_case for frontend compatibility
    const mapped = records.map((r) => ({
      id: r.id,
      encrypted_iv: r.encryptedIv,
      encrypted_ciphertext: r.encryptedCiphertext,
      wrapped_vault_key: r.wrappedVaultKey,
      encryption_public_key_jwk: r.encryptionPublicKeyJwk,
      signing_public_key_jwk: r.signingPublicKeyJwk,
      record_type: r.recordType,
      created_at: r.createdAt,
    }));

    return c.json({ records: mapped });
  } catch (err: any) {
    console.error('[Vault] ❌ Failed to fetch records:', err.message);
    return c.json({ error: 'Failed to retrieve records.' }, 500);
  }
});

// ─── DELETE /:record_id ───────────────────────────────────────────────────────

vault.delete('/:record_id', async (c) => {
  const recordId = c.req.param('record_id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Missing patient_id in body.' }, 400);
  }

  const { patient_id } = body;

  try {
    const result = await db
      .delete(vaultRecords)
      .where(eq(vaultRecords.id, recordId))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Record not found.' }, 404);
    }

    await db.insert(auditLog).values({
      id: uuidv4(),
      patientId: patient_id,
      action: 'DELETE_RECORD',
      success: 1,
      details: { record_id: recordId },
    });

    return c.json({ message: 'Record deleted.' });
  } catch (err: any) {
    console.error('[Vault] ❌ Delete failed:', err.message);
    return c.json({ error: 'Internal server error.' }, 500);
  }
});

// ─── GET /:patient_id/audit ───────────────────────────────────────────────────

vault.get('/:patient_id/audit', async (c) => {
  const patientId = c.req.param('patient_id');

  try {
    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.patientId, patientId))
      .orderBy(desc(auditLog.timestamp))
      .limit(50);

    // Map to legacy snake_case format
    const mapped = logs.map((l) => ({
      ...l,
      patient_id: l.patientId,
      success: l.success,
      details: l.details ? JSON.stringify(l.details) : null,
      timestamp: l.timestamp ? Math.floor(new Date(l.timestamp).getTime() / 1000) : 0,
    }));

    return c.json({ audit_log: mapped });
  } catch (err: any) {
    return c.json({ error: 'Failed to load audit log.' }, 500);
  }
});

export default vault;
