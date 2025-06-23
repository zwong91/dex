# 🚀 Quick Setup Guide for DEX API V1

## Prerequisites
- Node.js 20+ 
- Cloudflare account with Workers and D1 access
- Wrangler CLI installed and authenticated

## Setup Steps

### 1. Environment Configuration
```bash
# Copy the example configuration
cp wrangler.example.toml wrangler.toml

# Edit wrangler.toml and replace:
# - YOUR_ACCOUNT_ID_HERE with your Cloudflare account ID
# - YOUR_NEW_DEX_DATABASE_ID_HERE with your D1 database ID
# - YOUR_SECRET_KEY_HERE with a secure random key
```

### 2. Database Setup
```bash
# Create new D1 database
wrangler d1 create d1-dex-database

# Apply migrations
npm run migrate:local

# Initialize with sample data
npm run db:init
```

### 3. Verify Setup
```bash
# Test database connection
npm run db:query -- --command="SELECT COUNT(*) as total FROM permissions"

# Expected result: 14 permissions
```

### 4. Start Development Server
```bash
# Start local development server
npm run dev

# Test endpoints:
# - http://localhost:8787/health
# - http://localhost:8787/test/health
# - http://localhost:8787/test/permissions
```

## API Access

### Admin Access
- **Email**: admin@entysquare.com
- **API Key**: Enterprise tier with full permissions
- **Usage**: For system administration and testing

### Test User Access  
- **Email**: test@example.com
- **API Key**: Basic tier with limited permissions
- **Usage**: For testing authenticated endpoints

### Authentication Header
```bash
curl -H "X-API-Key: your-api-key-here" http://localhost:8787/api/dex/pools
```

## Key Features Enabled

✅ **Database-Driven Architecture**: 15 tables with full relational structure  
✅ **Authentication System**: API keys with permission-based access  
✅ **Rate Limiting**: Per-hour and per-day limits with usage tracking  
✅ **Subscription Tiers**: Free, Basic, Pro, Enterprise levels  
✅ **Event Sync**: Scheduled jobs for blockchain data synchronization  
✅ **Analytics**: Comprehensive usage tracking and reporting  

## Troubleshooting

### Database Issues
```bash
# Check database status
wrangler d1 execute d1-dex-database --local --command="SELECT 'Database working' as status"

# Reset database if needed  
npm run db:reset
npm run migrate:local
npm run db:init
```

### Development Server Issues
```bash
# Check TypeScript compilation
npm run test:unit

# Verify all tests pass (should be 115/115)
```

## Next Steps

1. **API Testing**: Use test endpoints to verify database connectivity
2. **Authentication Testing**: Test API key validation with different permission levels  
3. **Integration**: Connect frontend applications using the new authenticated endpoints
4. **Production Deployment**: Deploy to Cloudflare Workers with production database
