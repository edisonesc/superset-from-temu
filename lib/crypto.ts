import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is missing. " +
      "Generate one with: openssl rand -hex 16"
  );
}

/** AES-256-GCM requires a 32-byte key. A 32-char hex string gives 16 bytes — use 64-char hex. */
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

if (KEY.length !== 32) {
  throw new Error(
    `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
      `Current key decodes to ${KEY.length} bytes. ` +
      `Generate a valid key with: openssl rand -hex 32`
  );
}

const ALGORITHM = "aes-256-gcm";
/** IV length for GCM is 12 bytes (recommended). */
const IV_LENGTH = 12;
/** GCM auth tag is 16 bytes by default. */
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * The output is a base64 string encoding: [iv (12 bytes)][authTag (16 bytes)][ciphertext].
 * Used exclusively to persist database connection passwords.
 *
 * @param plain  The plaintext string to encrypt.
 * @returns      A base64-encoded ciphertext blob.
 */
export function encryptPassword(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Layout: iv | authTag | ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypts a ciphertext blob produced by `encryptPassword`.
 *
 * @param ciphertext  The base64-encoded blob returned by `encryptPassword`.
 * @returns           The original plaintext string.
 * @throws            If the ciphertext is malformed or authentication fails.
 */
export function decryptPassword(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
