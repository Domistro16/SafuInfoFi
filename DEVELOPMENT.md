# SafuInfoFi Dashboard - Development Guide

This guide will help you set up and develop the SafuInfoFi Dashboard locally.

## Project Structure

```
SafuInfoFi/
├── packages/
│   ├── contracts/          # Solidity smart contracts
│   │   ├── contracts/
│   │   ├── scripts/
│   │   ├── test/
│   │   └── hardhat.config.ts
│   ├── backend/            # Node.js/Express API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── config/
│   │   │   ├── jobs/
│   │   │   └── index.ts
│   │   └── prisma/
│   └── frontend/           # Next.js dashboard
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── lib/
│       │   └── styles/
│       └── public/
├── README.md
├── DEVELOPMENT.md
└── DEPLOYMENT.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 7+
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Domistro16/SafuInfoFi.git
cd SafuInfoFi
```

2. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install all package dependencies
npm run install:all
```

3. **Set up environment variables**

```bash
# Contracts
cd packages/contracts
cp .env.example .env
# Edit .env with your configuration

# Backend
cd ../backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

1. **Create PostgreSQL database**

```bash
createdb safu_infofi
```

2. **Run migrations**

```bash
cd packages/backend
npm run migrate
```

3. **Start Redis**

```bash
# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis
```

### Development

#### 1. Smart Contracts

```bash
cd packages/contracts

# Start local Hardhat node
npx hardhat node

# In another terminal, deploy contracts
npm run deploy:local

# Run tests
npm test
```

#### 2. Backend API

```bash
cd packages/backend

# Start development server
npm run dev

# The API will be available at http://localhost:3001
```

#### 3. Frontend

```bash
cd packages/frontend

# Start development server
npm run dev

# The frontend will be available at http://localhost:3000
```

#### 4. Run Everything

From the root directory:

```bash
npm run dev
```

This will start both backend and frontend concurrently.

## Key Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/safu_infofi

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
REGISTRY_CONTRACT_ADDRESS=0x...
WALLET_LINKER_CONTRACT_ADDRESS=0x...
VERIFIER_PRIVATE_KEY=0x...

# X/Twitter API
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_BEARER_TOKEN=...
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_WALLET_LINKER_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

## API Documentation

### Projects

```bash
# List all projects
GET /api/v1/projects?active=true

# Get project by ID
GET /api/v1/projects/:id

# Sync projects from blockchain
POST /api/v1/projects/sync

# Get project statistics
GET /api/v1/projects/:id/stats
```

### Leaderboards

```bash
# Get project leaderboard
GET /api/v1/leaderboards/:projectId?limit=100

# Get user ranking
GET /api/v1/leaderboards/:projectId/user/:address

# Update leaderboard
POST /api/v1/leaderboards/:projectId/update
```

### Users

```bash
# Link wallet to X account
POST /api/v1/users/link-wallet
{
  "walletAddress": "0x...",
  "xHandle": "username",
  "safuDomain": "username.safu"
}

# Get user profile
GET /api/v1/users/:address

# Get user statistics
GET /api/v1/users/:address/stats

# Verify SAFU domain
POST /api/v1/users/verify-domain
{
  "walletAddress": "0x...",
  "safuDomain": "username.safu"
}
```

### Posts

```bash
# Get project posts
GET /api/v1/posts/:projectId?limit=50&sortBy=impressions

# Sync posts
POST /api/v1/posts/sync
{
  "projectId": "..."
}

# Get top posts
GET /api/v1/posts/:projectId/top?limit=10&timeframe=7d
```

## Database Schema

### Key Models

- **Project**: Launched projects on InfoFi launchpad
- **User**: Wallets linked to X accounts with .safu domains
- **Leaderboard**: One per project
- **LeaderboardEntry**: Individual rankings
- **Post**: X/Twitter posts from users
- **ProjectKeyword**: Keywords for relevance matching

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# View database in Prisma Studio
npm run db:studio
```

## Testing

### Smart Contracts

```bash
cd packages/contracts
npm test

# With gas reporting
REPORT_GAS=true npm test

# Coverage
npm run coverage
```

### Backend

```bash
cd packages/backend
npm test

# Watch mode
npm run test:watch
```

## Code Quality

### Linting

```bash
# Backend
cd packages/backend
npm run lint
npm run lint:fix

# Frontend
cd packages/frontend
npm run lint
```

### Type Checking

```bash
# Backend
cd packages/backend
npm run type-check

# Frontend
cd packages/frontend
npm run type-check
```

## Architecture Overview

### Smart Contracts

1. **InfoFiRegistry**: Manages project registration and fees
2. **WalletLinker**: Links wallets to X accounts with SAFU verification
3. **FeeCollector**: Automated fee collection via Chainlink Automation

### Backend Services

1. **ProjectService**: Project management and blockchain sync
2. **UserService**: User management and wallet linking
3. **LeaderboardService**: Ranking calculation and updates
4. **PostService**: X post synchronization and management
5. **TwitterService**: X API integration
6. **RelevanceService**: Post relevance scoring

### Leaderboard Algorithm

Rankings are calculated based on:

```
Final Score = (Relevance Score × 0.6) + (Normalized Impressions × 0.4)
```

Where:
- **Relevance Score** (0-1): Keyword matching with project
- **Normalized Impressions** (0-1): log₁₀(avg impressions + 1) / 10

### Job Scheduler

Background jobs run on intervals:
- Post sync: Every 15 minutes
- Leaderboard update: Every 10 minutes
- Project sync: Every hour
- Fee check: Sundays at 1am UTC

## Common Tasks

### Add a New Project Manually

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/projects/sync
```

### Trigger Leaderboard Update

```bash
curl -X POST http://localhost:3001/api/v1/leaderboards/PROJECT_ID/update
```

### View Logs

```bash
# Backend logs
cd packages/backend
tail -f logs/combined.log

# Error logs
tail -f logs/error.log
```

### Reset Database

```bash
cd packages/backend
npx prisma migrate reset
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -d safu_infofi -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Should return PONG
```

### X/Twitter API Rate Limits

The X API has rate limits. If you hit them:
- Wait for the rate limit window to reset
- Reduce `POST_SYNC_INTERVAL_MINUTES` in backend .env
- Implement caching for user data

### Blockchain RPC Issues

If you experience RPC errors:
- Check your RPC provider (Alchemy/Infura) dashboard
- Ensure you haven't exceeded rate limits
- Try a different RPC endpoint

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure linting passes
5. Submit a pull request

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [X/Twitter API Documentation](https://developer.twitter.com/en/docs)

## Getting Help

- GitHub Issues: https://github.com/Domistro16/SafuInfoFi/issues
- Documentation: [Coming soon]
