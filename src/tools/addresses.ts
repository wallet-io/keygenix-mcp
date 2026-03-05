import { KeygenixConfig, apiCall, walletUrl } from "../api-client.js";

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const listAddressesTool = {
  name: "list_addresses",
  description: "List all derived addresses for a key.",
  inputSchema: {
    type: "object",
    properties: {
      keyCode: { type: "string", description: "The key code" },
      page: { type: "number", description: "Page number (default: 1)" },
      size: { type: "number", description: "Page size (default: 20)" },
    },
    required: ["keyCode"],
  },
};

export const createAddressTool = {
  name: "create_address",
  description:
    "Derive a new address from a key for a specific chain. " +
    "Idempotent — returns the existing address if already derived for the same path.",
  inputSchema: {
    type: "object",
    properties: {
      keyCode: { type: "string", description: "The key code to derive from" },
      addressType: {
        type: "string",
        enum: [
          "EVM", "SOL", "BTC_P2PKH", "BTC_P2WPKH", "LTC_P2PKH", "LTC_P2WPKH",
          "DOGE_P2PKH", "TRX", "XRP", "SUI_SECP256K1", "SUI_ED25519",
          "TON_V3R2", "TON_V4R2", "TON_V5R1", "ADA_ENTERPRISE", "APTOS",
          "COSMOS", "SEI", "ZEC_P2PKH",
        ],
        description: "Target address type / chain",
      },
      path: {
        type: "string",
        description: "BIP44 derivation path (e.g. m/44'/60'/0'/0/0). Uses chain default if omitted.",
      },
      curve: {
        type: "string",
        enum: ["secp256k1", "ed25519"],
        description: "Elliptic curve. Uses chain default if omitted.",
      },
      deriveType: {
        type: "string",
        enum: ["bip32", "bip32-cardano", "ed25519-hd-key"],
        description: "Derivation type. Uses chain default if omitted.",
      },
    },
    required: ["keyCode", "addressType"],
  },
};

// ─── Default derivation configs per addressType ───────────────────────────────

const ADDRESS_DEFAULTS: Record<string, { curve: string; path: string; deriveType: string }> = {
  EVM:           { curve: "secp256k1", path: "m/44'/60'/0'/0/0",       deriveType: "bip32" },
  SOL:           { curve: "ed25519",   path: "m/44'/501'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  BTC_P2PKH:     { curve: "secp256k1", path: "m/44'/0'/0'/0/0",        deriveType: "bip32" },
  BTC_P2WPKH:    { curve: "secp256k1", path: "m/84'/0'/0'/0/0",        deriveType: "bip32" },
  LTC_P2PKH:     { curve: "secp256k1", path: "m/44'/2'/0'/0/0",        deriveType: "bip32" },
  LTC_P2WPKH:    { curve: "secp256k1", path: "m/84'/2'/0'/0/0",        deriveType: "bip32" },
  DOGE_P2PKH:    { curve: "secp256k1", path: "m/44'/3'/0'/0/0",        deriveType: "bip32" },
  TRX:           { curve: "secp256k1", path: "m/44'/195'/0'/0/0",      deriveType: "bip32" },
  XRP:           { curve: "secp256k1", path: "m/44'/144'/0'/0/0",      deriveType: "bip32" },
  SUI_SECP256K1: { curve: "secp256k1", path: "m/44'/784'/0'/0/0",      deriveType: "bip32" },
  SUI_ED25519:   { curve: "ed25519",   path: "m/44'/784'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  TON_V3R2:      { curve: "ed25519",   path: "m/44'/607'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  TON_V4R2:      { curve: "ed25519",   path: "m/44'/607'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  TON_V5R1:      { curve: "ed25519",   path: "m/44'/607'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  ADA_ENTERPRISE:{ curve: "ed25519",   path: "m/44'/1815'/0'/0'/0'",   deriveType: "ed25519-hd-key" },
  APTOS:         { curve: "ed25519",   path: "m/44'/637'/0'/0'/0'",    deriveType: "ed25519-hd-key" },
  COSMOS:        { curve: "secp256k1", path: "m/44'/118'/0'/0/0",      deriveType: "bip32" },
  SEI:           { curve: "secp256k1", path: "m/44'/19000118'/0'/0/0", deriveType: "bip32" },
  ZEC_P2PKH:     { curve: "secp256k1", path: "m/44'/133'/0'/0/0",      deriveType: "bip32" },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleListAddresses(
  config: KeygenixConfig,
  args: { keyCode: string; page?: number; size?: number }
) {
  const page = args.page ?? 1;
  const size = args.size ?? 20;
  return apiCall(config, "GET", walletUrl(config, `/keys/${args.keyCode}/addresses?page=${page}&size=${size}`));
}

export async function handleCreateAddress(
  config: KeygenixConfig,
  args: {
    keyCode: string;
    addressType: string;
    path?: string;
    curve?: string;
    deriveType?: string;
  }
) {
  // 只有显式传了 path/curve/deriveType 时才发 deriving（private keyType 不支持 deriving）
  const hasCustomDeriving = args.path || args.curve || args.deriveType;
  const defaults = ADDRESS_DEFAULTS[args.addressType] ?? {
    curve: "secp256k1",
    path: "m/44'/60'/0'/0/0",
    deriveType: "bip32",
  };

  const body: Record<string, unknown> = {
    addressType: args.addressType,
    getOrCreate: true,
  };

  if (hasCustomDeriving) {
    body.deriving = {
      curve: args.curve ?? defaults.curve,
      path: args.path ?? defaults.path,
      deriveType: args.deriveType ?? defaults.deriveType,
    };
  }

  return apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/addresses`), body);
}
