import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

/**
 * Generate an X25519 keypair for NaCl box encryption.
 * The secret key MUST be kept in memory only — never localStorage.
 */
export function generateKeyPair() {
  return nacl.box.keyPair();
}

/**
 * Encrypt a plaintext message for a recipient.
 * Returns base64-encoded nonce and ciphertext.
 */
export function encryptMessage(
  text: string,
  theirPublicKey: string,
  mySecretKey: Uint8Array
): { nonce: string; ct: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = new TextEncoder().encode(text);
  const ciphertext = nacl.box(
    messageBytes,
    nonce,
    decodeBase64(theirPublicKey),
    mySecretKey
  );
  if (!ciphertext) {
    throw new Error("Encryption failed");
  }
  return {
    nonce: encodeBase64(nonce),
    ct: encodeBase64(ciphertext),
  };
}

/**
 * Decrypt a received ciphertext message.
 * Returns null if decryption fails (tampered or wrong keys).
 */
export function decryptMessage(
  nonce: string,
  ct: string,
  theirPublicKey: string,
  mySecretKey: Uint8Array
): string | null {
  const decrypted = nacl.box.open(
    decodeBase64(ct),
    decodeBase64(nonce),
    decodeBase64(theirPublicKey),
    mySecretKey
  );
  if (!decrypted) return null;
  return new TextDecoder().decode(decrypted);
}
