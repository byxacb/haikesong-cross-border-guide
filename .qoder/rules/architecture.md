---
trigger: always
description: 架构约定规范
---

# 架构约定规范

## 分层架构

项目采用清晰的分层架构，各层职责明确，单向依赖：

```
页面层 (app/)
    ↓
业务逻辑层 (src/lib/)
    ↓
数据访问层 (src/lib/db/)    AI服务层 (src/lib/ai/)
    ↓                           ↓
Supabase                    LLM Provider
```

### 各层职责

| 层级 | 目录 | 职责 |
|------|------|------|
| 页面层 | `src/app/` | 路由、页面布局、数据获取入口 |
| 组件层 | `src/components/` | UI 组件、交互逻辑 |
| 业务逻辑层 | `src/lib/` | 核心业务逻辑、数据转换 |
| 数据访问层 | `src/lib/db/` | 数据库 CRUD、查询封装 |
| AI 服务层 | `src/lib/ai/` | LLM 调用、Prompt 管理 |

### 依赖规则

- 上层可以调用下层，下层**不得**调用上层
- 同层之间尽量避免相互依赖
- 组件层不直接访问数据库或 AI 服务，必须通过业务逻辑层

## 目录结构

```
src/
├── app/                      # Next.js App Router 页面
│   ├── (auth)/               # 认证相关页面组
│   ├── (dashboard)/          # 主面板页面组
│   ├── api/                  # API Routes
│   │   ├── ai/               # AI 相关接口
│   │   ├── products/         # 商品接口
│   │   └── orders/           # 订单接口
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 首页
├── components/               # 可复用 UI 组件
│   ├── ui/                   # shadcn/ui 基础组件
│   ├── layout/               # 布局组件（Header、Sidebar等）
│   ├── product/              # 商品相关组件
│   ├── order/                # 订单相关组件
│   └── shared/               # 跨模块共享组件
├── lib/                      # 核心业务逻辑
│   ├── ai/                   # AI 服务封装
│   │   ├── providers/        # AI 提供商适配器
│   │   ├── prompts/          # Prompt 模板
│   │   └── index.ts          # 统一入口
│   ├── db/                   # 数据库操作
│   │   ├── queries/          # 查询封装
│   │   ├── migrations/       # 数据库迁移
│   │   └── client.ts         # Supabase 客户端
│   ├── utils/                # 工具函数
│   ├── hooks/                # 自定义 React Hooks
│   ├── validators/           # 数据验证（Zod schemas）
│   └── constants.ts          # 全局常量
├── types/                    # TypeScript 类型定义
│   ├── api.ts                # API 相关类型
│   ├── database.ts           # 数据库模型类型
│   └── index.ts              # 类型导出
├── stores/                   # Zustand 状态管理
│   ├── use-cart-store.ts     # 购物车状态
│   └── use-ui-store.ts       # UI 状态
└── config/                   # 配置文件
    ├── site.ts               # 站点配置
    └── nav.ts                # 导航配置
```

## API 设计规范

### RESTful 风格

- 使用 Next.js Route Handlers（`app/api/`）
- 资源命名使用复数名词：`/api/products`, `/api/orders`
- 使用标准 HTTP 方法：GET（查询）、POST（创建）、PUT（更新）、DELETE（删除）
- 使用 HTTP 状态码表达结果

### 统一响应格式

所有 API 接口必须返回统一的响应结构：

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// 成功响应
return NextResponse.json({
  success: true,
  data: products,
  meta: { page: 1, pageSize: 20, total: 100 }
});

// 错误响应
return NextResponse.json(
  { success: false, error: 'Product not found' },
  { status: 404 }
);
```

### 请求验证

- 所有 API 入参使用 Zod 进行验证
- 验证失败返回 400 + 具体错误信息

```typescript
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string(),
});
```

## 状态管理

### 优先级策略

1. **服务端组件直接获取数据**（首选）—— 利用 Next.js 14 的 Server Components
2. **URL 状态** —— 搜索、筛选、分页等用 `searchParams`
3. **React Context** —— 小范围共享（主题、语言等）
4. **Zustand** —— 复杂客户端状态（购物车、用户偏好）

### Zustand 使用规范

```typescript
// stores/use-cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
);
```

- 每个 Store 一个文件，命名为 `use-xxx-store.ts`
- 避免 prop drilling，但不要滥用全局状态
- 服务端能解决的数据不放客户端状态

## AI 调用规范

- 所有 LLM 调用**必须封装在 `src/lib/ai/` 目录**
- 业务代码不允许直接 `import` AI SDK，只能调用 `lib/ai/` 导出的函数
- AI 调用统一通过 API Route（`app/api/ai/`）暴露给客户端

## 数据库操作规范

- 所有数据库操作通过 Supabase Client，封装在 `src/lib/db/`
- 禁止在组件或 API Route 中直接写 SQL 查询
- 查询函数按业务模块分文件：`db/queries/products.ts`, `db/queries/orders.ts`
- 数据库类型从 Supabase 自动生成：`supabase gen types typescript`

## 安全规范

- 服务端使用 `createServerClient`，客户端使用 `createBrowserClient`
- Row Level Security (RLS) 必须开启
- API Route 中验证用户身份后再执行操作
- 敏感数据不暴露在客户端
- 环境变量中 `NEXT_PUBLIC_` 前缀的只放公开信息
