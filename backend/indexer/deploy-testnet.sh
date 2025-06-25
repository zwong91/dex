#!/bin/bash

# BSC Testnet Subgraph 部署脚本
# 使用方法: ./deploy-testnet.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 BSC Testnet Subgraph..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
echo -e "${BLUE}📦 检查依赖...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装，请先安装 Node.js${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 1. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 安装依赖...${NC}"
    npm install
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi

# 2. 启动本地 Graph 节点
echo -e "${BLUE}🐳 启动本地 Graph 节点...${NC}"
npm run start:node

# 等待服务启动
echo -e "${YELLOW}⏰ 等待服务启动（30秒）...${NC}"
sleep 30

# 检查服务状态
echo -e "${BLUE}🔍 检查服务状态...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Docker 服务启动失败${NC}"
    docker-compose ps
    exit 1
fi

# 3. 修复 schema.graphql 中的 @entity 指令问题
echo -e "${BLUE}🔧 修复 GraphQL Schema...${NC}"
if grep -q "@entity {" schema.graphql; then
    echo -e "${YELLOW}  修复 @entity 指令，添加 immutable 参数...${NC}"
    sed -i '' 's/@entity {/@entity(immutable: false) {/g' schema.graphql
    sed -i '' 's/@entity(immutable: false) {\([^}]*timestamp[^}]*\)}/@entity(immutable: true) {\1}/g' schema.graphql
    sed -i '' 's/type Trace @entity(immutable: false)/type Trace @entity(immutable: true)/g' schema.graphql
    echo -e "${GREEN}  ✅ Schema 修复完成${NC}"
else
    echo -e "${GREEN}  ✅ Schema 已经是正确格式${NC}"
fi

# 4. 准备配置文件
echo -e "${BLUE}⚙️ 生成配置文件...${NC}"
npm run prepare:bsc-testnet

# 5. 生成类型定义
echo -e "${BLUE}🔧 生成 TypeScript 类型定义...${NC}"
npm run codegen:bsc-testnet

# 6. 构建子图
echo -e "${BLUE}🔨 构建 subgraph...${NC}"
npm run build:bsc-testnet

# 7. 创建子图（如果不存在）
echo -e "${BLUE}📝 创建子图...${NC}"
SUBGRAPH_NAME="entysquare/indexer-bnb-testnet"
if ! npx graph create --node http://localhost:8020/ $SUBGRAPH_NAME 2>/dev/null; then
    echo -e "${YELLOW}  子图可能已存在，继续部署...${NC}"
fi

# 8. 部署到本地节点
echo -e "${BLUE}🚀 部署到本地节点...${NC}"
# 使用原始 yaml 文件而不是 build 目录中的文件，避免编译错误
echo "v0.0.1" | npx graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001/ $SUBGRAPH_NAME subgraph.bsc-testnet.yaml

# 9. 显示结果
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}📍 GraphQL 端点: http://localhost:8000/subgraphs/name/$SUBGRAPH_NAME${NC}"
echo -e "${GREEN}🌐 Graph Explorer: http://localhost:8000/subgraphs/name/$SUBGRAPH_NAME/graphql${NC}"

echo ""
echo -e "${BLUE}📊 可用的管理命令:${NC}"
echo -e "  ${YELLOW}查看日志:${NC}"
echo -e "    npm run logs:graph    # Graph Node 日志"
echo -e "    npm run logs:ipfs     # IPFS 日志"
echo -e "    npm run logs:postgres # PostgreSQL 日志"
echo ""
echo -e "  ${YELLOW}服务管理:${NC}"
echo -e "    npm run stop:node     # 停止所有服务"
echo -e "    npm run restart:node  # 重启所有服务"
echo -e "    npm run clean         # 完全清理"
echo ""
echo -e "  ${YELLOW}检查状态:${NC}"
echo -e "    docker-compose ps     # 查看容器状态"
echo -e "    docker logs indexer --tail 20  # 查看最新日志"

echo ""
echo -e "${GREEN}✨ 现在可以开始查询你的 subgraph 了！${NC}"
