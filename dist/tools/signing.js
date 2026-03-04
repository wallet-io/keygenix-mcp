import { apiCall, walletUrl, buildAuthSignature } from "../api-client.js";
// ─── Tool definitions ─────────────────────────────────────────────────────────
export const signTransactionTool = {
    name: "sign_transaction",
    description: "Sign a blockchain transaction using a TEE-stored key. " +
        "Supports EVM (RLP hex), SOL (base58/base64/hex), SUI, and other chains. " +
        "keyCode is always required. Optionally provide address to skip HD derivation.",
    inputSchema: {
        type: "object",
        properties: {
            keyCode: { type: "string", description: "Key code (required)" },
            address: { type: "string", description: "Specific address to sign with — optional, skips HD derivation when provided" },
            tx: {
                type: "string",
                description: "Unsigned transaction. EVM: 0x-prefixed RLP hex. SOL: base58/base64/hex encoded tx.",
            },
            chain: {
                type: "string",
                enum: ["EVM", "SOL", "SUI", "BTC", "TRX", "TON", "COSMOS", "XRP", "ADA", "APTOS"],
                description: "Target blockchain",
            },
            chainId: {
                type: "number",
                description: "EVM chain ID (e.g. 1=Ethereum, 56=BSC, 137=Polygon, 42161=Arbitrum). Required for EVM.",
            },
            encoding: {
                type: "string",
                enum: ["base58", "base64", "hex"],
                description: "SOL transaction encoding (default: base58)",
            },
            path: {
                type: "string",
                description: "BIP44 path (default: m/44'/60'/0'/0/0 for EVM). Only used with keyCode.",
            },
        },
        required: ["keyCode", "tx", "chain"],
    },
};
export const signMessageTool = {
    name: "sign_message",
    description: "Sign an arbitrary message (hex-encoded sha256 hash) using a TEE-stored key. " +
        "keyCode is always required. Optionally provide address to skip HD derivation.",
    inputSchema: {
        type: "object",
        properties: {
            keyCode: { type: "string", description: "Key code" },
            address: { type: "string", description: "Specific address to sign with (skips HD derivation)" },
            message: {
                type: "string",
                description: "Message to sign as 64-char hex (sha256 hash of the original message)",
            },
            chain: {
                type: "string",
                enum: ["EVM", "SOL", "SUI", "BTC", "TRX", "TON", "COSMOS", "XRP", "ADA", "APTOS"],
                description: "Chain type — determines default curve and path. Required when address is not provided.",
            },
            path: {
                type: "string",
                description: "BIP44 path override. Uses chain default if omitted.",
            },
        },
        required: ["keyCode", "message"],
    },
};
// ─── Chain defaults ───────────────────────────────────────────────────────────
const CHAIN_DEFAULTS = {
    EVM: { path: "m/44'/60'/0'/0/0", curve: "secp256k1", deriveType: "bip32" },
    SOL: { path: "m/44'/501'/0'/0'", curve: "ed25519", deriveType: "ed25519-hd-key" },
    SUI: { path: "m/44'/784'/0'/0'/0'", curve: "ed25519", deriveType: "ed25519-hd-key" },
    BTC: { path: "m/84'/0'/0'/0/0", curve: "secp256k1", deriveType: "bip32" },
    TRX: { path: "m/44'/195'/0'/0/0", curve: "secp256k1", deriveType: "bip32" },
    TON: { path: "m/44'/607'/0'", curve: "ed25519", deriveType: "ed25519-hd-key" },
    COSMOS: { path: "m/44'/118'/0'/0/0", curve: "secp256k1", deriveType: "bip32" },
    XRP: { path: "m/44'/144'/0'/0/0", curve: "secp256k1", deriveType: "bip32" },
    ADA: { path: "m/1852'/1815'/0'/0/0", curve: "ed25519", deriveType: "bip32-cardano" },
    APTOS: { path: "m/44'/637'/0'/0'/0'", curve: "ed25519", deriveType: "ed25519-hd-key" },
};
// ─── Handlers ─────────────────────────────────────────────────────────────────
export async function handleSignTransaction(config, args) {
    if (!args.keyCode) {
        throw new Error("keyCode is required (address is optional — if provided, deriving is skipped)");
    }
    // Build txBundle
    let txBundle;
    if (args.chain === "EVM") {
        txBundle = JSON.stringify({
            tx: args.tx,
            category: "EVM",
            network: { chainId: args.chainId ?? 1 },
        });
    }
    else if (args.chain === "SOL") {
        txBundle = JSON.stringify({
            tx: args.tx,
            enc: args.encoding ?? "base58",
            category: "SOL",
        });
    }
    else {
        txBundle = JSON.stringify({ tx: args.tx, category: args.chain });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = buildAuthSignature(config.authPrivKey, txBundle, timestamp);
    if (args.address) {
        // Address-based signing — no deriving needed
        return apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/addresses/${args.address}/sign_transaction`), { authSignature, timestamp, txBundle });
    }
    else {
        const defaults = CHAIN_DEFAULTS[args.chain] ?? CHAIN_DEFAULTS.EVM;
        return apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/sign_transaction`), {
            authSignature,
            timestamp,
            txBundle,
            deriving: {
                curve: defaults.curve,
                path: args.path ?? defaults.path,
                deriveType: defaults.deriveType,
            },
        });
    }
}
export async function handleSignMessage(config, args) {
    if (!args.keyCode) {
        throw new Error("keyCode is required (address is optional — if provided, deriving is skipped)");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const authSignature = buildAuthSignature(config.authPrivKey, args.message, timestamp);
    if (args.address) {
        // Address-based signing — no deriving needed
        return apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/addresses/${args.address}/sign_message`), { authSignature, timestamp, message: args.message });
    }
    else {
        const defaults = CHAIN_DEFAULTS[args.chain ?? "EVM"] ?? CHAIN_DEFAULTS.EVM;
        return apiCall(config, "POST", walletUrl(config, `/keys/${args.keyCode}/sign_message`), {
            authSignature,
            timestamp,
            message: args.message,
            deriving: {
                curve: defaults.curve,
                path: args.path ?? defaults.path,
                deriveType: defaults.deriveType,
            },
        });
    }
}
//# sourceMappingURL=signing.js.map