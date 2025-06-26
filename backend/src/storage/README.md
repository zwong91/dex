`/storage` 路由的常用 curl 调用示例（假设本地服务端口为 8787，API 路径为 `/v1/api/storage`，如有 x-api-key 鉴权请加上 `-H "x-api-key: test-key"`）：

---

### 1. 创建项目

```bash
curl -X POST "http://localhost:8787/v1/api/storage/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyProject",
    "description": "A demo project",
    "template": "dex"
  }'
```

---

### 2. 获取项目列表

```bash
curl -X GET "http://localhost:8787/v1/api/storage/project"
```

---

### 3. 读取文件内容

```bash
curl -X GET "http://localhost:8787/v1/api/storage/file/projects/proj_xxx/README.md"
```
> README.md 替换为实际文件路径

---

### 4. 写入（或覆盖）文件

```bash
curl -X PUT "http://localhost:8787/v1/api/storage/file/projects/proj_xxx/README.md" \
  -H "Content-Type: application/json" \
  -d '{"content": "New content for README"}'
```

---

### 5. 重命名文件

```bash
curl -X POST "http://localhost:8787/v1/api/storage/rename" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPath": "projects/proj_xxx/README.md",
    "newPath": "projects/proj_xxx/README-NEW.md"
  }'
```

---

### 6. 获取存储空间用量

```bash
curl -X GET "http://localhost:8787/v1/api/storage/size"
```

---

如有鉴权需求，加上 `-H "x-api-key: test-key"`。  
如有路径参数，注意 URL encode。  
