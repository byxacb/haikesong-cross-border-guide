// 卖家类型
export type SellerType = 'individual' | 'professional';

// 当前 MVP 只落地中国大陆卖家注册亚马逊北美站
export type RegionCode = 'CN';
export type TargetMarketplace = 'amazon_us';
export type EntityStatus = 'unknown' | 'no_company' | 'has_company';
export type BusinessEntityType = 'limited_company' | 'individual_business';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';
export type DocumentType =
  | 'business_license'
  | 'id_card'
  | 'address_proof'
  | 'company_articles'
  | 'residence_certificate'
  | 'appointment_document'
  | 'amazon_form'
  | 'risk_fix'
  | 'other';
export type TemplateType =
  | 'company_setup_checklist'
  | 'individual_business_checklist'
  | 'company_articles'
  | 'residence_certificate'
  | 'id_copy_checklist'
  | 'amazon_registration_fields'
  | 'risk_fix_checklist';
export type AmazonFieldStatus = 'ready' | 'missing' | 'needs_review';
export type AgentStage =
  | 'start'
  | 'questioning'
  | 'document'
  | 'analysis'
  | 'templates'
  | 'packet';

// 资质类别
export type QualificationCategory =
  | 'business_license'
  | 'id_card'
  | 'credit_card'
  | 'bank_account'
  | 'contact_info'
  | 'address_proof';

// 注册申请
export interface RegistrationApplication {
  id: string;
  sellerType: SellerType;
  region: string;
  status: 'draft' | 'checking' | 'ready' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

// 资质项
export interface QualificationItem {
  id: string;
  applicationId: string;
  category: QualificationCategory;
  status: 'pending' | 'filled' | 'verified' | 'warning' | 'error';
  userInput: Record<string, string>;
  aiCheckResult?: AICheckResult;
}

// 材料清单项
export interface ChecklistItem {
  category: QualificationCategory;
  name: string;
  required: boolean;
  requirements: string[];
  tips: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    placeholder: string;
    validation?: string;
    options?: string[];
  }>;
}

// AI校验结果
export interface AICheckResult {
  passed: boolean;
  riskLevel: RiskLevel;
  issues: Array<{
    field: string;
    problem: string;
    suggestion: string;
  }>;
  summary: string;
}

// 风险评估报告
export interface RiskAssessmentReport {
  applicationId: string;
  overallRisk: RiskLevel;
  passRate: number;
  risks: Array<{
    category: string;
    description: string;
    severity: 'warning' | 'error';
    suggestion: string;
  }>;
  strengths: string[];
  readySummary: string;
}

export interface FounderProfile {
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  address: string;
}

export interface CompanyPlan {
  entityType: BusinessEntityType;
  companyName: string;
  businessScope: string;
  registeredAddress: string;
  registeredCapital: string;
  shareholderInfo: string;
  contactPhone: string;
}

export interface DocumentAsset {
  id: string;
  type: DocumentType;
  name: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt: string;
  note?: string;
}

export interface ExtractedDocument {
  id: string;
  documentAssetId?: string;
  type: DocumentType;
  fields: Record<string, string>;
  confidence: number;
  issues: string[];
  source: 'vision' | 'manual' | 'mock';
  extractedAt: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export interface GapAnalysis {
  summary: string;
  readinessScore: number;
  riskLevel: RiskLevel;
  missingItems: Array<{
    id: string;
    title: string;
    reason: string;
    action: string;
    required: boolean;
  }>;
  readyItems: string[];
  nextActions: string[];
  disclaimer: string;
}

export interface GeneratedTemplate {
  id: string;
  type: TemplateType;
  title: string;
  description: string;
  content: string;
  sourceFields: string[];
  warnings: string[];
  updatedAt: string;
}

export interface AmazonFieldPacket {
  title: string;
  marketplace: TargetMarketplace;
  fields: Array<{
    id: string;
    label: string;
    value: string;
    source: string;
    status: AmazonFieldStatus;
    note: string;
  }>;
  risks: string[];
  copyBlock: string;
  disclaimer: string;
}

export interface NextQuestion {
  question: string;
  fieldKey: string;
  helperText: string;
  options: string[];
  done: boolean;
}

export interface QuestionHistoryItem {
  id: string;
  question: string;
  fieldKey: string;
  answer: string;
  answeredAt: string;
}

export interface ApplicationCase {
  id: string;
  name: string;
  region: RegionCode;
  targetMarketplace: TargetMarketplace;
  entityStatus: EntityStatus;
  founder: FounderProfile;
  companyPlan: CompanyPlan;
  documents: DocumentAsset[];
  extractedDocuments: ExtractedDocument[];
  tasks: WorkspaceTask[];
  gapAnalysis: GapAnalysis | null;
  templates: GeneratedTemplate[];
  amazonPacket: AmazonFieldPacket | null;
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  caseData: ApplicationCase;
  generatedAt: string;
  source: 'ai' | 'mock';
}
