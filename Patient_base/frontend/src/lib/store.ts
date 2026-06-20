/**
 * store.ts
 * In-memory session store for patient keys.
 * Keys are generated fresh each session and NEVER sent to the backend.
 */

import { generatePatientKeys, generateVaultKey } from './crypto';

export interface PatientSession {
  patientId: string;
  signingPair: CryptoKeyPair;
  encryptionPair: CryptoKeyPair;
  vaultKey: CryptoKey;
  signingPublicJwk: JsonWebKey;
  encryptionPublicJwk: JsonWebKey;
  isInitialized: boolean;
}

let session: PatientSession | null = null;

export async function initializeSession(patientId: string): Promise<PatientSession> {
  const { signingPair, encryptionPair, signingPublicJwk, encryptionPublicJwk } =
    await generatePatientKeys();
  const vaultKey = await generateVaultKey();

  session = {
    patientId,
    signingPair,
    encryptionPair,
    vaultKey,
    signingPublicJwk,
    encryptionPublicJwk,
    isInitialized: true,
  };

  return session;
}

export function getSession(): PatientSession | null {
  return session;
}

export function clearSession() {
  session = null;
}
