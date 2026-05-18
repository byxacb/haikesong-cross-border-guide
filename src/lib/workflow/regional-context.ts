import type { RegionalActionSource, RegionalContext, RegionalSource, UserSession } from './types';

const SAMR_2026_SOURCE: RegionalSource = {
  title: '市场监管总局：2026 版经营主体登记文书规范和提交材料规范',
  url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/djzcj/art/2026/art_3321d681741f48cfa3a8e6ef4b15cccd.html',
  snippet: '全国经营主体登记提交材料规范的上位参考，适合用于校验材料清单和登记文书边界。',
  sourceType: 'official',
  sourceKind: 'national_rule',
};

const SHANGHAI_ENTERPRISE_PORTAL = 'https://yct.sh.gov.cn/portal_yct/';
const SHANGHAI_NAME_NOTICE = 'https://yct.sh.gov.cn/portal_yct/webportal/v2/kbxz.do';
const SHANGHAI_SCOPE_NOTICE = 'https://yct.sh.gov.cn/portal_yct/webportal/v2/noticeBlxz';
const SHANGHAI_NAME_VALIDATION = 'https://fgw.sh.gov.cn/ys-sczr-2.1.2.1/';
const SHANGHAI_OPENING_GUIDE_PDF = 'https://fgw.sh.gov.cn/cmsres/bd/bd6c8e7bae6641d0a3e53060f2893489/6f4edf562ebebb7489714e2b4b7d3234.pdf';
const SHANGHAI_GOV_PORTAL = 'https://zwdt.sh.gov.cn/';

const OFFICIAL_PORTAL_HINTS: Record<string, RegionalSource[]> = {
  上海: [
    {
      title: '上海企业登记在线',
      url: SHANGHAI_ENTERPRISE_PORTAL,
      snippet: '上海企业登记、开办企业和相关市场主体登记的线上入口。',
      sourceType: 'official',
      sourceKind: 'official',
    },
    {
      title: '名称自主申报告知页',
      url: SHANGHAI_NAME_NOTICE,
      snippet: '上海企业登记在线的名称自主申报告知页，适合在正式填报名称前阅读规则边界。',
      sourceType: 'official',
      sourceKind: 'guide',
    },
    {
      title: '上海企业登记在线办理范围说明',
      url: SHANGHAI_SCOPE_NOTICE,
      snippet: '说明上海企业登记在线支持办理的主体类型和事项范围。',
      sourceType: 'official',
      sourceKind: 'guide',
    },
    {
      title: '上海发改委：公司名称验证说明',
      url: SHANGHAI_NAME_VALIDATION,
      snippet: '用于理解公司名称验证和名称申报相关注意点。',
      sourceType: 'official',
      sourceKind: 'guide',
    },
    {
      title: '上海企业登记在线使用指南（开办）PDF',
      url: SHANGHAI_OPENING_GUIDE_PDF,
      snippet: '上海开办企业线上办理操作指南，适合生成点击路径和填报步骤时引用。',
      sourceType: 'official',
      sourceKind: 'guide',
    },
    {
      title: '上海一网通办',
      url: SHANGHAI_GOV_PORTAL,
      snippet: '上海政务服务统一入口，可检索企业开办、个体工商户登记、税务和社保等事项。',
      sourceType: 'official',
      sourceKind: 'official',
    },
  ],
  成都: [
    {
      title: '四川政务服务网',
      url: 'https://www.sczwfw.gov.cn/',
      snippet: '四川省政务服务统一入口，可检索企业设立登记和个体工商户登记。',
      sourceType: 'official',
    },
  ],
  四川: [
    {
      title: '四川政务服务网',
      url: 'https://www.sczwfw.gov.cn/',
      snippet: '四川省政务服务统一入口，可检索企业设立登记和个体工商户登记。',
      sourceType: 'official',
    },
  ],
  福建: [
    {
      title: '福建省网上办事大厅',
      url: 'https://zwfw.fujian.gov.cn/',
      snippet: '福建省政务服务统一入口，适合检索市场主体登记相关事项。',
      sourceType: 'official',
    },
  ],
  厦门: [
    {
      title: '福建省网上办事大厅',
      url: 'https://zwfw.fujian.gov.cn/',
      snippet: '福建省政务服务统一入口，厦门事项以页面定位到本市后展示为准。',
      sourceType: 'official',
    },
  ],
  广东: [
    {
      title: '广东政务服务网',
      url: 'https://www.gdzwfw.gov.cn/',
      snippet: '广东省政务服务统一入口，可检索开办企业和市场主体登记事项。',
      sourceType: 'official',
    },
  ],
  深圳: [
    {
      title: '深圳市市场监督管理局',
      url: 'https://amr.sz.gov.cn/',
      snippet: '深圳市场监管官方入口，可进一步进入商事登记相关服务。',
      sourceType: 'official',
    },
  ],
  海南: [
    {
      title: '海南政务服务网',
      url: 'https://wssp.hainan.gov.cn/hnwt/home',
      snippet: '海南政务服务统一入口，可检索个体工商户和企业登记事项。',
      sourceType: 'official',
    },
  ],
  北京: [
    {
      title: '北京市企业服务 e 窗通平台',
      url: 'https://ect.scjgj.beijing.gov.cn/',
      snippet: '北京企业开办与登记相关线上入口。',
      sourceType: 'official',
    },
  ],
};

const SHANGHAI_ACTION_CARDS: RegionalActionSource[] = [
  {
    id: 'shanghai-name-declaration',
    category: 'name_declaration',
    officialSourceType: 'official',
    title: '上海名称自主申报',
    appliesTo: ['有限责任公司', '个体工商户', '准备名称备选的用户'],
    entryUrl: SHANGHAI_ENTERPRISE_PORTAL,
    sourceUrl: SHANGHAI_NAME_NOTICE,
    clickPath: [
      '打开上海企业登记在线',
      '在首页或事项区选择/搜索“名称自主申报”相关事项',
      '阅读名称自主申报告知内容',
      '按行政区划、字号、行业表述、组织形式拆分填写名称',
      '保存至少 3 个备选名称，优先使用最符合经营范围的名称',
    ],
    requiredInputs: [
      '拟注册地区',
      '主体类型',
      '3-5 个备选字号',
      '行业表述',
      '组织形式',
      '经办人实名账号',
    ],
    warnings: [
      '名称是否可用以系统实时校验结果为准。',
      '不要使用可能误导公众、侵犯他人在先权利或与知名主体近似的字号。',
      '如果页面按钮名称有调整，按页面搜索或选择“名称自主申报”相关事项办理。',
    ],
    fallbackText: '如果无法直接找到入口，在上海企业登记在线页面内搜索或选择“名称自主申报”。',
  },
  {
    id: 'shanghai-company-registration',
    category: 'company_registration',
    officialSourceType: 'official',
    title: '上海有限公司设立登记',
    appliesTo: ['有限责任公司', '一人有限公司', '跨境电商公司'],
    entryUrl: SHANGHAI_ENTERPRISE_PORTAL,
    sourceUrl: SHANGHAI_OPENING_GUIDE_PDF,
    clickPath: [
      '打开上海企业登记在线',
      '选择企业设立或开办企业相关事项',
      '按系统提示填报名称、住所、注册资本、股东出资、法定代表人和联络员信息',
      '上传或确认住所证明、公司章程、股东和任职人员材料',
      '完成实名认证、电子签名或按提示转线下提交',
      '提交后在平台查看受理、补正或核准结果',
    ],
    requiredInputs: [
      '企业名称或名称申报结果',
      '注册地址和住所证明',
      '注册资本和 5 年内实缴安排',
      '股东姓名、证件信息、出资比例和出资期限',
      '法定代表人、董事、监事、财务负责人、联络员信息',
      '经营范围标准条目',
    ],
    warnings: [
      '注册资本不是越高越好，超过自身承担能力会带来实缴和责任风险。',
      '一人有限公司要特别注意公司财产与个人财产独立。',
      '住所材料和经营范围不符合要求时，常见结果是补正或驳回。',
    ],
    fallbackText: '如果页面入口名称变化，在上海企业登记在线中选择或搜索“企业设立登记”“开办企业”。',
  },
  {
    id: 'shanghai-individual-registration',
    category: 'individual_registration',
    officialSourceType: 'official',
    title: '上海个体工商户登记',
    appliesTo: ['个体工商户', '个人经营', '家庭经营'],
    entryUrl: SHANGHAI_ENTERPRISE_PORTAL,
    sourceUrl: SHANGHAI_SCOPE_NOTICE,
    clickPath: [
      '打开上海企业登记在线',
      '先查看办理范围说明，确认个体工商户登记是否可线上办理',
      '选择个体工商户设立登记相关事项',
      '填写经营者、经营场所、经营范围和联系方式',
      '按系统要求完成实名认证、材料上传和提交',
    ],
    requiredInputs: [
      '经营者身份证明',
      '经营场所地址和证明',
      '经营范围',
      '手机号和实名认证账号',
      '个人经营或家庭经营选择',
    ],
    warnings: [
      '个体户适合轻量经营，但经营者通常以个人财产承担经营风险。',
      '涉及食品、餐饮、出版、药品等许可项目时，登记后仍需办理相应许可。',
    ],
    fallbackText: '如果页面没有直接展示个体户入口，先看办理范围说明，再按页面搜索“个体工商户设立登记”。',
  },
  {
    id: 'shanghai-address-registration',
    category: 'address_registration',
    officialSourceType: 'guide',
    title: '上海住所登记与地址材料核验',
    appliesTo: ['有限责任公司', '个体工商户', '住宅地址', '园区地址', '租赁地址'],
    entryUrl: SHANGHAI_ENTERPRISE_PORTAL,
    sourceUrl: SHANGHAI_OPENING_GUIDE_PDF,
    clickPath: [
      '在企业设立或个体户登记填报中进入住所或经营场所信息',
      '按地址类型填写完整门牌、房屋用途、产权或租赁信息',
      '上传租赁合同、产权证明、住所使用承诺或平台要求的其他材料',
      '住宅地址按页面要求确认是否需要住改商、利害关系人同意或街道证明',
    ],
    requiredInputs: [
      '完整注册地址',
      '产权证明或租赁合同',
      '房屋用途说明',
      '住所使用证明或承诺材料',
      '园区/孵化器地址的托管或入驻证明',
    ],
    warnings: [
      '住宅注册公司可能需要住改商材料，部分地址不能用于登记。',
      '虚拟或托管地址必须确认服务商资质和备案状态，避免后续经营异常。',
      '地址材料姓名、地址、租期与填报信息不一致时容易补正。',
    ],
    fallbackText: '地址要求通常跟具体房屋类型相关，页面未明确时应咨询登记机关或政务大厅窗口。',
  },
  {
    id: 'shanghai-name-validation',
    category: 'name_declaration',
    officialSourceType: 'guide',
    title: '上海公司名称验证辅助核验',
    appliesTo: ['有限责任公司', '名称被驳回或担心重名的用户'],
    entryUrl: SHANGHAI_NAME_VALIDATION,
    sourceUrl: SHANGHAI_NAME_VALIDATION,
    clickPath: [
      '打开上海发改委公司名称验证说明页',
      '核对名称申报的组成规则和验证要求',
      '回到上海企业登记在线进行系统申报',
      '名称被提示风险时，更换字号或调整行业表述后再试',
    ],
    requiredInputs: [
      '备选字号',
      '行业表述',
      '组织形式',
      '拟登记行政区划',
    ],
    warnings: [
      '辅助说明不能替代登记系统审核结果。',
      '名称可用性以市场监管登记系统实时反馈为准。',
    ],
    fallbackText: '如果辅助说明页不可用，仍以上海企业登记在线的名称申报反馈为准。',
  },
  {
    id: 'shanghai-seal-carving',
    category: 'seal_carving',
    officialSourceType: 'official',
    title: '上海刻章备案办理提醒',
    appliesTo: ['已领取营业执照的公司', '需要公章/财务章/法人章的主体'],
    entryUrl: SHANGHAI_GOV_PORTAL,
    clickPath: [
      '领取营业执照后，先确认登记平台或短信是否提示公章刻制联办',
      '没有联办提示时，在一网通办搜索“公章刻制”“印章备案”等事项',
      '选择公安备案刻章点或按政务大厅指引办理',
      '刻制完成后核对公章、财务章、法人章信息与营业执照一致',
    ],
    requiredInputs: [
      '营业执照',
      '法定代表人身份证明',
      '经办人身份证明和授权材料',
      '企业名称和统一社会信用代码',
    ],
    warnings: [
      '必须选择公安备案刻章点，不要使用无法备案的私刻印章。',
      '具体是否免费、可否联办、领取方式以页面和窗口最新要求为准。',
      '当前只展示已确认的办理入口，不编造未确认的具体按钮名称。',
    ],
    fallbackText: '在线入口不明确时，咨询政务大厅或公安备案刻章点。',
  },
  {
    id: 'shanghai-tax-registration',
    category: 'tax_registration',
    officialSourceType: 'official',
    title: '上海税务登记/新办纳税人事项',
    appliesTo: ['已领取营业执照的公司', '个体工商户', '需要开票或申报的主体'],
    entryUrl: SHANGHAI_GOV_PORTAL,
    clickPath: [
      '领取营业执照后 30 天内处理税务报到或新办纳税人事项',
      '在一网通办、主管税务机关或电子税务局入口搜索“新办纳税人”“税务登记”“发票申领”',
      '确认税种、申报期限、财务负责人和办税人员信息',
      '需要开票时，再按页面要求申请发票票种和税控/数电票权限',
    ],
    requiredInputs: [
      '营业执照和统一社会信用代码',
      '法定代表人、财务负责人、办税人员信息',
      '银行账户信息（如已开户）',
      '经营范围和预计开票需求',
    ],
    warnings: [
      '即使暂时没有收入，也要关注申报义务和零申报要求。',
      '税种、征收方式和开票资格需以主管税务机关核定为准。',
      '不要把税务登记理解为系统会自动替你完成申报。',
    ],
    fallbackText: '入口不明确时，咨询主管税务机关、电子税务局或政务大厅税务窗口；不要把本卡理解为自动完成税务申报。',
  },
  {
    id: 'shanghai-bank-account',
    category: 'bank_account',
    officialSourceType: 'official',
    title: '对公银行账户预约',
    appliesTo: ['有限责任公司', '需要 Amazon 收款或对公结算的主体'],
    entryUrl: SHANGHAI_GOV_PORTAL,
    clickPath: [
      '先确认营业执照、印章、法定代表人和实际经营地址材料已准备好',
      '通过拟开户银行官方渠道预约对公开户',
      '按银行要求完成尽调、地址核验、法人到场或视频核验',
      '开户完成后再同步给税务、收款账户和 Amazon 店铺资料',
    ],
    requiredInputs: [
      '营业执照',
      '公章、财务章、法人章',
      '法定代表人身份证明',
      '注册地址和实际经营地址说明',
      '公司章程或股东信息',
    ],
    warnings: [
      '银行开户不是市场监管登记的一部分，审核标准由银行和反洗钱要求决定。',
      '不要使用非官方代办渠道提交敏感资料。',
      '跨境电商收款还需单独准备第三方收款账户或银行跨境收款资料。',
    ],
    fallbackText: '没有统一在线按钮时，以拟开户银行官方 App、网点或客户经理预约为准。',
  },
  {
    id: 'shanghai-social-security',
    category: 'social_security',
    officialSourceType: 'official',
    title: '社保/公积金开户事项',
    appliesTo: ['准备雇佣员工的公司', '需要规范用工的主体'],
    entryUrl: SHANGHAI_GOV_PORTAL,
    clickPath: [
      '确认公司已领取营业执照并完成基础税务事项',
      '在一网通办搜索“单位社保开户”“住房公积金单位开户”等事项',
      '按页面要求填写单位基本信息、经办人和缴存信息',
      '有员工入职时，再按要求办理增员和缴费基数申报',
    ],
    requiredInputs: [
      '营业执照和统一社会信用代码',
      '法定代表人或经办人信息',
      '单位银行账户',
      '员工身份和入职信息（有员工时）',
    ],
    warnings: [
      '没有员工时通常先关注开户条件；有员工后要按用工规定及时参保。',
      '缴费基数和办理期限以社保、公积金部门最新页面为准。',
    ],
    fallbackText: '入口不明确时，在一网通办搜索相关事项或咨询社保、公积金窗口。',
  },
  {
    id: 'shanghai-cross-border',
    category: 'cross_border',
    officialSourceType: 'national_rule',
    title: '跨境电商附加准备',
    appliesTo: ['跨境电商公司', 'Amazon 卖家', '货物进出口业务'],
    entryUrl: SHANGHAI_ENTERPRISE_PORTAL,
    sourceUrl: SAMR_2026_SOURCE.url,
    clickPath: [
      '在经营范围阶段确认是否包含货物进出口、技术进出口、互联网销售等相关条目',
      '营业执照办结后，按实际业务办理进出口权、海关、外汇和电子口岸等备案',
      '准备 Amazon 注册材料：营业执照、法人身份证、联系方式、双币信用卡、收款账户',
      '第三方收款账户完成实名认证后，再与 Amazon 后台公司资料保持一致',
    ],
    requiredInputs: [
      '经营范围中的进出口相关表述',
      '营业执照',
      '法人身份证明',
      '双币信用卡',
      '海外收款账户',
      '手机号和邮箱',
    ],
    warnings: [
      '营业执照经营范围不等于已经取得全部跨境备案或平台审核资格。',
      'Amazon 审核看重资料一致性，执照、法人、地址、收款账户信息不要互相冲突。',
      '涉及特定品类、品牌或危险品时，还可能需要额外资质。',
    ],
    fallbackText: '跨境备案事项会随业务模式变化，应以海关、外汇、电子口岸和 Amazon 官方后台最新要求为准。',
  },
];

const NATIONAL_RULE_ACTION_CARD: RegionalActionSource = {
  id: 'national-samr-material-rules',
  category: 'national_rules',
  officialSourceType: 'national_rule',
  title: '2026 全国登记材料规范核验',
  appliesTo: ['有限责任公司', '个体工商户', '所有经营主体'],
  entryUrl: SAMR_2026_SOURCE.url,
  sourceUrl: SAMR_2026_SOURCE.url,
  clickPath: [
    '打开市场监管总局 2026 版规范通知',
    '按主体类型核对登记文书和提交材料',
    '再回到所在地官方登记平台按地方页面要求提交',
  ],
  requiredInputs: [
    '主体类型',
    '登记事项类型',
    '材料清单',
    '签署人和经办人信息',
  ],
  warnings: [
    '这是全国上位材料规范，地方系统填报项和页面路径仍以当地平台为准。',
    '材料名称相似不代表内容合格，提交前要核对签署、日期、证件有效期和地址一致性。',
  ],
  fallbackText: '如地方平台要求与上位规范表述不同，先按地方登记机关页面要求办理。',
};

const GENERIC_PORTAL_ACTIONS: Record<string, RegionalActionSource[]> = {
  成都: [
    buildGenericPortalAction('chengdu-sichuan-registration', '四川/成都市场主体登记入口', '四川政务服务网', 'https://www.sczwfw.gov.cn/', ['成都', '四川']),
  ],
  四川: [
    buildGenericPortalAction('sichuan-registration', '四川市场主体登记入口', '四川政务服务网', 'https://www.sczwfw.gov.cn/', ['四川']),
  ],
  福建: [
    buildGenericPortalAction('fujian-registration', '福建市场主体登记入口', '福建省网上办事大厅', 'https://zwfw.fujian.gov.cn/', ['福建']),
  ],
  厦门: [
    buildGenericPortalAction('xiamen-fujian-registration', '厦门市场主体登记入口', '福建省网上办事大厅', 'https://zwfw.fujian.gov.cn/', ['厦门', '福建']),
  ],
  广东: [
    buildGenericPortalAction('guangdong-registration', '广东市场主体登记入口', '广东政务服务网', 'https://www.gdzwfw.gov.cn/', ['广东']),
  ],
  深圳: [
    buildGenericPortalAction('shenzhen-registration', '深圳商事登记入口', '深圳市市场监督管理局', 'https://amr.sz.gov.cn/', ['深圳']),
  ],
  海南: [
    buildGenericPortalAction('hainan-registration', '海南市场主体登记入口', '海南政务服务网', 'https://wssp.hainan.gov.cn/hnwt/home', ['海南']),
  ],
  北京: [
    buildGenericPortalAction('beijing-registration', '北京企业开办入口', '北京市企业服务 e 窗通平台', 'https://ect.scjgj.beijing.gov.cn/', ['北京']),
  ],
};

export async function retrieveRegionalContext(session: UserSession): Promise<RegionalContext> {
  return buildKnownRegionalContext(session);
}

export function buildKnownRegionalContext(session: UserSession): RegionalContext {
  const locationLabel = [session.location.province, session.location.city, session.location.district]
    .filter(Boolean)
    .join(' ') || '中国大陆';
  const sources = dedupeSources([...getOfficialHints(session), SAMR_2026_SOURCE]);
  const actionCards = dedupeActionCards([...getOfficialActionCards(session), NATIONAL_RULE_ACTION_CARD]);

  return {
    query: `${locationLabel} 登记事项 DeepSeek 地区化判断`,
    locationLabel,
    retrievedAt: new Date().toISOString(),
    sources,
    actionCards,
    summary: buildRegionalSummary(locationLabel, sources),
  };
}

export function hasSearchProviderKey() {
  return true;
}

function getOfficialHints(session: UserSession): RegionalSource[] {
  const keys = [
    session.location.city,
    session.location.province,
    session.location.district,
  ].filter((key): key is string => Boolean(key));

  const sources: RegionalSource[] = [];
  for (const key of keys) {
    for (const [region, regionSources] of Object.entries(OFFICIAL_PORTAL_HINTS)) {
      if (key.includes(region) || region.includes(key)) {
        sources.push(...regionSources);
      }
    }
  }
  return sources;
}

function getOfficialActionCards(session: UserSession): RegionalActionSource[] {
  const keys = [
    session.location.city,
    session.location.province,
    session.location.district,
  ].filter((key): key is string => Boolean(key));

  const cards: RegionalActionSource[] = [];
  for (const key of keys) {
    if (key.includes('上海') || '上海'.includes(key)) {
      cards.push(...filterShanghaiCards(session));
      continue;
    }

    for (const [region, regionCards] of Object.entries(GENERIC_PORTAL_ACTIONS)) {
      if (key.includes(region) || region.includes(key)) {
        cards.push(...regionCards);
      }
    }
  }
  return cards;
}

function filterShanghaiCards(session: UserSession): RegionalActionSource[] {
  const isCompany = session.registrationType === 'company';
  const isIndividual = session.registrationType === 'individual';
  const isCrossBorder = /跨境|进出口|amazon|亚马逊/i.test(session.industry);
  return SHANGHAI_ACTION_CARDS.filter((card) => {
    if (card.category === 'company_registration') return !isIndividual;
    if (card.category === 'individual_registration') return !isCompany;
    if (card.category === 'cross_border') return isCrossBorder || !session.industry;
    return true;
  });
}

function buildRegionalSummary(locationLabel: string, sources: RegionalSource[]): string {
  if (!sources.length) {
    return `${locationLabel} 暂未匹配到内置官方入口。DeepSeek 需要基于自身知识进行地区化判断，并明确提示用户以当地市场监管局和政务服务网最新页面为准。`;
  }
  return `${locationLabel} 地区上下文已匹配 ${sources.length} 个内置来源，并提供可执行办理事项卡片。DeepSeek 可以结合自身知识组织下一问和步骤，但不得编造未确认的按钮、费用、时限。`;
}

function dedupeSources(sources: RegionalSource[]): RegionalSource[] {
  const seen = new Set<string>();
  const result: RegionalSource[] = [];
  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    result.push(source);
  }
  return result;
}

function dedupeActionCards(cards: RegionalActionSource[]): RegionalActionSource[] {
  const seen = new Set<string>();
  const result: RegionalActionSource[] = [];
  for (const card of cards) {
    if (!card.id || seen.has(card.id)) continue;
    seen.add(card.id);
    result.push(card);
  }
  return result;
}

function buildGenericPortalAction(
  id: string,
  title: string,
  portalName: string,
  entryUrl: string,
  appliesTo: string[],
): RegionalActionSource {
  return {
    id,
    category: 'general_portal',
    officialSourceType: 'official',
    title,
    appliesTo,
    entryUrl,
    clickPath: [
      `打开${portalName}`,
      '定位到所在市区后搜索“企业设立登记”“个体工商户设立登记”“开办企业”等事项',
      '按页面实时展示选择主体类型、填报名称、住所、经营范围和人员信息',
      '提交前核对材料清单、电子签名和实名认证要求',
    ],
    requiredInputs: [
      '主体类型',
      '拟注册地区',
      '名称备选',
      '注册地址材料',
      '经营范围',
      '申请人或经办人实名账号',
    ],
    warnings: [
      '当前地区暂未内置精确按钮路径，点击路径以页面实时展示为准。',
      '不要把通用入口当作最终材料结论，提交前需核对当地页面要求。',
    ],
    fallbackText: `如找不到事项，在${portalName}搜索市场主体登记关键词或咨询当地政务大厅。`,
  };
}
