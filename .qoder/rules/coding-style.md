---
trigger: always
description: 编码风格规范
---

# 编码风格规范

## 语言与类型

- 使用 TypeScript strict mode，`tsconfig.json` 中开启 `"strict": true`
- **禁止使用 `any` 类型**，必须使用具体类型或 `unknown` + 类型守卫
- 优先使用 `interface` 定义对象结构，`type` 用于联合类型和工具类型
- 所有函数必须有明确的返回类型标注

## 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `ProductCard`, `SearchPanel` |
| 函数/方法 | camelCase | `fetchProducts`, `handleSubmit` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 文件名 | kebab-case | `product-card.tsx`, `use-search.ts` |
| 类型/接口 | PascalCase | `ProductInfo`, `ApiResponse` |
| 枚举 | PascalCase（值用 UPPER_SNAKE_CASE） | `enum Status { ACTIVE, INACTIVE }` |
| CSS 类名 | kebab-case（Tailwind 优先） | `card-wrapper` |
| 环境变量 | UPPER_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

## 文件组织

- 每个组件一个文件，文件名与组件名对应（kebab-case）
- 按功能模块分目录，不按文件类型分目录
- 组件目录结构示例：
  ```
  src/components/product/
  ├── product-card.tsx        # 组件实现
  ├── product-card.test.tsx   # 单元测试
  ├── product-list.tsx        # 相关组件
  └── index.ts                # 统一导出
  ```
- 共享类型定义放在 `src/types/` 目录
- 工具函数放在 `src/lib/utils/` 目录

## 注释规范

- **关键业务逻辑**使用中文注释，便于团队理解业务意图
  ```typescript
  // 跨境电商场景：根据目标国家计算关税比例
  const dutyRate = calculateDutyRate(country, category);
  ```
- **代码接口**使用 JSDoc 英文注释
  ```typescript
  /**
   * Calculate shipping cost based on destination and weight
   * @param destination - Target country code (ISO 3166-1)
   * @param weight - Package weight in kilograms
   * @returns Shipping cost in USD
   */
  function calculateShipping(destination: string, weight: number): number
  ```
- 避免无意义的注释（如 `// 设置变量`），注释应解释"为什么"而非"是什么"

## 错误处理

- 统一使用 `try-catch` + 自定义错误类型
- 自定义错误类继承自 `AppError` 基类：
  ```typescript
  class AppError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number = 500
    ) {
      super(message);
      this.name = 'AppError';
    }
  }
  ```
- API 路由中必须有顶层错误捕获
- 禁止吞掉错误（空 catch 块），至少要记录日志
- 用户可见的错误信息需要国际化处理

## 导入顺序

导入语句按以下顺序排列，各组之间空一行：

```typescript
// 1. React / Next.js 核心
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 3. 项目内部模块
import { ProductCard } from '@/components/product/product-card';
import { fetchProducts } from '@/lib/api/products';

// 4. 类型定义
import type { Product, ApiResponse } from '@/types';
```

## 组件规范

- **优先使用服务端组件**（Server Components），享受 Next.js 14 的性能优势
- 客户端组件必须在文件顶部标注 `'use client'`
- 客户端组件仅用于：需要交互（事件处理）、浏览器 API、React hooks（useState 等）
- 组件 Props 使用 `interface` 定义，命名为 `XxxProps`：
  ```typescript
  interface ProductCardProps {
    product: Product;
    onAddToCart?: (id: string) => void;
  }
  ```
- 使用 `export default` 导出页面组件，`export` 导出可复用组件
- 避免组件超过 200 行，超过时应拆分子组件

## 其他约定

- 字符串统一使用单引号
- 语句末尾加分号
- 缩进使用 2 空格
- 使用 `const` 优先，其次 `let`，禁止 `var`
- 异步操作统一使用 `async/await`，避免 `.then()` 链式调用
- 使用可选链 `?.` 和空值合并 `??` 简化代码
