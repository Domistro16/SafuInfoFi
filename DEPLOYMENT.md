# SafuInfoFi Dashboard - Deployment Guide

This guide covers deploying the SafuInfoFi Dashboard to production.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Ethereum node access (Alchemy, Infura, etc.)
- X/Twitter API credentials
- Domain for frontend
- Server for backend (VPS, cloud instance, etc.)

## 1. Smart Contract Deployment

### Testnet Deployment (Sepolia)

```bash
cd packages/contracts

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Deploy to Sepolia
npm run deploy:testnet
```

### Mainnet Deployment

```bash
# Deploy to mainnet (ensure you have sufficient ETH for gas)
npm run deploy:mainnet

# Verify contracts on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Post-Deployment

1. Save contract addresses to a secure location
2. Set up Chainlink Automation for FeeCollector
   - Go to automation.chain.link
   - Register new upkeep with FeeCollector address
   - Fund the upkeep with LINK tokens

## 2. Database Setup

### PostgreSQL

```bash
# Create database
createdb safu_infofi

# Set DATABASE_URL in backend .env
DATABASE_URL=postgresql://user:password@localhost:5432/safu_infofi
```

### Redis

```bash
# Install Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Run Migrations

```bash
cd packages/backend
npm run migrate:prod
```

## 3. Backend Deployment

### Environment Configuration

```bash
cd packages/backend
cp .env.example .env
# Edit .env with production values
```

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `RPC_URL` - Ethereum RPC endpoint
- `REGISTRY_CONTRACT_ADDRESS` - Deployed InfoFiRegistry address
- `WALLET_LINKER_CONTRACT_ADDRESS` - Deployed WalletLinker address
- `VERIFIER_PRIVATE_KEY` - Private key for signing verifications
- `TWITTER_*` - X/Twitter API credentials
- `JWT_SECRET` - Secure random string

### Build and Start

```bash
# Build
npm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/index.js --name safu-api

# Or with systemd
sudo nano /etc/systemd/system/safu-api.service
```

Example systemd service:

```ini
[Unit]
Description=SafuInfoFi API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/SafuInfoFi/packages/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Frontend Deployment

### Vercel (Recommended)

```bash
cd packages/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_WALLET_LINKER_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Alternative: Self-Hosted

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "safu-frontend" -- start

# Or use Nginx to serve static files
npm run build
# Copy .next/static to your web server
```

## 5. Post-Deployment Tasks

### 1. Initialize Smart Contracts

```bash
# Sync projects from blockchain
curl -X POST https://api.yourdomain.com/api/v1/projects/sync
```

### 2. Set Up Monitoring

```bash
# Backend health check
curl https://api.yourdomain.com/health

# Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
```

### 3. Configure CORS

Update backend `.env`:
```
CORS_ORIGIN=https://yourdomain.com
```

### 4. Set Up SSL

```bash
# Using Certbot for Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### 5. Database Backups

```bash
# Automated PostgreSQL backups
crontab -e

# Daily backup at 2 AM
0 2 * * * pg_dump safu_infofi | gzip > /backups/safu_$(date +\%Y\%m\%d).sql.gz
```

## 6. Monitoring & Logs

### Application Logs

```bash
# PM2 logs
pm2 logs safu-api

# System logs
journalctl -u safu-api -f
```

### Database Monitoring

```bash
# Check PostgreSQL connections
SELECT count(*) FROM pg_stat_activity;

# Slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Redis Monitoring

```bash
redis-cli info stats
redis-cli monitor
```

## 7. Scaling Considerations

### Backend Scaling

1. **Horizontal Scaling**: Run multiple backend instances behind a load balancer
2. **Database**: Use connection pooling, read replicas
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Job Queue**: Use Bull with Redis for background jobs

### Frontend Scaling

- Vercel automatically handles scaling
- For self-hosted: Use CDN for static assets

## 8. Security Checklist

- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] Database passwords rotated
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Private keys stored securely (AWS Secrets Manager, HashiCorp Vault)
- [ ] Regular security updates
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented

## 9. Maintenance

### Regular Tasks

- Monitor contract fees and gas prices
- Update dependencies monthly
- Review and optimize database queries
- Monitor X/Twitter API rate limits
- Check Chainlink Automation upkeep funding

### Upgrades

```bash
# Backend updates
cd packages/backend
git pull
npm install
npm run build
pm2 restart safu-api

# Frontend updates
cd packages/frontend
git pull
npm install
vercel --prod
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/Domistro16/SafuInfoFi/issues
- Documentation: [Coming soon]
