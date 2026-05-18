---
trigger: glob
glob: src/lib/ai/**
description: AI集成规范
---

# AI 集成规范

本规范适用于 `src/lib/ai/` 目录下所有 AI 相关代码。

## 统一 AI 服务层

所有 LLM 调用必须经过统一入口，禁止在业务代码中直接使用 AI SDK。

### 入口设计

```typescript
// src/lib/ai/index.ts
export { generateText, streamText } from './core';
export { createCompletion, createStreamCompletion } from './completions';
export type { AIConfig, AIResponse, StreamCallback } from './types';
```

### 提供商适配器

```typescript
// src/lib/ai/providers/index.ts
import { createOpenAI } from '@ai-sdk/openai';

// 主力模型：DeepSeek（兼容OpenAI接口格式）
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// 备选1：智谱GLM-4
const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

// 备选2：通义千问
const qwen = createOpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 通过环境变量选择默认模型
const AI_PROVIDER = process.env.AI_PROVIDER || 'deepseek';

export function getProvider() {
  switch (AI_PROVIDER) {
    case 'deepseek':
      return deepseek;
    case 'zhipu':
      return zhipu;
    case 'qwen':
      return qwen;
    default:
      throw new AIError('Unsupported AI provider', 'INVALID_PROVIDER');
  }
}
```

## 支持的模型

| 提供商 | 模型 | 用途 |
|--------|------|------|
| DeepSeek | deepseek-chat | 主力模型，对话场景 |
| DeepSeek | deepseek-reasoner | 复杂推理任务 |
| 智谱AI | GLM-4 | 备选1，国产大模型 |
| 通义千问 | qwen-plus | 备选2，阿里云大模型 |

模型选择通过环境变量配置：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
# 备选模型配置
ZHIPU_API_KEY=xxx
QWEN_API_KEY=xxx
```

## Prompt 模板化

所有 Prompt 存放在 `src/lib/ai/prompts/` 目录，使用模板变量。

### 目录结构

```
src/lib/ai/prompts/
├── product-description.ts    # 商品描述生成
├── translation.ts            # 多语言翻译
├── customer-service.ts       # 智能客服
├── market-analysis.ts        # 市场分析
└── index.ts                  # 统一导出
```

### 模板格式

```typescript
// src/lib/ai/prompts/product-description.ts
import type { PromptTemplate } from '../types';

export const productDescriptionPrompt: PromptTemplate = {
  name: 'product-description',
  version: '1.0',
  system: `你是一位专业的跨境电商文案专家。
根据商品信息生成适合目标市场的商品描述。
目标语言：{{targetLanguage}}
目标市场：{{targetMarket}}`,
  user: `请为以下商品生成描述：
商品名称：{{productName}}
商品类别：{{category}}
核心卖点：{{sellingPoints}}
字数要求：{{wordCount}}字以内`,
};

// 模板渲染函数
export function renderPrompt(
  template: PromptTemplate,
  variables: Record<string, string>
): { system: string; user: string } {
  let system = template.system;
  let user = template.user;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    system = system.replaceAll(placeholder, value);
    user = user.replaceAll(placeholder, value);
  }
  
  return { system, user };
}
```

## 流式输出

优先使用流式响应，提升用户体验。使用 Vercel AI SDK 的流式能力：

```typescript
// src/lib/ai/core.ts
import { streamText as aiStreamText } from 'ai';
import { getProvider } from './providers';

export async function streamText(params: StreamTextParams) {
  const provider = getProvider();
  
  const result = await aiStreamText({
    model: provider(params.model || DEFAULT_MODEL),
    system: params.system,
    messages: params.messages,
    maxTokens: params.maxTokens || 2000,
    temperature: params.temperature || 0.7,
    abortSignal: params.abortSignal,
  });

  return result;
}
```

### API Route 中使用流式输出

```typescript
// src/app/api/ai/generate/route.ts
import { streamText } from '@/lib/ai';

export async function POST(req: Request) {
  const { prompt, model } = await req.json();
  
  const result = await streamText({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  return result.toDataStreamResponse();
}
```

## 降级方案

AI 调用失败时必须有 fallback 处理，确保核心业务不中断。

### 降级策略

```typescript
// src/lib/ai/fallback.ts
import type { AIResponse } from './types';

interface FallbackConfig {
  /** 主模型 */
  primaryModel: string;
  /** 降级模型 */
  fallbackModel: string;
  /** 最大重试次数 */
  maxRetries: number;
  /** 静态降级内容（最后手段） */
  staticFallback?: string;
}

export async function withFallback<T>(
  fn: (model: string) => Promise<T>,
  config: FallbackConfig
): Promise<T> {
  // 第一步：尝试主模型
  try {
    return await fn(config.primaryModel);
  } catch (primaryError) {
    console.warn(`Primary model failed: ${primaryError}`);
  }

  // 第二步：尝试降级模型
  try {
    return await fn(config.fallbackModel);
  } catch (fallbackError) {
    console.warn(`Fallback model failed: ${fallbackError}`);
  }

  // 第三步：返回静态降级内容
  if (config.staticFallback) {
    return config.staticFallback as T;
  }

  throw new AIError(
    'All AI providers failed',
    'AI_COMPLETE_FAILURE'
  );
}
```

### 降级场景处理表

| 场景 | 处理方式 |
|------|----------|
| 模型超时 | 切换至备选模型（如智谱GLM-4） |
| API 限流 (429) | 等待后重试，超过阈值切换提供商 |
| 内容过滤被拒 | 记录日志 + 返回友好提示 |
| 网络异常 | 重试 3 次后降级到缓存结果 |
| Token 超限 | 截断输入后重试 |

## Token 管理

### 用量监控

```typescript
// src/lib/ai/token-manager.ts
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export class TokenManager {
  private static dailyUsage: Map<string, number> = new Map();
  
  /** 每日 Token 限额 */
  private static DAILY_LIMIT = Number(process.env.AI_DAILY_TOKEN_LIMIT) || 1000000;
  
  /** 单次请求最大 Token */
  private static MAX_REQUEST_TOKENS = 4000;

  static async checkQuota(userId: string): Promise<boolean> {
    const used = this.dailyUsage.get(userId) || 0;
    return used < this.DAILY_LIMIT;
  }

  static async recordUsage(userId: string, usage: TokenUsage): Promise<void> {
    const current = this.dailyUsage.get(userId) || 0;
    this.dailyUsage.set(userId, current + usage.totalTokens);
    
    // 持久化到数据库
    await saveTokenUsage(userId, usage);
  }
}
```

### 限流配置

```typescript
// 环境变量配置
AI_DAILY_TOKEN_LIMIT=1000000     # 每日总 Token 限额
AI_REQUEST_MAX_TOKENS=4000       # 单次请求最大 Token
AI_RATE_LIMIT_RPM=60             # 每分钟最大请求数
```

## 错误处理

### 自定义 AI 错误类

```typescript
// src/lib/ai/errors.ts
export class AIError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public retryable: boolean = false,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export type AIErrorCode =
  | 'TIMEOUT'           // 请求超时
  | 'RATE_LIMITED'      // 被限流
  | 'CONTENT_FILTERED'  // 内容被过滤
  | 'TOKEN_EXCEEDED'    // Token 超限
  | 'INVALID_PROVIDER'  // 无效的提供商
  | 'QUOTA_EXCEEDED'    // 配额用完
  | 'AI_COMPLETE_FAILURE' // 完全失败
  | 'NETWORK_ERROR';    // 网络错误
```

### 超时处理

```typescript
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await promise;
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIError('AI request timeout', 'TIMEOUT', true);
    }
    throw error;
  }
}
```

## 最佳实践

1. **不在客户端直接调用 AI** —— 所有 AI 调用通过 API Route
2. **Prompt 版本化管理** —— 每个 Prompt 模板都有 version 字段
3. **结果缓存** —— 相同输入的结果可缓存，减少重复调用
4. **日志记录** —— 记录每次 AI 调用的输入、输出、Token 用量、耗时
5. **敏感信息过滤** —— 发送给 AI 前清除用户隐私数据
6. **结构化输出** —— 优先使用 JSON mode 获取结构化响应，便于程序处理
