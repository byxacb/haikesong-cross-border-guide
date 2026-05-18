# 跨境电商开店注册引导工具 需求规格文档 (SPEC)

> 本文档是人与 Agent 的开发合同。所有编码工作必须基于本 SPEC 执行，未列入的功能不做。

## 1. 项目概述

### 1.1 目标用户
中国跨境电商新手卖家 — 首次注册亚马逊店铺，不熟悉平台要求和注册流程，缺乏专业指导。

### 1.2 核心痛点
亚马逊开店注册流程复杂（6+项资质材料）、要求严格且易出错、审核驳回率高。新手卖家常因资料不一致、格式不合规、信息遗漏等细节问题反复被拒，浪费大量时间和精力。

### 1.3 解决方案
AI 驱动的开店注册全流程引导工具：智能检查资质完备性、逐步引导资料填写、预警常见驳回风险，帮助卖家一次性通过审核。

### 1.4 产品定位
AI 引导助手类工具（非自动化操作亚马逊后台，不替代人工决策）。

### 1.5 比赛评分对齐
| 评分项 | 本项目如何拿分 |
|--------|----------------|
| 技术实现 40 | DeepSeek 大模型作为核心引擎，驱动资质分析、智能填写建议、风险预警三大 AI 链路；使用 Vercel AI SDK streamText + generateObject 实现流式交互和结构化输出 |
| 创意/商业价值 30 | 解决跨境新手卖家"注册难"真实痛点；可量化价值：降低驳回率、缩短注册周期；市场规模大（每年数十万中国新卖家注册亚马逊） |
| 完成度 30 | 完整可交互 Demo（资质检查→填写引导→风险预警全闭环）；5分钟演示路径清晰；UI 专业美观 |

## 2. 功能规格

### 2.1 核心功能（MVP - 必须完成）
| 功能 | 输入 | AI处理 | 输出 |
|------|------|--------|------|
| 资质准备引导 | 用户选择卖家类型（个人/专业）+ 所在地区 | AI 基于卖家类型和地区，生成个性化材料清单，说明每项材料的具体要求 | 结构化清单（材料名称、是否必需、具体要求、实用提示） |
| 资料填写辅助 | 用户逐项输入营业执照号、法人姓名等信息 | AI 校验信息一致性（如执照号格式、姓名匹配）、格式合规性，给出填写建议 | 逐字段校验结果（通过/警告/错误）+ 修正建议 |
| 风险预警 | 用户填写的全部资料汇总 | AI 对照常见驳回原因库（资料不一致、照片不清晰、地址不匹配等），综合预判驳回风险 | 风险等级（低/中/高）+ 具体问题列表 + 修改建议 + 预估通过概率 |

### 2.2 增强功能（时间允许时）
- 审核进度模拟跟踪（展示审核各阶段和预估时间线）
- 多平台选择界面（Shopee、eBay 等入口，逻辑仅实现亚马逊）
- 历史记录保存（Supabase 持久化用户填写进度，支持断点续填）
- 自由问答模式（用户可咨询注册相关任意问题）

### 2.3 非目标（明确不做）
- 不自动操作亚马逊卖家后台
- 不提供法律意见或合规承诺
- 不处理实际支付、收款、税务
- 不做多语言翻译（仅中文界面）
- 不对接亚马逊真实 API

### 2.4 Demo 最小闭环
```text
用户选择"专业卖家 + 中国大陆"
  -> AI 生成个性化材料清单（营业执照、身份证、信用卡、收款账户、联系方式、地址证明）
  -> 用户逐项输入资料信息
  -> AI 实时校验每项资料（格式正确性、信息一致性）
  -> 全部填写完成后，AI 综合评估驳回风险
  -> 输出"注册就绪报告"（通过概率、风险点、改进建议）
```

## 3. 技术规格

### 3.1 技术栈
- **框架**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: Vercel AI SDK + DeepSeek API (deepseek-chat / deepseek-reasoner)
- **数据**: Supabase (PostgreSQL) 或本地 Zustand persist（按时间裁剪）
- **部署**: Vercel

### 3.2 AI能力需求
- 使用的模型：DeepSeek（deepseek-chat 用于对话和清单生成，deepseek-reasoner 用于复杂校验推理）
- 调用方式：Vercel AI SDK 的 `streamText`（流式对话）和 `generateObject`（结构化输出）
- 预期输出格式：结构化 JSON（通过 Zod Schema 强制约束，确保前端可直接解析）
- 备选模型：智谱 GLM-4、通义千问（DeepSeek 不可用时降级）

### 3.3 第三方服务
- DeepSeek API（AI 模型，https://api.deepseek.com）
- Supabase（数据库 + Auth，可选）
- Vercel（部署托管）

### 3.4 数据模型

```typescript
// === 基础类型 ===

// 卖家类型
type SellerType = 'individual' | 'professional';

// 资质类别
type QualificationCategory =
  | 'business_license'  // 营业执照
  | 'id_card'           // 法人身份证
  | 'credit_card'       // 双币信用卡
  | 'bank_account'      // 收款账户
  | 'contact_info'      // 联系方式
  | 'address_proof';    // 地址证明

// === 核心数据结构 ===

// 注册申请
interface RegistrationApplication {
  id: string;
  sellerType: SellerType;
  region: string;                    // 'CN' | 'HK' | 'TW' 等
  status: 'draft' | 'checking' | 'ready' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

// 资质项
interface QualificationItem {
  id: string;
  applicationId: string;
  category: QualificationCategory;
  status: 'pending' | 'filled' | 'verified' | 'warning' | 'error';
  userInput: Record<string, string>;  // 用户填写的各字段
  aiCheckResult?: AICheckResult;
}

// === AI 输出结构 ===

// 材料清单项
interface ChecklistItem {
  category: QualificationCategory;
  name: string;                      // 中文名称，如"营业执照"
  required: boolean;
  requirements: string[];            // 具体要求列表
  tips: string;                      // 实用提示
  fields: Array<{                    // 需要用户填写的字段
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    placeholder: string;
    validation?: string;             // 校验规则描述
  }>;
}

// AI 校验结果
interface AICheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  issues: Array<{
    field: string;                   // 问题字段
    problem: string;                 // 问题描述
    suggestion: string;              // 修改建议
  }>;
  summary: string;                   // 总结说明
}

// 风险评估报告
interface RiskAssessmentReport {
  applicationId: string;
  overallRisk: 'low' | 'medium' | 'high';
  passRate: number;                  // 预估通过概率 0-100
  risks: Array<{
    category: string;                // 风险所属类别
    description: string;             // 风险描述
    severity: 'warning' | 'error';   // 严重程度
    suggestion: string;              // 改进建议
  }>;
  strengths: string[];               // 做得好的方面
  readySummary: string;              // 综合评价
}
```

### 3.5 AI 输出格式

必须定义结构化输出，避免前端依赖自然语言解析。

**材料清单输出格式：**
```json
{
  "type": "checklist",
  "sellerType": "professional",
  "region": "CN",
  "totalItems": 6,
  "items": [
    {
      "category": "business_license",
      "name": "营业执照",
      "required": true,
      "requirements": [
        "有效期距今≥60天",
        "经营范围含贸易/电商类目",
        "信息清晰完整可读"
      ],
      "tips": "个体户执照也可注册，但专业卖家建议使用企业执照，通过率更高",
      "fields": [
        { "key": "license_number", "label": "统一社会信用代码", "type": "text", "placeholder": "18位信用代码" },
        { "key": "company_name", "label": "企业名称", "type": "text", "placeholder": "与执照完全一致" },
        { "key": "legal_person", "label": "法定代表人", "type": "text", "placeholder": "与身份证姓名一致" },
        { "key": "expiry_date", "label": "有效期至", "type": "date", "placeholder": "YYYY-MM-DD" }
      ]
    }
  ]
}
```

**校验结果输出格式：**
```json
{
  "type": "verification",
  "category": "business_license",
  "passed": false,
  "riskLevel": "medium",
  "issues": [
    {
      "field": "expiry_date",
      "problem": "营业执照将在45天内到期，低于亚马逊要求的60天有效期",
      "suggestion": "建议先办理执照续期，再提交注册申请"
    }
  ],
  "summary": "营业执照基本信息完整，但有效期不足需处理"
}
```

**风险评估输出格式：**
```json
{
  "type": "risk_assessment",
  "overallRisk": "medium",
  "passRate": 65,
  "risks": [
    {
      "category": "business_license",
      "description": "执照有效期不足60天",
      "severity": "error",
      "suggestion": "办理续期后再提交"
    },
    {
      "category": "address_proof",
      "description": "注册地址与营业执照地址不一致",
      "severity": "warning",
      "suggestion": "确保所有材料中地址信息统一"
    }
  ],
  "strengths": ["法人信息一致", "信用卡类型符合要求", "联系方式格式正确"],
  "readySummary": "当前资料有2处需要修改，建议处理后再提交注册，预估通过概率65%"
}
```

## 4. 用户流程

### 主流程
```text
1. 打开应用 → 首页展示产品介绍 + "开始注册引导"按钮
2. 点击开始 → 选择卖家类型（个人/专业）和所在地区（中国大陆/香港/台湾）
3. AI 生成个性化材料清单 → 展示需准备的6项材料及具体要求
4. 进入逐项填写模式：
   a. 选择一项材料开始填写
   b. 按照 AI 提示的字段逐一输入信息
   c. 填写完成后 AI 实时校验，显示通过/警告/错误状态
   d. 有问题的字段标红并显示修改建议
   e. 修改后可重新校验
   f. 该项通过后，进入下一项
5. 全部材料填写完成 → 点击"综合评估"
6. AI 输出注册就绪报告：
   - 总体风险等级（低/中/高）
   - 预估通过概率
   - 具体风险点和改进建议
   - 做得好的方面（正向反馈）
7. （可选）用户可进入自由问答，咨询注册相关问题
```

### 异常流程
- AI 服务不可用：显示友好提示，提供静态版材料清单（Mock数据兜底）
- 用户中途离开：本地自动保存填写进度（Zustand persist）
- 校验不通过：明确标识问题字段，用户可选择修改或跳过（跳过的计入风险）

## 5. 约束条件
- 时间：24小时内完成开发
- 现场开发：核心代码必须现场完成
- Demo要求：必须可运行、可交互演示
- 评分重点：技术实现(40%) + 创意商业价值(30%) + 完成度(30%)
- 真实性：不能把赛前完整项目伪装成现场开发
- 密钥安全：不能硬编码 API Key / Token
- 合规边界：只做提示和引导，不承诺审核结果，不自动操作亚马逊后台
- 中文优先：所有 UI 文案、代码注释使用中文
- AI模型：必须使用 DeepSeek API（国内可访问），备选智谱/通义千问
- 降级方案：AI 失败时使用 Mock 数据保证 Demo 可演示

## 6. 验收标准
- [ ] 资质清单生成功能完整可用（输入卖家类型→输出材料清单）
- [ ] 逐项资料校验功能完整可用（输入资料→输出校验结果）
- [ ] 综合风险评估功能完整可用（全部资料→输出评估报告）
- [ ] AI 实际参与每个核心环节（非静态页面或写死数据）
- [ ] 流式响应体验流畅（打字机效果，非等待加载）
- [ ] UI 界面专业可交互（使用 shadcn/ui，视觉一致性好）
- [ ] 可在5分钟内完成完整 Demo 演示
- [ ] 部署上线可访问（Vercel 或本地兜底）
- [ ] DeepSeek 失败时有 Mock 降级方案，Demo 不中断
- [ ] 输出内容可解释（能说明输入什么、AI 做了什么、为何这样输出）
- [ ] PPT、GitHub 链接、5分钟录屏准备路径明确

## 7. Open Questions
- [ ] DeepSeek API Key 现场是否可用？（需提前申请并测试连通性）
- [ ] 是否需要实际文件上传功能？（MVP 建议只做文字信息输入，不做 OCR）
- [ ] Supabase 是否必要？（MVP 可用 Zustand persist 本地存储，省去数据库配置时间）
- [ ] 是否需要用户登录功能？（建议 MVP 不做，匿名使用）
- [ ] 5分钟演示时重点展示哪个功能？（建议：完整走一遍"专业卖家注册"流程）
