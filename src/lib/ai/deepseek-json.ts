import type { AmazonFieldPacket, GapAnalysis, GeneratedTemplate, NextQuestion } from '@/types/domain';

type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

interface DeepSeekChoice {
  message?: {
    content?: string;
  };
}

interface DeepSeekResponse {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
  choices?: DeepSeekChoice[];
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export async function generateDeepSeekJson<T>(
  model: DeepSeekModel,
  prompt: string,
  label: string,
  options: { maxTokens?: number } = {},
): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 DEEPSEEK_API_KEY');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你只输出一个合法 JSON 对象，不要输出 Markdown 代码块，不要添加任何解释文字。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: options.maxTokens ?? 4000,
      response_format: { type: 'json_object' },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek ${label} 请求失败：HTTP ${response.status} ${text.slice(0, 500)}`);
  }

  let payload: DeepSeekResponse;
  try {
    payload = JSON.parse(text) as DeepSeekResponse;
  } catch {
    throw new Error(`DeepSeek ${label} 返回非 JSON 响应：${text.slice(0, 500)}`);
  }

  if (payload.error) {
    throw new Error(`DeepSeek ${label} 错误：${payload.error.message || payload.error.code || payload.error.type || '未知错误'}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`DeepSeek ${label} 没有返回内容`);
  }

  return parseJsonContent<T>(content, label);
}

export function validateNextQuestion(value: unknown): NextQuestion {
  const object = asRecord(value, '下一问');
  return {
    question: asString(object.question, 'question'),
    fieldKey: asString(object.fieldKey, 'fieldKey'),
    helperText: asString(object.helperText, 'helperText'),
    options: optionalStringArray(object.options),
    done: typeof object.done === 'boolean' ? object.done : false,
  };
}

export function validateGapAnalysis(value: unknown): GapAnalysis {
  const object = asRecord(value, '缺口分析');
  return {
    summary: asString(object.summary, 'summary'),
    readinessScore: clampNumber(asNumber(object.readinessScore, 'readinessScore'), 0, 100),
    riskLevel: asRiskLevel(object.riskLevel),
    missingItems: asArray(object.missingItems, 'missingItems').map((item, index) => {
      const row = asRecord(item, `missingItems[${index}]`);
      return {
        id: asString(row.id, 'id'),
        title: asString(row.title, 'title'),
        reason: asString(row.reason, 'reason'),
        action: asString(row.action, 'action'),
        required: asBoolean(row.required, 'required'),
      };
    }),
    readyItems: asStringArray(object.readyItems, 'readyItems'),
    nextActions: asStringArray(object.nextActions, 'nextActions'),
    disclaimer: asString(object.disclaimer, 'disclaimer'),
  };
}

export function validateTemplateDraft(value: unknown): { templates: GeneratedTemplate[] } {
  const object = asRecord(value, '模板草稿');
  return {
    templates: asArray(object.templates, 'templates').map((item, index) => {
      const row = asRecord(item, `templates[${index}]`);
      return {
        id: asString(row.id, 'id'),
        type: asTemplateType(row.type),
        title: asString(row.title, 'title'),
        description: asString(row.description, 'description'),
        content: asString(row.content, 'content'),
        sourceFields: asStringArray(row.sourceFields, 'sourceFields'),
        warnings: asStringArray(row.warnings, 'warnings'),
        updatedAt: asString(row.updatedAt, 'updatedAt'),
      };
    }),
  };
}

export function validateAmazonPacket(value: unknown): AmazonFieldPacket {
  const object = asRecord(value, '填表包');
  return {
    title: asString(object.title, 'title'),
    marketplace: 'amazon_us',
    fields: asArray(object.fields, 'fields').map((item, index) => {
      const row = asRecord(item, `fields[${index}]`);
      return {
        id: asString(row.id, 'id'),
        label: asString(row.label, 'label'),
        value: typeof row.value === 'string' ? row.value : '',
        source: asString(row.source, 'source'),
        status: asAmazonFieldStatus(row.status),
        note: asString(row.note, 'note'),
      };
    }),
    risks: asStringArray(object.risks, 'risks'),
    copyBlock: asString(object.copyBlock, 'copyBlock'),
    disclaimer: asString(object.disclaimer, 'disclaimer'),
  };
}

function parseJsonContent<T>(content: string, label: string): T {
  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error(`DeepSeek ${label} 返回内容不是合法 JSON：${content.slice(0, 500)}`);
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} 必须是数组`);
  }
  return value;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} 必须是字符串`);
  }
  return value;
}

function asStringArray(value: unknown, field: string): string[] {
  return asArray(value, field).map((item, index) => asString(item, `${field}[${index}]`));
}

function optionalStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${field} 必须是布尔值`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${field} 必须是数字`);
  }
  return value;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asRiskLevel(value: unknown): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error('riskLevel 必须是 low、medium 或 high');
}

function asTemplateType(value: unknown): GeneratedTemplate['type'] {
  const allowed = [
    'company_setup_checklist',
    'individual_business_checklist',
    'company_articles',
    'residence_certificate',
    'id_copy_checklist',
    'amazon_registration_fields',
    'risk_fix_checklist',
  ];
  if (typeof value === 'string' && allowed.includes(value)) {
    return value as GeneratedTemplate['type'];
  }
  throw new Error('模板 type 不合法');
}

function asAmazonFieldStatus(value: unknown): AmazonFieldPacket['fields'][number]['status'] {
  if (value === 'ready' || value === 'missing' || value === 'needs_review') return value;
  throw new Error('字段 status 不合法');
}
