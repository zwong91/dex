路由是以 `/v1/api/admin/{resource}/{id?}` 形式，需带上 `Authorization: Bearer test-key` 头。下面是常用 curl 示例：

1. 查询所有用户（分页）：
```sh
curl -X GET "https://http://localhost:8787/v1/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer test-key"
```

2. 查询单个用户：
```sh
curl -X GET "https://http://localhost:8787/v1/api/admin/users/user_xxx" \
  -H "Authorization: Bearer test-key"
```

3. 创建新用户：
```sh
curl -X POST "https://http://localhost:8787/v1/api/admin/users" \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","name":"Test User"}'
```

4. 更新用户：
```sh
curl -X PUT "https://http://localhost:8787/v1/api/admin/users/user_xxx" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"新名字"}'
```

5. 删除用户（软删除）：
```sh
curl -X DELETE "https://http://localhost:8787/v1/api/admin/users/user_xxx" \
  -H "Authorization: Bearer test-key"
```

6. 查询所有 API Key（分页）：
```sh
curl -X GET "https://http://localhost:8787/v1/api/admin/api-keys?page=1&limit=20" \
  -H "Authorization: Bearer test-key"
```

7. 创建 API Key：
```sh
curl -X POST "https://http://localhost:8787/v1/api/admin/api-keys" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_xxx","name":"test key","permissions":["read"],"tier":"free"}'
```

如需其它资源（如 permissions、applications、analytics）也可类似调用。  
记得替换 `test-key` 和 `user_xxx`。