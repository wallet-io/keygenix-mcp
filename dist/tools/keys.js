import { apiCall, walletUrl } from "../api-client.js";
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
            size: { type: "number", description: "Page size (default: 10)" },
            keyCode: { type: "string", description: "Filter by keyCode (max 32 chars)" },
            name: { type: "string", description: "Filter by key name (max 32 chars)" },
            orderDirection: { type: "string", enum: ["ASC", "DESC"], description: "Sort direction" },
        },
        required: [],
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
export const updateKeyTool = {
    name: "update_key",
    description: "Update a key's name or remark.",
    inputSchema: {
        type: "object",
        properties: {
            keyCode: { type: "string", description: "The key code to update" },
            name: { type: "string", description: "New name (max 32 chars)" },
            remark: { type: "string", description: "New remark (max 1024 chars)" },
        },
        required: ["keyCode"],
    },
};
export const getPublicKeyTool = {
    name: "get_public_key",
    description: "Get the derived public key for a key. " +
        "For mnemonic keys, provide curve/path/deriveType. " +
        "For private/secret keys, omit all deriving params.",
    inputSchema: {
        type: "object",
        properties: {
            keyCode: { type: "string", description: "The key code" },
            curve: { type: "string", enum: ["secp256k1", "ed25519"], description: "Curve (mnemonic only)" },
            path: { type: "string", description: "BIP44 derivation path (mnemonic only)" },
            deriveType: { type: "string", enum: ["bip32", "bip32-cardano", "ed25519-hd-key"], description: "Derive type (mnemonic only)" },
        },
        required: ["keyCode"],
    },
};
export const createKeyTool = {
    name: "create_key",
    description: "Create a new key in the TEE. Supports mnemonic (HD wallet), private key, or secret key types. " +
        "curve is required for private (secp256k1 or ed25519) and secret (ed25519 only) key types.",
    inputSchema: {
        type: "object",
        properties: {
            keyType: {
                type: "string",
                enum: ["mnemonic", "private", "secret"],
                description: "Type of key. 'mnemonic' = HD wallet (recommended for multi-chain).",
            },
            curve: {
                type: "string",
                enum: ["secp256k1", "ed25519"],
                description: "Required for private/secret key types. Omit for mnemonic.",
            },
            chains: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["EVM", "SOL", "BTC", "SUI", "TRX", "TON", "XRP", "ADA", "APTOS", "COSMOS"],
                },
                description: "For mnemonic keys: chain addresses to derive on creation. Defaults to [EVM, SOL].",
            },
        },
        required: ["keyType"],
    },
};
export const exportKeyTool = {
    name: "export_key",
    description: "Export a key from TEE. The key material is returned encrypted with your ephemeral public key (ECIES). " +
        "Generates a local keypair, sends the public key to the server, receives encrypted key, decrypts locally.",
    inputSchema: {
        type: "object",
        properties: {
            keyCode: { type: "string", description: "The key code to export" },
        },
        required: ["keyCode"],
    },
};
// ─── Handlers ─────────────────────────────────────────────────────────────────
export async function handleListKeys(config, args) {
    const params = new URLSearchParams();
    if (args.page)
        params.set("page", String(args.page));
    if (args.size)
        params.set("size", String(args.size));
    if (args.keyCode)
        params.set("keyCode", args.keyCode);
    if (args.name)
        params.set("name", args.name);
    if (args.orderDirection)
        params.set("orderDirection", args.orderDirection);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiCall(config, "GET", walletUrl(config, `/keys${qs}`));
}
export async function handleGetKey(config, args) {
    return apiCall(config, "GET", walletUrl(config, `/keys/${args.keyCode}`));
}
export async function handleUpdateKey(config, args) {
    return apiCall(config, "PUT", walletUrl(config, `/keys/${args.keyCode}`), {
        ...(args.name !== undefined && { name: args.name }),
        ...(args.remark !== undefined && { remark: args.remark }),
    });
}
export async function handleGetPublicKey(config, args) {
    const params = new URLSearchParams();
    if (args.curve)
        params.set("curve", args.curve);
    if (args.path)
        params.set("path", args.path);
    if (args.deriveType)
        params.set("deriveType", args.deriveType);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiCall(config, "GET", walletUrl(config, `/keys/${args.keyCode}/public_key${qs}`));
}
export async function handleCreateKey(config, args) {
    const authPubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(config.authPrivKey)));
    const body = { keyType: args.keyType, authPubKey };
    // curve required for private/secret
    if (args.keyType === "private" || args.keyType === "secret") {
        if (!args.curve)
            throw new Error(`curve is required for keyType=${args.keyType}`);
        body.curve = args.curve;
    }
    // createAddresses only for mnemonic
    if (args.keyType === "mnemonic") {
        const chains = args.chains ?? ["EVM", "SOL"];
        const createAddresses = chains.flatMap((c) => CHAIN_ADDRESS_CONFIG[c] ?? []);
        if (createAddresses.length > 0)
            body.createAddresses = createAddresses;
    }
    return apiCall(config, "POST", walletUrl(config, "/keys"), body);
}
export async function handleExportKey(config, args) {
    const { buildAuthSignature } = await import("../api-client.js");
    const { SecureEncryption } = await import("../encryption.js");
    // Generate local ephemeral keypair for decryption
    const ephemeralKey = secp256k1.utils.randomSecretKey();
    const publicKey = bytesToHex(secp256k1.getPublicKey(ephemeralKey));
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = buildAuthSignature(config.authPrivKey, publicKey, timestamp);
    const result = await apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/export`), { authSignature, timestamp, publicKey });
    // Decrypt the exported key locally
    const enc = new SecureEncryption();
    const decrypted = enc.decrypt(result.encryptedExportingKey, bytesToHex(ephemeralKey));
    return JSON.parse(decrypted);
}
//# sourceMappingURL=keys.js.map