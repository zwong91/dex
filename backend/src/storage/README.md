`/storage` 路由的常用 curl 调用示例（假设本地服务端口为 8787，API 路径为 `/v1/api/r2`，如有 x-api-key 鉴权请加上 `-H "x-api-key: test-key"`）：

---

> **注意**：如接口返回 `Authentication required`，请加上鉴权头部，例如 `-H "x-api-key: test-key"`。

### 1. 创建项目

```bash
curl -X POST "http://localhost:8787/v1/api/r2/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "name": "MyProject",
    "description": "A demo project",
    "template": "dex"
  }'
```

> 返回示例（成功）：
>
> ```json
> {
>   "success": true,
>   "data": {
>     "projectId": "proj_1750996846320_labz54527",
>     "name": "MyProject",
>     "template": "dex",
>     "path": "projects/proj_1750996846320_labz54527",
>     "files": [
>       "README.md",
>       "package.json",
>       "contracts/DEX.sol",
>       "src/index.ts"
>     ]
>   },
>   "timestamp": "2025-06-27T04:00:46.336Z"
> }
> ```

---

### 2. 获取项目列表

```bash
curl -X GET "http://localhost:8787/v1/api/r2/project" \
  -H "x-api-key: test-key" |jq
```

---

> **为什么获取项目列表为空？**
>
> 1. 你当前用户（API Key 对应的 user）还没有创建任何项目。请先用“创建项目”接口创建项目。
> 2. 项目文件是按用户隔离的，每个用户只能看到自己创建的项目。
> 3. 如果你用的是 `test-key`，请确保用它创建过项目，否则项目列表会为空。
> 4. 创建和查询项目时必须使用同一个 API Key，否则查不到项目。
>
> 可以先运行“创建项目”示例，再用“获取项目列表”接口查看结果。

### 3. 读取文件内容

```bash
curl -X GET "http://localhost:8787/v1/api/r2/file/projects/proj_xxx/README.md" \
  -H "x-api-key: test-key" | jq
```

> README.md 替换为实际文件路径

---

### 4. 写入（或覆盖）文件

```bash
curl -X PUT "http://localhost:8787/v1/api/r2/file/projects/proj_xxx/README.md" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"content": "New content for README"}'
```

---

### 5. 重命名文件

```bash
curl -X POST "http://localhost:8787/v1/api/r2/rename" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "oldPath": "projects/proj_xxx/README.md",
    "newPath": "projects/proj_xxx/README-NEW.md"
  }'
```

---

### 6. 获取存储空间用量

```bash
curl -X GET "http://localhost:8787/v1/api/r2/size" \
  -H "x-api-key: test-key"
```

> 返回示例：
>
> ```json
> {
>   "success": true,
>   "data": {
>     "totalSize": 12345,
>     "fileCount": 7,
>     "formattedSize": "12.06 KB"
>   },
>   "timestamp": "2025-06-27T04:00:46.336Z"
> }
> ```

---

如有鉴权需求，加上 `-H "x-api-key: test-key"`。  
如有路径参数，注意 URL encode。

> **说明**：  
> 通过 `/size` 接口可以查询当前用户（API Key 对应用户）在 R2 存储中的所有文件总大小和文件数量。
