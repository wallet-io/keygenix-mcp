/**
 * Shared chain → address derivation config.
 * Used by create_key and import_key tools.
 */
export const CHAIN_ADDRESS_CONFIG = {
    EVM: [{ deriving: { curve: "secp256k1", path: "m/44'/60'/0'/0/0", deriveType: "bip32" }, addressType: "EVM" }],
    SOL: [{ deriving: { curve: "ed25519", path: "m/44'/501'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "SOL" }],
    BTC: [{ deriving: { curve: "secp256k1", path: "m/84'/0'/0'/0/0", deriveType: "bip32" }, addressType: "BTC_P2WPKH" }],
    SUI: [{ deriving: { curve: "ed25519", path: "m/44'/784'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "SUI_ED25519" }],
    TRX: [{ deriving: { curve: "secp256k1", path: "m/44'/195'/0'/0/0", deriveType: "bip32" }, addressType: "TRX" }],
    TON: [{ deriving: { curve: "ed25519", path: "m/44'/607'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "TON_V4R2" }],
    XRP: [{ deriving: { curve: "secp256k1", path: "m/44'/144'/0'/0/0", deriveType: "bip32" }, addressType: "XRP" }],
    ADA: [{ deriving: { curve: "ed25519", path: "m/44'/1815'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "ADA_ENTERPRISE" }],
    APTOS: [{ deriving: { curve: "ed25519", path: "m/44'/637'/0'/0'/0'", deriveType: "ed25519-hd-key" }, addressType: "APTOS" }],
    COSMOS: [{ deriving: { curve: "secp256k1", path: "m/44'/118'/0'/0/0", deriveType: "bip32" }, addressType: "COSMOS" }],
};
//# sourceMappingURL=constants.js.map