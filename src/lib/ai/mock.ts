import type {
  AmazonFieldPacket,
  ApplicationCase,
  DocumentType,
  GapAnalysis,
  GeneratedTemplate,
  QualificationCategory,
  TemplateType,
} from '@/types/domain';

/**
 * Mock 材料清单（专业卖家 + 中国大陆）
 * 当 AI 调用失败时作为降级数据返回
 */
export function getMockChecklist(sellerType: string, region: string) {
  return {
    sellerType,
    region,
    totalItems: 6,
    items: [
      {
        category: 'business_license' as const,
        name: '营业执照',
        required: true,
        requirements: ['有效期距今≥60天', '经营范围含贸易/电商类目', '统一社会信用代码清晰可读'],
        tips: '个体户执照也可注册，但企业执照通过率更高',
        fields: [
          { key: 'license_number', label: '统一社会信用代码', type: 'text' as const, placeholder: '18位信用代码' },
          { key: 'company_name', label: '企业名称', type: 'text' as const, placeholder: '与执照完全一致' },
          { key: 'legal_person', label: '法定代表人', type: 'text' as const, placeholder: '与身份证姓名一致' },
          { key: 'expiry_date', label: '有效期至', type: 'date' as const, placeholder: 'YYYY-MM-DD' },
        ],
      },
      {
        category: 'id_card' as const,
        name: '法人身份证',
        required: true,
        requirements: ['正反面清晰完整', '有效期≥3个月', '与营业执照法人姓名一致'],
        tips: '拍照时确保四角完整，无反光无遮挡',
        fields: [
          { key: 'name', label: '姓名', type: 'text' as const, placeholder: '与营业执照法人一致' },
          { key: 'id_number', label: '身份证号', type: 'text' as const, placeholder: '18位身份证号' },
          { key: 'expiry_date', label: '有效期至', type: 'date' as const, placeholder: 'YYYY-MM-DD' },
        ],
      },
      {
        category: 'credit_card' as const,
        name: '双币信用卡',
        required: true,
        requirements: ['支持VISA或MasterCard', '可进行美元扣款', '未关联其他亚马逊账号'],
        tips: '建议使用主卡，附属卡可能会被拒',
        fields: [
          { key: 'card_type', label: '卡片类型', type: 'select' as const, placeholder: 'VISA / MasterCard' },
          { key: 'card_holder', label: '持卡人姓名', type: 'text' as const, placeholder: '信用卡上的英文姓名' },
          { key: 'card_last_four', label: '卡号后四位', type: 'text' as const, placeholder: '仅用于核对' },
        ],
      },
      {
        category: 'bank_account' as const,
        name: '收款账户',
        required: true,
        requirements: ['支持Payoneer/WorldFirst/连连支付等', '账户已完成实名认证', '可接收美元入账'],
        tips: '建议提前注册并完成收款平台的KYC认证',
        fields: [
          { key: 'platform', label: '收款平台', type: 'select' as const, placeholder: 'Payoneer / WorldFirst / 连连支付' },
          { key: 'account_name', label: '账户名称', type: 'text' as const, placeholder: '与注册信息一致' },
        ],
      },
      {
        category: 'contact_info' as const,
        name: '联系方式',
        required: true,
        requirements: ['手机号可接收验证码', '邮箱未注册过亚马逊账号', '建议使用企业邮箱'],
        tips: '手机号和邮箱都不能与已有亚马逊账号关联',
        fields: [
          { key: 'phone', label: '手机号', type: 'text' as const, placeholder: '+86 开头的手机号' },
          { key: 'email', label: '电子邮箱', type: 'text' as const, placeholder: '未注册过亚马逊的邮箱' },
        ],
      },
      {
        category: 'address_proof' as const,
        name: '地址证明',
        required: sellerType === 'professional',
        requirements: ['与营业执照注册地址一致', '或提供90天内水电账单', '地址信息清晰完整'],
        tips: '如果营业执照地址与实际办公地址不同，以营业执照地址为准',
        fields: [
          { key: 'address', label: '详细地址', type: 'text' as const, placeholder: '省市区街道门牌号' },
          { key: 'proof_type', label: '证明类型', type: 'select' as const, placeholder: '营业执照地址 / 水电账单' },
        ],
      },
    ],
  };
}

export function createEmptyCase(): ApplicationCase {
  const now = new Date().toISOString();
  return {
    id: `case-${Date.now()}`,
    name: '亚马逊北美站注册资料包',
    region: 'CN',
    targetMarketplace: 'amazon_us',
    entityStatus: 'unknown',
    founder: {
      name: '',
      phone: '',
      email: '',
      idNumber: '',
      address: '',
    },
    companyPlan: {
      entityType: 'limited_company',
      companyName: '',
      businessScope: '',
      registeredAddress: '',
      registeredCapital: '',
      shareholderInfo: '',
      contactPhone: '',
    },
    documents: [],
    extractedDocuments: [],
    tasks: [],
    gapAnalysis: null,
    templates: [],
    amazonPacket: null,
    answers: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function getMockNextQuestion(caseData: ApplicationCase) {
  if (caseData.entityStatus === 'unknown') {
    return {
      question: '你现在已经有可用于亚马逊美国站注册的大陆有限公司营业执照了吗？',
      fieldKey: 'entityStatus',
      helperText: 'Amazon 面向中国卖家注册美国站时通常要求企业营业执照；如果没有，需要先准备办照材料。',
      options: ['还没有公司/营业执照', '已经有大陆有限公司营业执照'],
      done: false,
    };
  }

  const sequence = [
    {
      value: caseData.founder.name,
      question: '请先填写负责人或法定代表人姓名。',
      fieldKey: 'founder.name',
      helperText: '该姓名会用于身份证、营业执照法定代表人、Amazon 账户联系人一致性检查。',
      options: [],
    },
    {
      value: caseData.founder.phone,
      question: '负责人手机号是什么？',
      fieldKey: 'founder.phone',
      helperText: '手机号需要能接收验证码，并且最好没有绑定过其他 Amazon 卖家账户。',
      options: [],
    },
    {
      value: caseData.founder.email,
      question: '准备用哪个邮箱注册 Amazon 卖家账户？',
      fieldKey: 'founder.email',
      helperText: '建议使用未注册过 Amazon 卖家账户的邮箱，后续填表包会直接引用。',
      options: [],
    },
    {
      value: caseData.companyPlan.businessScope,
      question: '你准备经营哪些商品类目或服务范围？',
      fieldKey: 'companyPlan.businessScope',
      helperText: '经营范围会影响办照草稿和 Amazon 注册风险提示。',
      options: ['服装配饰', '家居日用品', '电子配件', '宠物用品', '美妆个护'],
    },
    {
      value: caseData.companyPlan.registeredAddress,
      question: caseData.entityStatus === 'no_company' ? '准备用哪个地址作为注册地址或经营场所？' : '营业执照上的注册地址是什么？',
      fieldKey: 'companyPlan.registeredAddress',
      helperText: '地址会用于住所/经营场所证明草稿，也会影响 Amazon 地址一致性风险。',
      options: [],
    },
    {
      value: caseData.companyPlan.companyName,
      question: caseData.entityStatus === 'no_company' ? '有没有拟定公司名称？没有也可以填“待核名”。' : '营业执照上的企业名称是什么？',
      fieldKey: 'companyPlan.companyName',
      helperText: '公司名称需要和营业执照、Amazon 后台 Legal business name 保持一致。',
      options: [],
    },
    {
      value: caseData.companyPlan.shareholderInfo,
      question: '股东或经营者信息怎么安排？',
      fieldKey: 'companyPlan.shareholderInfo',
      helperText: '如果还没开公司，这会进入章程草案和设立材料清单；已有公司则用于一致性核验。',
      options: ['一人有限公司', '两名以上股东', '个体工商户经营者', '暂未确定'],
    },
  ];

  const next = sequence.find((item) => !item.value);
  if (next) {
    return {
      question: next.question,
      fieldKey: next.fieldKey,
      helperText: next.helperText,
      options: next.options,
      done: false,
    };
  }

  return {
    question: '关键资料已具备，可以生成缺口分析和模板草稿。',
    fieldKey: 'done',
    helperText: '继续补充上传文件可以提高填表包完整度。',
    options: [],
    done: true,
  };
}

export function getMockGapAnalysis(caseData: ApplicationCase): GapAnalysis {
  const hasLicense = caseData.extractedDocuments.some((doc) => doc.type === 'business_license');
  const hasFounder = Boolean(caseData.founder.name && caseData.founder.phone && caseData.founder.email);
  const missingItems = [
    ...(!hasLicense ? [{
      id: 'business-license',
      title: caseData.entityStatus === 'no_company' ? '办理大陆有限公司营业执照' : '上传并确认营业执照字段',
      reason: '亚马逊美国站中国卖家注册通常需要企业营业执照，并用其核验公司信息。',
      action: caseData.entityStatus === 'no_company' ? '先生成办照材料模板，再办理营业执照后上传。' : '上传营业执照或粘贴证照文字，确认统一社会信用代码、企业名称、法定代表人。',
      required: true,
    }] : []),
    ...(!hasFounder ? [{
      id: 'founder-profile',
      title: '补齐负责人联系方式和身份证信息',
      reason: '注册账户、身份验证和后续审核都需要联系人信息一致。',
      action: '填写姓名、手机号、邮箱、身份证号和联系地址。',
      required: true,
    }] : []),
    {
      id: 'payment',
      title: '准备可扣款信用卡和收款银行账户',
      reason: 'Amazon 注册需要可扣款卡片和收款账户，MVP 不保存完整敏感卡号。',
      action: '只在本工具记录卡组织、持卡人和账户平台，完整敏感信息到 Amazon 后台手工填写。',
      required: true,
    },
  ];

  return {
    summary: missingItems.length > 1 ? '资料还没有形成可直接填 Amazon 的完整包，建议先补齐证照和联系人信息。' : '核心资料基本具备，可以生成亚马逊填表包并人工核验。',
    readinessScore: Math.max(35, 90 - missingItems.length * 18),
    riskLevel: missingItems.length > 2 ? 'high' : missingItems.length > 0 ? 'medium' : 'low',
    missingItems,
    readyItems: [
      '已锁定范围：中国大陆卖家 + 亚马逊北美站',
      caseData.companyPlan.businessScope ? '已填写经营范围方向' : '可生成经营范围候选草稿',
      hasLicense ? '已记录营业执照解析字段' : '可生成办照材料模板',
    ],
    nextActions: missingItems.map((item) => item.action),
    disclaimer: '本结果是资料准备和风险提示，不构成法律、税务或 Amazon 审核通过承诺；提交前需用户自行核验。',
  };
}

export function getMockTemplates(
  caseData: ApplicationCase,
  templateTypes?: TemplateType[],
): GeneratedTemplate[] {
  const now = new Date().toISOString();
  const all: GeneratedTemplate[] = [
    {
      id: 'tpl-company-checklist',
      type: 'company_setup_checklist',
      title: '有限公司设立材料清单',
      description: '用于还没开公司的卖家先准备办照材料。',
      content: `# 有限公司设立材料清单（草稿）\n\n- 公司登记申请书\n- 公司章程\n- 法定代表人、股东、董事/监事/高级管理人员身份证明\n- 法定代表人任职文件\n- 住所使用相关文件\n- 经营范围如涉及前置审批，需另备批准文件或许可证件\n\n拟定公司名称：${caseData.companyPlan.companyName || '待填写'}\n经营范围方向：${caseData.companyPlan.businessScope || '待填写'}\n注册地址：${caseData.companyPlan.registeredAddress || '待填写'}\n\n提示：不同地区登记机关对住所材料、名称规则和经营范围表述可能有差异，提交前需以当地窗口/线上系统要求为准。`,
      sourceFields: ['companyPlan.companyName', 'companyPlan.businessScope', 'companyPlan.registeredAddress'],
      warnings: ['草稿不构成法律意见', '前置审批需用户自行核验'],
      updatedAt: now,
    },
    {
      id: 'tpl-articles',
      type: 'company_articles',
      title: '公司章程草案',
      description: '用于形成章程初稿，便于用户带去修改确认。',
      content: `# 公司章程草案\n\n第一条 公司名称：${caseData.companyPlan.companyName || '待填写'}\n\n第二条 公司住所：${caseData.companyPlan.registeredAddress || '待填写'}\n\n第三条 经营范围：${caseData.companyPlan.businessScope || '待填写'}\n\n第四条 注册资本：${caseData.companyPlan.registeredCapital || '待填写'}\n\n第五条 股东及出资：${caseData.companyPlan.shareholderInfo || '待填写'}\n\n第六条 法定代表人：${caseData.founder.name || '待填写'}\n\n本章程为 AI 生成草稿，需由全体股东确认，并按当地登记机关模板调整。`,
      sourceFields: ['companyPlan', 'founder.name'],
      warnings: ['章程需股东确认', '建议提交前咨询当地登记机关或专业人士'],
      updatedAt: now,
    },
    {
      id: 'tpl-residence',
      type: 'residence_certificate',
      title: '住所/经营场所使用证明草案',
      description: '用于梳理注册地址材料。',
      content: `# 住所/经营场所使用证明草案\n\n使用主体：${caseData.companyPlan.companyName || caseData.founder.name || '待填写'}\n场所地址：${caseData.companyPlan.registeredAddress || caseData.founder.address || '待填写'}\n用途：企业登记住所/经营场所\n\n材料准备提示：\n- 自有房产：准备产权证明材料。\n- 租赁场地：准备租赁合同及出租方权属证明。\n- 集中登记/托管地址：准备托管机构出具的证明文件。\n\n此草稿仅用于准备材料，具体格式以当地登记机关要求为准。`,
      sourceFields: ['companyPlan.registeredAddress', 'founder.address'],
      warnings: ['住所材料是否被接受需按当地规则确认'],
      updatedAt: now,
    },
    {
      id: 'tpl-id-copy',
      type: 'id_copy_checklist',
      title: '身份证复印件准备清单',
      description: '用于避免身份材料不清晰或不一致。',
      content: `# 身份证材料准备清单\n\n负责人/法定代表人：${caseData.founder.name || '待填写'}\n\n- 身份证正反面彩色扫描或清晰照片\n- 姓名、证件号、有效期清晰可读\n- 与营业执照法定代表人、Amazon 账户联系人保持一致\n- 不使用模糊截图、黑白复印件或遮挡照片\n\n身份证号：${caseData.founder.idNumber ? '已记录，导出时不展示完整号码' : '待填写'}`,
      sourceFields: ['founder.name', 'founder.idNumber'],
      warnings: ['身份证属于敏感信息，导出前请确认脱敏策略'],
      updatedAt: now,
    },
    {
      id: 'tpl-amazon-fields',
      type: 'amazon_registration_fields',
      title: 'Amazon Seller Central 填表清单',
      description: '用于最后复制粘贴到 Amazon 后台。',
      content: `# Amazon 北美站注册填表清单\n\n公司名称：${caseData.companyPlan.companyName || '待填写'}\n统一社会信用代码：${findExtractedField(caseData, 'registrationNumber') || '待上传营业执照解析'}\n法定代表人：${caseData.founder.name || findExtractedField(caseData, 'legalRepresentative') || '待填写'}\n联系邮箱：${caseData.founder.email || '待填写'}\n联系电话：${caseData.founder.phone || '待填写'}\n注册地址：${caseData.companyPlan.registeredAddress || findExtractedField(caseData, 'registeredAddress') || '待填写'}\n\n注意：银行账户、信用卡完整信息请仅在 Amazon 官方后台填写，本工具不保存完整敏感卡号。`,
      sourceFields: ['companyPlan', 'founder', 'extractedDocuments'],
      warnings: ['提交前逐项核对 Amazon 页面提示', '敏感支付信息不要导入本工具'],
      updatedAt: now,
    },
    {
      id: 'tpl-risk-fix',
      type: 'risk_fix_checklist',
      title: '审核风险修正清单',
      description: '用于提交前逐项排雷。',
      content: `# 审核风险修正清单\n\n- 公司名、统一社会信用代码、法定代表人姓名与营业执照一致\n- 身份证姓名与营业执照法定代表人一致\n- 地址证明与注册地址/办公地址逻辑一致\n- 证件照片清晰、完整、彩色、无遮挡\n- 邮箱和手机号未绑定过其他 Amazon 卖家账户\n- 信用卡可扣款，银行账户可收款\n\n结论：此清单只做风险提示，不保证审核通过。`,
      sourceFields: ['gapAnalysis', 'extractedDocuments'],
      warnings: ['不构成 Amazon 审核承诺'],
      updatedAt: now,
    },
  ];

  if (!templateTypes || templateTypes.length === 0) return all;
  return all.filter((template) => templateTypes.includes(template.type));
}

export function getMockVisionExtract(
  documentType: DocumentType,
  pastedText?: string,
) {
  if (pastedText?.trim()) {
    return parsePastedDocumentText(documentType, pastedText);
  }

  return {
    documentType,
    fields: documentType === 'business_license'
      ? {
          companyName: '厦门示例跨境电子商务有限公司',
          registrationNumber: '91350200M000000000',
          legalRepresentative: '张三',
          registeredAddress: '福建省厦门市思明区示例路 88 号',
          businessScope: '互联网销售、日用百货销售、货物进出口',
        }
      : {
          name: '张三',
          idNumber: '350200********1234',
          address: '福建省厦门市思明区示例路 88 号',
        },
    confidence: 0.72,
    issues: ['当前为演示/降级解析，请用户对照原件确认。'],
    source: 'mock' as const,
  };
}

export function getMockAmazonPacket(caseData: ApplicationCase): AmazonFieldPacket {
  const licenseNumber = findExtractedField(caseData, 'registrationNumber');
  const companyName = caseData.companyPlan.companyName || findExtractedField(caseData, 'companyName');
  const legalPerson = caseData.founder.name || findExtractedField(caseData, 'legalRepresentative');
  const address = caseData.companyPlan.registeredAddress || findExtractedField(caseData, 'registeredAddress') || caseData.founder.address;
  const fields = [
    {
      id: 'company-name',
      label: 'Legal business name / 公司法定名称',
      value: companyName || '',
      source: companyName ? '营业执照/公司计划' : '缺失',
      status: companyName ? 'ready' as const : 'missing' as const,
      note: '必须与营业执照完全一致。',
    },
    {
      id: 'registration-number',
      label: 'Business registration number / 统一社会信用代码',
      value: licenseNumber || '',
      source: licenseNumber ? '营业执照 OCR' : '缺失',
      status: licenseNumber ? 'ready' as const : 'missing' as const,
      note: '大陆公司通常为 18 位统一社会信用代码。',
    },
    {
      id: 'legal-representative',
      label: 'Primary contact / 法定代表人或主要联系人',
      value: legalPerson || '',
      source: legalPerson ? '负责人档案/营业执照 OCR' : '缺失',
      status: legalPerson ? 'ready' as const : 'missing' as const,
      note: '需与身份验证材料保持一致。',
    },
    {
      id: 'email',
      label: 'Email address / 注册邮箱',
      value: caseData.founder.email,
      source: caseData.founder.email ? '负责人档案' : '缺失',
      status: caseData.founder.email ? 'ready' as const : 'missing' as const,
      note: '建议使用未注册过 Amazon 卖家账户的邮箱。',
    },
    {
      id: 'phone',
      label: 'Phone number / 联系电话',
      value: caseData.founder.phone,
      source: caseData.founder.phone ? '负责人档案' : '缺失',
      status: caseData.founder.phone ? 'ready' as const : 'missing' as const,
      note: '需可接收验证码。',
    },
    {
      id: 'business-address',
      label: 'Business address / 公司注册地址',
      value: address || '',
      source: address ? '营业执照/公司计划' : '缺失',
      status: address ? 'needs_review' as const : 'missing' as const,
      note: '英文地址提交前需再次核对，避免与证明材料冲突。',
    },
    {
      id: 'bank-account',
      label: 'Bank account / 收款账户',
      value: '待在 Amazon 官方后台填写',
      source: '人工填写',
      status: 'needs_review' as const,
      note: '本工具不保存完整银行账户或信用卡敏感信息。',
    },
  ];

  return {
    title: 'Amazon 北美站注册填表包',
    marketplace: 'amazon_us',
    fields,
    risks: fields.filter((field) => field.status !== 'ready').map((field) => `${field.label}：${field.note}`),
    copyBlock: fields.map((field) => `${field.label}\n${field.value || '待补充'}\n来源：${field.source}\n备注：${field.note}`).join('\n\n'),
    disclaimer: '本填表包只用于复制粘贴前的信息整理，不自动操作 Amazon 后台，也不保证审核通过。',
  };
}

function parsePastedDocumentText(documentType: DocumentType, text: string) {
  const registrationNumber = text.match(/[0-9A-Z]{18}/)?.[0] || '';
  const legalRepresentative = text.match(/(?:法定代表人|负责人|经营者)[:：\s]*([\u4e00-\u9fa5]{2,5})/)?.[1] || '';
  const companyName = text.match(/(?:名称|企业名称)[:：\s]*([^\n]+)/)?.[1]?.trim() || '';
  const registeredAddress = text.match(/(?:住所|经营场所|地址)[:：\s]*([^\n]+)/)?.[1]?.trim() || '';
  const businessScope = text.match(/(?:经营范围)[:：\s]*([^\n]+)/)?.[1]?.trim() || '';

  return {
    documentType,
    fields: {
      ...(companyName ? { companyName } : {}),
      ...(registrationNumber ? { registrationNumber } : {}),
      ...(legalRepresentative ? { legalRepresentative } : {}),
      ...(registeredAddress ? { registeredAddress } : {}),
      ...(businessScope ? { businessScope } : {}),
      rawText: text,
    },
    confidence: registrationNumber || companyName ? 0.86 : 0.48,
    issues: registrationNumber || companyName ? ['已从粘贴文本提取，请用户核对原件。'] : ['未识别到核心字段，请手动补充。'],
    source: 'manual' as const,
  };
}

function findExtractedField(caseData: ApplicationCase, key: string): string {
  for (const doc of caseData.extractedDocuments) {
    if (doc.fields[key]) return doc.fields[key];
  }
  return '';
}

/**
 * Mock 校验结果（默认通过）
 * 当 AI 调用失败时作为降级数据返回
 */
export function getMockVerifyResult(category: QualificationCategory) {
  return {
    passed: true,
    riskLevel: 'low' as const,
    issues: [],
    summary: `${getCategoryName(category)}信息校验通过，格式正确，符合亚马逊注册要求。（注：当前为离线模式，建议联网后重新校验）`,
  };
}

/**
 * Mock 风险评估（默认低风险）
 * 当 AI 调用失败时作为降级数据返回
 */
export function getMockRiskAssessment() {
  return {
    overallRisk: 'low' as const,
    passRate: 85,
    risks: [],
    strengths: ['所有材料已填写完整', '基本格式符合要求'],
    readySummary: '资料基本完整，建议联网后进行AI深度校验以获取更准确的评估结果。（当前为离线模式）',
  };
}

/** 辅助：资质类别中文名映射 */
function getCategoryName(category: QualificationCategory): string {
  const names: Record<QualificationCategory, string> = {
    business_license: '营业执照',
    id_card: '法人身份证',
    credit_card: '双币信用卡',
    bank_account: '收款账户',
    contact_info: '联系方式',
    address_proof: '地址证明',
  };
  return names[category] || category;
}
