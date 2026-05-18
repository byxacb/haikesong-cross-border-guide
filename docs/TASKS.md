# 任务清单 (TASKS)

> 基于 `docs/SPEC.md` 分解，共 5 个阶段、16 个任务。每个任务可独立执行、可验证、可交接。

## 任务状态说明
- [ ] 待开始 | [~] 进行中 | [x] 已完成 | [!] 阻塞

## 任务质量标准

每个任务必须包含：

- 任务编号和名称
- 优先级
- 依赖关系
- 涉及文件
- 输入和输出
- 验收标准
- 测试命令或验证方式

---

## 阶段一：基础设施（预计 1h）

### T-001: 初始化 Next.js 14 工程
- **优先级**: P0
- **依赖**: 无
- **预估时间**: 20 分钟
- **涉及文件**:
  - package.json
  - tsconfig.json
  - next.config.js
  - src/app/layout.tsx
  - src/app/page.tsx
  - tailwind.config.ts
- **输入**:
  - Next.js 14 + App Router + TypeScript + Tailwind CSS 标准模板
- **输出**:
  - 可运行的 Next.js 14 项目骨架，含 Tailwind CSS 配置
- **验收标准**:
  - [ ] `npm run dev` 启动成功，访问 localhost:3000 显示默认页面
  - [ ] TypeScript 编译无错误
  - [ ] Tailwind CSS 样式生效
- **验证方式**:
  - `npm run build` 无报错
- **状态**: [ ]

### T-002: 安装配置 shadcn/ui
- **优先级**: P0
- **依赖**: T-001
- **预估时间**: 15 分钟
- **涉及文件**:
  - components.json
  - src/components/ui/*
  - src/lib/utils.ts
- **输入**:
  - shadcn/ui 初始化配置
- **输出**:
  - 完成以下组件安装：button, card, input, form, badge, progress, alert, tabs, separator, dialog, select, label, textarea
- **验收标准**:
  - [ ] 所有组件可正常 import
  - [ ] `npm run build` 无报错
  - [ ] components.json 配置正确
- **验证方式**:
  - `npm run build` 无报错
- **状态**: [ ]

### T-003: 配置 AI 集成层
- **优先级**: P0
- **依赖**: T-001
- **预估时间**: 25 分钟
- **涉及文件**:
  - src/lib/ai/models.ts
  - .env.local
  - package.json
- **输入**:
  - DeepSeek API 配置需求（baseURL: https://api.deepseek.com, 模型: deepseek-chat / deepseek-reasoner）
- **输出**:
  - 安装依赖：ai, @ai-sdk/openai, zod
  - DeepSeek 客户端配置文件，包含 createOpenAI 配置
  - .env.local 模板（含 DEEPSEEK_API_KEY 占位）
- **验收标准**:
  - [ ] TypeScript 编译无错误
  - [ ] 环境变量占位正确（.env.local 中有 DEEPSEEK_API_KEY）
  - [ ] models.ts 导出可用的模型实例
- **验证方式**:
  - `npm run build` 无报错
- **状态**: [ ]

---

## 阶段二：核心 AI 功能（预计 4-5h）

### T-004: Prompt 模板和 Zod Schema
- **优先级**: P0
- **依赖**: T-003
- **预估时间**: 60 分钟
- **涉及文件**:
  - src/lib/ai/prompts.ts
  - src/lib/ai/schemas.ts
  - src/types/domain.ts
- **输入**:
  - SPEC 中定义的数据模型（ChecklistItem, AICheckResult, RiskAssessmentReport）
  - SPEC 中定义的 AI 输出格式示例 JSON
- **输出**:
  - domain.ts：完整 TypeScript 类型定义
  - prompts.ts：3 套 Prompt 模板（清单生成 / 单项校验 / 风险评估）
  - schemas.ts：3 套 Zod Schema（checklistSchema / verifySchema / riskAssessSchema）
- **验收标准**:
  - [ ] Schema 可正确校验 SPEC 中的示例 JSON
  - [ ] TypeScript 类型与 Zod Schema 一致
  - [ ] Prompt 模板包含清晰的角色设定和输出格式要求
- **验证方式**:
  - `npm run build` 无报错
- **状态**: [ ]

### T-005: 实现 /api/ai/checklist 端点
- **优先级**: P0
- **依赖**: T-004
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/app/api/ai/checklist/route.ts
- **输入**:
  - `{ sellerType: 'individual' | 'professional', region: string }`
- **输出**:
  - 流式返回 ChecklistItem[] JSON（包含 category, name, required, requirements, tips, fields）
- **AI处理**:
  - 基于卖家类型和地区，调用 DeepSeek 生成个性化材料清单
  - 使用 generateObject + checklistSchema 约束输出格式
- **验收标准**:
  - [ ] curl POST 得到合法 JSON
  - [ ] 返回结果包含正确的 category 和 fields
  - [ ] 流式响应正常工作
- **验证方式**:
  - `curl -X POST http://localhost:3000/api/ai/checklist -H "Content-Type: application/json" -d '{"sellerType":"professional","region":"CN"}'`
- **状态**: [ ]

### T-006: 实现 /api/ai/verify 端点
- **优先级**: P0
- **依赖**: T-004
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/app/api/ai/verify/route.ts
- **输入**:
  - `{ category: QualificationCategory, userInput: Record<string, string> }`
- **输出**:
  - AICheckResult（passed, riskLevel, issues[], summary）
- **AI处理**:
  - 校验信息一致性（如执照号格式、姓名匹配）
  - 校验格式合规性
  - 使用 generateObject + verifySchema 约束输出
- **验收标准**:
  - [ ] curl POST 得到合法 AICheckResult JSON
  - [ ] issues 数组中每项包含 field, problem, suggestion
  - [ ] riskLevel 为 'low' | 'medium' | 'high' 之一
- **验证方式**:
  - `curl -X POST http://localhost:3000/api/ai/verify -H "Content-Type: application/json" -d '{"category":"business_license","userInput":{"license_number":"91110000MA01XXXXX","company_name":"测试公司"}}'`
- **状态**: [ ]

### T-007: 实现 /api/ai/risk-assess 端点
- **优先级**: P0
- **依赖**: T-004
- **预估时间**: 60 分钟
- **涉及文件**:
  - src/app/api/ai/risk-assess/route.ts
- **输入**:
  - `{ applicationId: string, allQualifications: QualificationItem[] }`
- **输出**:
  - RiskAssessmentReport（overallRisk, passRate, risks[], strengths[], readySummary）
- **AI处理**:
  - 综合评估所有资料完整性和一致性
  - 对照常见驳回原因库（资料不一致、格式不合规、信息遗漏等）
  - 使用 generateObject + riskAssessSchema 约束输出
- **验收标准**:
  - [ ] curl POST 得到合法 RiskAssessmentReport JSON
  - [ ] passRate 为 0-100 之间的数值
  - [ ] overallRisk 为 'low' | 'medium' | 'high' 之一
  - [ ] risks 数组包含 category, description, severity, suggestion
- **验证方式**:
  - `curl -X POST http://localhost:3000/api/ai/risk-assess -H "Content-Type: application/json" -d '{"applicationId":"test-001","allQualifications":[...]}'`
- **状态**: [ ]

### T-008: Mock 降级方案
- **优先级**: P1
- **依赖**: T-005, T-006, T-007
- **预估时间**: 30 分钟
- **涉及文件**:
  - src/lib/ai/mock.ts
  - src/app/api/ai/checklist/route.ts（增加 try-catch 降级）
  - src/app/api/ai/verify/route.ts（增加 try-catch 降级）
  - src/app/api/ai/risk-assess/route.ts（增加 try-catch 降级）
- **输入**:
  - SPEC 中的示例 JSON 数据作为 Mock 模板
- **输出**:
  - 3 个 Mock 函数：mockChecklist(), mockVerify(), mockRiskAssess()
  - 各 route.ts 增加 try-catch，AI 失败时自动降级到 Mock
- **验收标准**:
  - [ ] 设置无效 API Key 时，API 仍返回合法（Mock）JSON
  - [ ] Mock 数据结构与真实 AI 输出格式一致
  - [ ] 降级时控制台有明确的 warn 日志
- **验证方式**:
  - 将 .env.local 中 DEEPSEEK_API_KEY 设为无效值，curl 调用各端点验证返回 Mock 数据
- **状态**: [ ]

---

## 阶段三：前端界面（预计 3-4h）

### T-009: 首页 + 卖家类型选择
- **优先级**: P0
- **依赖**: T-002
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/app/page.tsx
  - src/app/(routes)/select/page.tsx
  - src/components/features/seller-type-select.tsx
- **输入**:
  - 产品介绍文案（SPEC 1.3 解决方案描述）
  - 卖家类型选项：个人卖家 / 专业卖家
  - 地区选项：中国大陆 / 香港 / 台湾
- **输出**:
  - 首页：产品介绍 + "开始注册引导"按钮
  - 选择页：卖家类型卡片选择 + 地区下拉选择 + "下一步"按钮
- **验收标准**:
  - [ ] 首页展示产品介绍和"开始"按钮
  - [ ] 点击进入选择页，可选个人/专业卖家和地区
  - [ ] 选择后点击下一步可跳转到清单页
  - [ ] UI 视觉美观、响应式适配
- **验证方式**:
  - 浏览器访问 localhost:3000，手动操作验证流程
- **状态**: [ ]

### T-010: 材料清单展示组件
- **优先级**: P0
- **依赖**: T-005, T-009
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/app/(routes)/checklist/page.tsx
  - src/components/features/checklist-display.tsx
- **输入**:
  - /api/ai/checklist 接口返回的 ChecklistItem[] 数据
- **输出**:
  - 材料清单展示页面，支持流式加载动画
  - 每项显示：名称、是否必需标记、具体要求列表、实用提示
  - 底部"开始填写"按钮
- **验收标准**:
  - [ ] 流式加载展示材料清单，有加载动画
  - [ ] 每项显示名称、要求、提示
  - [ ] 必需项有明显标记
  - [ ] 点击"开始填写"进入表单填写页
- **验证方式**:
  - 浏览器访问清单页，观察流式加载效果和内容展示
- **状态**: [ ]

### T-011: 资料填写表单 + AI 校验反馈
- **优先级**: P0
- **依赖**: T-006, T-010
- **预估时间**: 90 分钟
- **涉及文件**:
  - src/app/(routes)/fill/page.tsx
  - src/components/features/qualification-form.tsx
  - src/components/features/check-result.tsx
- **输入**:
  - ChecklistItem 中定义的 fields（字段列表）
  - /api/ai/verify 接口的校验结果
- **输出**:
  - 逐项表单页面：按 category 分组，展示对应字段输入框
  - 校验结果组件：通过（绿色）/ 警告（黄色）/ 错误（红色）状态
  - 问题字段标红并显示修改建议
- **验收标准**:
  - [ ] 逐项表单可填写，字段类型正确（text/number/date/select）
  - [ ] 提交后显示 AI 校验结果（通过/警告/错误）
  - [ ] 问题字段标红并显示具体建议
  - [ ] 校验通过后可进入下一项
  - [ ] 全部通过后可跳转到风险评估
- **验证方式**:
  - 浏览器手动填写表单，观察校验反馈效果
- **状态**: [ ]

### T-012: 风险评估报告页
- **优先级**: P0
- **依赖**: T-007, T-011
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/app/(routes)/report/page.tsx
  - src/components/features/risk-report.tsx
- **输入**:
  - /api/ai/risk-assess 接口返回的 RiskAssessmentReport 数据
- **输出**:
  - 风险评估报告页面，包含：
    - 总体风险等级（色彩化展示：低=绿/中=黄/高=红）
    - 预估通过概率（进度条）
    - 风险列表（按严重程度排序）
    - 优势列表（正向反馈）
    - 综合建议文字
- **验收标准**:
  - [ ] 展示总体风险等级，颜色区分
  - [ ] 展示通过概率进度条
  - [ ] 风险列表包含描述和改进建议
  - [ ] 优势列表展示做得好的方面
  - [ ] 综合建议清晰可读
- **验证方式**:
  - 浏览器访问报告页，验证数据展示完整性
- **状态**: [ ]

---

## 阶段四：联调与状态管理（预计 2h）

### T-013: Zustand 状态管理 + 本地持久化
- **优先级**: P1
- **依赖**: T-001
- **预估时间**: 45 分钟
- **涉及文件**:
  - src/stores/app-store.ts
  - src/hooks/use-store.ts
- **输入**:
  - RegistrationApplication 数据模型
  - 应用状态需求：当前步骤、卖家类型、地区、各项填写数据、校验结果
- **输出**:
  - 全局 store：管理 application 状态、当前步骤、各项填写数据
  - 本地持久化：使用 zustand/middleware persist，数据存储在 localStorage
  - useStore hook：封装 hydration 处理，避免 SSR 不一致
- **验收标准**:
  - [ ] 全局状态可在各页面共享
  - [ ] 刷新页面后填写进度不丢失
  - [ ] SSR hydration 无警告
- **验证方式**:
  - 填写部分数据后刷新页面，验证数据仍在
- **状态**: [ ]

### T-014: 端到端联调 + 错误处理
- **优先级**: P0
- **依赖**: T-010, T-011, T-012, T-013
- **预估时间**: 75 分钟
- **涉及文件**:
  - 所有页面（src/app/(routes)/*/page.tsx）
  - 所有 API 路由（src/app/api/ai/*/route.ts）
  - src/stores/app-store.ts
- **输入**:
  - 完整用户流程：首页 → 选择 → 清单 → 填写 → 报告
- **输出**:
  - 全流程联调通过
  - 错误处理：AI 异常时 Mock 兜底、网络错误友好提示、加载状态展示
  - 页面间数据正确传递
- **验收标准**:
  - [ ] 从首页到报告完整走通，无中断
  - [ ] AI 异常时 Mock 兜底生效
  - [ ] 网络错误有友好提示（toast 或 alert）
  - [ ] 各页面加载状态有 skeleton 或 spinner
  - [ ] 页面间跳转数据不丢失
- **验证方式**:
  - 手动走完全流程
  - 断开网络测试错误处理
  - 设置无效 API Key 测试 Mock 降级
- **状态**: [ ]

---

## 阶段五：演示准备（预计 1-2h）

### T-015: Vercel 部署
- **优先级**: P0
- **依赖**: T-014
- **预估时间**: 30 分钟
- **涉及文件**:
  - vercel.json
  - .env（Vercel Dashboard 配置）
- **输入**:
  - Vercel 账号和项目配置
  - 环境变量：DEEPSEEK_API_KEY
- **输出**:
  - 线上可访问的部署地址
  - 环境变量配置完成
- **验收标准**:
  - [ ] Vercel 部署成功
  - [ ] 线上环境可正常访问
  - [ ] 环境变量配置正确
  - [ ] AI 功能线上可用
- **验证方式**:
  - 访问 Vercel 部署 URL，完整走一遍流程
- **状态**: [ ]

### T-016: Demo 脚本与录屏
- **优先级**: P0
- **依赖**: T-015
- **预估时间**: 60 分钟
- **涉及文件**:
  - docs/DEMO-SCRIPT.md
- **输入**:
  - 线上可访问的 Demo 地址
  - 5 分钟演示时间限制
- **输出**:
  - 5 分钟演示脚本（含时间节点、操作步骤、话术要点）
  - 演示录屏（MP4）
  - PPT 路径明确
- **验收标准**:
  - [ ] 5 分钟演示脚本完成，节奏合理
  - [ ] 录屏完成，画质清晰
  - [ ] PPT 制作完成，包含项目介绍、技术架构、演示截图
  - [ ] GitHub 链接可访问
- **验证方式**:
  - 按脚本试演一遍，确认 5 分钟内可完成
- **状态**: [ ]

---

## 时间轴概览

| 时间段 | 阶段 | 关键产出 | 关键任务 |
|--------|------|----------|----------|
| 0-1h | 基础设施 | 项目初始化、UI 组件库、AI 配置 | T-001, T-002, T-003 |
| 1-5h | 核心 AI 功能 | Prompt/Schema、3 个 API 端点、Mock 降级 | T-004 ~ T-008 |
| 5-9h | 前端界面 | 首页、清单页、表单页、报告页 | T-009 ~ T-012 |
| 9-11h | 联调与状态管理 | Zustand 持久化、端到端联调、错误处理 | T-013, T-014 |
| 11-13h | 演示准备 | Vercel 部署、Demo 脚本、录屏 | T-015, T-016 |

## 风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI API 调用限流 | 核心功能不可用，演示中断 | T-008 Mock 降级方案兜底，确保 Demo 不中断 |
| DeepSeek 服务不稳定 | AI 响应慢或失败 | 备选模型（智谱 GLM-4）+ Mock 降级 + 超时重试 |
| 时间不足 | 功能不完整 | 严格按 P0 优先级砍需求，P1 任务可延后 |
| 合规表述过度 | 误导评委和用户 | 只写"提示/缺口/待确认"，不写"已合规/保证通过" |
| GitHub 提交不足 | 影响提交物完整性和真实性证明 | 尽早初始化 Git，每完成一个任务提交一次 |

---

## 依赖关系图

```text
T-001 ──┬── T-002 ── T-009 ──┐
         │                     ├── T-010 ── T-011 ── T-012 ──┐
         ├── T-003 ── T-004 ──┤                              │
         │              │      ├── T-005 ─────────────────────┤
         │              │      ├── T-006 ─────────────────────┤
         │              │      └── T-007 ─────────────────────┤
         │              │                                      │
         │              └──────── T-008 ──────────────────────┤
         │                                                     │
         └── T-013 ───────────────────────────────────────────┼── T-014 ── T-015 ── T-016
```
