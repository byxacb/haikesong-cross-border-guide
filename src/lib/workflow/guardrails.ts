import type {
  FinalWorkflowPlan,
  MaterialGap,
  RegionalActionCategory,
  RegionalActionSource,
  RegionalSource,
  RiskWarning,
  UserSession,
  WorkflowMaterialCategory,
  WorkflowMaterialItem,
  WorkflowQuestion,
  WorkflowRoadmapStep,
  WorkflowStepResult,
} from './types';

export const WORKFLOW_DISCLAIMER =
  '本系统提供的信息仅供参考，不构成法律、税务或财务建议。具体办理要求以当地市场监督管理局、政务服务平台和 Amazon 官方最新规定为准。正式办理前请咨询当地政务大厅或专业服务机构确认。';

export const PHASE_LABELS: Record<number, string> = {
  0: '欢迎与意图识别',
  1: '基础信息收集',
  2: '主体类型专属信息',
  3: '名称设计引导',
  4: '经营范围选择',
  5: '注册地址确认',
  6: '材料清单与缺口分析',
  7: '注册操作指引',
  8: '注册后续事项',
  9: '跨境电商附加引导',
};

export const SCOPE_TEMPLATES = {
  跨境电商: {
    main: ['经营电子商务', '国内贸易', '从事货物及技术的进出口业务'],
    secondary: ['日用百货销售', '服装服饰批发', '电子产品销售', '家居用品销售'],
    optional: ['供应链管理服务', '国际货物运输代理', '信息技术咨询服务'],
    reminder: "必须包含'从事货物及技术的进出口业务'才能办理进出口权",
  },
  '电商/网店': {
    main: ['经营电子商务', '互联网销售'],
    secondary: ['日用百货销售', '服装服饰批发', '电子产品销售'],
    optional: ['市场营销策划', '广告设计', '企业管理咨询'],
    reminder: '确保经营范围覆盖你实际销售的品类',
  },
  餐饮: {
    main: ['餐饮服务'],
    secondary: ['食品销售', '餐饮管理'],
    optional: ['食品互联网销售', '外卖递送服务'],
    reminder: '需要办理食品经营许可证，通常属于后置许可',
  },
  '软件/科技': {
    main: ['软件开发', '信息技术咨询服务'],
    secondary: ['技术服务、技术开发、技术咨询', '数据处理和存储支持服务'],
    optional: ['人工智能基础软件开发', '互联网数据服务'],
    reminder: '',
  },
  '自媒体/MCN': {
    main: ['互联网信息服务', '文化艺术咨询'],
    secondary: ['广告设计、代理', '市场营销策划', '企业形象策划'],
    optional: ['摄影扩印服务', '组织文化艺术交流活动'],
    reminder: '',
  },
  '贸易/批发': {
    main: ['国内贸易代理', '货物进出口'],
    secondary: ['日用百货销售', '五金产品批发', '电子产品销售'],
    optional: ['供应链管理服务', '仓储服务'],
    reminder: '',
  },
  '咨询/服务': {
    main: ['企业管理咨询', '商务信息咨询'],
    secondary: ['市场营销策划', '企业形象策划', '经济信息咨询'],
    optional: ['会议服务', '翻译服务'],
    reminder: '',
  },
} as const;

export const MATERIALS_INDIVIDUAL = [
  '经营者身份证',
  '经营地址证明',
  '名称备选',
  '经营范围',
  '手机号',
  '省政务服务网账号',
  '人脸识别和实名认证材料',
];

export const MATERIALS_COMPANY = [
  '法定代表人身份证',
  '全体股东身份证',
  '监事身份证',
  '注册地址证明',
  '名称备选',
  '经营范围',
  '注册资本方案',
  '公司章程',
  '人员任职信息',
  '省政务服务网账号',
  '全体股东电子签名准备',
];

export function createEmptyUserSession(): UserSession {
  return {
    registrationType: null,
    location: {
      province: '',
      city: '',
      district: '',
    },
    industry: '',
    industryCategory: '',
    existingMaterials: [],
    nameOptions: [],
    businessScope: {
      mainScope: [],
      secondaryScope: [],
      requiresLicense: false,
      licenseDetails: [],
    },
    address: {
      type: '',
      fullAddress: '',
      documentsReady: false,
      documents: [],
    },
    materialsChecklist: [],
    registrationProgress: {
      currentStep: 0,
      totalSteps: 9,
      status: 'preparing',
    },
    postRegistration: {
      sealCarved: false,
      bankAccountOpened: false,
      taxRegistered: false,
      socialInsurance: false,
      invoiceApplied: false,
      bookkeepingSetup: false,
    },
  };
}

export function mergeSessionPatch(session: UserSession, patch: unknown): UserSession {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return session;
  return deepMerge(session, patch as Partial<UserSession>);
}

export function sanitizeSessionForAi(session: UserSession): UserSession {
  return {
    ...session,
    individualInfo: session.individualInfo
      ? {
          ...session.individualInfo,
          idNumber: maskIdNumber(session.individualInfo.idNumber),
        }
      : undefined,
    companyInfo: session.companyInfo
      ? {
          ...session.companyInfo,
          shareholders: session.companyInfo.shareholders.map((shareholder) => ({
            ...shareholder,
            idNumber: maskIdNumber(shareholder.idNumber),
          })),
        }
      : undefined,
  };
}

export function normalizeQuestion(value: unknown, fallbackPhase: number): WorkflowQuestion {
  const row = asRecord(value);
  const questionType = row.questionType;
  const normalizedType =
    questionType === 'multi_choice' ||
    questionType === 'text_input' ||
    questionType === 'confirm' ||
    questionType === 'single_choice'
      ? questionType
      : 'text_input';

  const options = Array.isArray(row.options)
    ? row.options
        .map((option) => {
          if (typeof option === 'string') {
            return { label: option, value: option };
          }
          if (!option || typeof option !== 'object') return null;
          const optionRow = option as Record<string, unknown>;
          const label = stringify(optionRow.label || optionRow.value);
          if (!label) return null;
          return {
            label,
            value: stringify(optionRow.value || optionRow.label),
            description: stringify(optionRow.description),
          };
        })
        .filter((option): option is { label: string; value: string; description?: string } => Boolean(option))
    : [];

  return {
    id: stringify(row.id) || `ai-phase-${fallbackPhase}-${Date.now()}`,
    phase: clampPhase(Number(row.phase ?? fallbackPhase)),
    question: stringify(row.question) || '请补充你的真实情况，我们会继续判断下一步。',
    questionType: normalizedType,
    fieldKey: stringify(row.fieldKey) || 'general',
    helperText: stringify(row.helperText) || '该信息会影响后续材料清单、风险提示和办理路径。',
    options,
  };
}

export function normalizeStepResult(
  value: unknown,
  currentSession: UserSession,
  fallbackActionCards: RegionalActionSource[] = [],
): Omit<WorkflowStepResult, 'sources' | 'disclaimer'> {
  const row = asRecord(value);
  const phase = clampPhase(Number(row.currentPhase ?? row.phase ?? inferCurrentPhase(currentSession)));
  const patchedSession = mergeSessionPatch(currentSession, row.sessionPatch || row.session || {});
  const session = applyDerivedSession(patchedSession);
  const nextQuestion = normalizeQuestion(row.nextQuestion || row.question || {}, phase);
  const riskWarnings = normalizeWarnings(row.riskWarnings || row.warnings);
  const materialGaps = normalizeMaterialGaps(row.materialGaps || row.materialChecklist || row.gaps);
  const actionCards = normalizeActionCards(row.actionCards || row.regionalActionCards, fallbackActionCards);

  return {
    session,
    currentPhase: phase,
    phaseLabel: stringify(row.phaseLabel) || PHASE_LABELS[phase] || '动态问诊',
    nextQuestion,
    riskWarnings: mergeRiskWarnings(session, riskWarnings),
    materialGaps: materialGaps.length ? materialGaps : buildMaterialGaps(session),
    rationale: stringify(row.rationale) || '已结合当前回答、办理规则和地区资料生成下一步。',
    actionCards,
    canGenerateFinalPlan: Boolean(row.canGenerateFinalPlan) || hasMinimumPlanFields(session),
    finalPlanPreview: stringify(row.finalPlanPreview) || buildPlanPreview(session),
  };
}

export function buildMaterialGaps(session: UserSession): MaterialGap[] {
  const required = session.registrationType === 'individual' ? MATERIALS_INDIVIDUAL : MATERIALS_COMPANY;
  return required.map((name) => {
    const ready = session.existingMaterials.some((item) => item.includes(name) || name.includes(item));
    return {
      name,
      status: ready ? 'ready' : 'missing',
      reason: ready ? '用户已声明具备该材料。' : '当前会话尚未确认该材料已准备齐全。',
      action: ready ? '提交前核对材料清晰度和信息一致性。' : `按所在地登记机关要求准备${name}。`,
    };
  });
}

export function mergeRiskWarnings(session: UserSession, aiWarnings: RiskWarning[] = []): RiskWarning[] {
  const warnings = [...aiWarnings];
  const add = (warning: RiskWarning) => {
    if (!warnings.some((item) => item.id === warning.id)) warnings.push(warning);
  };

  if (session.companyInfo?.registeredCapital && session.companyInfo.registeredCapital > 100) {
    add({
      id: 'capital-over-100',
      title: '注册资本实缴风险',
      message: `注册资本 ${session.companyInfo.registeredCapital} 万元意味着需要在 5 年内完成实缴，并在该出资范围内承担责任。`,
      severity: 'critical',
      source: 'guardrail',
    });
  }

  if (session.companySubType === 'one_person') {
    add({
      id: 'one-person-company',
      title: '一人有限公司财产独立风险',
      message: '一人有限公司需重视公司财产与个人财产独立，通常还涉及年度审计和更严格的举证要求。',
      severity: 'warning',
      source: 'guardrail',
    });
  }

  if (session.businessScope.requiresLicense) {
    add({
      id: 'licensed-scope',
      title: '许可经营项目提醒',
      message: '当前经营范围包含许可经营项目，需确认前置或后置许可，在取得许可证前不得实际开展相应业务。',
      severity: 'warning',
      source: 'guardrail',
    });
  }

  if (session.registrationType === 'company' && session.address.type === 'residential') {
    add({
      id: 'residential-company-address',
      title: '住宅注册公司风险',
      message: "住宅地址注册公司通常需要办理'住改商'手续，并可能需要利害关系业主书面同意；部分城市不允许。",
      severity: 'warning',
      source: 'guardrail',
    });
  }

  if (session.address.type === 'virtual') {
    add({
      id: 'virtual-address',
      title: '虚拟地址备案风险',
      message: '请确认虚拟地址提供方已在市场监管部门备案，否则后续可能被列入经营异常名录。',
      severity: 'warning',
      source: 'guardrail',
    });
  }

  if (session.registrationProgress.status === 'approved') {
    add({
      id: 'tax-registration-30-days',
      title: '税务登记 30 天期限',
      message: '领取营业执照后请务必在 30 天内完成税务登记或税务报到，即使无收入也需要按期申报。',
      severity: 'critical',
      source: 'guardrail',
    });
  }

  return warnings;
}

export function applyDerivedSession(session: UserSession): UserSession {
  const industryCategory = session.industryCategory || inferIndustryCategory(session.industry);
  const scopeTemplate = SCOPE_TEMPLATES[industryCategory as keyof typeof SCOPE_TEMPLATES];
  const requiresLicense =
    session.businessScope.requiresLicense ||
    /餐饮|食品|教育|培训|医疗|药品|出版|互联网信息服务/.test([
      session.industry,
      ...session.businessScope.mainScope,
      ...session.businessScope.secondaryScope,
    ].join(' '));

  return {
    ...session,
    industryCategory,
    businessScope: {
      ...session.businessScope,
      mainScope: session.businessScope.mainScope.length
        ? session.businessScope.mainScope
        : scopeTemplate?.main ? [...scopeTemplate.main] : session.businessScope.mainScope,
      secondaryScope: session.businessScope.secondaryScope.length
        ? session.businessScope.secondaryScope
        : scopeTemplate?.secondary ? [...scopeTemplate.secondary] : session.businessScope.secondaryScope,
      requiresLicense,
      licenseDetails: requiresLicense && !session.businessScope.licenseDetails?.length
        ? [{ item: session.industry || '许可经营项目', licenseType: '需按当地要求确认许可证', timing: 'post' }]
        : session.businessScope.licenseDetails,
    },
  };
}

export function inferCurrentPhase(session: UserSession): number {
  if (!session.registrationType) return 0;
  if (!session.location.province || !session.location.city || !session.industry) return 1;
  if (session.registrationType === 'individual' && !session.individualInfo?.ownerName) return 2;
  if (session.registrationType === 'company' && !session.companyInfo?.legalRepresentative) return 2;
  if (!session.nameOptions.length) return 3;
  if (!session.businessScope.mainScope.length) return 4;
  if (!session.address.fullAddress) return 5;
  if (!session.materialsChecklist.length) return 6;
  if (session.registrationProgress.currentStep < 1) return 7;
  return /跨境|进出口|amazon|亚马逊/i.test(session.industry) ? 9 : 8;
}

export function buildFallbackFirstQuestion(): WorkflowQuestion {
  return {
    id: 'q0-registration-type',
    phase: 0,
    question: '你想注册的经营主体类型是？',
    questionType: 'single_choice',
    fieldKey: 'registrationType',
    helperText: '主体类型会决定后续材料、注册资本、人员信息和办理步骤。',
    options: [
      { label: '个体工商户', value: 'individual', description: '一个人经营，流程更简单，适合小生意。' },
      { label: '有限责任公司', value: 'company', description: '适合团队经营、跨境电商和长期品牌化运营。' },
      { label: '不确定，帮我分析', value: 'unsure', description: '根据经营人数、融资需求和风险偏好判断。' },
    ],
  };
}

export function buildGuardrailFinalPlan(
  session: UserSession,
  sources: RegionalSource[],
  actionCards: RegionalActionSource[] = [],
): FinalWorkflowPlan {
  const riskWarnings = mergeRiskWarnings(session);
  const materialChecklist = buildMaterialGaps(session);
  const portal = sources[0]?.title ? `${sources[0].title}：${sources[0].url}` : '所在地政务服务网或市场监管局线上入口';
  const isIndividual = session.registrationType === 'individual';
  const isCrossBorder = /跨境|进出口|amazon|亚马逊/i.test(session.industry);
  const roadmapSteps = buildRoadmapSteps(session, actionCards);
  const materialsByStep = roadmapSteps.map((step) => ({
    order: step.order,
    stepTitle: step.title,
    materials: step.materials,
  }));
  const registrationCards = actionCards.filter((card) => [
    'name_declaration',
    isIndividual ? 'individual_registration' : 'company_registration',
    'address_registration',
    'general_portal',
    'national_rules',
  ].includes(card.category));
  const postCards = actionCards.filter((card) => [
    'seal_carving',
    'tax_registration',
    'bank_account',
    'social_security',
  ].includes(card.category));
  const crossBorderCards = actionCards.filter((card) => card.category === 'cross_border');

  return {
    title: `${session.location.city || session.location.province || '本地'}${isIndividual ? '个体工商户' : '有限责任公司'}注册方案`,
    summary: `基于当前回答，建议按${isIndividual ? '个体工商户' : '有限责任公司'}路径准备材料，并以${portal}的最新要求为准。`,
    materialChecklist,
    roadmapSteps,
    materialsByStep,
    registrationSteps: [
      {
        title: isIndividual ? '个体户办理主线' : '公司设立主线',
        items: [
          `登录或访问：${portal}`,
          '先完成名称申报或名称查重，准备至少 3 个备选字号。',
          `确认经营范围：${[...session.businessScope.mainScope, ...session.businessScope.secondaryScope].join('、') || '按实际经营项目选择标准条目'}`,
          `提交注册地址材料：${session.address.fullAddress || '待补充完整地址和证明文件'}`,
          '按系统要求完成实名验证、电子签名或窗口提交。',
          '审核不通过时，按驳回原因修改后重新提交。',
        ],
        actionCards: registrationCards,
      },
    ],
    postRegistrationSteps: [
      {
        title: '领取执照后的事项',
        items: [
          '尽快办理公安备案刻章，至少准备公章、财务章、法人私章。',
          '根据业务需要预约银行对公账户。',
          '领取营业执照后 30 天内完成税务登记或税务报到。',
          '无收入也要按期零申报，避免异常或处罚。',
        ],
        actionCards: postCards,
      },
    ],
    crossBorderSteps: isCrossBorder
      ? [
          {
            title: '跨境电商附加事项',
            items: [
              "经营范围中确认包含'货物进出口'或'从事货物及技术的进出口业务'等相关表述。",
              '根据实际模式办理进出口权、海关、外汇等备案事项。',
              '准备 Amazon 注册材料：营业执照、法人身份证、双币信用卡、收款账户、手机号和邮箱。',
              'Payoneer、万里汇、PingPong 等收款账户需提前完成实名认证。',
            ],
            actionCards: crossBorderCards,
          },
        ]
      : [],
    riskWarnings,
    timelineEstimate: isIndividual ? '通常 1-5 个工作日，地区和材料复杂度会影响时长。' : '通常 1-10 个工作日完成登记，后续刻章、开户、税务可能还需 1-2 周。',
    sourceNotes: sources,
    actionCards,
    disclaimer: WORKFLOW_DISCLAIMER,
  };
}

export function buildRoadmapSteps(
  session: UserSession,
  actionCards: RegionalActionSource[] = [],
): WorkflowRoadmapStep[] {
  const isIndividual = session.registrationType === 'individual';
  const isCrossBorder = /跨境|进出口|amazon|亚马逊/i.test(session.industry);
  const steps: WorkflowRoadmapStep[] = [];

  const addStep = (step: Omit<WorkflowRoadmapStep, 'order'>) => {
    steps.push({ ...step, order: steps.length + 1 });
  };

  addStep({
    phase: 3,
    title: '名称自主申报',
    whenToDo: '正式提交设立登记前',
    agency: '上海市市场监督管理局登记系统',
    officialUrl: getCardUrl(actionCards, 'shanghai-name-declaration', 'https://yct.sh.gov.cn/portal_yct/'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-name-declaration', 'https://yct.sh.gov.cn/portal_yct/webportal/v2/kbxz.do'),
    materials: [
      createMaterial('名称备选', 'required_registration', 'missing', true, '公司和个体户名称申报', '申请人自行准备', '提前准备 3-5 个备选字号，按行政区划、字号、行业表述、组织形式拆分。', '上海企业登记在线名称自主申报告知页', getCardGuideUrl(actionCards, 'shanghai-name-declaration')),
      createMaterial('经营范围初稿', 'required_registration', 'missing', true, '名称和设立登记前置准备', '申请人根据真实业务准备', '先写清主营业务，跨境电商需考虑货物进出口、互联网销售等条目。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    ],
    actions: [
      '打开上海企业登记在线。',
      '选择或搜索“名称自主申报”相关事项。',
      '阅读告知页后填写名称四段信息。',
      '名称通过后保留申报结果，用于后续设立登记。',
    ],
    blockingRules: [
      '名称未通过时不要进入设立登记，先调整字号或行业表述。',
      '不要使用明显近似知名主体或可能误导公众的名称。',
    ],
    nextStepHint: '名称通过后，进入材料准备和设立登记填报。',
    actionCardIds: ['shanghai-name-declaration', 'shanghai-name-validation'],
  });

  addStep({
    phase: 6,
    title: '登记材料准备',
    whenToDo: '名称申报通过后、正式填报设立登记前',
    agency: '申请人自行准备，按上海企业登记在线和市场监管总局规范核对',
    officialUrl: getCardUrl(actionCards, 'national-samr-material-rules', 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/djzcj/art/2026/art_3321d681741f48cfa3a8e6ef4b15cccd.html'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-company-registration', 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf'),
    materials: isIndividual ? buildIndividualRegistrationMaterials(actionCards) : buildCompanyRegistrationMaterials(session, actionCards),
    actions: [
      '按主体类型核对必备材料，不要把公司材料和个体户材料混用。',
      '身份证复印件/扫描件需保持姓名、证件号、有效期清晰可辨。',
      '地址材料中的地址、权利人、租期或使用期限要与填报信息一致。',
      '一人有限公司额外准备财产独立留存材料，但不要当作设立登记必交材料上传。',
    ],
    blockingRules: [
      '身份证、地址、章程、人员任职信息不一致时，容易被要求补正。',
      '住宅地址需先确认住改商或利害关系人同意要求。',
    ],
    nextStepHint: '材料齐后，进入上海企业登记在线提交设立登记。',
    actionCardIds: ['national-samr-material-rules', isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'shanghai-address-registration'],
  });

  addStep({
    phase: 7,
    title: isIndividual ? '个体工商户设立登记' : '有限公司设立登记',
    whenToDo: '材料准备完成后',
    agency: '上海市市场监督管理局登记系统',
    officialUrl: getCardUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://yct.sh.gov.cn/portal_yct/'),
    guideUrl: getCardGuideUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf'),
    materials: isIndividual ? buildIndividualRegistrationMaterials(actionCards).slice(0, 4) : buildCompanyRegistrationMaterials(session, actionCards).filter((item) => item.category !== 'risk_retention'),
    actions: isIndividual
      ? [
          '打开上海企业登记在线。',
          '查看办理范围说明后，选择或搜索个体工商户设立登记事项。',
          '填写经营者、经营场所、经营范围和联系方式。',
          '按页面要求完成实名认证、材料上传和提交。',
        ]
      : [
          '打开上海企业登记在线。',
          '选择或搜索企业设立登记/开办企业事项。',
          '填写名称、住所、注册资本、股东出资、法定代表人、监事、财务负责人、联络员和经营范围。',
          '上传或确认材料后，按系统要求完成实名认证和电子签名。',
        ],
    blockingRules: [
      '注册资本超过 100 万时，提交前再次确认 5 年实缴安排。',
      '经营范围含许可项目时，取得许可前不得实际开展对应业务。',
    ],
    nextStepHint: '提交后等待审核；如被驳回，按补正意见修改。',
    actionCardIds: [isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration'],
  });

  addStep({
    phase: 5,
    title: '住所/经营场所核验',
    whenToDo: '设立登记填报住所信息时同步完成',
    agency: '上海市市场监督管理局登记系统，必要时咨询属地政务大厅或街道',
    officialUrl: getCardUrl(actionCards, 'shanghai-address-registration', 'https://yct.sh.gov.cn/portal_yct/'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-address-registration', 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf'),
    materials: buildAddressMaterials(session, actionCards),
    actions: [
      '按房屋类型填写完整地址、房屋用途、产权或租赁信息。',
      '上传或确认租赁合同、产权证明、住所使用承诺等材料。',
      '住宅地址先核对住改商、利害关系人同意或属地要求。',
    ],
    blockingRules: [
      '住宅、虚拟、托管地址不一定都能登记，必须以页面和窗口要求为准。',
      '地址材料与填报地址不一致时先修改，避免补正。',
    ],
    nextStepHint: '住所信息确认后，继续实名验证和电子签名。',
    actionCardIds: ['shanghai-address-registration'],
  });

  addStep({
    phase: 7,
    title: '实名认证/电子签名与提交审核',
    whenToDo: '设立登记信息填完后',
    agency: '上海企业登记在线及其提示的实名认证/电子签名渠道',
    officialUrl: getCardUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://yct.sh.gov.cn/portal_yct/'),
    guideUrl: getCardGuideUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf'),
    materials: [
      createMaterial('经办人实名账号', 'personnel_signature', 'missing', true, '线上提交和身份验证', '经办人准备', '使用本人手机号和证件信息完成平台实名认证。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-company-registration')),
      createMaterial(isIndividual ? '经营者电子签名准备' : '全体股东/任职人员电子签名准备', 'personnel_signature', 'missing', true, '线上签署登记材料', '对应签署人本人完成', '按系统提示完成身份核验和电子签名，不要由他人代签。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-company-registration')),
    ],
    actions: [
      '核对填报信息和上传材料。',
      '按系统提示通知相关人员完成实名认证或电子签名。',
      '提交后保存受理编号和平台消息。',
    ],
    blockingRules: [
      '人员未完成签名会阻塞提交。',
      '证件过期、手机号不一致或实名失败时，需要先修正人员信息。',
    ],
    nextStepHint: '提交后等待审核；如被退回，按补正原因修正。',
    actionCardIds: [isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration'],
  });

  addStep({
    phase: 7,
    title: '审核补正与领取营业执照',
    whenToDo: '提交后至核准通过',
    agency: '上海市市场监督管理局登记系统或指定窗口',
    officialUrl: getCardUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://yct.sh.gov.cn/portal_yct/'),
    guideUrl: getCardGuideUrl(actionCards, isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration', 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf'),
    materials: [
      createMaterial('受理编号/平台通知', 'required_registration', 'missing', true, '查看审核进度和补正意见', '平台生成', '提交后保存受理编号，关注短信、站内信和补正意见。', '上海企业登记在线', getCardUrl(actionCards, 'shanghai-company-registration')),
      createMaterial('营业执照', 'post_registration', 'missing', true, '登记核准后领取', '登记机关核发', '核准后按页面选择电子营业执照、邮寄或窗口领取方式。', '上海企业登记在线', getCardUrl(actionCards, 'shanghai-company-registration')),
    ],
    actions: [
      '在上海企业登记在线查看受理状态。',
      '如被要求补正，按具体原因修改名称、地址、材料或签名信息。',
      '核准后领取或下载营业执照，并核对统一社会信用代码、名称、住所和经营范围。',
    ],
    blockingRules: [
      '未取得营业执照前，不要进入刻章、银行开户、税务登记的实操步骤。',
      '营业执照信息有误时先更正，不要带错信息进入 Amazon 或银行开户。',
    ],
    nextStepHint: '领照后，开始刻章、银行开户和税务事项。',
    actionCardIds: [isIndividual ? 'shanghai-individual-registration' : 'shanghai-company-registration'],
  });

  addStep({
    phase: 8,
    title: '公安备案刻章',
    whenToDo: '领取营业执照后',
    agency: '公安备案刻章点或政务大厅指引渠道',
    officialUrl: getCardUrl(actionCards, 'shanghai-seal-carving', 'https://zwdt.sh.gov.cn/'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-seal-carving'),
    materials: [
      createMaterial('营业执照', 'post_registration', 'missing', true, '刻制公章、财务章、法人章', '登记机关核发', '携带营业执照原件/电子照和统一社会信用代码信息。', '一网通办或公安备案刻章点要求', getCardUrl(actionCards, 'shanghai-seal-carving')),
      createMaterial('法定代表人/经营者身份证明', 'post_registration', 'missing', true, '刻章身份核验', '法定代表人或经营者提供', '准备身份证原件、清晰复印件或电子扫描件；如经办人办理，另备授权材料。', '公安备案刻章点要求', getCardUrl(actionCards, 'shanghai-seal-carving')),
    ],
    actions: [
      '先查看登记平台或短信是否提供刻章联办提示。',
      '没有联办提示时，在一网通办搜索“公章刻制”“印章备案”。',
      '选择公安备案刻章点办理，不使用无法备案的私刻印章。',
    ],
    blockingRules: [
      '未领取营业执照不能刻制公司印章。',
      '未备案印章可能影响银行开户、税务和合同使用。',
    ],
    nextStepHint: '刻章完成后，预约银行对公账户。',
    actionCardIds: ['shanghai-seal-carving'],
  });

  if (!isIndividual) {
    addStep({
      phase: 8,
      title: '银行对公账户预约',
      whenToDo: '领取营业执照并完成刻章后',
      agency: '拟开户银行官方渠道或网点',
      officialUrl: getCardUrl(actionCards, 'shanghai-bank-account', 'https://zwdt.sh.gov.cn/'),
      guideUrl: getCardGuideUrl(actionCards, 'shanghai-bank-account'),
      materials: [
        createMaterial('营业执照', 'post_registration', 'missing', true, '银行对公开户', '登记机关核发', '营业执照信息需与银行开户申请一致。', '银行官方开户要求', getCardUrl(actionCards, 'shanghai-bank-account')),
        createMaterial('公章、财务章、法人章', 'post_registration', 'missing', true, '银行预留印鉴和开户资料', '公安备案刻章点刻制', '携带已备案印章，按银行要求留印鉴。', '银行官方开户要求', getCardUrl(actionCards, 'shanghai-bank-account')),
        createMaterial('注册地址和实际经营地址说明', 'post_registration', 'missing', true, '银行尽调和地址核验', '申请人准备', '准备租赁合同、办公场地照片、业务说明等银行可能要求的材料。', '银行官方开户要求', getCardUrl(actionCards, 'shanghai-bank-account')),
      ],
      actions: [
        '通过拟开户银行官方渠道预约对公开户。',
        '按银行要求完成法人到场、视频核验、地址核验或尽调。',
        '开户完成后保存账户信息，供税务、合同和 Amazon 收款资料使用。',
      ],
      blockingRules: [
        '银行开户审核标准由银行和反洗钱要求决定，不等同于工商登记通过。',
        '不要通过非官方代办渠道提交敏感资料。',
      ],
      nextStepHint: '开户后处理税务登记、票种和申报设置。',
      actionCardIds: ['shanghai-bank-account'],
    });
  }

  addStep({
    phase: 8,
    title: '税务登记/发票和申报设置',
    whenToDo: '领取营业执照后 30 天内',
    agency: '主管税务机关、电子税务局或一网通办税务事项',
    officialUrl: getCardUrl(actionCards, 'shanghai-tax-registration', 'https://zwdt.sh.gov.cn/'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-tax-registration'),
    materials: [
      createMaterial('营业执照和统一社会信用代码', 'post_registration', 'missing', true, '税务登记和纳税人信息确认', '登记机关核发', '核对名称、统一社会信用代码、住所、经营范围。', '主管税务机关要求', getCardUrl(actionCards, 'shanghai-tax-registration')),
      createMaterial('财务负责人和办税人员信息', 'post_registration', 'missing', true, '税务实名和申报管理', '公司或个体户指定人员提供', '准备姓名、手机号、身份证明和实名办税授权。', '主管税务机关要求', getCardUrl(actionCards, 'shanghai-tax-registration')),
      createMaterial('银行账户信息', 'post_registration', 'missing', !isIndividual, '税务扣款、开票或经营收付款', '开户银行提供', '公司有对公账户后同步给税务；个体户按税务要求确认账户。', '主管税务机关要求', getCardUrl(actionCards, 'shanghai-tax-registration')),
    ],
    actions: [
      '在一网通办、主管税务机关或电子税务局入口搜索新办纳税人、税务登记、发票申领。',
      '确认税种、征收方式、申报期限、财务负责人和办税人员。',
      '需要开票时，再按页面要求申请发票票种或数电票权限。',
    ],
    blockingRules: [
      '无收入也要关注零申报和申报期限。',
      '税种、征收方式和开票资格必须以主管税务机关核定为准。',
    ],
    nextStepHint: isCrossBorder ? '税务基础完成后，准备跨境电商备案和 Amazon 材料。' : '如有员工，继续办理社保/公积金开户。',
    actionCardIds: ['shanghai-tax-registration'],
  });

  addStep({
    phase: 8,
    title: '社保/公积金开户',
    whenToDo: '准备雇佣员工前后',
    agency: '一网通办、社保和公积金管理部门',
    officialUrl: getCardUrl(actionCards, 'shanghai-social-security', 'https://zwdt.sh.gov.cn/'),
    guideUrl: getCardGuideUrl(actionCards, 'shanghai-social-security'),
    materials: [
      createMaterial('营业执照和统一社会信用代码', 'post_registration', 'missing', true, '单位开户', '登记机关核发', '用于单位基础信息核验。', '社保/公积金部门要求', getCardUrl(actionCards, 'shanghai-social-security')),
      createMaterial('单位银行账户', 'post_registration', 'missing', !isIndividual, '缴费扣款', '开户银行提供', '用于后续缴费和扣款。', '社保/公积金部门要求', getCardUrl(actionCards, 'shanghai-social-security')),
      createMaterial('员工身份和入职信息', 'post_registration', 'missing', false, '员工增员和缴费基数申报', '员工和用人单位提供', '有员工后准备身份证明、入职日期、工资/缴费基数等信息。', '社保/公积金部门要求', getCardUrl(actionCards, 'shanghai-social-security')),
    ],
    actions: [
      '在一网通办搜索单位社保开户、住房公积金单位开户等事项。',
      '按页面要求填写单位、经办人、缴费和员工信息。',
      '有员工入职时及时办理增员和缴费基数申报。',
    ],
    blockingRules: [
      '没有员工时先确认是否需要立即开户；有员工后要按用工规定及时参保。',
      '缴费基数和办理期限以社保、公积金部门最新页面为准。',
    ],
    nextStepHint: isCrossBorder ? '继续跨境电商附加事项。' : '注册后基础事项完成，进入日常记账报税和合规经营。',
    actionCardIds: ['shanghai-social-security'],
  });

  if (isCrossBorder) {
    addStep({
      phase: 9,
      title: '跨境电商附加事项',
      whenToDo: '营业执照办结且基础税务/银行事项准备后',
      agency: '海关、外汇、电子口岸、Amazon 官方后台和第三方收款机构',
      officialUrl: getCardUrl(actionCards, 'shanghai-cross-border', 'https://yct.sh.gov.cn/portal_yct/'),
      guideUrl: getCardGuideUrl(actionCards, 'shanghai-cross-border', getCardUrl(actionCards, 'national-samr-material-rules')),
      materials: [
        createMaterial('含进出口相关表述的经营范围', 'cross_border', 'missing', true, '办理跨境相关备案和平台资料一致性', '营业执照登记形成', '经营范围中确认货物进出口、技术进出口或互联网销售等与真实业务匹配的条目。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
        createMaterial('Amazon 注册材料', 'cross_border', 'missing', true, 'Amazon 店铺注册和审核', '申请人准备', '准备营业执照、法人身份证、手机号、邮箱、双币信用卡、收款账户，确保公司名称、法人、地址一致。', 'Amazon 官方后台要求，以后台最新页面为准', getCardUrl(actionCards, 'shanghai-cross-border')),
        createMaterial('海外收款账户', 'cross_border', 'missing', true, 'Amazon 收款', 'Payoneer、万里汇、PingPong、银行等官方渠道', '完成实名认证，账户主体和营业执照主体保持一致。', '收款机构官方要求', getCardUrl(actionCards, 'shanghai-cross-border')),
      ],
      actions: [
        '确认营业执照经营范围覆盖跨境电商实际业务。',
        '按业务模式办理进出口权、海关、外汇、电子口岸等备案。',
        '注册 Amazon 店铺时保持营业执照、法人、地址、收款账户资料一致。',
      ],
      blockingRules: [
        '营业执照有进出口表述不等于已经取得所有跨境备案。',
        'Amazon 审核不通过常见原因是资料不一致、证件不清晰或地址冲突。',
      ],
      nextStepHint: '完成后进入 Amazon 填表包和审核跟踪。',
      actionCardIds: ['shanghai-cross-border'],
    });
  }

  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

function buildCompanyRegistrationMaterials(
  session: UserSession,
  actionCards: RegionalActionSource[],
): WorkflowMaterialItem[] {
  const materials: WorkflowMaterialItem[] = [
    createMaterial('法定代表人身份证复印件/扫描件', 'required_registration', 'missing', true, '有限公司设立登记', '法定代表人本人提供', '正反面清晰，证件在有效期内，姓名和证件号与填报信息一致。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('全体股东身份证复印件/扫描件', 'required_registration', 'missing', true, '股东为自然人的有限公司设立登记', '全体自然人股东提供', '正反面清晰，出资比例和股东姓名与章程、登记信息一致。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('监事身份证复印件/扫描件', 'personnel_signature', 'missing', true, '设有监事或需要任职人员信息时', '监事本人提供', '证件信息与任职信息一致；监事通常不能与法定代表人混同。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('公司章程', 'required_registration', 'missing', true, '有限公司设立登记', '股东共同确认', '载明公司名称、住所、经营范围、注册资本、股东出资额、出资方式、出资期限、组织机构等。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('股东出资和注册资本方案', 'required_registration', 'missing', true, '有限公司设立登记', '全体股东确认', '明确注册资本、出资比例、出资金额、出资期限；2024 后有限责任公司通常需关注 5 年实缴安排。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('人员任职信息', 'personnel_signature', 'missing', true, '有限公司设立登记', '公司拟任人员提供', '准备法定代表人、董事/执行董事、监事、财务负责人、联络员姓名、手机号和证件信息。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-company-registration')),
  ];

  if (session.companySubType === 'one_person') {
    materials.push(
      createMaterial('公司财产独立留存材料', 'risk_retention', 'needs_review', false, '一人有限公司财产独立风险留存，不是设立登记必交材料', '公司后续经营中持续形成', '单独银行账户、会计账簿、合同/发票、资金流水、必要时年度审计报告等，用于证明公司财产与个人财产分离。', '本地护栏风险规则，办理前可咨询专业会计/律师', getCardUrl(actionCards, 'shanghai-company-registration')),
    );
  }

  return materials;
}

function buildIndividualRegistrationMaterials(actionCards: RegionalActionSource[]): WorkflowMaterialItem[] {
  return [
    createMaterial('经营者身份证复印件/扫描件', 'required_registration', 'missing', true, '个体工商户设立登记', '经营者本人提供', '正反面清晰，证件在有效期内，姓名和证件号与填报信息一致。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
    createMaterial('经营场所地址证明', 'address', 'missing', true, '个体工商户设立登记', '经营者、出租方或地址提供方提供', '按经营场所类型准备产权证明、租赁合同、住所使用证明或平台要求材料。', '上海企业登记在线办理范围说明', getCardGuideUrl(actionCards, 'shanghai-individual-registration')),
    createMaterial('名称备选', 'required_registration', 'missing', true, '个体户需要名称时', '经营者自行准备', '准备 3-5 个备选字号；不使用名称的按当地页面要求办理。', '名称自主申报告知页', getCardGuideUrl(actionCards, 'shanghai-name-declaration')),
    createMaterial('经营范围', 'required_registration', 'missing', true, '个体工商户设立登记', '经营者按真实业务准备', '按实际经营项目选择标准条目，涉及许可项目需后续办理许可。', '市场监管总局 2026 版材料规范', getCardUrl(actionCards, 'national-samr-material-rules')),
  ];
}

function buildAddressMaterials(
  session: UserSession,
  actionCards: RegionalActionSource[],
): WorkflowMaterialItem[] {
  const materials = [
    createMaterial('完整注册地址', 'address', 'missing', true, '住所/经营场所填报', '申请人确认', '精确到门牌号或房间号，和证明材料一致。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-address-registration')),
    createMaterial('产权证明或租赁合同', 'address', 'missing', true, '自有或租赁地址', '产权人、出租方或申请人提供', '合同主体、地址、租期和用途需与填报信息一致。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-address-registration')),
    createMaterial('住所使用证明/承诺材料', 'address', 'missing', true, '平台要求住所使用证明时', '申请人、产权人或地址提供方提供', '按页面模板或要求签署，确保地址可用于登记。', '上海企业登记在线开办指南', getCardGuideUrl(actionCards, 'shanghai-address-registration')),
  ];

  if (session.address.type === 'residential') {
    materials.push(
      createMaterial('住改商/利害关系人同意材料', 'address', 'needs_review', false, '住宅地址注册公司或个体户时', '申请人按属地要求准备', '向属地登记机关、街道或物业确认是否需要住改商手续、利害关系业主同意或其他证明。', '地址要求以当地登记机关和页面最新要求为准', getCardGuideUrl(actionCards, 'shanghai-address-registration')),
    );
  }

  if (session.address.type === 'virtual' || session.address.type === 'incubator') {
    materials.push(
      createMaterial('园区/托管地址入驻或备案证明', 'address', 'needs_review', true, '园区、孵化器、托管或虚拟地址', '地址服务方提供', '确认地址提供方资质和备案状态，保留合同、入驻协议和备案说明。', '地址要求以当地登记机关和页面最新要求为准', getCardGuideUrl(actionCards, 'shanghai-address-registration')),
    );
  }

  return materials;
}

function createMaterial(
  name: string,
  category: WorkflowMaterialCategory,
  status: MaterialGap['status'],
  required: boolean,
  appliesTo: string,
  provider: string,
  howToPrepare: string,
  officialBasis: string,
  sourceUrl = '',
): WorkflowMaterialItem {
  return {
    name,
    category,
    status,
    required,
    appliesTo,
    provider,
    howToPrepare,
    officialBasis,
    sourceUrl,
  };
}

function getCardUrl(cards: RegionalActionSource[], id: string, fallback = ''): string {
  return cards.find((card) => card.id === id)?.entryUrl || fallback;
}

function getCardGuideUrl(cards: RegionalActionSource[], id: string, fallback = ''): string {
  const card = cards.find((item) => item.id === id);
  return card?.sourceUrl || card?.entryUrl || fallback;
}

export function normalizeActionCards(
  value: unknown,
  fallbackActionCards: RegionalActionSource[] = [],
): RegionalActionSource[] {
  const parsed = Array.isArray(value)
    ? value
        .map((item, index) => normalizeActionCard(item, index))
        .filter((item): item is RegionalActionSource => Boolean(item))
    : [];
  return dedupeActionCards([...parsed, ...fallbackActionCards]);
}

function normalizeWarnings(value: unknown): RiskWarning[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = asRecord(item);
    const severity = row.severity === 'critical' || row.severity === 'info' || row.severity === 'warning'
      ? row.severity
      : 'warning';
    const source = row.source === 'guardrail' || row.source === 'regional' || row.source === 'deepseek'
      ? row.source
      : 'deepseek';
    return {
      id: stringify(row.id) || `ai-warning-${index}`,
      title: stringify(row.title) || '风险提示',
      message: stringify(row.message) || stringify(row.warning) || '请按官方要求核验。',
      severity,
      source,
    };
  });
}

function normalizeMaterialGaps(value: unknown): MaterialGap[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = asRecord(item);
    const status = row.status === 'ready' || row.status === 'needs_review' || row.status === 'missing'
      ? row.status
      : 'missing';
    return {
      name: stringify(row.name) || stringify(row.title) || `材料 ${index + 1}`,
      status,
      reason: stringify(row.reason) || '根据当前信息判断。',
      action: stringify(row.action) || stringify(row.howToPrepare) || '按官方要求准备并核验。',
    };
  });
}

function inferIndustryCategory(industry: string): string {
  if (/跨境|亚马逊|Amazon|进出口/i.test(industry)) return '跨境电商';
  if (/网店|电商|淘宝|抖音|拼多多|互联网销售/i.test(industry)) return '电商/网店';
  if (/餐饮|奶茶|食品|咖啡|小吃/i.test(industry)) return '餐饮';
  if (/软件|科技|开发|SaaS|AI|人工智能/i.test(industry)) return '软件/科技';
  if (/自媒体|MCN|短视频|直播|传媒/i.test(industry)) return '自媒体/MCN';
  if (/贸易|批发|零售|供应链/i.test(industry)) return '贸易/批发';
  if (/咨询|服务|管理/i.test(industry)) return '咨询/服务';
  return industry ? '咨询/服务' : '';
}

function hasMinimumPlanFields(session: UserSession): boolean {
  return Boolean(session.registrationType && session.location.city && session.industry && session.address.type);
}

function buildPlanPreview(session: UserSession): string {
  if (!hasMinimumPlanFields(session)) return '继续补齐主体类型、地区、行业和地址后即可生成方案。';
  return `可以生成${session.location.city}${session.registrationType === 'individual' ? '个体户' : '公司'}注册方案，并包含材料清单、操作步骤、后续事项${/跨境|亚马逊|进出口/i.test(session.industry) ? '和跨境电商附加步骤' : ''}。`;
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    if (value && typeof value === 'object' && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value as Record<string, unknown>);
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

function maskIdNumber(value: string): string {
  if (!value) return '';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}********${value.slice(-4)}`;
}

function clampPhase(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9, Math.round(value)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeActionCard(value: unknown, index: number): RegionalActionSource | null {
  const row = asRecord(value);
  const entryUrl = stringify(row.entryUrl || row.url);
  const title = stringify(row.title);
  if (!entryUrl || !title) return null;

  return {
    id: stringify(row.id) || `ai-action-card-${index}`,
    category: normalizeActionCategory(row.category),
    title,
    appliesTo: normalizeStringArray(row.appliesTo),
    entryUrl,
    sourceUrl: stringify(row.sourceUrl),
    clickPath: normalizeStringArray(row.clickPath || row.steps),
    requiredInputs: normalizeStringArray(row.requiredInputs || row.materials),
    warnings: normalizeStringArray(row.warnings || row.notes),
    fallbackText: stringify(row.fallbackText),
  };
}

function normalizeActionCategory(value: unknown): RegionalActionCategory {
  const category = stringify(value);
  const allowed: RegionalActionCategory[] = [
    'name_declaration',
    'company_registration',
    'individual_registration',
    'address_registration',
    'seal_carving',
    'tax_registration',
    'bank_account',
    'social_security',
    'cross_border',
    'national_rules',
    'general_portal',
  ];
  return allowed.includes(category as RegionalActionCategory)
    ? category as RegionalActionCategory
    : 'general_portal';
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringify(item))
      .filter(Boolean);
  }
  const text = stringify(value);
  return text ? [text] : [];
}

function dedupeActionCards(cards: RegionalActionSource[]): RegionalActionSource[] {
  const seen = new Set<string>();
  const result: RegionalActionSource[] = [];
  for (const card of cards) {
    const key = card.id || `${card.title}-${card.entryUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(card);
  }
  return result;
}
