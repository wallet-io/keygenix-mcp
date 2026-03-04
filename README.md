# keygenix-mcp

**Keygenix MCP Server** — Non-custodial TEE key management & signing for AI agents.

[![npm version](https://badge.fury.io/js/keygenix-mcp.svg)](https://www.npmjs.com/package/keygenix-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Private keys are generated, stored, and used exclusively inside a **Trusted Execution Environment (TEE)**. They never leave in plaintext — not to you, not to Keygenix, not to the AI.

---

## Quick Start

### 1. Get your credentials

1. Register at [keygenix.pro](https://keygenix.pro)
2. Create an organization → note `orgCode`
3. Create a wallet → note `walletCode`
4. Generate two keypairs (run once):

```bash
npx keygenix-mcp keygen   # API Auth keypair
npx keygenix-mcp keygen   # AuthKey keypair (separate)
```

5. Register both **public keys** in the Keygenix dashboard.

### 2. Configure your AI client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "keygenix": {
      "command": "npx",
      "args": ["keygenix-mcp"],
      "env": {
        "KEYGENIX_API_PRIV_KEY": "your-api-auth-private-key-hex",
        "KEYGENIX_AUTH_PRIV_KEY": "your-authkey-private-key-hex",
        "KEYGENIX_ORG_CODE": "your-org-code",
        "KEYGENIX_WALLET_CODE": "your-wallet-code"
      }
    }
  }
}
```

#### Cursor / Windsurf

Edit `.cursor/mcp.json` or `.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "keygenix": {
      "command": "npx",
      "args": ["keygenix-mcp"],
      "env": {
        "KEYGENIX_API_PRIV_KEY": "...",
        "KEYGENIX_AUTH_PRIV_KEY": "...",
        "KEYGENIX_ORG_CODE": "...",
        "KEYGENIX_WALLET_CODE": "..."
      }
    }
  }
}
```

#### OpenClaw

Add to your OpenClaw MCP config, or use the [keygenix OpenClaw Skill](https://clawhub.com/skills/keygenix) directly.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `keygen` | Generate a new secp256k1 keypair locally (no network) |
| `list_keys` | List all keys in the wallet |
| `get_key` | Get details of a key by keyCode |
| `create_key` | Create a new key (mnemonic/private/secret) |
| `list_addresses` | List derived addresses for a key |
| `create_address` | Derive a new address for a chain |
| `sign_transaction` | Sign a blockchain transaction (EVM/SOL/SUI/etc.) |
| `sign_message` | Sign an arbitrary message |

---

## Supported Chains

EVM · Solana · Bitcoin · Litecoin · Dogecoin · Zcash · Tron · Ripple · Sui · TON · Cardano · Aptos · Cosmos · Sei

---

## Security Model

```
AI Agent
  ↓  calls MCP tool (no keys in prompt)
keygenix-mcp (local process)
  ↓  ECDSA-signed HTTPS requests
Keygenix TEE API
  ↓  private key never leaves enclave
Signed transaction returned
```

- **API Auth Private Key** — signs every API request. Store in env, never hardcode.
- **AuthKey Private Key** — authorizes sign/export. Signed locally; Keygenix only sees the public key.
- **Private keys** — generated inside TEE, never exposed in plaintext.

---

## Without MCP (CLI)

For scripting, debugging, or direct integration — no AI client needed:

```bash
cd cli
npm install
cp .env.example .env   # fill in your keys
node client.js list-keys
```

See [`cli/README.md`](cli/README.md) for full command reference.

---

## Development

```bash
git clone https://github.com/onezerotrace/keygenix-mcp
cd keygenix-mcp
npm install
npm run build
npm start
```

---

## Distribution

| Channel | Command |
|---------|---------|
| GitHub | `npm install github:onezerotrace/keygenix-mcp` |
| npm _(coming soon)_ | `npx keygenix-mcp` |
| OpenClaw | `clawhub install keygenix` |
| Smithery | [smithery.ai/server/keygenix](https://smithery.ai) |

---

## Links

- Website: [keygenix.pro](https://keygenix.pro)
- API Docs: [keygenix.pro/docs.html](https://keygenix.pro/docs.html)
- Issues: [github.com/onezerotrace/keygenix-mcp/issues](https://github.com/onezerotrace/keygenix-mcp/issues)
