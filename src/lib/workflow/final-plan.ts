import { generateDeepSeekJson } from '@/lib/ai/deepseek-json';
import {
  buildGuardrailFinalPlan,
  mergeRiskWarnings,
  normalizeActionCards,
  sanitizeSessionForAi,
  WORKFLOW_DISCLAIMER,
} from './guardrails';
import { retrieveRegionalContext } from './regional-context';
import type {
  FinalWorkflowPlan,
  MaterialGap,
  MaterialStatus,
  RegionalActionSource,
  RegionalContext,
  RegionalSource,
  RiskWarning,
  WarningSeverity,
  WorkflowMaterialCategory,
  WorkflowMaterialItem,
  WorkflowRoadmapStep,
  WorkflowFinalPlanRequest,
} from './types';

const FINAL_PLAN_FRAME = `
你是营业执照注册方案顾问，需要生成用户可照着执行的最终方案。

要求：
1. 必须基于 UserSession、问答历史、regionalContext 内置官方入口提示，以及你自身掌握的地区政策知识。
2. 按用户地区生成入口和操作提示，不要使用泛化流程替代地区差异；但具体办理入口、费用、时限必须提示用户以官方平台最新页面为准。
3. 必须优先输出按办理顺序排列的 roadmapSteps。它是最终方案主结构，告诉用户先办什么、后办什么、最后办什么。
4. 如果是跨境电商，必须包含进出口权、Amazon 注册材料、海外收款账户等附加步骤。
5. regionalContext.actionCards 是本地已核验或保守整理的官方办理事项卡片。最终方案每个大步骤应尽量附上相关 actionCards。
6. 不允许只写“去官网办理”。必须写入口链接、点击路径、需要填写/准备的信息和注意事项。
7. 如果入口页面按钮名称无法从内置资料确认，必须写“在页面搜索/选择对应事项”，不能编造精确按钮、费用或时限。
8. 对刻章、税务、银行开户等后续事项，入口不明确时写“咨询政务大厅/公安备案刻章点/电子税务局/银行官方预约”，不要伪造链接。
9. 只能复用 regionalContext 里的官方入口、依据页和本地资料包链接；不能自己编新的办理 URL。
10. “公司财产独立证明/财产证明”只能作为一人有限公司风险留存材料，不能写成设立登记必交材料。
11. 所有结论都保持提示和草稿定位，不承诺审批通过。
12. 输出合法 JSON 对象，不要 Markdown。

输出字段：
{
  "title": "",
  "summary": "",
  "materialChecklist": [{"name":"", "status":"ready|missing|needs_review", "reason":"", "action":""}],
  "roadmapSteps": [{
    "order": 1,
    "phase": 0-9,
    "title": "事项名称",
    "whenToDo": "什么时候办",
    "agency": "办理机构",
    "officialUrl": "只能使用 regionalContext 中已有官方入口",
    "guideUrl": "只能使用 regionalContext 中已有依据或教程链接，可为空",
    "materials": [{
      "name": "材料名称",
      "category": "required_registration|address|personnel_signature|post_registration|cross_border|risk_retention",
      "status": "ready|missing|needs_review",
      "required": true,
      "appliesTo": "适用场景",
      "provider": "谁提供/去哪办",
      "howToPrepare": "如何准备",
      "officialBasis": "官方依据或保守依据说明",
      "sourceUrl": "只能使用 regionalContext 中已有链接，可为空"
    }],
    "actions": ["打开哪个官网", "选择或搜索哪个事项", "填哪些字段", "下一步做什么"],
    "blockingRules": ["不满足时不能进入下一步的条件"],
    "nextStepHint": "完成后进入哪一步",
    "actionCardIds": ["相关 regionalContext.actionCards id"]
  }],
  "materialsByStep": [{"order":1,"stepTitle":"","materials": []}],
  "registrationSteps": [{"title":"", "items":[""], "actionCards": []}],
  "postRegistrationSteps": [{"title":"", "items":[""], "actionCards": []}],
  "crossBorderSteps": [{"title":"", "items":[""], "actionCards": []}],
  "riskWarnings": [{"id":"", "title":"", "message":"", "severity":"info|warning|critical", "source":"deepseek"}],
  "timelineEstimate": "",
  "sourceNotes": [{"title":"", "url":"", "snippet":"", "sourceType":"official|search"}],
  "actionCards": [{
    "id": "复用 regionalContext.actionCards 的 id 或稳定id",
    "category": "name_declaration|company_registration|individual_registration|address_registration|seal_carving|tax_registration|bank_account|social_security|cross_border|national_rules|general_portal",
    "title": "事项名称",
    "appliesTo": ["适用对象"],
    "entryUrl": "官方入口URL",
    "sourceUrl": "依据页URL，可为空",
    "clickPath": ["打开哪个入口", "找哪个事项或在页面搜索", "填哪些字段", "下一步做什么"],
    "requiredInputs": ["需要提前准备的信息"],
    "warnings": ["注意事项"],
    "fallbackText": "入口按钮不明确时的处理方式"
  }]
}
`;

export async function generateAdaptiveFinalPlan(request: WorkflowFinalPlanRequest): Promise<FinalWorkflowPlan> {
  const regionalContext = await retrieveRegionalContext(request.session);
  const fallback = buildGuardrailFinalPlan(request.session, regionalContext.sources, regionalContext.actionCards);
  let aiPlan: FinalWorkflowPlan;
  try {
    aiPlan = await callDeepSeekForFinalPlan(request, regionalContext);
  } catch (error) {
    if (!isRecoverableDeepSeekJsonError(error)) {
      throw error;
    }
    console.warn('[workflow-final-plan] DeepSeek 最终方案解析失败，使用本地护栏方案兜底:', error);
    aiPlan = fallback;
  }
  const roadmapSteps = aiPlan.roadmapSteps.length ? aiPlan.roadmapSteps : fallback.roadmapSteps;
  return {
    ...aiPlan,
    roadmapSteps,
    materialsByStep: aiPlan.materialsByStep.length ? aiPlan.materialsByStep : buildMaterialsByStepFromRoadmap(roadmapSteps),
    riskWarnings: mergeRiskWarnings(request.session, aiPlan.riskWarnings),
    sourceNotes: aiPlan.sourceNotes.length ? aiPlan.sourceNotes : regionalContext.sources,
    actionCards: aiPlan.actionCards.length ? aiPlan.actionCards : regionalContext.actionCards,
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}

async function callDeepSeekForFinalPlan(
  request: WorkflowFinalPlanRequest,
  regionalContext: RegionalContext,
): Promise<FinalWorkflowPlan> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('缺少 DEEPSEEK_API_KEY，无法由 DeepSeek 生成最终方案。');
  }

  const prompt = `${FINAL_PLAN_FRAME}

regionalContext:
${JSON.stringify(regionalContext, null, 2)}

UserSession（已脱敏）:
${JSON.stringify(sanitizeSessionForAi(request.session), null, 2)}

问答历史:
${JSON.stringify(request.history.slice(-30), null, 2)}

请生成完整最终方案。`;

  const payload = await generateDeepSeekJson<unknown>('deepseek-chat', prompt, '自适应最终方案', {
    maxTokens: 8000,
  });
  return normalizeFinalPlan(payload, request, regionalContext);
}

function normalizeFinalPlan(
  value: unknown,
  request: WorkflowFinalPlanRequest,
  regionalContext: RegionalContext,
): FinalWorkflowPlan {
  const fallback = buildGuardrailFinalPlan(request.session, regionalContext.sources, regionalContext.actionCards);
  const row = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const actionCards = filterActionCardsForSession(
    normalizeActionCards(row.actionCards || row.regionalActionCards, regionalContext.actionCards),
    request,
  );
  const roadmapSteps = normalizeRoadmapSteps(row.roadmapSteps, fallback.roadmapSteps, regionalContext, actionCards);
  const materialsByStep = normalizeMaterialsByStep(row.materialsByStep, roadmapSteps);

  return {
    title: asString(row.title) || fallback.title,
    summary: asString(row.summary) || fallback.summary,
    materialChecklist: normalizeMaterialChecklist(row.materialChecklist) || fallback.materialChecklist,
    roadmapSteps,
    materialsByStep,
    registrationSteps: normalizeSections(row.registrationSteps, actionCards, request) || fallback.registrationSteps,
    postRegistrationSteps: normalizeSections(row.postRegistrationSteps, actionCards, request) || fallback.postRegistrationSteps,
    crossBorderSteps: normalizeSections(row.crossBorderSteps, actionCards) || fallback.crossBorderSteps,
    riskWarnings: normalizeWarnings(row.riskWarnings) || fallback.riskWarnings,
    timelineEstimate: asString(row.timelineEstimate) || fallback.timelineEstimate,
    sourceNotes: normalizeSources(row.sourceNotes, regionalContext.sources, actionCards) || regionalContext.sources,
    actionCards,
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}

function normalizeMaterialChecklist(value: unknown): MaterialGap[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item, index) => {
    const row = toRecord(item);
    const status: MaterialStatus = row.status === 'ready' || row.status === 'needs_review' || row.status === 'missing'
      ? row.status
      : 'missing';
    return {
      name: asString(row.name) || `材料 ${index + 1}`,
      status,
      reason: asString(row.reason) || '根据当前会话判断。',
      action: asString(row.action) || '按官方要求准备。',
    };
  });
  return items.length ? items : null;
}

function normalizeSections(
  value: unknown,
  fallbackActionCards: RegionalActionSource[],
  request?: WorkflowFinalPlanRequest,
): FinalWorkflowPlan['registrationSteps'] | null {
  if (!Array.isArray(value)) return null;
  const sections = value.map((item, index) => {
    const row = toRecord(item);
    const items = Array.isArray(row.items)
      ? row.items.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
      : [];
    return {
      title: asString(row.title) || `步骤 ${index + 1}`,
      items,
      actionCards: filterActionCardsForSession(
        normalizeActionCards(row.actionCards, fallbackActionCards.filter((card) => shouldAttachCardToSection(card, asString(row.title), items))),
        request,
      ),
    };
  }).filter((section) => section.items.length);
  return sections.length ? sections : null;
}

function filterActionCardsForSession(
  cards: RegionalActionSource[],
  request?: WorkflowFinalPlanRequest,
): RegionalActionSource[] {
  if (!request || request.session.registrationType !== 'individual') return cards;
  return cards.filter((card) => card.category !== 'company_registration' && card.category !== 'bank_account');
}

function normalizeRoadmapSteps(
  value: unknown,
  fallbackSteps: WorkflowRoadmapStep[],
  regionalContext: RegionalContext,
  actionCards: RegionalActionSource[],
): WorkflowRoadmapStep[] {
  if (!Array.isArray(value) || !value.length) return fallbackSteps;
  const knownUrls = buildKnownUrlSet(regionalContext, actionCards, fallbackSteps);
  const parsed = value
    .map((item) => normalizeRoadmapStep(item, knownUrls))
    .filter((item): item is WorkflowRoadmapStep => Boolean(item));
  if (!parsed.length) return fallbackSteps;

  return fallbackSteps.map((fallback, index) => {
    const aiStep = parsed.find((step) => isSimilarStepTitle(step.title, fallback.title));
    if (!aiStep) return { ...fallback, order: index + 1 };

    return {
      ...fallback,
      order: index + 1,
      phase: fallback.phase,
      title: fallback.title,
      whenToDo: aiStep.whenToDo || fallback.whenToDo,
      agency: aiStep.agency || fallback.agency,
      officialUrl: acceptKnownUrl(aiStep.officialUrl, knownUrls) || fallback.officialUrl,
      guideUrl: acceptKnownUrl(aiStep.guideUrl, knownUrls) || fallback.guideUrl,
      materials: mergeMaterialItems(fallback.materials, aiStep.materials, knownUrls),
      actions: aiStep.actions.length ? aiStep.actions : fallback.actions,
      blockingRules: dedupeStrings([...fallback.blockingRules, ...aiStep.blockingRules]),
      nextStepHint: aiStep.nextStepHint || fallback.nextStepHint,
      actionCardIds: dedupeStrings([...(fallback.actionCardIds || []), ...(aiStep.actionCardIds || [])]),
    };
  });
}

function normalizeRoadmapStep(value: unknown, knownUrls: Set<string>): WorkflowRoadmapStep | null {
  const row = toRecord(value);
  const title = asString(row.title);
  if (!title) return null;
  const order = Number(row.order);
  return {
    order: Number.isFinite(order) && order > 0 ? Math.round(order) : 0,
    phase: normalizePhase(row.phase),
    title,
    whenToDo: asString(row.whenToDo),
    agency: asString(row.agency),
    officialUrl: acceptKnownUrl(asString(row.officialUrl), knownUrls),
    guideUrl: acceptKnownUrl(asString(row.guideUrl), knownUrls),
    materials: normalizeWorkflowMaterials(row.materials, knownUrls),
    actions: normalizeStringArray(row.actions),
    blockingRules: normalizeStringArray(row.blockingRules),
    nextStepHint: asString(row.nextStepHint),
    actionCardIds: normalizeStringArray(row.actionCardIds),
  };
}

function normalizeMaterialsByStep(
  value: unknown,
  roadmapSteps: WorkflowRoadmapStep[],
): FinalWorkflowPlan['materialsByStep'] {
  if (!Array.isArray(value) || !value.length) return buildMaterialsByStepFromRoadmap(roadmapSteps);
  const byOrder = new Map<number, WorkflowMaterialItem[]>();
  for (const item of value) {
    const row = toRecord(item);
    const order = Number(row.order);
    if (!Number.isFinite(order)) continue;
    const matched = roadmapSteps.find((step) => step.order === Math.round(order));
    if (!matched) continue;
    byOrder.set(matched.order, matched.materials);
  }

  return roadmapSteps.map((step) => ({
    order: step.order,
    stepTitle: step.title,
    materials: byOrder.get(step.order) || step.materials,
  }));
}

function buildMaterialsByStepFromRoadmap(
  roadmapSteps: WorkflowRoadmapStep[],
): FinalWorkflowPlan['materialsByStep'] {
  return roadmapSteps.map((step) => ({
    order: step.order,
    stepTitle: step.title,
    materials: step.materials,
  }));
}

function normalizeWorkflowMaterials(value: unknown, knownUrls: Set<string>): WorkflowMaterialItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeWorkflowMaterial(item, knownUrls))
    .filter((item): item is WorkflowMaterialItem => Boolean(item));
}

function normalizeWorkflowMaterial(value: unknown, knownUrls: Set<string>): WorkflowMaterialItem | null {
  const row = toRecord(value);
  const name = asString(row.name || row.title);
  if (!name) return null;
  return {
    name,
    category: normalizeMaterialCategory(row.category),
    status: normalizeMaterialStatus(row.status),
    required: typeof row.required === 'boolean' ? row.required : true,
    appliesTo: asString(row.appliesTo) || '当前办理步骤',
    provider: asString(row.provider) || asString(row.source) || '申请人按官方要求准备',
    howToPrepare: asString(row.howToPrepare || row.action || row.description) || '按官方页面要求准备并核验一致性。',
    officialBasis: asString(row.officialBasis || row.basis) || '以官方办理入口和登记机关页面要求为准。',
    sourceUrl: acceptKnownUrl(asString(row.sourceUrl), knownUrls),
  };
}

function mergeMaterialItems(
  fallback: WorkflowMaterialItem[],
  aiItems: WorkflowMaterialItem[],
  knownUrls: Set<string>,
): WorkflowMaterialItem[] {
  const merged = [...fallback];
  for (const item of aiItems) {
    const existingIndex = merged.findIndex((material) => material.name === item.name);
    const safeItem = {
      ...item,
      sourceUrl: acceptKnownUrl(item.sourceUrl, knownUrls),
    };
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        status: safeItem.status || merged[existingIndex].status,
        appliesTo: safeItem.appliesTo || merged[existingIndex].appliesTo,
        provider: safeItem.provider || merged[existingIndex].provider,
        howToPrepare: safeItem.howToPrepare || merged[existingIndex].howToPrepare,
        officialBasis: safeItem.officialBasis || merged[existingIndex].officialBasis,
        sourceUrl: safeItem.sourceUrl || merged[existingIndex].sourceUrl,
      };
      continue;
    }
    merged.push(safeItem);
  }
  return merged;
}

function normalizeWarnings(value: unknown): RiskWarning[] | null {
  if (!Array.isArray(value)) return null;
  const warnings = value.map((item, index) => {
    const row = toRecord(item);
    const severity: WarningSeverity = row.severity === 'info' || row.severity === 'critical' || row.severity === 'warning'
      ? row.severity
      : 'warning';
    const source: RiskWarning['source'] = row.source === 'guardrail' || row.source === 'regional' || row.source === 'deepseek'
      ? row.source
      : 'deepseek';
    return {
      id: asString(row.id) || `final-warning-${index}`,
      title: asString(row.title) || '风险提示',
      message: asString(row.message) || '请以官方要求为准。',
      severity,
      source,
    };
  });
  return warnings.length ? warnings : null;
}

function normalizeSources(
  value: unknown,
  fallbackSources: RegionalSource[],
  actionCards: RegionalActionSource[],
): FinalWorkflowPlan['sourceNotes'] | null {
  if (!Array.isArray(value)) return null;
  const knownUrls = new Set<string>([
    ...fallbackSources.map((source) => source.url).filter(Boolean),
    ...actionCards.flatMap((card) => [card.entryUrl, card.sourceUrl || '']).filter(Boolean),
  ]);
  const sources = value.map((item) => {
    const row = toRecord(item);
    const url = asString(row.url);
    if (!url || !knownUrls.has(url)) return null;
    const sourceType: RegionalSource['sourceType'] = row.sourceType === 'official' || row.sourceType === 'search'
      ? row.sourceType
      : 'official';
    return {
      title: asString(row.title) || url,
      url,
      snippet: asString(row.snippet),
      sourceType,
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return sources.length ? sources : null;
}

function buildKnownUrlSet(
  regionalContext: RegionalContext,
  actionCards: RegionalActionSource[],
  fallbackSteps: WorkflowRoadmapStep[],
): Set<string> {
  return new Set([
    ...regionalContext.sources.map((source) => source.url),
    ...actionCards.flatMap((card) => [card.entryUrl, card.sourceUrl || '']),
    ...fallbackSteps.flatMap((step) => [step.officialUrl, step.guideUrl || '', ...step.materials.map((material) => material.sourceUrl || '')]),
  ].filter(Boolean));
}

function acceptKnownUrl(value: unknown, knownUrls: Set<string>): string {
  const url = asString(value);
  if (!url) return '';
  return knownUrls.has(url) ? url : '';
}

function normalizeMaterialCategory(value: unknown): WorkflowMaterialCategory {
  const category = asString(value);
  const allowed: WorkflowMaterialCategory[] = [
    'required_registration',
    'address',
    'personnel_signature',
    'post_registration',
    'cross_border',
    'risk_retention',
  ];
  return allowed.includes(category as WorkflowMaterialCategory)
    ? category as WorkflowMaterialCategory
    : 'required_registration';
}

function normalizeMaterialStatus(value: unknown): MaterialStatus {
  return value === 'ready' || value === 'needs_review' || value === 'missing'
    ? value
    : 'missing';
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean);
  }
  const text = asString(value);
  return text ? [text] : [];
}

function normalizePhase(value: unknown): number {
  const phase = Number(value);
  if (!Number.isFinite(phase)) return 0;
  return Math.max(0, Math.min(9, Math.round(phase)));
}

function dedupeStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function isSimilarStepTitle(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const keywords = ['名称', '材料', '设立', '住所', '签名', '审核', '领照', '刻章', '银行', '税务', '社保', '跨境'];
  return keywords.some((keyword) => a.includes(keyword) && b.includes(keyword));
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function shouldAttachCardToSection(card: RegionalActionSource, title: string, items: string[]): boolean {
  const text = [title, ...items].join(' ');
  if (card.category === 'name_declaration') return /名称|字号/.test(text);
  if (card.category === 'company_registration') return /公司|设立|开办|登记/.test(text);
  if (card.category === 'individual_registration') return /个体/.test(text);
  if (card.category === 'address_registration') return /地址|住所|经营场所/.test(text);
  if (card.category === 'seal_carving') return /刻章|公章|印章/.test(text);
  if (card.category === 'tax_registration') return /税务|申报|发票/.test(text);
  if (card.category === 'bank_account') return /银行|开户|账户/.test(text);
  if (card.category === 'social_security') return /社保|公积金|用工/.test(text);
  if (card.category === 'cross_border') return /跨境|Amazon|亚马逊|进出口|收款/.test(text);
  return /登记|材料|入口|办理/.test(text);
}

function isRecoverableDeepSeekJsonError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/缺少 DEEPSEEK_API_KEY|请求失败|DeepSeek .* 错误|没有返回内容|返回非 JSON 响应/.test(message)) {
    return false;
  }
  return /JSON|Unexpected|Expected|position|合法/.test(message);
}
