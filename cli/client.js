/**
 * Keygenix API Client
 * Usage: node client.js <command> [args...]
 *
 * Commands:
 *   keygen                          — Generate a new secp256k1 keypair
 *   list-keys                       — List keys in a wallet
 *   create-key <keyType>            — Create a key (mnemonic|private|secret)
 *   get-key <keyCode>               — Get key details
 *   list-addresses <keyCode>        — List addresses for a key
 *   create-address <keyCode> <addressType> <path> <curve> <deriveType>
 *   sign-tx <keyCode> <txHex> <chainId> <path>   — Sign an EVM transaction
 *   sign-msg <keyCode> <messageHex> <path>        — Sign a message
 *   sign-tx-address <keyCode> <address> <txHex>   — Sign tx via address (EVM)
 *   sign-msg-address <keyCode> <address> <msgHex> — Sign message via address
 *
 * Env vars:
 *   KEYGENIX_API_PRIV_KEY  — API auth private key (hex)
 *   KEYGENIX_AUTH_PRIV_KEY — AuthKey private key (hex)
 *   KEYGENIX_ORG_CODE      — Org code
 *   KEYGENIX_WALLET_CODE   — Wallet code
 */

const jsonStableStringify = require("json-stable-stringify");
const axios = require("axios");
const { secp256k1 } = require('@noble/curves/secp256k1.js');
const { sha256 } = require('@noble/hashes/sha2.js');
const { bytesToHex, hexToBytes } = require('@noble/hashes/utils.js');
const SecureEncryption = require('./secure_encryption');

const BASE_URL = 'https://api.keygenix.pro/v1/api';

// ─── Auth helpers ────────────────────────────────────────────────────────────

function apiSign(method, url, body, privKeyHex) {
  const path = '/' + url.replace('https://', '').split('/').slice(1).join('/');
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method.toUpperCase()}|${path}|${jsonStableStringify(body || {})}|${timestamp}`;
  const privKeyBytes = hexToBytes(privKeyHex);
  const pubKey = bytesToHex(secp256k1.getPublicKey(privKeyBytes));
  const sig = secp256k1.sign(sha256(new TextEncoder().encode(message)), privKeyBytes);
  return { pubKey, sign: bytesToHex(sig.toCompactRawBytes()), timestamp };
}

function authSign(privKeyHex, content, timestamp) {
  const msg = sha256(new TextEncoder().encode(`${content}|${timestamp}`));
  const sig = secp256k1.sign(msg, hexToBytes(privKeyHex));
  return bytesToHex(sig.toCompactRawBytes());
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

async function call(method, url, body) {
  const apiPrivKey = process.env.KEYGENIX_API_PRIV_KEY;
  if (!apiPrivKey) throw new Error('KEYGENIX_API_PRIV_KEY not set');

  const { pubKey, sign, timestamp } = apiSign(method, url, body, apiPrivKey);
  const headers = {
    'api-auth-key': pubKey,
    'api-auth-sign': sign,
    'api-auth-timestamp': timestamp,
    'content-type': 'application/json',
  };

  const res = await axios({ method, url, data: body, headers })
    .catch(e => e.response || (() => { throw e; })());
  const result = res.data;
  if (result.status !== 0) throw new Error(`Keygenix [${result.status}]: ${result.msg}`);
  return result.data;
}

// ─── Convenience builders ────────────────────────────────────────────────────

function orgUrl(path = '') {
  const org = process.env.KEYGENIX_ORG_CODE;
  const wallet = process.env.KEYGENIX_WALLET_CODE;
  if (!org || !wallet) throw new Error('KEYGENIX_ORG_CODE and KEYGENIX_WALLET_CODE must be set');
  return `${BASE_URL}/org/${org}/wallets/${wallet}${path}`;
}

// ─── Commands ────────────────────────────────────────────────────────────────

const commands = {

  keygen() {
    const privKey = secp256k1.utils.randomSecretKey();
    const privKeyHex = bytesToHex(privKey);
    const pubKeyHex = bytesToHex(secp256k1.getPublicKey(privKey));
    return { privateKey: privKeyHex, publicKey: pubKeyHex };
  },

  async 'list-keys'([page = '1', size = '10'] = []) {
    return call('GET', orgUrl(`/keys?page=${page}&size=${size}`));
  },

  async 'create-key'([keyType = 'mnemonic', authPubKey]) {
    if (!authPubKey) throw new Error('authPubKey required');
    const addresses = keyType === 'mnemonic' ? [
      { deriving: { curve: 'secp256k1', path: "m/44'/60'/0'/0/0", deriveType: 'bip32' }, addressType: 'EVM' },
      { deriving: { curve: 'ed25519', path: "m/44'/501'/0'/0'", deriveType: 'ed25519-hd-key' }, addressType: 'SOL' },
    ] : [];
    return call('POST', orgUrl('/keys'), { keyType, authPubKey, ...(addresses.length ? { createAddresses: addresses } : {}) });
  },

  async 'get-key'([keyCode]) {
    if (!keyCode) throw new Error('keyCode required');
    return call('GET', orgUrl(`/keys/${keyCode}`));
  },

  async 'list-addresses'([keyCode, page = '1', size = '20'] = []) {
    if (!keyCode) throw new Error('keyCode required');
    return call('GET', orgUrl(`/keys/${keyCode}/addresses?page=${page}&size=${size}`));
  },

  async 'create-address'([keyCode, addressType = 'EVM', path = "m/44'/60'/0'/0/0", curve = 'secp256k1', deriveType = 'bip32']) {
    if (!keyCode) throw new Error('keyCode required');
    return call('POST', orgUrl(`/keys/${keyCode}/addresses`), {
      deriving: { curve, path, deriveType },
      addressType,
      getOrCreate: true,
    });
  },

  async 'sign-tx'([keyCode, txHex, chainId = '1', path = "m/44'/60'/0'/0/0"]) {
    if (!keyCode || !txHex) throw new Error('keyCode and txHex required');
    const authPrivKey = process.env.KEYGENIX_AUTH_PRIV_KEY;
    if (!authPrivKey) throw new Error('KEYGENIX_AUTH_PRIV_KEY not set');
    const txBundle = JSON.stringify({ tx: txHex, category: 'EVM', network: { chainId: parseInt(chainId) } });
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = authSign(authPrivKey, txBundle, timestamp);
    return call('POST', orgUrl(`/keys/${keyCode}/sign_transaction`), {
      authSignature, timestamp, txBundle,
      deriving: { curve: 'secp256k1', path, deriveType: 'bip32' },
    });
  },

  async 'sign-msg'([keyCode, messageHex, path = "m/44'/60'/0'/0/0"]) {
    if (!keyCode || !messageHex) throw new Error('keyCode and messageHex required');
    const authPrivKey = process.env.KEYGENIX_AUTH_PRIV_KEY;
    if (!authPrivKey) throw new Error('KEYGENIX_AUTH_PRIV_KEY not set');
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = authSign(authPrivKey, messageHex, timestamp);
    return call('POST', orgUrl(`/keys/${keyCode}/sign_message`), {
      authSignature, timestamp, message: messageHex,
      deriving: { curve: 'secp256k1', path, deriveType: 'bip32' },
    });
  },

  async 'sign-tx-address'([keyCode, address, txHex, chainId = '1']) {
    if (!keyCode || !address || !txHex) throw new Error('keyCode, address, txHex required');
    const authPrivKey = process.env.KEYGENIX_AUTH_PRIV_KEY;
    if (!authPrivKey) throw new Error('KEYGENIX_AUTH_PRIV_KEY not set');
    const txBundle = JSON.stringify({ tx: txHex, category: 'EVM', network: { chainId: parseInt(chainId) } });
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = authSign(authPrivKey, txBundle, timestamp);
    return call('POST', orgUrl(`/keys/${keyCode}/addresses/${address}/sign_transaction`), {
      authSignature, timestamp, txBundle,
    });
  },

  async 'sign-msg-address'([keyCode, address, messageHex]) {
    if (!keyCode || !address || !messageHex) throw new Error('keyCode, address, messageHex required');
    const authPrivKey = process.env.KEYGENIX_AUTH_PRIV_KEY;
    if (!authPrivKey) throw new Error('KEYGENIX_AUTH_PRIV_KEY not set');
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = authSign(authPrivKey, messageHex, timestamp);
    return call('POST', orgUrl(`/keys/${keyCode}/addresses/${address}/sign_message`), {
      authSignature, timestamp, message: messageHex,
    });
  },
};

// ─── CLI entry ───────────────────────────────────────────────────────────────

(async () => {
  const [,, cmd, ...args] = process.argv;
  if (!cmd || !commands[cmd]) {
    console.log('Available commands:', Object.keys(commands).join(', '));
    process.exit(1);
  }
  try {
    const result = await commands[cmd](args);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
