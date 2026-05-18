# 项目架构设计文档

> 当前架构是黑客松默认技术基线。具体赛题确定后，以 `docs/SPEC.md` 和 `docs/PROJECT-BLUEPRINT.md` 为准裁剪。产品方向是"跨境电商开店注册引导工具"：聚焦亚马逊平台，提供智能引导、材料校验、进度跟踪，帮助卖家高效完成开店注册流程。

## 1. 架构概览

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    展示层 (Presentation)                   │
│         Next.js Pages + React Components + shadcn/ui      │
├─────────────────────────────────────────────────────────┤
│                    应用层 (Application)                    │
│            React Hooks + State Management (Zustand)       │
├─────────────────────────────────────────────────────────┤
│                    服务层 (Service)                        │
│          API Routes + Vercel AI SDK + Business Logic      │
├─────────────────────────────────────────────────────────┤
│                    AI层 (AI Integration)                   │
│         Prompt Templates + Model Orchestration + Stream   │
├─────────────────────────────────────────────────────────┤
│                    数据层 (Data)                           │
│              Supabase (PostgreSQL + Auth + Storage)        │
└─────────────────────────────────────────────────────────┘
```

### 架构原则
- **简洁优先**：黑客松场景下，优先选择约定大于配置的方案
- **全栈统一**：前后端使用同一语言(TypeScript)，减少上下文切换
- **AI原生**：AI不是附加功能，而是核心业务逻辑的一部分
- **快速迭代**：利用Next.js的文件路由和API Routes减少样板代码

## 2. 技术选型决策

| 技术 | 选择理由 | 黑客松优势 |
|------|----------|------------|
| **Next.js 14** | App Router + Server Components + API Routes 全栈一体 | 零配置部署Vercel，文件路由免配置 |
| **TypeScript** | 类型安全减少运行时错误 | AI辅助开发时类型提示极大提升效率 |
| **Tailwind CSS** | 原子化CSS，无需写样式文件 | 快速实现专业UI，无需设计稿 |
| **shadcn/ui** | 高质量组件直接复制到项目中 | 即装即用，可定制，不依赖npm包版本 |
| **Vercel AI SDK** | 统一的AI模型调用接口 + 流式支持 | 内置流式UI组件，5行代码集成AI |
| **Supabase** | PostgreSQL + Auth + Realtime + Storage | 免费额度足够Demo，自带管理面板 |
| **Zustand** | 极简状态管理，无样板代码 | 比Redux轻量10倍，学习成本低 |
| **Vercel** | 与Next.js深度集成 | git push即部署，免费SSL/CDN |

## 3. 目录结构详细说明

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局（全局Provider、字体、主题）
│   ├── page.tsx                  # 首页/主入口
│   ├── globals.css               # 全局样式（Tailwind指令）
│   ├── (routes)/                 # 路由分组
│   │   ├── dashboard/            # 仪表盘页面
│   │   │   └── page.tsx
│   │   └── result/               # 结果展示页
│   │       └── page.tsx
│   └── api/                      # API路由（后端逻辑）
│       ├── ai/                   # AI相关端点
│       │   ├── chat/route.ts     # 对话式AI接口
│       │   └── generate/route.ts # 生成式AI接口
│       └── data/                 # 数据CRUD端点
│           └── route.ts
│
├── components/                   # React组件
│   ├── ui/                       # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                   # 布局组件
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── features/                 # 业务功能组件
│       ├── ai-input.tsx          # AI输入面板
│       ├── result-display.tsx    # 结果展示
│       └── history-list.tsx      # 历史记录
│
├── lib/                          # 工具库和配置
│   ├── ai/                       # AI服务封装
│   │   ├── prompts.ts            # Prompt模板管理
│   │   ├── models.ts             # 模型配置
│   │   └── utils.ts              # AI工具函数
│   ├── supabase/                 # Supabase配置
│   │   ├── client.ts             # 客户端实例
│   │   ├── server.ts             # 服务端实例
│   │   └── types.ts              # 数据库类型
│   └── utils.ts                  # 通用工具函数
│
├── hooks/                        # 自定义Hooks
│   ├── use-ai.ts                 # AI调用Hook
│   └── use-store.ts              # 状态管理Hook
│
├── stores/                       # Zustand状态管理
│   └── app-store.ts              # 全局应用状态
│
└── types/                        # TypeScript类型定义
    ├── api.ts                    # API请求/响应类型
    └── domain.ts                 # 业务领域类型

docs/                             # 项目文档（SDD流程）
├── SPEC.md                       # 需求规格文档
├── TASKS.md                      # 任务清单
├── ARCHITECTURE.md               # 本文档
├── SPEC-TEMPLATE.md              # 需求规格模板
└── TASKS-TEMPLATE.md             # 任务清单模板

public/                           # 静态资源
├── images/                       # 图片资源
└── favicon.ico
```

### 目录职责说明

| 目录 | 职责 | 关键原则 |
|------|------|----------|
| `app/` | 路由和页面，Next.js约定目录 | 尽量薄，逻辑下沉到components和lib |
| `app/api/` | 后端API逻辑 | 每个route.ts对应一个API端点 |
| `components/ui/` | shadcn/ui基础组件 | 不修改，保持可升级 |
| `components/features/` | 业务组件 | 一个组件一个功能，可独立测试 |
| `lib/ai/` | AI服务封装 | Prompt集中管理，模型配置分离 |
| `lib/supabase/` | 数据库操作 | 客户端/服务端实例分离 |
| `stores/` | 全局状态 | 最小化全局状态，优先用Server State |
| `types/` | 类型定义 | 所有共享类型集中管理 |

## 4. AI集成架构

### 4.1 AI服务层设计

```
用户输入 → API Route → AI Service Layer → LLM Provider → 流式响应 → 前端渲染
                            │
                    ┌───────┼───────┐
                    │       │       │
              Prompt管理  模型选择  输出解析
```

### 4.2 Prompt管理策略

```typescript
// src/lib/ai/prompts.ts
export const PROMPTS = {
  // 系统角色定义
  SYSTEM_ROLE: `你是一个专业的跨境电商助手...`,
  
  // 功能Prompt模板（使用模板字符串）
  FEATURE_A: (input: string) => `
    基于以下信息，请...
    输入：${input}
    要求：
    1. ...
    2. ...
    输出格式：JSON
  `,
} as const;
```

### 4.3 流式响应处理

```typescript
// API端 - src/app/api/ai/chat/route.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// 创建DeepSeek客户端（兼容OpenAI接口格式）
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // 使用DeepSeek模型进行对话
  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: PROMPTS.SYSTEM_ROLE,
    messages,
  });
  
  return result.toDataStreamResponse();
}

// 前端 - 使用 useChat Hook
import { useChat } from 'ai/react';

export function ChatComponent() {
  const { messages, input, handleSubmit } = useChat({
    api: '/api/ai/chat',
  });
  // ...
}
```

### 4.4 模型配置

```typescript
// src/lib/ai/models.ts
export const MODEL_CONFIG = {
  // 主力模型 - DeepSeek对话模型
  primary: 'deepseek-chat',
  // 复杂推理 - DeepSeek推理模型
  reasoner: 'deepseek-reasoner',
  // 模型参数
  params: {
    temperature: 0.7,
    maxTokens: 2000,
  },
};
```

## 5. 数据流

### 5.1 完整请求链路

```
[用户操作]
    │
    ▼
[React组件] ─── 触发事件 ──→ [Custom Hook / useChat]
    │                              │
    │                              ▼
    │                      [fetch /api/ai/xxx]
    │                              │
    │                              ▼
    │                      [API Route Handler]
    │                              │
    │                    ┌─────────┼─────────┐
    │                    ▼         ▼         ▼
    │              [验证输入]  [查询DB]  [构建Prompt]
    │                    │         │         │
    │                    └─────────┼─────────┘
    │                              ▼
    │                      [调用AI模型(流式)]
    │                              │
    │                              ▼
    │                    [StreamResponse返回]
    │                              │
    ▼                              ▼
[UI实时更新] ◄─── 流式渲染 ◄── [ReadableStream]
    │
    ▼
[结果持久化] ──→ [Supabase保存]
```

### 5.2 状态管理流

```
Server State (Supabase)     ←→    API Routes
        ↕                              ↕
Client Cache (React Query/SWR)    Server Components
        ↕                              ↕
UI State (Zustand)          ←→    Client Components
```

## 6. 部署架构

### 6.1 Vercel部署配置

```
GitHub Repo ──push──→ Vercel Auto Build ──→ Production
                          │
                    ┌─────┼─────┐
                    ▼     ▼     ▼
              Build   Edge    Serverless
              (SSG)  Functions  Functions
                          │
                          ▼
                    CDN Distribution
```

### 6.2 环境变量管理

```bash
# .env.local（本地开发）
DEEPSEEK_API_KEY=sk-xxx             # DeepSeek AI模型密钥
NEXT_PUBLIC_SUPABASE_URL=xxx       # Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx  # Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=xxx      # Supabase服务端密钥（仅服务端）
```

### 6.3 部署检查清单
- [ ] 环境变量在Vercel Dashboard中配置
- [ ] 构建命令确认：`next build`
- [ ] Node.js版本 >= 18
- [ ] 域名/子域配置（可选）

## 7. 关键设计决策

### 7.1 为什么选择 App Router 而非 Pages Router？
- Server Components 减少客户端JS体积
- 内置 loading.tsx / error.tsx 提升用户体验
- API Routes 与页面同目录，开发体验更好
- 流式渲染原生支持

### 7.2 为什么选择 Supabase 而非自建后端？
- 黑客松24小时时间约束，不应花时间搭建基础设施
- 提供即用的 Auth / Database / Storage / Realtime
- PostgreSQL 比 Firebase(NoSQL) 更适合结构化电商数据
- 慷慨的免费额度，Demo足够使用

### 7.3 为什么选择 Vercel AI SDK 而非直接调用 DeepSeek API？
- 统一的模型接口，一行代码切换模型提供商
- 内置流式处理，自动处理 SSE/WebSocket
- 前端 useChat/useCompletion Hook，减少80%样板代码
- 与 Next.js 深度集成，零额外配置

### 7.4 为什么选择 Zustand 而非 Context/Redux？
- 无 Provider 包裹，减少组件树复杂度
- 代码量仅需 5-10 行即可定义 Store
- 支持 persist 中间件，轻松实现本地持久化
- TypeScript 类型推断完美

### 7.5 前后端一体 vs 分离部署？
- 选择一体：黑客松场景下，减少部署和联调复杂度
- Next.js API Routes 作为 BFF 层，足以满足需求
- 如需扩展，可随时抽离为独立微服务
