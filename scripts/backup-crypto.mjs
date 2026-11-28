// ============================================================
// Cifratura dei backup D1.
//
// Un dump contiene dati personali e impostazioni: su disco va cifrato, e la
// cifratura deve essere verificabile (autenticata, non solo offuscata).
// Formato del file:
//   "LMBACKUP1" (9 byte) | salt (16) | iv (12) | authTag (16) | ciphertext
// Chiave derivata dalla passphrase con scrypt; cifrario AES-256-GCM, che
// rifiuta un file manomesso invece di restituire dati corrotti.
//
// Uso da altri script:
//   encryptBuffer(plain, passphrase) / decryptBuffer(file, passphrase)
//   isEncrypted(buffer)
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MAGIC = Buffer.from("LMBACKUP1", "ascii");
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const MIN_LENGTH = MAGIC.length + SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
const MIN_PASSPHRASE = 12;

function keyFromPassphrase(passphrase, salt) {
  // N=2^15 richiede maxmem esplicito: il default di Node (32 MB) non basta.
  return scryptSync(passphrase, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function assertPassphrase(passphrase) {
  if (typeof passphrase !== "string" || passphrase.trim().length < MIN_PASSPHRASE) {
    throw new Error(`La passphrase del backup deve avere almeno ${MIN_PASSPHRASE} caratteri.`);
  }
}

export function isEncrypted(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= MAGIC.length && buffer.subarray(0, MAGIC.length).equals(MAGIC);
}

export function encryptBuffer(plain, passphrase) {
  assertPassphrase(passphrase);
  if (!Buffer.isBuffer(plain) || plain.length === 0) throw new Error("Nessun dato da cifrare.");
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", keyFromPassphrase(passphrase, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBuffer(file, passphrase) {
  assertPassphrase(passphrase);
  if (!isEncrypted(file)) {
    throw new Error("Il file non è un backup cifrato di Lead Machine (intestazione LMBACKUP1 assente).");
  }
  if (file.length < MIN_LENGTH) throw new Error("Il file cifrato è troncato.");
  let offset = MAGIC.length;
  const salt = file.subarray(offset, (offset += SALT_LENGTH));
  const iv = file.subarray(offset, (offset += IV_LENGTH));
  const tag = file.subarray(offset, (offset += TAG_LENGTH));
  const ciphertext = file.subarray(offset);
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFromPassphrase(passphrase, salt), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // GCM non distingue "passphrase sbagliata" da "file manomesso": il
    // messaggio deve dirlo, senza fingere di sapere quale dei due sia.
    throw new Error("Impossibile decifrare: passphrase errata oppure file danneggiato/manomesso.");
  }
}
