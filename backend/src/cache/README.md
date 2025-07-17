# Cloudflare KV Caching Implementation

This implementation adds comprehensive caching capabilities to your DEX backend API using Cloudflare Workers KV, optimizing performance with high read volumes and low latency.

## 🚀 Features

- **Intelligent Cache Strategies**: Different TTL settings for different types of data
- **User-Specific Caching**: Separate cache keys for user-specific data
- **Cache Management API**: Endpoints for cache invalidation and monitoring
- **Automatic Cache Warming**: Preloads critical endpoints via cron jobs
- **Performance Headers**: Proper cache-control headers for client-side caching
- **Error Handling**: Graceful fallback when KV is unavailable

## 📊 Cache Strategies

| Data Type | TTL | Description |
|-----------|-----|-------------|
| **STATIC** | 24 hours | Tokens, vault strategies - rarely changes |
| **POOLS** | 5 minutes | Pool data - changes moderately |
| **PRICE** | 1 minute | Price data - changes frequently |
| **USER** | 30 seconds | User-specific data - personalized |
| **ANALYTICS** | 1 hour | Analytics data - updated hourly |
| **HEALTH** | 10 seconds | Health checks - real-time monitoring |
| **METADATA** | 10 minutes | Subgraph metadata - stable |

## 🔧 Configuration

### Environment Variables

Add to your `wrangler.toml`:

```toml
[env.production]
name = "dex-backend-prod"

[[env.production.kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

[env.staging]
name = "dex-backend-staging"

[[env.staging.kv_namespaces]]
binding = "KV" 
id = "your-staging-kv-namespace-id"
```

### Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "DEX_CACHE"

# Create preview namespace for development
wrangler kv:namespace create "DEX_CACHE" --preview
```

## 📡 API Endpoints

### Cache Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/api/cache/status` | GET | Cache status and configuration |
| `/v1/api/cache/invalidate/pool` | POST | Invalidate pool caches |
| `/v1/api/cache/invalidate/user` | POST | Invalidate user caches |
| `/v1/api/cache/invalidate/key` | POST | Invalidate specific cache key |
| `/v1/api/cache/clear-all` | POST | Clear all caches (caution!) |
| `/v1/api/cache/info/:key` | GET | Get cache info for specific key |

### Cache Headers

All cached responses include these headers:

- `X-Cache`: HIT or MISS
- `X-Cache-Key`: The cache key used
- `X-Cache-TTL`: TTL in seconds
- `Cache-Control`: Client-side caching directive

## 🔄 Cache Invalidation

### Automatic Invalidation

Cache invalidation happens automatically in these scenarios:

1. **Pool Changes**: When liquidity is added/removed
2. **Swaps**: When trades occur
3. **Rewards**: When rewards are distributed
4. **User Actions**: When users perform transactions

### Manual Invalidation

```bash
# Invalidate specific pool
curl -X POST https://your-worker.workers.dev/v1/api/cache/invalidate/pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"chain": "bsc", "poolId": "0x123..."}'

# Invalidate user cache
curl -X POST https://your-worker.workers.dev/v1/api/cache/invalidate/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"userAddress": "0x456..."}'
```

## ⚡ Cache Warming

Critical endpoints are automatically warmed every 5 minutes via cron jobs:

- `/v1/api/dex/health`
- `/v1/api/dex/subgraph/meta`
- `/v1/api/dex/pools/bsc`
- `/v1/api/dex/tokens/bsc`
- `/v1/api/dex/analytics/bsc`

### Cron Schedule

```
*/5 * * * * - Cache warming (every 5 minutes)
0 * * * *   - Metrics collection (hourly)
0 2 * * 0   - Log cleanup (weekly)
```

## 🔍 Monitoring

### Cache Performance

Monitor cache performance through:

1. **Response Headers**: Check `X-Cache` header for hit/miss ratio
2. **Cache Status Endpoint**: Get detailed cache statistics
3. **Cloudflare Analytics**: Monitor KV operations and latency

### Key Metrics

- **Hit Ratio**: Percentage of requests served from cache
- **Response Time**: Average response time for cached vs non-cached requests
- **KV Operations**: Number of read/write operations
- **Error Rate**: Failed cache operations

## 🛠️ Usage Examples

### Frontend Integration

```typescript
// Check if response is cached
const response = await fetch('/v1/api/dex/pools/bsc')
const isCached = response.headers.get('X-Cache') === 'HIT'
const cacheKey = response.headers.get('X-Cache-Key')

console.log(\`Response cached: \${isCached}, key: \${cacheKey}\`)
```

### Cache-Aware Client

```typescript
// Implement client-side cache-aware requests
class DexApiClient {
  async getPools(chain: string, useCache = true) {
    const headers = useCache 
      ? { 'Cache-Control': 'max-age=300' }
      : { 'Cache-Control': 'no-cache' }
    
    return fetch(\`/v1/api/dex/pools/\${chain}\`, { headers })
  }
}
```

## 🔧 Advanced Configuration

### Custom Cache Keys

```typescript
// Generate custom cache keys
import { generateCacheKey } from './middleware/cache'

const customKey = generateCacheKey(c, 'custom-prefix', true)
```

### Cache Bypass

```typescript
// Bypass cache for specific requests
app.get('/pools/:chain', 
  (c, next) => {
    if (c.req.header('X-Force-Refresh') === 'true') {
      return next() // Skip cache middleware
    }
    return createKVCacheMiddleware('POOLS')(c, next)
  },
  createPoolsHandler('list')
)
```

## ⚠️ Best Practices

1. **Cache Keys**: Use consistent, lowercase cache keys
2. **TTL Selection**: Choose appropriate TTL based on data volatility
3. **Error Handling**: Always handle KV unavailability gracefully
4. **Invalidation**: Implement proper cache invalidation strategies
5. **Monitoring**: Monitor cache performance and adjust strategies

## 🚧 Limitations

- **KV Limitations**: 25 MiB value size limit, eventual consistency
- **Key Listing**: KV doesn't support pattern-based key listing
- **Global Latency**: Initial cache population may have higher latency
- **Cost**: KV operations are billable (but cost-effective for read-heavy workloads)

## 🔄 Migration Guide

If you're adding caching to an existing API:

1. Deploy with caching disabled first
2. Enable caching gradually per endpoint
3. Monitor performance and error rates
4. Adjust TTL values based on usage patterns
5. Implement proper invalidation strategies

## 📈 Performance Impact

Expected performance improvements:

- **Response Time**: 50-90% reduction for cached responses
- **Origin Load**: 70-95% reduction in backend queries
- **Global Latency**: Sub-100ms responses from edge locations
- **Scalability**: Handle 10x more traffic with same backend resources
