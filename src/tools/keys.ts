import { KeygenixConfig, apiCall, walletUrl } from "../api-client.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { CHAIN_ADDRESS_CONFIG } from "../constants.js";

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const listKeysTool = {
  name: "list_keys",
  description: "List all keys in the wallet.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number (default: 1)" },
      size: { type: "number", description: "Page size (default: 10, max: 100)" },
    },
    required: [] as string[],
  },
};

export const getKeyTool = {
  name: "get_key",
  description: "Get details of a specific key by keyCode.",
  inputSchema: {
    type: "object",
    properties: {
      keyCode: { type: "string", description: "The key code to retrieve" },
    },
    required: ["keyCode"],
  },
};

export const createKeyTool = {
  name: "create_key",
  description:
    "Create a new key in the TEE. Supports mnemonic (HD wallet), private key, or secret key types. " +
    "For mnemonic keys, specify which chain addresses to derive on creation.",
  inputSchema: {
    type: "object",
    properties: {
      keyType: {
        type: "string",
        enum: ["mnemonic", "private", "secret"],
        description: "Type of key to create. 'mnemonic' = HD wallet (recommended for multi-chain)",
      },
      chains: {
        type: "array",
        items: {
          type: "string",
          enum: ["EVM", "SOL", "BTC", "SUI", "TRX", "TON", "XRP", "ADA", "APTOS", "COSMOS"],
        },
        description:
          "For mnemonic keys: which chain addresses to derive on creation. Defaults to [EVM, SOL].",
      },
    },
    required: ["keyType"],
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleListKeys(config: KeygenixConfig, args: { page?: number; size?: number }) {
  const page = args.page ?? 1;
  const size = args.size ?? 10;
  return apiCall(config, "GET", walletUrl(config, `/keys?page=${page}&size=${size}`));
}

export async function handleGetKey(config: KeygenixConfig, args: { keyCode: string }) {
  return apiCall(config, "GET", walletUrl(config, `/keys/${args.keyCode}`));
}

export async function handleCreateKey(
  config: KeygenixConfig,
  args: { keyType: string; chains?: string[] }
) {
  const authPubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(config.authPrivKey)));

  const chains = args.chains ?? (args.keyType === "mnemonic" ? ["EVM", "SOL"] : []);
  const createAddresses = chains.flatMap((c) => CHAIN_ADDRESS_CONFIG[c] ?? []);

  const body: Record<string, unknown> = {
    keyType: args.keyType,
    authPubKey,
  };
  if (createAddresses.length > 0) {
    body.createAddresses = createAddresses;
  }

  return apiCall(config, "POST", walletUrl(config, "/keys"), body);
}
