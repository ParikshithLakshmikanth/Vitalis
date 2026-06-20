/**
 * uuid.ts — Simple UUID v4 using Bun's native crypto
 */
export function v4(): string {
  return crypto.randomUUID();
}
