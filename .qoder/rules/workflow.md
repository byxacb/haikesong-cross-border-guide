---
trigger: manual
description: 开发工作流规范
---

# 开发工作流规范

本规范定义了项目的开发流程、协作方式和质量保障机制。需要时手动引用。

## SDD 四阶段流程

项目遵循 Spec-Driven Development（规格驱动开发）四阶段流程：

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  需求规格    │ → │  任务拆解    │ → │  质量验证    │ → │  逐步实现    │
│  (SPEC)     │    │  (TASKS)    │    │  (VERIFY)   │    │  (IMPL)     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 阶段一：需求规格（SPEC）

每个功能模块**必须先写 SPEC 再编码**。SPEC 文档包含：

- **功能概述**：用一句话描述这个功能要解决什么问题
- **用户故事**：As a [角色], I want [功能], so that [价值]
- **输入/输出定义**：明确数据结构和类型
- **边界条件**：异常情况、限制条件
- **UI/UX 要求**：页面布局、交互流程（可附原型图）
- **验收标准**：明确的可测试的完成条件

SPEC 模板：

```markdown
# [功能名称] SPEC

## 概述
[一句话描述]

## 用户故事
- As a 卖家, I want 自动翻译商品描述, so that 快速上架多语言商品

## 数据结构
```typescript
interface Input { ... }
interface Output { ... }
```

## API 设计
- `POST /api/xxx` - 描述

## 边界条件
- [ ] 条件1
- [ ] 条件2

## 验收标准
- [ ] 标准1
- [ ] 标准2
```

### 阶段二：任务拆解（TASKS）

将 SPEC 拆解为可执行的小任务：

- 每个任务不超过 **2小时** 工作量
- 任务之间有明确的依赖关系
- 每个任务有清晰的完成标准
- 优先级排列：基础设施 > 核心逻辑 > UI 组件 > 集成测试

任务拆解示例：
```
1. [DB] 创建数据库表结构和迁移
2. [API] 实现 CRUD API 接口
3. [AI] 实现 AI 功能调用
4. [UI] 实现页面组件
5. [INT] 集成测试和联调
```

### 阶段三：质量验证（VERIFY）

每完成一个任务必须通过验证：

- **类型检查**：`tsc --noEmit` 无错误
- **Lint 检查**：`eslint` 无警告
- **单元测试**：相关测试用例通过
- **功能验证**：手动验证核心路径
- **边界测试**：异常输入、网络错误等

### 阶段四：逐步实现（IMPL）

按任务列表顺序逐步实现：

- 一次只做一个任务
- 完成后立即验证
- 验证通过后提交代码
- 发现问题立即修复，不堆积技术债

## Experts 模式

使用 Experts 模式进行全栈开发，按角色分工：

| 角色 | 职责 | 关注点 |
|------|------|--------|
| Architect | 系统架构设计 | 整体结构、技术选型、性能 |
| Frontend | 前端开发 | UI 组件、交互、响应式 |
| Backend | 后端开发 | API、数据库、安全 |
| AI Engineer | AI 集成 | Prompt 工程、模型选择、降级 |
| QA | 质量保证 | 测试用例、边界条件、验收 |

工作流程：
1. Architect 定义整体方案和接口
2. Backend 实现 API 和数据层
3. AI Engineer 实现 AI 功能
4. Frontend 实现 UI 和交互
5. QA 验证所有功能

## Git 提交规范

### Commit Message 格式

```
type(scope): description

[可选 body]

[可选 footer]
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(product): add AI description generation` |
| `fix` | Bug 修复 | `fix(cart): correct price calculation` |
| `docs` | 文档更新 | `docs(readme): update setup instructions` |
| `style` | 代码格式 | `style(global): apply prettier formatting` |
| `refactor` | 重构 | `refactor(ai): extract prompt templates` |
| `test` | 测试 | `test(api): add product CRUD tests` |
| `chore` | 构建/工具 | `chore(deps): upgrade next.js to 14.2` |

### Scope 范围

对应项目功能模块：`product`, `order`, `cart`, `ai`, `auth`, `ui`, `db`, `config`

### 规则

- description 使用英文，小写开头，不加句号
- 一次提交只做一件事
- 提交前确保通过类型检查和测试

## 分支策略

```
main (生产分支)
├── feature/product-listing    # 功能分支
├── feature/ai-translation     # 功能分支
├── fix/cart-calculation       # 修复分支
└── chore/upgrade-deps         # 维护分支
```

### 规则

- `main` 为主分支，始终保持可部署状态
- 功能开发在 `feature/xxx` 分支进行
- Bug 修复在 `fix/xxx` 分支进行
- 完成后合并到 `main`
- 分支命名使用 kebab-case
- 合并前确保通过所有检查

## 代码评审

### 评审时机

- **重要功能变更**：涉及核心业务逻辑、数据库结构变更、AI 集成修改
- **架构变更**：新增模块、修改分层关系、引入新依赖
- **安全相关**：认证逻辑、权限控制、数据加密

### AI 评审清单

让 AI 评审时关注以下方面：

- [ ] 代码是否符合架构约定（分层是否清晰）
- [ ] 类型定义是否完整（无 any）
- [ ] 错误处理是否充分
- [ ] 是否有潜在的性能问题
- [ ] 是否有安全隐患
- [ ] 命名是否清晰达意
- [ ] 是否有重复代码可提取

### 评审命令

```
请评审以下代码变更，关注：
1. 架构合理性
2. 类型安全
3. 错误处理
4. 性能影响
5. 安全风险
```

## 开发节奏

### 单个功能模块的开发流程

```
1. 写 SPEC (15min)
2. 任务拆解 (10min)
3. 逐个实现 + 验证 (主要时间)
4. 集成测试 (15min)
5. 代码评审 (10min)
6. 合并提交
```

### 每日工作流

1. 确认今日目标（1-2个功能模块）
2. 按 SDD 流程逐个推进
3. 每完成一个模块提交一次
4. 日终回顾进度，调整计划

## 质量底线

以下情况**不允许**合并到 main：

- TypeScript 类型检查不通过
- 存在 ESLint 错误（warning 可接受）
- 核心功能路径未经测试
- AI 调用缺少降级方案
- API 缺少入参验证
- 数据库操作缺少错误处理
