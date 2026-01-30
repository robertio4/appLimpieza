import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

// Get encryption key from environment variable
// Generate with: openssl rand -base64 32
function getEncryptionKey(): Buffer {
  const key = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "base64");
}

/**
 * Encrypts a token using AES-256-CBC encryption
 * @param token - The plain text token to encrypt
 * @returns Encrypted token in format: "iv:encryptedData"
 */
export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return IV and encrypted data separated by colon
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * @param encryptedToken - The encrypted token in format "iv:encryptedData"
 * @returns The decrypted plain text token
 */
export function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(":");

  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
