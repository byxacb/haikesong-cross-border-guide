import { createOpenAI } from '@ai-sdk/openai';

// 创建DeepSeek客户端（兼容OpenAI接口格式）
export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

export const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY || '',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

// 模型配置
export const MODEL_CONFIG = {
  // 主力对话模型
  chat: 'deepseek-chat',
  // 复杂推理模型
  reasoner: 'deepseek-reasoner',
  vision: 'glm-4v',
  // 模型参数
  params: {
    temperature: 0.7,
    maxTokens: 2000,
  },
} as const;

// 获取对话模型实例
export function getChatModel() {
  return deepseek(MODEL_CONFIG.chat);
}

// 获取推理模型实例
export function getReasonerModel() {
  return deepseek(MODEL_CONFIG.reasoner);
}

export function getVisionModel() {
  return zhipu(MODEL_CONFIG.vision);
}

export function hasVisionKey() {
  return Boolean(process.env.ZHIPU_API_KEY);
}
