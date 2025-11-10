# nft_ticket

A simple NFT ticket app that allows you to create, view, and transfer tickets as NFTs.

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

3. Start the development server:

```bash
npm run dev
```
