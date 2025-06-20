# DEX Backend V2 API Documentation

## 认证

所有API端点都需要Bearer token认证：
```
Authorization: Bearer your-secret-key
```

## 基础端点

### 健康检查
```
GET /health
```

### API信息
```
GET /
```

## 用户管理 API

### 列出用户
```
GET /api/v2/admin/users
```

**查询参数：**
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为20，最大100
- `search` (可选): 搜索用户名、邮箱或姓名
- `status` (可选): 按状态过滤 (active, suspended, pending)

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "username": "testuser",
      "name": "Test User",
      "status": "active",
      "createdAt": "2025-06-20T08:18:55.791Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 获取用户详情
```
GET /api/v2/admin/users/{userId}
```

### 创建用户
```
POST /api/v2/admin/users
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "name": "New User",
  "company": "Optional Company",
  "website": "https://example.com",
  "bio": "Optional bio"
}
```

### 更新用户
```
PUT /api/v2/admin/users/{userId}
Content-Type: application/json

{
  "name": "Updated Name",
  "company": "Updated Company",
  "status": "active"
}
```

### 删除用户（软删除）
```
DELETE /api/v2/admin/users/{userId}
```
*注意：这会将用户状态设为"suspended"并撤销所有API密钥*

## API密钥管理

### 列出API密钥
```
GET /api/v2/admin/api-keys
```

**查询参数：**
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `search` (可选): 搜索密钥名称或前缀
- `status` (可选): 按状态过滤 (active, suspended, revoked)
- `tier` (可选): 按层级过滤 (free, basic, pro, enterprise)

### 获取API密钥详情
```
GET /api/v2/admin/api-keys/{keyId}
```

### 创建API密钥
```
POST /api/v2/admin/api-keys
Content-Type: application/json

{
  "userId": "user_123",
  "name": "My API Key",
  "description": "Description for the key",
  "tier": "basic",
  "permissions": ["pools_read", "swaps_read"],
  "rateLimitPerHour": 1000,
  "rateLimitPerDay": 10000
}
```

**注意：** 完整的API密钥只在创建时返回，请妥善保存。

### 更新API密钥
```
PUT /api/v2/admin/api-keys/{keyId}
Content-Type: application/json

{
  "name": "Updated Key Name",
  "description": "Updated description",
  "status": "active",
  "rateLimitPerHour": 2000
}
```

### 撤销API密钥
```
DELETE /api/v2/admin/api-keys/{keyId}
```

## 权限管理

### 列出权限
```
GET /api/v2/admin/permissions
```

## 分析数据

### 获取分析统计
```
GET /api/v2/admin/analytics
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 3,
      "active": 2,
      "recent_registrations": 1
    },
    "api_keys": {
      "total": 5,
      "active": 4,
      "revoked": 1,
      "recent_created": 2,
      "by_tier": {
        "free": 1,
        "basic": 2,
        "pro": 1,
        "enterprise": 1
      }
    },
    "usage_statistics": {
      "requests_today": 0,
      "requests_this_month": 0
    }
  }
}
```

## 应用申请

### 列出应用申请
```
GET /api/v2/admin/applications
```

## 错误响应

所有错误响应都遵循以下格式：

```json
{
  "error": "Error message"
}
```

常见HTTP状态码：
- `400` - 请求数据无效
- `401` - 未授权访问
- `404` - 资源不存在
- `409` - 资源冲突（如邮箱已存在）
- `500` - 服务器内部错误
- `501` - 功能未实现
- `503` - 服务不可用

## 权限层级

- **free**: 基础访问权限
- **basic**: 标准用户权限
- **pro**: 高级用户权限
- **enterprise**: 企业级权限，包括管理功能

## 可用权限

- `pools_read` - 读取池信息
- `pools_create` - 创建池
- `swaps_read` - 读取交换数据
- `swaps_write` - 执行交换
- `liquidity_read` - 读取流动性数据
- `liquidity_write` - 管理流动性
- `portfolio_read` - 读取投资组合
- `portfolio_write` - 管理投资组合
- `analytics_basic` - 基础分析数据
- `analytics_advanced` - 高级分析数据
- `price_history` - 价格历史数据
- `admin_users` - 用户管理权限
- `admin_api` - API管理权限
- `admin_system` - 系统管理权限
