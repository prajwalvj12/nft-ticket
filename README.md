# nft_ticket

A blockchain-based NFT ticketing system with IPFS integration and QR code verification.

## Features

- 🎫 Mint event tickets as NFTs on Polygon Amoy testnet
- 🔒 Marketplace with controlled resale (prevents scalping)
- 📦 IPFS integration for decentralized metadata storage
- 📱 QR code generation and scanning for ticket verification
- ✅ Real-time ticket verification
- 🎪 Event management and browsing
- 👛 MetaMask wallet integration

## Getting Started

### Prerequisites

- Node.js
- npm

### Backend

1. Install dependencies:

```bash
npm install
```

2. Run a local Hardhat node:

```bash
npx hardhat node
```

3. In a new terminal, deploy the smart contracts to the local node:

```bash
npx hardhat ignition deploy ./ignition/modules/EventTicketNFT.js --network localhost
```

### Frontend

1. Navigate to the `nft-frontend` directory:

```bash
cd nft-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the `nft-frontend` directory (see `.env.example`):

```bash
# Required
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional - for IPFS features
VITE_PINATA_JWT=your_pinata_jwt_token
```

4. Start the development server:

```bash
npm run dev
```

### Metadata Server (Optional)

For serving ticket metadata:

```bash
cd nft-frontend/metadata-server
npm install
npm start
```

## IPFS and QR Code Features

This project includes optional IPFS integration and QR code functionality:

- **IPFS Storage**: Decentralized metadata storage via Pinata
- **QR Codes**: Automatic generation for each ticket
- **QR Scanning**: Built-in camera scanner for ticket verification

For detailed documentation, see [IPFS_QR_FEATURES.md](./IPFS_QR_FEATURES.md)

### Quick Setup for IPFS

1. Create a free account at [Pinata](https://app.pinata.cloud/)
2. Get your JWT token from the API Keys section
3. Add to `nft-frontend/.env`:
   ```
   VITE_PINATA_JWT=your_jwt_token_here
   ```
4. Restart the frontend

**Note**: IPFS is optional. The system works without it using fallback URLs.
