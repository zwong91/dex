# DEX Backend Test Suite

这个目录包含了 DEX Backend Serverless 项目的完整测试套件。

## 📁 测试文件结构

```
test/
├── index.spec.ts          # 主入口点测试
├── ai.spec.ts             # AI 服务测试
├── database.spec.ts       # 数据库服务测试
├── storage.spec.ts        # 存储服务测试
├── dex.spec.ts           # DEX API 测试
├── integration.spec.ts    # 集成测试
├── performance.spec.ts    # 性能测试
├── security.spec.ts       # 安全测试
├── vitest.config.ts       # 测试配置
├── run-tests.sh          # 测试运行脚本
└── README.md             # 本文件
```

## 🧪 测试类型

### 1. 单元测试
- **index.spec.ts**: 测试主路由和健康检查
- **ai.spec.ts**: 测试 AI 服务的各种场景
- **database.spec.ts**: 测试数据库操作和验证
- **storage.spec.ts**: 测试文件存储功能
- **dex.spec.ts**: 测试 DEX API 的所有端点

### 2. 集成测试
- **integration.spec.ts**: 测试服务间的交互和工作流程
- 跨服务数据流测试
- API 一致性测试
- CORS 和错误处理测试

### 3. 性能测试
- **performance.spec.ts**: 响应时间基准测试
- 负载测试
- 并发请求处理
- 资源使用测试

### 4. 安全测试
- **security.spec.ts**: 输入验证边界情况
- SQL 注入防护测试
- XSS 攻击防护测试
- 路径遍历攻击防护测试
- 授权和认证测试

## 🚀 运行测试

### 快速开始
```bash
# 运行所有测试
./run-tests.sh

# 或者使用 npm
npm test
```

### 运行特定测试
```bash
# 运行单个测试文件
npx vitest run test/dex.spec.ts

# 运行特定测试模式
npx vitest run test/performance.spec.ts --config test/vitest.config.ts

# 运行集成测试
npx vitest run test/integration.spec.ts

# 运行安全测试
npx vitest run test/security.spec.ts
```

### 开发模式
```bash
# 监视模式运行测试
npx vitest watch

# 运行特定文件的监视模式
npx vitest watch test/dex.spec.ts
```

## 📊 覆盖率报告

测试套件包含代码覆盖率分析：

```bash
# 生成覆盖率报告
npx vitest run --coverage

# 查看 HTML 覆盖率报告
open coverage/index.html
```

## 🔧 测试配置

测试使用 Cloudflare Workers 测试池：
- **环境**: Cloudflare Workers Runtime
- **测试框架**: Vitest
- **超时**: 30秒（集成测试）
- **并发**: 支持并发测试

## 📋 测试覆盖范围

### AI 服务测试
- ✅ 参数验证
- ✅ 请求方法验证
- ✅ 错误处理
- ✅ AI 服务可用性检查

### 数据库服务测试
- ✅ 认证和授权
- ✅ Sandbox CRUD 操作
- ✅ 用户管理
- ✅ 数据验证
- ✅ 共享功能
- ✅ 生成限制

### 存储服务测试
- ✅ 文件操作（创建、读取、删除）
- ✅ 项目初始化
- ✅ 大小计算
- ✅ 文件重命名
- ✅ 权限验证

### DEX API 测试
- ✅ 代币管理
- ✅ 交易对信息
- ✅ 价格查询
- ✅ 水龙头功能
- ✅ 交换交易
- ✅ 流动性操作
- ✅ 历史查询
- ✅ 统计信息
- ✅ CORS 支持

### 集成测试
- ✅ 服务间通信
- ✅ 完整工作流程
- ✅ 错误传播
- ✅ API 一致性

### 性能测试
- ✅ 响应时间基准
- ✅ 并发处理能力
- ✅ 负载测试
- ✅ 内存使用

### 安全测试
- ✅ 输入验证
- ✅ SQL 注入防护
- ✅ XSS 防护
- ✅ 路径遍历防护
- ✅ 认证绕过尝试

## 🎯 测试最佳实践

1. **模拟环境**: 测试考虑了开发环境中可能缺少的绑定
2. **错误处理**: 每个测试都验证正确的错误响应
3. **边界情况**: 包含极端输入和异常情况的测试
4. **安全第一**: 专门的安全测试确保应用程序安全
5. **性能监控**: 性能测试确保响应时间在可接受范围内

## 🐛 调试测试

如果测试失败：

1. **检查依赖**: 确保所有依赖都已安装
2. **查看日志**: 测试输出包含详细的错误信息
3. **环境检查**: 某些测试在没有相应绑定时会显示警告
4. **单独运行**: 单独运行失败的测试文件进行调试

```bash
# 调试特定测试
npx vitest run test/dex.spec.ts --reporter=verbose

# 查看详细输出
npx vitest run test/dex.spec.ts --reporter=verbose --no-coverage
```

## 📈 持续集成

这些测试设计为在 CI/CD 管道中运行：

```yaml
# GitHub Actions 示例
- name: Run Tests
  run: |
    cd backend
    npm install
    npm test
```

## 🔄 更新测试

当添加新功能时：

1. 在相应的测试文件中添加测试用例
2. 更新集成测试以包含新的工作流程
3. 如果是面向用户的功能，添加性能测试
4. 考虑添加相关的安全测试

## ⚡ 性能基准

当前性能目标：
- 健康检查: < 1秒
- 简单查询: < 2秒
- 复杂操作: < 3秒
- 并发处理: 支持 20+ 并发请求

这些基准在性能测试中进行验证和监控。
