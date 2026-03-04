/**
 * SecureEncryption — ECIES over secp256k1 + AES-256-GCM + HKDF-SHA256
 * Compatible with Keygenix TEE encryption protocol (v1)
 */
import crypto from "crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { gcm } from "@noble/ciphers/aes.js";
const ENC_INFO = new TextEncoder().encode("encryption-key");
export class SecureEncryption {
    version = 1;
    encrypt(plaintext, publicKeyHex, ephemeralPrivateKeyHex) {
        if (!plaintext || plaintext.length === 0)
            throw new Error("Plaintext must be non-empty string");
        if (!/^[0-9a-f]+$/i.test(publicKeyHex))
            throw new Error("Invalid public key format");
        const ephemeralPrivKeyBytes = ephemeralPrivateKeyHex
            ? hexToBytes(ephemeralPrivateKeyHex)
            : secp256k1.utils.randomSecretKey();
        const secret = secp256k1.getSharedSecret(ephemeralPrivKeyBytes, hexToBytes(publicKeyHex)).slice(1);
        const saltBytes = crypto.randomBytes(32);
        const key = hkdf(sha256, secret, saltBytes, ENC_INFO, 32);
        const iv = crypto.randomBytes(12);
        // gcm.encrypt returns ciphertext + 16-byte auth tag concatenated
        const plainBytes = new TextEncoder().encode(plaintext);
        const encrypted = gcm(key, iv).encrypt(plainBytes);
        // Split: last 16 bytes = auth tag
        const ciphertext = encrypted.slice(0, encrypted.length - 16);
        const authTag = encrypted.slice(encrypted.length - 16);
        const payload = {
            v: this.version,
            epk: bytesToHex(secp256k1.getPublicKey(ephemeralPrivKeyBytes)),
            salt: bytesToHex(saltBytes),
            iv: bytesToHex(iv),
            tag: bytesToHex(authTag),
            data: bytesToHex(ciphertext),
        };
        return JSON.stringify(payload);
    }
    decrypt(encryptedData, privateKeyHex) {
        const data = typeof encryptedData === "string" ? JSON.parse(encryptedData) : encryptedData;
        if (data.v !== this.version)
            throw new Error(`Unsupported version: ${data.v}`);
        for (const field of ["epk", "salt", "iv", "tag", "data"]) {
            if (!data[field])
                throw new Error(`Missing field: ${field}`);
        }
        const secret = secp256k1.getSharedSecret(hexToBytes(privateKeyHex), hexToBytes(data.epk)).slice(1);
        const key = hkdf(sha256, secret, hexToBytes(data.salt), ENC_INFO, 32);
        const iv = hexToBytes(data.iv);
        const tag = hexToBytes(data.tag);
        const ciphertext = hexToBytes(data.data);
        // gcm.decrypt expects ciphertext + tag concatenated
        const combined = new Uint8Array(ciphertext.length + tag.length);
        combined.set(ciphertext);
        combined.set(tag, ciphertext.length);
        const bytes = gcm(key, iv).decrypt(combined);
        return new TextDecoder().decode(bytes);
    }
}
//# sourceMappingURL=encryption.js.map