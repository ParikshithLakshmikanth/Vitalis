import crypto from "crypto";
import si from "systeminformation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed application salt – changing this invalidates ALL stored files. */
const APP_SALT = "vortexa-clinical-handoff-salt-v1";

/** PBKDF2 iteration count for KEK derivation. */
const PBKDF2_ITERATIONS = 100_000;

/** AES-256-GCM key length in bytes. */
const KEY_LENGTH = 32;

// ---------------------------------------------------------------------------
// Master Key (KEK) – derived asynchronously using hardware fingerprint
// ---------------------------------------------------------------------------

let MASTER_KEY: Buffer | null = null;

/**
 * Build a hardware fingerprint string from stable system identifiers.
 * Uses motherboard serial + CPU brand as a compound hardware ID.
 */
async function getHardwareFingerprint(): Promise<string> {
  const [board, cpu, uuid] = await Promise.all([
    si.baseboard(),
    si.cpu(),
    si.uuid(),
  ]);

  const parts = [
    board.serial || "no-serial",
    board.manufacturer || "no-mfr",
    cpu.brand || "no-cpu",
    uuid.hardware || "no-uuid",
  ];

  return parts.join("|");
}

/**
 * Derive the stable 32-byte Master Key (KEK) deterministically from:
 *   - process.env.APP_SECRET  (application secret)
 *   - hardware fingerprint     (machine-bound)
 *   - APP_SALT                 (fixed application salt)
 *
 * The same key is produced on every restart as long as the hardware and
 * APP_SECRET remain unchanged.
 */
async function deriveMasterKey(): Promise<Buffer> {
  const appSecret = process.env.APP_SECRET;
  if (!appSecret) {
    throw new Error(
      "[CryptoEngine] APP_SECRET environment variable is not set. " +
        "Set it before starting the server."
    );
  }

  const hwFingerprint = await getHardwareFingerprint();

  // Combine app secret + hardware fingerprint as the PBKDF2 password.
  const password = `${appSecret}::${hwFingerprint}`;

  return crypto.pbkdf2Sync(
    password,
    APP_SALT,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Initialise the CryptoEngine. Must be called once before the server starts
 * accepting requests. Idempotent – safe to call multiple times.
 */
export async function initCryptoEngine(): Promise<void> {
  if (MASTER_KEY) return; // already initialised
  MASTER_KEY = await deriveMasterKey();
  console.log("[CryptoEngine] Hardware-bound Master Key (KEK) derived ✓");
}

function getMasterKey(): Buffer {
  if (!MASTER_KEY) {
    throw new Error(
      "[CryptoEngine] Engine not initialised. Call initCryptoEngine() first."
    );
  }
  return MASTER_KEY;
}

// ---------------------------------------------------------------------------
// Internal AES-256-GCM helpers
// ---------------------------------------------------------------------------

function aesGcmEncrypt(
  plaintext: Buffer,
  key: Buffer
): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, authTag, ciphertext };
}

function aesGcmDecrypt(
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer
): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// DEK blob helpers
// ---------------------------------------------------------------------------

/** Pack a KEK-encrypted DEK with its own IV/tag: [IV(12)] [TAG(16)] [ENC_DEK(32)] */
function buildEncryptedDekBlob(dek: Buffer): Buffer {
  const { iv, authTag, ciphertext } = aesGcmEncrypt(dek, getMasterKey());
  return Buffer.concat([iv, authTag, ciphertext]);
}

function extractEncryptedDekBlob(blob: Buffer): Buffer {
  const dekIv = blob.subarray(0, 12);
  const dekAuthTag = blob.subarray(12, 28);
  const encDek = blob.subarray(28);
  return aesGcmDecrypt(encDek, getMasterKey(), dekIv, dekAuthTag);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt a raw file Buffer using Hardware-Bound Envelope Encryption.
 *
 * Binary payload layout:
 *   [IV_LEN (1 byte)] [IV] [AUTHTAG_LEN (1 byte)] [AUTHTAG]
 *   [ENC_DEK_LEN (2 bytes, big-endian)] [ENC_DEK_BLOB] [ENC_FILE_BODY]
 */
export function encryptFile(fileBuffer: Buffer): Buffer {
  const dek = crypto.randomBytes(KEY_LENGTH);

  const {
    iv: fileIv,
    authTag: fileAuthTag,
    ciphertext: encryptedBody,
  } = aesGcmEncrypt(fileBuffer, dek);

  const encryptedDekBlob = buildEncryptedDekBlob(dek);

  const ivLenBuf = Buffer.alloc(1);
  ivLenBuf.writeUInt8(fileIv.length, 0);

  const authTagLenBuf = Buffer.alloc(1);
  authTagLenBuf.writeUInt8(fileAuthTag.length, 0);

  const dekBlobLenBuf = Buffer.alloc(2);
  dekBlobLenBuf.writeUInt16BE(encryptedDekBlob.length, 0);

  return Buffer.concat([
    ivLenBuf,
    fileIv,
    authTagLenBuf,
    fileAuthTag,
    dekBlobLenBuf,
    encryptedDekBlob,
    encryptedBody,
  ]);
}

/**
 * Decrypt a binary payload produced by `encryptFile`.
 * Returns the original plaintext file Buffer.
 */
export function decryptFile(payloadBuffer: Buffer): Buffer {
  let offset = 0;

  const ivLen = payloadBuffer.readUInt8(offset);
  offset += 1;
  const fileIv = payloadBuffer.subarray(offset, offset + ivLen);
  offset += ivLen;

  const authTagLen = payloadBuffer.readUInt8(offset);
  offset += 1;
  const fileAuthTag = payloadBuffer.subarray(offset, offset + authTagLen);
  offset += authTagLen;

  const dekBlobLen = payloadBuffer.readUInt16BE(offset);
  offset += 2;
  const encryptedDekBlob = payloadBuffer.subarray(offset, offset + dekBlobLen);
  offset += dekBlobLen;

  const encryptedBody = payloadBuffer.subarray(offset);

  const dek = extractEncryptedDekBlob(encryptedDekBlob);
  return aesGcmDecrypt(encryptedBody, dek, fileIv, fileAuthTag);
}
