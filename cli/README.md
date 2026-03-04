# Keygenix CLI

Direct command-line access to the Keygenix API — **no MCP server required**.

Use this when you want to integrate Keygenix directly into scripts or test the API without setting up an MCP client.

## Setup

```bash
cd cli
npm install
cp .env.example .env
# Fill in your keys in .env
```

## Usage

```bash
# Generate a new secp256k1 keypair (local, no API call)
node client.js keygen

# List keys in your wallet
node client.js list-keys

# Create a new mnemonic key (EVM + SOL addresses by default)
node client.js create-key mnemonic <authPubKey>

# Get key details
node client.js get-key <keyCode>

# List addresses for a key
node client.js list-addresses <keyCode>

# Derive a new address
node client.js create-address <keyCode> <addressType> <path> <curve> <deriveType>

# Sign an EVM transaction
node client.js sign-tx <keyCode> <txHex> <chainId> <path>

# Sign a message
node client.js sign-msg <keyCode> <messageHex>

# Sign via specific address (no deriving)
node client.js sign-tx-address <keyCode> <address> <txHex>
node client.js sign-msg-address <keyCode> <address> <msgHex>
```

## When to use CLI vs MCP

| | CLI | MCP Server |
|---|---|---|
| **Use when** | Scripting, debugging, no AI client | AI agent workflows (Claude, Cursor, etc.) |
| **Requires** | Node.js | MCP-compatible AI client |
| **Setup** | `npm install` in this folder | Configure env vars in AI client |
