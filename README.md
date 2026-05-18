# 跨境电商开店注册引导工具（黑客松项目）

> 鹭岛青年筑梦AI创新大赛·电商黑客松参赛项目

## 项目简介

基于AI的跨境电商开店注册引导工具，聚焦亚马逊平台，利用大语言模型为跨境电商卖家提供智能开店注册引导、材料校验、进度跟踪等一站式服务，帮助卖家高效完成开店注册流程。

## 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈React框架 |
| 语言 | TypeScript | 类型安全 |
| 样式 | Tailwind CSS | 原子化CSS |
| 组件库 | shadcn/ui | 高质量UI组件 |
| AI | Vercel AI SDK + DeepSeek API | AI能力集成 |
| 数据库 | Supabase (PostgreSQL) | 数据存储与认证 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 部署 | Vercel | 自动化部署 |

## 目录结构

```
├── src/
│   ├── app/                # Next.js App Router（页面 + API路由）
│   │   ├── api/            # 后端API端点
│   │   └── (routes)/       # 前端页面路由
│   ├── components/         # React组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── layout/         # 布局组件
│   │   └── features/       # 业务功能组件
│   ├── lib/                # 工具库
│   │   ├── ai/             # AI服务封装（Prompt、模型配置）
│   │   └── supabase/       # Supabase客户端配置
│   ├── hooks/              # 自定义React Hooks
│   ├── stores/             # Zustand状态管理
│   └── types/              # TypeScript类型定义
├── docs/                   # 项目文档（SDD流程）
│   ├── SPEC.md             # 需求规格文档
│   ├── TASKS.md            # 任务清单
│   └── ARCHITECTURE.md     # 架构设计文档
├── public/                 # 静态资源
└── .env.local              # 环境变量（不提交git）
```

## 开发流程（SDD四阶段）

本项目遵循 **规格驱动开发 (Specification-Driven Development)** 流程：

1. **SPEC（规格定义）** - 明确需求、用户画像、核心功能、验收标准
2. **ARCH（架构设计）** - 确定技术方案、目录结构、数据模型、AI集成方式
3. **TASKS（任务拆解）** - 将需求分解为可执行的开发任务，排定优先级
4. **IMPL（实现开发）** - 按优先级逐个完成任务，持续验证

## 快速开始

### 项目初始化（比赛现场使用）

```bash
# 1. 创建 Next.js 项目
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir

# 2. 安装核心依赖
npm install @ai-sdk/openai ai zustand
# 注：@ai-sdk/openai 用于创建DeepSeek客户端（DeepSeek兼容OpenAI接口格式）

# 3. 安装 Supabase 客户端
npm install @supabase/supabase-js

# 4. 初始化 shadcn/ui
npx shadcn@latest init

# 5. 安装常用 shadcn 组件
npx shadcn@latest add button input card dialog textarea tabs badge
```

### 环境变量配置

创建 `.env.local` 文件：

```bash
# AI 模型配置（DeepSeek）
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 可选：备选AI模型
# ZHIPU_API_KEY=
# QWEN_API_KEY=
```

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览生产版本
npm run start
```

### 部署

```bash
# 方式一：通过 Vercel CLI
npx vercel

# 方式二：推送到 GitHub 自动部署（推荐）
git push origin main
```

## 提交物清单

比赛结束需提交以下材料：

- [ ] **PPT演示文稿** - 项目介绍、技术方案、商业价值
- [ ] **GitHub仓库链接** - 包含完整源代码
- [ ] **5分钟录屏** - 产品Demo演示视频
- [ ] **线上访问地址** - Vercel部署的可访问URL

## 比赛信息

- **赛事名称**：鹭岛青年筑梦AI创新大赛·电商黑客松
- **团队规模**：一人团队
- **开发时间**：24小时
- **评分标准**：
  - 技术实现 40%
  - 创意商业价值 30%
  - 完成度 30%

## 开发备忘

### 关键时间节点
- 开发开始：确定选题 → 填写SPEC → 开始编码
- 中间检查：核心功能完成 → 开始联调
- 最终冲刺：部署上线 → 录屏 → 制作PPT

### 紧急降级方案
- AI API不可用 → 使用Mock数据展示流程
- 数据库问题 → 使用本地存储(localStorage)
- 部署失败 → 本地 `npm run dev` 演示

---

*Built with AI (DeepSeek) for Cross-border E-commerce*
