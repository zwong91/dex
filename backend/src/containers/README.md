# 简单示例

curl -X POST \
  http://localhost:8787/v1/api/container/sandbox/dev-1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "command": "ls -la",
    "cwd": "/app"
  }'

# 多个命令示例  

curl -X POST \
  http://localhost:8787/v1/api/container/sandbox/dev-2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "command": "pwd && ls -la && echo hello",
    "cwd": "/app"
  }'

# 检查Python版本

curl -X POST \
  http://localhost:8787/v1/api/container/sandbox/py-env \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "command": "python3 --version",
    "cwd": "/app"
  }'