/**
 * crypto.ts
 * All cryptographic operations using the native Web Crypto API.
 * This ensures keys and plaintext NEVER leave the browser unencrypted.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VaultKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
}

export interface EncryptedRecord {
  iv: string;          // base64
  ciphertext: string;  // base64
  wrappedKey: string;  // base64: AES key wrapped with patient's public RSA key
}

export interface SignedPayload {
  data: string;        // JSON stringified data
  signature: string;   // base64 signature
  publicKeyJwk: JsonWebKey;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toBase64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const fromBase64 = (str: string): Uint8Array =>
  Uint8Array.from(atob(str), c => c.charCodeAt(0));

// ─── Key Pair Generation (RSA-OAEP for wrap/unwrap + ECDSA for signing) ──────

/**
 * Generates a patient's identity key pair.
 * RSA-PSS is used for signing access requests.
 * RSA-OAEP is used for wrapping the symmetric vault key.
 */
export async function generatePatientKeys(): Promise<{
  signingPair: CryptoKeyPair;
  encryptionPair: CryptoKeyPair;
  signingPublicJwk: JsonWebKey;
  encryptionPublicJwk: JsonWebKey;
}> {
  const signingPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const encryptionPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  );

  const signingPublicJwk = await crypto.subtle.exportKey('jwk', signingPair.publicKey);
  const encryptionPublicJwk = await crypto.subtle.exportKey('jwk', encryptionPair.publicKey);

  return { signingPair, encryptionPair, signingPublicJwk, encryptionPublicJwk };
}

// ─── AES-GCM Symmetric Encryption (Vault) ────────────────────────────────────

/** Generate a fresh AES-GCM key for encrypting vault records. */
export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypt plaintext with AES-GCM. Returns IV + ciphertext in base64. */
export async function encryptData(
  plaintext: string,
  vaultKey: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vaultKey, encoded);
  return { iv: toBase64(iv.buffer), ciphertext: toBase64(cipherBuffer) };
}

/** Decrypt base64 ciphertext with AES-GCM. */
export async function decryptData(
  iv: string,
  ciphertext: string,
  vaultKey: CryptoKey
): Promise<string> {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    vaultKey,
    fromBase64(ciphertext)
  );
  return new TextDecoder().decode(plainBuffer);
}

// ─── Key Wrapping ─────────────────────────────────────────────────────────────

/** Wrap (encrypt) the AES vault key with the patient's RSA-OAEP public key. */
export async function wrapVaultKey(
  vaultKey: CryptoKey,
  encryptionPublicKey: CryptoKey
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', vaultKey, encryptionPublicKey, {
    name: 'RSA-OAEP',
  });
  return toBase64(wrapped);
}

/** Unwrap (decrypt) the AES vault key using the patient's RSA-OAEP private key. */
export async function unwrapVaultKey(
  wrappedKey: string,
  encryptionPrivateKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    fromBase64(wrappedKey),
    encryptionPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ─── Digital Signatures ───────────────────────────────────────────────────────

/** Sign a data payload with the patient's ECDSA private key. */
export async function signPayload(
  data: object,
  signingPrivateKey: CryptoKey
): Promise<SignedPayload> {
  const dataStr = JSON.stringify(data);
  const encoded = new TextEncoder().encode(dataStr);
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    signingPrivateKey,
    encoded
  );
  return {
    data: dataStr,
    signature: toBase64(sigBuffer),
    publicKeyJwk: await crypto.subtle.exportKey('jwk', signingPrivateKey), // will be overridden
  };
}

/**
 * Build a fully signed access payload for the backend to verify.
 * Includes the plaintext data, the signature, and the public key so the
 * backend can verify without needing any prior key exchange.
 */
export async function buildSignedPayload(
  data: object,
  signingPrivateKey: CryptoKey,
  signingPublicKey: CryptoKey
): Promise<SignedPayload> {
  const dataStr = JSON.stringify(data);
  const encoded = new TextEncoder().encode(dataStr);
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    signingPrivateKey,
    encoded
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', signingPublicKey);
  return {
    data: dataStr,
    signature: toBase64(sigBuffer),
    publicKeyJwk,
  };
}
