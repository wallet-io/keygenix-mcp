/**
 * Keygenix API Client
 * Handles secp256k1 request signing and all API communication.
 */
import axios, { AxiosError } from "axios";
import jsonStableStringify from "json-stable-stringify";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export const BASE_URL = "https://api.keygenix.pro/v1/api";

export interface KeygenixConfig {
  apiAuthPrivKey: string;  // hex — secp256k1 private key for request auth
  authPrivKey: string;     // hex — secp256k1 private key for sign/export auth
  orgCode: string;
  walletCode: string;
}

// ─── Request signing ──────────────────────────────────────────────────────────

function signRequest(method: string, url: string, body: object, privKeyHex: string) {
  const path = "/" + url.replace("https://", "").split("/").slice(1).join("/");
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method.toUpperCase()}|${path}|${jsonStableStringify(body) ?? "{}"}|${timestamp}`;
  const privKeyBytes = hexToBytes(privKeyHex);
  const pubKey = bytesToHex(secp256k1.getPublicKey(privKeyBytes));
  const sig = secp256k1.sign(sha256(new TextEncoder().encode(message)), privKeyBytes);
  return { pubKey, sign: bytesToHex(sig.toCompactRawBytes()), timestamp };
}

/** Build authSignature for sensitive operations (sign_transaction, sign_message, export) */
export function buildAuthSignature(authPrivKeyHex: string, content: string, timestamp: number): string {
  const msg = sha256(new TextEncoder().encode(`${content}|${timestamp}`));
  const sig = secp256k1.sign(msg, hexToBytes(authPrivKeyHex));
  return bytesToHex(sig.toCompactRawBytes());
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

export async function apiCall<T = unknown>(
  config: KeygenixConfig,
  method: string,
  url: string,
  body?: object
): Promise<T> {
  const bodyData = body ?? {};
  const { pubKey, sign, timestamp } = signRequest(method, url, bodyData, config.apiAuthPrivKey);

  const headers = {
    "api-auth-key": pubKey,
    "api-auth-sign": sign,
    "api-auth-timestamp": String(timestamp),
    "content-type": "application/json",
  };

  try {
    const res = await axios({ method, url, data: body, headers, timeout: 30000 });
    const result = res.data as { status: number; msg: string; data: T };
    if (result.status !== 0) {
      throw new Error(`Keygenix error [${result.status}]: ${result.msg}`);
    }
    return result.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      const d = err.response.data as { status?: number; msg?: string };
      throw new Error(`Keygenix error [${d?.status ?? err.response.status}]: ${d?.msg ?? err.message}`);
    }
    throw err;
  }
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function walletUrl(config: KeygenixConfig, path = ""): string {
  return `${BASE_URL}/org/${config.orgCode}/wallets/${config.walletCode}${path}`;
}
