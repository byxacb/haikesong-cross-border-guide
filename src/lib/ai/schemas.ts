import { z } from 'zod';

export const documentTypeSchema = z.enum([
  'business_license',
  'id_card',
  'address_proof',
  'company_articles',
  'residence_certificate',
  'appointment_document',
  'amazon_form',
  'risk_fix',
  'other',
]);

export const templateTypeSchema = z.enum([
  'company_setup_checklist',
  'individual_business_checklist',
  'company_articles',
  'residence_certificate',
  'id_copy_checklist',
  'amazon_registration_fields',
  'risk_fix_checklist',
]);

// === 材料清单 Schema — /api/ai/checklist 的输出格式 ===
export const checklistSchema = z.object({
  sellerType: z.enum(['individual', 'professional']),
  region: z.string(),
  totalItems: z.number(),
  items: z.array(z.object({
    category: z.enum([
      'business_license',
      'id_card',
      'credit_card',
      'bank_account',
      'contact_info',
      'address_proof',
    ]),
    name: z.string().describe('材料中文名称'),
    required: z.boolean(),
    requirements: z.array(z.string()).describe('具体要求列表'),
    tips: z.string().describe('实用提示和建议'),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string().describe('字段中文标签'),
      type: z.enum(['text', 'number', 'date', 'select']),
      placeholder: z.string(),
      validation: z.string().optional().describe('校验规则描述'),
      options: z.array(z.string()).optional().describe('选择项'),
    })),
  })),
});

// === 单项校验结果 Schema — /api/ai/verify 的输出格式 ===
export const verifyResultSchema = z.object({
  passed: z.boolean().describe('是否通过校验'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('风险等级'),
  issues: z.array(z.object({
    field: z.string().describe('问题字段key'),
    problem: z.string().describe('问题描述'),
    suggestion: z.string().describe('修改建议'),
  })),
  summary: z.string().describe('校验总结'),
});

// === 风险评估报告 Schema — /api/ai/risk-assess 的输出格式 ===
export const riskAssessmentSchema = z.object({
  overallRisk: z.enum(['low', 'medium', 'high']).describe('总体风险等级'),
  passRate: z.number().min(0).max(100).describe('预估通过概率'),
  risks: z.array(z.object({
    category: z.string().describe('风险所属资质类别'),
    description: z.string().describe('风险描述'),
    severity: z.enum(['warning', 'error']).describe('严重程度'),
    suggestion: z.string().describe('改进建议'),
  })),
  strengths: z.array(z.string()).describe('做得好的方面'),
  readySummary: z.string().describe('综合评价和建议'),
});

export const nextQuestionSchema = z.object({
  question: z.string().describe('下一步要问用户的问题'),
  fieldKey: z.string().describe('该问题对应的档案字段 key'),
  helperText: z.string().describe('为什么要问这个问题'),
  options: z.array(z.string()).describe('可选项，允许为空数组'),
  done: z.boolean().describe('是否已经不需要继续追问'),
});

export const gapAnalysisSchema = z.object({
  summary: z.string(),
  readinessScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high']),
  missingItems: z.array(z.object({
    id: z.string(),
    title: z.string(),
    reason: z.string(),
    action: z.string(),
    required: z.boolean(),
  })),
  readyItems: z.array(z.string()),
  nextActions: z.array(z.string()),
  disclaimer: z.string(),
});

export const templateDraftSchema = z.object({
  templates: z.array(z.object({
    id: z.string(),
    type: templateTypeSchema,
    title: z.string(),
    description: z.string(),
    content: z.string(),
    sourceFields: z.array(z.string()),
    warnings: z.array(z.string()),
    updatedAt: z.string(),
  })),
});

export const amazonPacketSchema = z.object({
  title: z.string(),
  marketplace: z.literal('amazon_us'),
  fields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
    source: z.string(),
    status: z.enum(['ready', 'missing', 'needs_review']),
    note: z.string(),
  })),
  risks: z.array(z.string()),
  copyBlock: z.string(),
  disclaimer: z.string(),
});

export const visionExtractSchema = z.object({
  documentType: documentTypeSchema,
  fields: z.record(z.string(), z.string()),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string()),
  source: z.enum(['vision', 'manual', 'mock']),
});
