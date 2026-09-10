// Shared AES-256-CBC encrypt/decrypt for stored secrets (channel credentials, tenant integration
// settings, outbound webhook signing secrets) — extracted from app.js so non-route modules (webhooks.js)
// can decrypt a secret without importing the whole Express app.
import crypto from 'crypto';

if (!process.env.ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY must be set in production. All encrypted data will be unrecoverable without it.');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'fallback-dev-only').digest();
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
