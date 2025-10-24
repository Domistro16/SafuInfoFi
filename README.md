# SafuInfoFi Dashboard

A Web3 social intelligence dashboard for projects launched on the InfoFi launchpad. Track, rank, and reward community engagement through X/Twitter integration and on-chain verification.

## Overview

SafuInfoFi Dashboard creates leaderboards that rank X/Twitter accounts based on their engagement with launchpad projects. Users must link their wallet (with a .safu domain) to participate in rankings based on post relevance and impressions.

### Key Features

- **Project Registration**: Only projects that launched tokens on InfoFi launchpad
- **Smart Contract Fees**: Automated fee collection every Sunday at 1am UTC
- **X/Twitter Integration**: Track posts, impressions, and engagement metrics
- **SAFU Domain Verification**: Wallet linking requires .safu domain ownership
- **AI-Powered Ranking**: Posts ranked by relevance to project and impression count
- **Leaderboards**: Real-time rankings for each project's community

## Architecture

```
safu-infofi-dashboard/
├── packages/
│   ├── contracts/     # Solidity smart contracts
│   ├── backend/       # Node.js/Express API server
│   ├── frontend/      # Next.js dashboard UI
│   └── shared/        # Shared TypeScript types
```

## Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- Hardhat (development & testing)
- OpenZeppelin contracts
- Chainlink Automation (scheduled fee collection)

### Backend
- Node.js 18+ with TypeScript
- Express.js
- PostgreSQL (primary database)
- Redis (caching & job queues)
- Bull (job scheduling)
- X/Twitter API v2
- Ethers.js (blockchain interaction)

### Frontend
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS
- RainbowKit (wallet connection)
- Wagmi (React hooks for Ethereum)
- TanStack Query (data fetching)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- X/Twitter API credentials
- RPC endpoint (Alchemy, Infura, etc.)

### Installation

```bash
# Install all dependencies
npm run install:all

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
cp packages/contracts/.env.example packages/contracts/.env
```

### Configuration

1. **Backend** (`packages/backend/.env`):
   - Database credentials
   - X/Twitter API keys
   - Blockchain RPC URLs
   - JWT secrets

2. **Contracts** (`packages/contracts/.env`):
   - Private key for deployment
   - RPC URLs
   - Etherscan API key

3. **Frontend** (`packages/frontend/.env`):
   - API endpoint
   - WalletConnect project ID
   - Chain configurations

### Development

```bash
# Run development servers
npm run dev

# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Deployment

```bash
# Build all packages
npm run build

# Deploy smart contracts
cd packages/contracts
npm run deploy:mainnet

# Run tests
npm test
```

## Smart Contracts

### InfoFiRegistry
Manages project registration and fee payments.

### WalletLinker
Handles wallet-to-X verification with SAFU domain checks.

### FeeCollector
Automated fee collection using Chainlink Automation.

## API Endpoints

### Projects
- `POST /api/projects` - Register new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details

### Leaderboards
- `GET /api/leaderboards/:projectId` - Get project leaderboard
- `GET /api/leaderboards/:projectId/user/:address` - User ranking

### Users
- `POST /api/users/link-wallet` - Link wallet with X account
- `GET /api/users/:address` - Get user profile
- `POST /api/users/verify-domain` - Verify SAFU domain

### Posts
- `GET /api/posts/:projectId` - Get project-related posts
- `POST /api/posts/sync` - Trigger post synchronization

## Leaderboard Algorithm

Rankings are calculated based on:

1. **Post Relevance** (60% weight)
   - Keyword matching with project name/token
   - Hashtag relevance
   - Mention analysis
   - Sentiment analysis

2. **Engagement Metrics** (40% weight)
   - Impressions count
   - Likes, retweets, replies
   - Follower reach

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/Domistro16/SafuInfoFi/issues
- Documentation: [Coming soon]
