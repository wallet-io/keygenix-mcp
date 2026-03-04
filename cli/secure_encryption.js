/**
 * SecureEncryption — ECIES over secp256k1 + AES-256-GCM + HKDF-SHA256
 * Compatible with Keygenix TEE encryption protocol (v1)
 */
const crypto = require("crypto");
const { secp256k1 } = require('@noble/curves/secp256k1.js');
const { hkdf } = require('@noble/hashes/hkdf.js');
const { sha256 } = require('@noble/hashes/sha2.js');
const { bytesToHex, hexToBytes } = require('@noble/hashes/utils.js');
const { gcm } = require('@noble/ciphers/aes.js');

class SecureEncryption {
  constructor() {
    this.version = 1;
  }

  encrypt(plaintext, publicKeyHex, ephemeralPrivateKeyHex = undefined) {
    if (typeof plaintext !== 'string' || !plaintext.trim()) throw new Error('Plaintext must be non-empty string');
    if (typeof publicKeyHex !== 'string' || !/^[0-9a-f]+$/i.test(publicKeyHex)) throw new Error('Invalid public key format');

    let ephemeralPrivKeyBytes = ephemeralPrivateKeyHex
      ? hexToBytes(ephemeralPrivateKeyHex)
      : secp256k1.utils.randomSecretKey();

    const secret = secp256k1.getSharedSecret(ephemeralPrivKeyBytes, hexToBytes(publicKeyHex)).slice(1);
    const salt = crypto.randomBytes(32);
    const key = hkdf(sha256, secret, salt, 'encryption-key', 32);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      v: this.version,
      epk: bytesToHex(secp256k1.getPublicKey(ephemeralPrivKeyBytes)),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  decrypt(encryptedData, privateKeyHex) {
    const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    if (data.v !== this.version) throw new Error(`Unsupported version: ${data.v}`);
    for (const field of ['epk', 'salt', 'iv', 'tag', 'data']) {
      if (!data[field]) throw new Error(`Missing field: ${field}`);
    }
    const secret = secp256k1.getSharedSecret(hexToBytes(privateKeyHex), hexToBytes(data.epk)).slice(1);
    const key = hkdf(sha256, secret, hexToBytes(data.salt), 'encryption-key', 32);
    const iv = hexToBytes(data.iv);
    const tag = hexToBytes(data.tag);
    const ciphertext = hexToBytes(data.data);
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);
    const bytes = gcm(key, iv).decrypt(combined);
    return new TextDecoder().decode(bytes);
  }
}

module.exports = SecureEncryption;
