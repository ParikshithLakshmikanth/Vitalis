/**
 * signatureVerifier.ts
 * Hono middleware for verifying ECDSA-P256 digital signatures.
 *
 * The patient must cryptographically sign every sensitive request
 * (e.g., AI analysis) with their private key. The backend verifies
 * the signature before processing anything.
 */

import type { Context, Next } from 'hono';

interface SignedPayload {
  data: string;
  signature: string;
  publicKeyJwk: JsonWebKey;
}

const fromBase64 = (str: string): Uint8Array =>
  Buffer.from(str, 'base64');

/**
 * Verify an ECDSA P-256 signature using the Node.js webcrypto API.
 */
export async function verifyECDSASignature(
  payload: SignedPayload
): Promise<boolean> {
  try {
    const { webcrypto } = await import('crypto');
    const subtle = webcrypto.subtle;

    const publicKey = await subtle.importKey(
      'jwk',
      payload.publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );

    const dataBytes = new TextEncoder().encode(payload.data);
    const sigBytes = fromBase64(payload.signature);

    return await subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      sigBytes,
      dataBytes
    );
  } catch (err) {
    console.error('[SignatureVerifier] Verification error:', err);
    return false;
  }
}

/**
 * Hono middleware: verifies ECDSA signature in the request JSON body.
 * Expects body: { data: string, signature: string, publicKeyJwk: JsonWebKey }
 * Returns 401 if the signature is invalid.
 */
export async function requireValidSignature(c: Context, next: Next) {
  let body: Partial<SignedPayload>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const { data, signature, publicKeyJwk } = body;

  if (!data || !signature || !publicKeyJwk) {
    return c.json(
      { error: 'Missing signed payload. Required: data, signature, publicKeyJwk' },
      400
    );
  }

  const isValid = await verifyECDSASignature({ data, signature, publicKeyJwk });

  if (!isValid) {
    console.warn('[SignatureVerifier] ❌ Invalid signature — unauthorized access blocked.');
    return c.json(
      {
        error: 'Unauthorized: Digital signature verification failed.',
        hint: 'Sign this request with your ECDSA private key.',
      },
      401
    );
  }

  console.log('[SignatureVerifier] ✅ Signature verified — access granted.');
  // Store parsed body so downstream handlers don't need to re-parse
  c.set('signedBody', body as SignedPayload);
  await next();
}
