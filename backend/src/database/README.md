下面是根据你 `routes.ts` 文件所有路由整理的 curl 用例，涵盖所有资源（users、api-keys、permissions、applications、analytics），路径均为 `/v1/api/d1/` 前缀，需带 `Authorization: Bearer test-key` 头：

---

1. 查询所有用户（分页）  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/users?page=1&limit=20" \
  -H "Authorization: Bearer test-key" | jq
```

2. 查询单个用户  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/users/user_xxx" \
  -H "Authorization: Bearer test-key"
```

3. 创建新用户  

```sh
curl -X POST "http://localhost:8787/v1/api/d1/users" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","name":"Test User"}'
```

4. 更新用户  

```sh
curl -X PUT "http://localhost:8787/v1/api/d1/users/user_xxx" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"new name"}'
```

5. 删除用户（软删除）  

```sh
curl -X DELETE "http://localhost:8787/v1/api/d1/users/user_xxx" \
  -H "Authorization: Bearer test-key"
```

6. 查询所有 API Key（分页）  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/api-keys?page=1&limit=20" \
  -H "Authorization: Bearer test-key" | jq
```

7. 查询单个 API Key  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/api-keys/key_xxx" \
  -H "Authorization: Bearer test-key" | jq
```

8. 创建 API Key  

```sh
curl -X POST "http://localhost:8787/v1/api/d1/api-keys" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_xxx","name":"test key","permissions":["read"],"tier":"free"}'
```

9. 更新 API Key  

```sh
curl -X PUT "http://localhost:8787/v1/api/d1/api-keys/key_xxx" \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"new key name"}'
```

10. 删除（撤销）API Key  

```sh
curl -X DELETE "http://localhost:8787/v1/api/d1/api-keys/key_xxx" \
  -H "Authorization: Bearer test-key"
```

11. 查询所有权限  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/permissions" \
  -H "Authorization: Bearer test-key"
```

12. 查询所有应用  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/applications" \
  -H "Authorization: Bearer test-key"
```

13. 查询统计信息  

```sh
curl -X GET "http://localhost:8787/v1/api/d1/analytics" \
  -H "Authorization: Bearer test-key" | jq
```

---

如需其它资源（如自定义路由），可参考上述格式。记得替换 `test-key`、`user_xxx`、`key_xxx` 为实际值。
