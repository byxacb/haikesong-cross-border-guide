'use client';

import JSZip from 'jszip';

import type {
  FinalWorkflowPlan,
  UserSession,
  WorkflowMaterialItem,
  WorkflowRoadmapStep,
} from '@/lib/workflow/types';
import {
  buildDocxBlob,
  buildHtml,
  buildMarkdown,
  downloadBlob,
  downloadHtml,
  downloadMarkdown,
  resolveFilename,
  type WorkspaceExportPayload,
  type WorkspaceExportSection,
} from '@/lib/export/workspace-export';

export type TemplateFormat = 'docx' | 'md' | 'html';

export interface DownloadableTemplate {
  id: string;
  title: string;
  description: string;
  filenameBase: string;
  appliesTo: string;
  warnings: string[];
  payload: WorkspaceExportPayload;
}

const TEMPLATE_DISCLAIMER =
  '本文件为办理准备草案/清单，需以当地登记机关、平台官网、银行、税务机关和公安备案刻章点的最新要求为准；不构成法律、税务或平台审核保证。';

/**
 * 根据最终办理方案生成可下载模板。这里不再调用模型，避免下载能力受网络波动影响。
 */
export function buildDownloadableTemplates(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate[] {
  const templates = [
    buildMaterialChecklistTemplate(plan, session),
    buildRoadmapChecklistTemplate(plan, session),
    buildAddressProofTemplate(plan, session),
    buildIdCopyChecklistTemplate(plan, session),
    buildRiskCorrectionTemplate(plan, session),
  ];

  if (session.registrationType === 'company') {
    templates.splice(2, 0, buildArticlesTemplate(plan, session));
  }

  if (session.companySubType === 'one_person') {
    templates.push(buildOnePersonCompanyRetentionTemplate(plan, session));
  }

  if (isCrossBorderScenario(plan, session)) {
    templates.push(buildAmazonChecklistTemplate(plan, session));
    templates.push(buildCrossBorderFollowUpTemplate(plan, session));
  }

  return templates.filter((template): template is DownloadableTemplate => Boolean(template));
}

export function downloadTemplate(template: DownloadableTemplate, format: TemplateFormat) {
  if (format === 'md') {
    downloadMarkdown(template.payload, { filename: template.filenameBase });
    return;
  }

  if (format === 'html') {
    downloadHtml(template.payload, { filename: template.filenameBase });
    return;
  }

  return downloadTemplateDocx(template);
}

export async function downloadTemplateDocx(template: DownloadableTemplate) {
  const blob = await buildDocxBlob(template.payload);
  downloadBlob(blob, resolveFilename(template.filenameBase, 'docx'));
}

/**
 * 将所有适用模板打包下载，避免浏览器连续拦截多个单文件下载。
 */
export async function downloadTemplatesZip(templates: DownloadableTemplate[], filename = '注册办理模板文件') {
  assertBrowser();

  const zip = new JSZip();
  await Promise.all(
    templates.flatMap((template) => [
      addTextToZip(zip, template, 'md', buildMarkdown(template.payload)),
      addTextToZip(zip, template, 'html', buildHtml(template.payload)),
      addDocxToZip(zip, template),
    ]),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, resolveFilename(filename, 'zip'));
}

function buildMaterialChecklistTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  const materialGroups = (plan.materialsByStep || []).map((group) => [
    `第 ${group.order} 步：${group.stepTitle}`,
    ...(group.materials || []).map(formatWorkflowMaterial),
  ]);

  return createTemplate({
    id: 'material-checklist',
    title: '材料清单待核验',
    description: '按办理步骤整理所有必备、按需和留存材料。',
    filenameBase: withLocation(session, '材料清单待核验'),
    appliesTo: '所有注册场景',
    warnings: ['材料名称和提交口径需以当地登记页面实际要求为准。'],
    plan,
    session,
    sections: [
      {
        title: '当前注册画像',
        content: buildSessionSummary(session),
      },
      {
        title: '按步骤材料清单',
        content: materialGroups.length ? materialGroups.map((items) => items.join('\n')) : ['暂无材料分组，请重新生成办理方案。'],
      },
      {
        title: '材料缺口',
        content: (plan.materialChecklist || []).map((item) => `${item.name}：${formatMaterialStatus(item.status)}。${item.action || item.reason}`),
      },
    ],
  });
}

function buildRoadmapChecklistTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'roadmap-checklist',
    title: '办理路线清单',
    description: '把第 1 步到最后一步拆成可勾选的办理顺序。',
    filenameBase: withLocation(session, '办理路线清单'),
    appliesTo: '所有注册场景',
    warnings: ['办理入口和页面按钮名称可能会调整，实际操作以官网页面展示为准。'],
    plan,
    session,
    sections: [
      {
        title: '办理顺序',
        content: (plan.roadmapSteps || []).map(formatRoadmapStep),
      },
    ],
  });
}

function buildArticlesTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  const capital = session.companyInfo?.registeredCapital ? `${session.companyInfo.registeredCapital} 万元` : '待确认';
  const shareholderLines = (session.companyInfo?.shareholders || []).length
    ? (session.companyInfo?.shareholders || []).map((shareholder) =>
        `${shareholder.name || '股东'}：认缴比例 ${shareholder.investmentRatio || 0}%，认缴金额 ${shareholder.investmentAmount || 0} 万元，出资期限 ${shareholder.investmentDeadline || '待确认'}`,
      )
    : ['股东姓名、认缴比例、认缴金额和出资期限待补充。'];

  return createTemplate({
    id: 'company-articles-draft',
    title: '公司章程草案',
    description: '供有限公司设立登记前整理章程核心字段。',
    filenameBase: withLocation(session, '公司章程草案'),
    appliesTo: '有限责任公司',
    warnings: ['这是草案，不是官方固定模板；提交前需按登记机关页面模板、股东决议和律师/财税意见核验。'],
    plan,
    session,
    sections: [
      {
        title: '章程核心字段',
        content: [
          `公司名称：${session.nameOptions?.[0]?.fullName || '待名称自主申报确认'}`,
          `住所：${session.address.fullAddress || '待补充'}`,
          `经营范围：${formatBusinessScope(session)}`,
          `注册资本：${capital}`,
          `法定代表人：${session.companyInfo?.legalRepresentative || '待补充'}`,
          `执行董事/董事：${session.companyInfo?.director || '待补充'}`,
          `监事：${session.companyInfo?.supervisor || '待补充'}`,
          `财务负责人：${session.companyInfo?.financialOfficer?.name || '待补充'}，电话 ${session.companyInfo?.financialOfficer?.phone || '待补充'}`,
        ],
      },
      {
        title: '股东出资安排',
        content: shareholderLines,
      },
      {
        title: '待核验条款',
        content: [
          '股东会/股东决定规则。',
          '利润分配、亏损承担和股权转让规则。',
          '法定代表人、董事、监事、高级管理人员职责。',
          '营业期限、解散与清算条款。',
          '是否采用登记机关平台提供的章程模板。',
        ],
      },
    ],
  });
}

function buildAddressProofTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'address-proof-draft',
    title: '住所经营场所证明草案',
    description: '整理注册地址/经营场所证明、租赁合同、住改商等材料。',
    filenameBase: withLocation(session, '住所经营场所证明草案'),
    appliesTo: '需要提交住所或经营场所材料的场景',
    warnings: ['住宅、托管、园区地址要求差异较大，需向属地登记机关或页面提示核验。'],
    plan,
    session,
    sections: [
      {
        title: '地址信息',
        content: [
          `地址类型：${formatAddressType(session.address.type)}`,
          `完整地址：${session.address.fullAddress || '待补充'}`,
          `现有地址材料：${session.address.documents.length ? session.address.documents.join('、') : '待补充'}`,
          `材料是否已齐：${session.address.documentsReady ? '是' : '否/待核验'}`,
        ],
      },
      {
        title: '常见准备项',
        content: [
          '产权证明或房屋权属信息。',
          '租赁合同或无偿使用证明。',
          '产权人/出租方身份证明或主体资格证明。',
          '经营场所平面/门牌/房间号等与填报地址一致的信息。',
          '住宅地址按属地要求准备住改商、利害关系人同意、物业/街道说明等材料。',
          '园区、孵化器、托管地址保留入驻协议、托管证明、备案说明和地址服务方资质材料。',
        ],
      },
    ],
  });
}

function buildIdCopyChecklistTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  const people = collectPeople(session);
  return createTemplate({
    id: 'id-copy-checklist',
    title: '身份证复印件准备清单',
    description: '列出谁需要准备身份证、手机号和实名签名信息。',
    filenameBase: withLocation(session, '身份证复印件准备清单'),
    appliesTo: '所有注册场景',
    warnings: ['身份证号等敏感信息不要上传到不可信渠道；本清单只记录需要准备的人员角色。'],
    plan,
    session,
    sections: [
      {
        title: '人员清单',
        content: people.length ? people : ['经营者/法定代表人、股东、监事、财务负责人、联系人等人员信息待补充。'],
      },
      {
        title: '准备要求',
        content: [
          '身份证正反面复印件或电子照片需清晰完整。',
          '手机号需能接收实名认证、电子签名、银行和税务短信。',
          '人员姓名、身份证、手机号应与登记平台实名认证一致。',
          '仅在官方登记平台、银行或税务等可信渠道提交敏感资料。',
        ],
      },
    ],
  });
}

function buildRiskCorrectionTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'risk-correction-checklist',
    title: '风险留存与补正清单',
    description: '把当前方案里的风险提示转成后续补正和留存动作。',
    filenameBase: withLocation(session, '风险留存与补正清单'),
    appliesTo: '所有有风险提示或需复核材料的场景',
    warnings: ['本清单用于降低驳回和后续合规风险，不替代法律、税务或审计意见。'],
    plan,
    session,
    sections: [
      {
        title: '当前风险提示',
        content: (plan.riskWarnings || []).length
          ? (plan.riskWarnings || []).map((warning) => `${warning.title}：${warning.message}`)
          : ['当前方案暂无明确风险提示；仍需按官网最新要求复核。'],
      },
      {
        title: '补正动作',
        content: [
          '提交前核对名称、地址、经营范围、人员身份和联系方式是否一致。',
          '涉及许可经营项目时，确认前置/后置许可办理顺序。',
          '注册资本较高时，留存出资计划、股东出资能力和实缴安排说明。',
          '地址存在争议时，先补齐地址证明、租赁合同、住改商或托管备案材料。',
        ],
      },
    ],
  });
}

function buildOnePersonCompanyRetentionTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'one-person-company-retention',
    title: '一人有限公司财产独立留存清单',
    description: '用于一人有限公司后续证明公司财产独立，不作为设立登记必交材料。',
    filenameBase: withLocation(session, '一人有限公司财产独立留存清单'),
    appliesTo: '一人有限公司',
    warnings: ['此清单不是设立登记必交材料，而是经营期风险留存材料。'],
    plan,
    session,
    sections: [
      {
        title: '留存材料',
        content: [
          '公司独立银行账户流水。',
          '完整会计账簿、凭证和财务报表。',
          '公司与个人资金往来的审批、合同、发票和还款记录。',
          '公司采购、销售、服务合同及对应发票。',
          '年度审计报告或财务核查材料。',
          '避免个人账户代收代付公司经营款项的说明和整改记录。',
        ],
      },
      {
        title: '使用场景',
        content: [
          '税务、审计、债务争议或股东责任风险核查。',
          '证明公司财产与股东个人财产相互独立。',
        ],
      },
    ],
  });
}

function buildAmazonChecklistTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'amazon-registration-checklist',
    title: 'Amazon 注册填表清单',
    description: '整理 Amazon 店铺注册常见字段，便于复制核对。',
    filenameBase: withLocation(session, 'Amazon注册填表清单'),
    appliesTo: '跨境电商 / Amazon 开店',
    warnings: ['Amazon 后台字段和审核要求以平台最新页面为准；所有主体、地址、法人信息应与营业执照一致。'],
    plan,
    session,
    sections: [
      {
        title: '主体信息',
        content: [
          `公司/个体户名称：${session.nameOptions?.[0]?.fullName || '以营业执照为准'}`,
          `统一社会信用代码：待营业执照核发后填写`,
          `注册地址：${session.address.fullAddress || '以营业执照为准'}`,
          `法定代表人/经营者：${session.companyInfo?.legalRepresentative || session.individualInfo?.ownerName || '待补充'}`,
          `经营范围：${formatBusinessScope(session)}`,
        ],
      },
      {
        title: '账号与收款',
        content: [
          '专用邮箱。',
          '可接收短信和电话的手机号。',
          '双币信用卡或平台要求的付款方式。',
          '海外收款账户，主体需与营业执照主体保持一致。',
          '可提供账单或地址验证材料的联系方式和地址。',
        ],
      },
      {
        title: '审核核验',
        content: [
          '营业执照扫描件/照片清晰完整。',
          '法人或经营者身份证件清晰完整。',
          '后台填写的公司名称、地址、法人信息和证照一致。',
          '如触发视频验证或地址验证，按后台最新提示准备。',
        ],
      },
    ],
  });
}

function buildCrossBorderFollowUpTemplate(plan: FinalWorkflowPlan, session: UserSession): DownloadableTemplate {
  return createTemplate({
    id: 'cross-border-follow-up',
    title: '跨境电商后续事项清单',
    description: '注册完成后继续准备进出口、海关、外汇、收款和平台材料。',
    filenameBase: withLocation(session, '跨境电商后续事项清单'),
    appliesTo: '跨境电商 / 进出口业务',
    warnings: ['进出口、海关、外汇、税务等事项需按业务真实性和属地要求办理。'],
    plan,
    session,
    sections: [
      {
        title: '后续事项',
        content: [
          '确认营业执照经营范围包含与真实业务匹配的互联网销售、货物进出口、技术进出口等表述。',
          '按业务需要办理进出口相关备案、海关备案、电子口岸或外汇相关事项。',
          '开立或绑定收款账户，确保主体一致。',
          '准备 Amazon 店铺注册、品牌、物流、税务和发票资料。',
          '建立日常记账、报税、发票和资金流水留存机制。',
        ],
      },
      {
        title: '方案中的跨境步骤',
        content: (plan.crossBorderSteps || []).flatMap((section) => [
          section.title,
          ...(section.items || []),
        ]),
      },
    ],
  });
}

function createTemplate({
  id,
  title,
  description,
  filenameBase,
  appliesTo,
  warnings,
  plan,
  session,
  sections,
}: {
  id: string;
  title: string;
  description: string;
  filenameBase: string;
  appliesTo: string;
  warnings: string[];
  plan: FinalWorkflowPlan;
  session: UserSession;
  sections: WorkspaceExportSection[];
}): DownloadableTemplate {
  return {
    id,
    title,
    description,
    filenameBase,
    appliesTo,
    warnings,
    payload: {
      title,
      subtitle: `${formatLocation(session)}${formatRegistrationType(session.registrationType)}办理准备`,
      summary: plan.summary,
      sections: [
        ...sections,
        {
          title: '免责声明',
          content: TEMPLATE_DISCLAIMER,
        },
      ],
      generatedAt: new Date(),
    },
  };
}

async function addDocxToZip(zip: JSZip, template: DownloadableTemplate) {
  const blob = await buildDocxBlob(template.payload);
  zip.file(resolveFilename(template.filenameBase, 'docx'), blob);
}

function addTextToZip(zip: JSZip, template: DownloadableTemplate, extension: 'md' | 'html', content: string) {
  const mime = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8';
  zip.file(resolveFilename(template.filenameBase, extension), new Blob([content], { type: mime }));
}

function formatRoadmapStep(step: WorkflowRoadmapStep) {
  return [
    `第 ${step.order} 步：${step.title}`,
    `办理阶段：${step.phase}`,
    `什么时候办：${step.whenToDo || '按路线顺序办理'}`,
    `办理机构：${step.agency || '以官方页面为准'}`,
    `官网入口：${step.officialUrl || '线下或官网搜索对应事项'}`,
    step.guideUrl ? `官方教程/依据：${step.guideUrl}` : '',
    ...(step.actions || []).map((action, index) => `操作 ${index + 1}：${action}`),
    ...(step.blockingRules || []).map((rule) => `不能继续的情况：${rule}`),
    step.nextStepHint ? `完成后：${step.nextStepHint}` : '',
  ].filter(Boolean).join('\n');
}

function formatWorkflowMaterial(material: WorkflowMaterialItem) {
  return [
    `${material.required ? '必备' : '按需/留存'}：${material.name}`,
    `状态：${formatMaterialStatus(material.status)}`,
    `适用场景：${material.appliesTo || '以实际情况为准'}`,
    `谁提供/去哪办：${material.provider || '待确认'}`,
    `如何准备：${material.howToPrepare || '按官方页面提示准备'}`,
    `依据：${material.officialBasis || '以官方最新要求为准'}`,
  ].join('；');
}

function buildSessionSummary(session: UserSession) {
  return [
    `主体类型：${formatRegistrationType(session.registrationType)}`,
    `地区：${formatLocation(session) || '待补充'}`,
    `行业：${session.industry || '待补充'}`,
    `行业分类：${session.industryCategory || '待判断'}`,
    `地址类型：${formatAddressType(session.address.type)}`,
    `完整地址：${session.address.fullAddress || '待补充'}`,
  ];
}

function collectPeople(session: UserSession) {
  const people = new Set<string>();
  if (session.individualInfo?.ownerName) people.add(`经营者：${session.individualInfo.ownerName}`);
  if (session.companyInfo?.legalRepresentative) people.add(`法定代表人：${session.companyInfo.legalRepresentative}`);
  if (session.companyInfo?.director) people.add(`董事/执行董事：${session.companyInfo.director}`);
  if (session.companyInfo?.supervisor) people.add(`监事：${session.companyInfo.supervisor}`);
  if (session.companyInfo?.financialOfficer?.name) people.add(`财务负责人：${session.companyInfo.financialOfficer.name}`);
  if (session.companyInfo?.contactPerson?.name) people.add(`联系人：${session.companyInfo.contactPerson.name}`);
  (session.companyInfo?.shareholders || []).forEach((shareholder) => {
    if (shareholder.name) people.add(`股东：${shareholder.name}`);
  });
  return Array.from(people);
}

function formatBusinessScope(session: UserSession) {
  const scopes = [
    ...(session.businessScope.mainScope || []),
    ...(session.businessScope.secondaryScope || []),
  ];
  return scopes.length ? scopes.join('；') : session.industry || '待经营范围规范化后确认';
}

function isCrossBorderScenario(plan: FinalWorkflowPlan, session: UserSession) {
  const text = [
    session.industry,
    session.industryCategory,
    plan.title,
    plan.summary,
    ...(plan.crossBorderSteps || []).flatMap((section) => [section.title, ...(section.items || [])]),
  ].join(' ');
  return /跨境|进出口|amazon|亚马逊/i.test(text);
}

function withLocation(session: UserSession, name: string) {
  const location = formatLocation(session).replace(/\s+/g, '');
  return location ? `${location}${name}` : name;
}

function formatLocation(session: UserSession) {
  return [session.location.province, session.location.city, session.location.district].filter(Boolean).join(' ');
}

function formatRegistrationType(value: UserSession['registrationType']) {
  if (value === 'individual') return '个体工商户';
  if (value === 'company') return '有限责任公司';
  return '注册主体';
}

function formatAddressType(value: UserSession['address']['type']) {
  const labels: Record<string, string> = {
    owned: '自有房产',
    rented: '租赁地址',
    residential: '住宅地址',
    virtual: '虚拟/挂靠地址',
    incubator: '园区/孵化器地址',
  };
  return value ? labels[value] || value : '待补充';
}

function formatMaterialStatus(value: string) {
  const labels: Record<string, string> = {
    ready: '已准备',
    missing: '待补充',
    needs_review: '需核验',
  };
  return labels[value] || value;
}

function assertBrowser() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('模板下载只能在浏览器端使用。');
  }
}
