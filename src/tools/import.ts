import { KeygenixConfig, apiCall, walletUrl } from "../api-client.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { SecureEncryption } from "../encryption.js";

// ─── Tool definition ──────────────────────────────────────────────────────────

export const importKeyTool = {
  name: "import_key",
  description:
    "Import an existing key (mnemonic or private key) into Keygenix TEE. " +
    "The key material is encrypted with ECIES before leaving the local machine — " +
    "it is never transmitted in plaintext. " +
    "Provide either 'mnemonic' (12/24 words) or 'privateKey' (hex), not both.",
  inputSchema: {
    type: "object",
    properties: {
      keyType: {
        type: "string",
        enum: ["mnemonic", "private"],
        description: "Type of key to import",
      },
      mnemonic: {
        type: "string",
        description: "BIP39 mnemonic phrase (12 or 24 words). Required when keyType=mnemonic.",
      },
      privateKey: {
        type: "string",
        description: "Private key as hex string. Required when keyType=private.",
      },
      curve: {
        type: "string",
        enum: ["secp256k1", "ed25519"],
        description: "Elliptic curve for private key import (default: secp256k1). Not used for mnemonic.",
      },
      chains: {
        type: "array",
        items: {
          type: "string",
          enum: ["EVM", "SOL", "BTC", "SUI", "TRX", "TON", "XRP", "ADA", "APTOS", "COSMOS"],
        },
        description: "Chain addresses to derive after import. Defaults to [EVM, SOL] for mnemonic.",
      },
    },
    required: ["keyType"],
  },
};

// ─── Chain address configs (same as keys.ts) ──────────────────────────────────

const CHAIN_ADDRESS_CONFIG: Record<string, { deriving: object; addressType: string }[]> = {
  EVM:    [{ deriving: { curve: "secp256k1", path: "m/44'/60'/0'/0/0", deriveType: "bip32" }, addressType: "EVM" }],
  SOL:    [{ deriving: { curve: "ed25519",   path: "m/44'/501'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "SOL" }],
  BTC:    [{ deriving: { curve: "secp256k1", path: "m/84'/0'/0'/0/0", deriveType: "bip32" }, addressType: "BTC_P2WPKH" }],
  SUI:    [{ deriving: { curve: "ed25519",   path: "m/44'/784'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "SUI_ED25519" }],
  TRX:    [{ deriving: { curve: "secp256k1", path: "m/44'/195'/0'/0/0", deriveType: "bip32" }, addressType: "TRX" }],
  TON:    [{ deriving: { curve: "ed25519",   path: "m/44'/607'/0'", deriveType: "ed25519-hd-key" }, addressType: "TON_V4R2" }],
  XRP:    [{ deriving: { curve: "secp256k1", path: "m/44'/144'/0'/0/0", deriveType: "bip32" }, addressType: "XRP" }],
  ADA:    [{ deriving: { curve: "ed25519",   path: "m/1852'/1815'/0'/0/0", deriveType: "bip32-cardano" }, addressType: "ADA_ENTERPRISE" }],
  APTOS:  [{ deriving: { curve: "ed25519",   path: "m/44'/637'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "APTOS" }],
  COSMOS: [{ deriving: { curve: "secp256k1", path: "m/44'/118'/0'/0/0", deriveType: "bip32" }, addressType: "COSMOS" }],
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleImportKey(
  config: KeygenixConfig,
  args: {
    keyType: string;
    mnemonic?: string;
    privateKey?: string;
    curve?: string;
    chains?: string[];
  }
) {
  if (args.keyType === "mnemonic" && !args.mnemonic) {
    throw new Error("mnemonic is required when keyType=mnemonic");
  }
  if (args.keyType === "private" && !args.privateKey) {
    throw new Error("privateKey is required when keyType=private");
  }

  // Step 1: Get TEE public key for encryption
  const { publicKey: preparedPubKey } = await apiCall<{ publicKey: string }>(
    config,
    "POST",
    walletUrl(config, "/keys/prepare_import"),
    {}
  );

  // Step 2: Build key material payload and encrypt with TEE public key (ECIES)
  const enc = new SecureEncryption();
  let keyMaterial: string;
  if (args.keyType === "mnemonic") {
    keyMaterial = JSON.stringify({ mnemonic: args.mnemonic });
  } else {
    keyMaterial = JSON.stringify({
      privateKey: args.privateKey,
      curve: args.curve ?? "secp256k1",
    });
  }
  const encryptedImportingKey = enc.encrypt(keyMaterial, preparedPubKey);

  // Step 3: AuthKey public key
  const authPubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(config.authPrivKey)));

  // Step 4: Derive address configs
  const chains = args.chains ?? (args.keyType === "mnemonic" ? ["EVM", "SOL"] : []);
  const createAddresses = chains.flatMap((c) => CHAIN_ADDRESS_CONFIG[c] ?? []);

  const body: Record<string, unknown> = {
    keyType: args.keyType,
    encryptedImportingKey,
    authPubKey,
    preparedPubKey,
  };
  if (createAddresses.length > 0) {
    body.createAddresses = createAddresses;
  }

  return apiCall(config, "POST", walletUrl(config, "/keys/import"), body);
}
