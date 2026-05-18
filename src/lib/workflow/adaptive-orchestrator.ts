import { generateDeepSeekJson } from '@/lib/ai/deepseek-json';
import {
  buildFallbackFirstQuestion,
  inferCurrentPhase,
  mergeRiskWarnings,
  mergeSessionPatch,
  normalizeStepResult,
  sanitizeSessionForAi,
  WORKFLOW_DISCLAIMER,
} from './guardrails';
import { buildKnownRegionalContext, retrieveRegionalContext } from './regional-context';
import type {
  RegionalContext,
  UserSession,
  WorkflowHistoryItem,
  WorkflowQuestion,
  WorkflowStepRequest,
  WorkflowStepResult,
} from './types';

const WORKFLOW_FRAME = `
你是营业执照注册引导 AI 顾问，正在驱动一个实时动态问答系统。

硬性原则：
1. 你主导下一问，但必须遵守阶段 0-9 的边界：0 类型判断、1 地区行业材料、2 主体专属信息、3 名称、4 经营范围、5 地址、6 材料缺口、7 注册步骤、8 后续事项、9 跨境电商附加。
2. 不要一次性让用户填大表。每次只问一个最关键问题，可以给清晰选项。
3. 地区化内容由你基于自身知识和 regionalContext 内置官方入口提示动态判断；具体办理入口、费用、时限必须提醒用户以当地官方平台最新页面为准。
4. 用户说“上海”后，应围绕上海企业登记在线/一网通办等地区入口和你掌握的上海登记特点调整问题和依据。
5. 如果行业是跨境电商，阶段 4 经营范围要考虑进出口相关表述，最终进入阶段 9。
6. regionalContext.actionCards 是本地已核验的官方办理事项卡片。你必须优先复用这些卡片组织下一问旁边的办理入口，不允许只写“去官网办理”。
7. actionCards 必须写成“打开哪个入口、找哪个栏目/按钮、填哪些字段、下一步做什么”。如果按钮名称无法从内置资料确认，必须写“在页面搜索/选择对应事项”，不能编造精确按钮名。
8. 输出必须是合法 JSON 对象，不要 Markdown。

必须输出字段：
{
  "sessionPatch": {}, 
  "currentPhase": 0-9,
  "phaseLabel": "阶段名称",
  "nextQuestion": {
    "id": "稳定节点id",
    "phase": 0-9,
    "question": "只问一个问题",
    "questionType": "single_choice|multi_choice|text_input|confirm",
    "fieldKey": "要写入的字段路径",
    "helperText": "为什么要问",
    "options": [{"label":"", "value":"", "description":""}]
  },
  "riskWarnings": [{"id":"", "title":"", "message":"", "severity":"info|warning|critical", "source":"deepseek"}],
  "materialGaps": [{"name":"", "status":"ready|missing|needs_review", "reason":"", "action":""}],
  "rationale": "说明你根据哪些回答和地区来源做判断",
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
  }],
  "canGenerateFinalPlan": false,
  "finalPlanPreview": "方案预览"
}
`;

export async function runAdaptiveWorkflowStep(request: WorkflowStepRequest): Promise<WorkflowStepResult> {
  const answeredSession = applyAnswerToSession(
    request.session,
    request.currentQuestion ?? null,
    request.answer,
  );
  const regionalContext = await retrieveRegionalContext(answeredSession);
  const result = await callDeepSeekForStep(answeredSession, request.history, request.currentQuestion ?? null, request.answer, regionalContext);

  return {
    ...result,
    riskWarnings: mergeRiskWarnings(result.session, result.riskWarnings),
    sources: regionalContext.sources,
    actionCards: result.actionCards.length ? result.actionCards : regionalContext.actionCards,
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}

export async function runAdaptiveWorkflowStepWithoutRealtime(request: WorkflowStepRequest): Promise<WorkflowStepResult> {
  const answeredSession = applyAnswerToSession(
    request.session,
    request.currentQuestion ?? null,
    request.answer,
  );
  const regionalContext = buildKnownRegionalContext(answeredSession);
  const result = await callDeepSeekForStep(answeredSession, request.history, request.currentQuestion ?? null, request.answer, regionalContext);

  return {
    ...result,
    riskWarnings: mergeRiskWarnings(result.session, result.riskWarnings),
    sources: regionalContext.sources,
    actionCards: result.actionCards.length ? result.actionCards : regionalContext.actionCards,
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}

function applyAnswerToSession(
  session: UserSession,
  question: WorkflowQuestion | null,
  answer: string | string[] | undefined,
): UserSession {
  if (!question || answer === undefined || answer === '') return session;
  const answerText = Array.isArray(answer) ? answer.join('、') : answer;
  const patch = buildPatchFromField(question.fieldKey, answerText);
  return mergeSessionPatch(session, patch);
}

async function callDeepSeekForStep(
  session: UserSession,
  history: WorkflowHistoryItem[],
  currentQuestion: WorkflowQuestion | null,
  answer: string | string[] | undefined,
  regionalContext: RegionalContext,
): Promise<Omit<WorkflowStepResult, 'sources' | 'disclaimer'>> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('缺少 DEEPSEEK_API_KEY，无法由 DeepSeek 自适应生成下一问。');
  }

  const phase = inferCurrentPhase(session);
  const prompt = `${WORKFLOW_FRAME}

当前阶段推断：${phase}

regionalContext:
${JSON.stringify(regionalContext, null, 2)}

当前 UserSession（已脱敏）:
${JSON.stringify(sanitizeSessionForAi(session), null, 2)}

最近问答历史:
${JSON.stringify(history.slice(-12), null, 2)}

当前问题:
${JSON.stringify(currentQuestion, null, 2)}

用户刚刚回答:
${JSON.stringify(answer ?? null)}

请根据用户刚刚回答更新 sessionPatch，并决定最该问的下一问。`;

  const payload = await generateDeepSeekJson<unknown>('deepseek-chat', prompt, '自适应工作流下一步');
  return normalizeStepResult(payload, session, regionalContext.actionCards);
}

function buildPatchFromField(fieldKey: string, answer: string): Partial<UserSession> {
  switch (fieldKey) {
    case 'registrationType':
      return answer === 'individual' || answer.includes('个体')
        ? { registrationType: 'individual' }
        : answer === 'company' || answer.includes('公司') || answer.includes('有限')
          ? { registrationType: 'company' }
          : {};
    case 'location':
    case 'location.city':
      return { location: inferLocation(answer) };
    case 'industry':
      return { industry: answer };
    case 'existingMaterials':
      return { existingMaterials: splitAnswer(answer) };
    case 'companySubType':
      return answer.includes('一人') || answer === 'one_person'
        ? { companySubType: 'one_person' }
        : { companySubType: 'multi_person' };
    case 'companyInfo.registeredCapital':
      return { companyInfo: { registeredCapital: parseCapital(answer) } as UserSession['companyInfo'] };
    case 'companyInfo.legalRepresentative':
      return { companyInfo: { legalRepresentative: answer } as UserSession['companyInfo'] };
    case 'companyInfo.supervisor':
      return { companyInfo: { supervisor: answer } as UserSession['companyInfo'] };
    case 'companyInfo.shareholders':
      return { companyInfo: { shareholders: splitAnswer(answer).map((name) => ({
        name,
        idNumber: '',
        investmentRatio: 0,
        investmentAmount: 0,
        investmentDeadline: '',
      })) } as UserSession['companyInfo'] };
    case 'individualInfo.ownerName':
      return { individualInfo: { ownerName: answer } as UserSession['individualInfo'] };
    case 'individualInfo.phone':
      return { individualInfo: { phone: answer } as UserSession['individualInfo'] };
    case 'individualInfo.operationType':
      return { individualInfo: { operationType: answer.includes('家庭') ? 'family' : 'personal' } as UserSession['individualInfo'] };
    case 'nameOptions':
      return { nameOptions: splitAnswer(answer).map((tradeName, index) => ({
        fullName: tradeName,
        administrativeDivision: '',
        tradeName,
        industryTerm: '',
        organizationForm: '',
        isPrimary: index === 0,
      })) };
    case 'businessScope':
    case 'businessScope.mainScope':
      return { businessScope: { mainScope: splitAnswer(answer) } as UserSession['businessScope'] };
    case 'address.type':
      return { address: { type: inferAddressType(answer) } as UserSession['address'] };
    case 'address.fullAddress':
      return { address: { fullAddress: answer } as UserSession['address'] };
    case 'registrationProgress.status':
      return { registrationProgress: { status: answer.includes('通过') ? 'approved' : 'preparing' } as UserSession['registrationProgress'] };
    default:
      return inferPatchFromAnswer(answer);
  }
}

function inferPatchFromAnswer(answer: string): Partial<UserSession> {
  const patch: Partial<UserSession> = {};
  if (/个体/.test(answer)) patch.registrationType = 'individual';
  if (/公司|有限责任|有限公司/.test(answer)) patch.registrationType = 'company';
  if (/上海|北京|成都|厦门|深圳|广州|杭州|南京|武汉|海南|福建|四川|广东/.test(answer)) {
    patch.location = inferLocation(answer);
  }
  if (/跨境|亚马逊|Amazon|电商|餐饮|食品|软件|咨询|贸易/.test(answer)) {
    patch.industry = answer;
  }
  return patch;
}

function inferLocation(answer: string): UserSession['location'] {
  const clean = answer.replace(/\s+/g, '');
  const provinces = ['上海', '北京', '四川', '福建', '广东', '浙江', '江苏', '湖北', '海南', '山东', '河南', '湖南', '重庆'];
  const cities = ['上海', '北京', '成都', '厦门', '深圳', '广州', '杭州', '南京', '武汉', '海口', '重庆'];
  const province = provinces.find((item) => clean.includes(item)) || '';
  const city = cities.find((item) => clean.includes(item)) || province;
  return { province, city, district: '' };
}

function inferAddressType(answer: string): '' | 'owned' | 'rented' | 'residential' | 'virtual' | 'incubator' {
  if (/自有|产权|自己的/.test(answer)) return 'owned';
  if (/租|合同|商铺|办公室/.test(answer)) return 'rented';
  if (/住宅|家里|小区|住址/.test(answer)) return 'residential';
  if (/虚拟|挂靠|秘书/.test(answer)) return 'virtual';
  if (/园区|孵化|众创/.test(answer)) return 'incubator';
  return '';
}

function parseCapital(answer: string): number {
  const match = answer.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function splitAnswer(answer: string): string[] {
  return answer
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildInitialWorkflowStep(session: UserSession): WorkflowStepResult {
  const context = buildKnownRegionalContext(session);
  return {
    session,
    currentPhase: 0,
    phaseLabel: '欢迎与意图识别',
    nextQuestion: buildFallbackFirstQuestion(),
    riskWarnings: [],
    materialGaps: [],
    rationale: '首次进入先识别主体类型，后续每一步会结合官方办理资料继续追问。',
    sources: context.sources,
    actionCards: context.actionCards,
    canGenerateFinalPlan: false,
    finalPlanPreview: '先回答主体类型后，会根据你的地区和行业继续调整问题。',
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}
