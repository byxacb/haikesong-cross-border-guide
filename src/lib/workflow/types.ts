export type RegistrationType = 'individual' | 'company' | null;
export type CompanySubType = 'one_person' | 'multi_person';
export type OperationType = 'personal' | 'family';
export type AddressType = 'owned' | 'rented' | 'residential' | 'virtual' | 'incubator';
export type RegistrationStatus = 'preparing' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
export type QuestionType = 'single_choice' | 'multi_choice' | 'text_input' | 'confirm';
export type WarningSeverity = 'info' | 'warning' | 'critical';
export type MaterialStatus = 'ready' | 'missing' | 'needs_review';
export type OfficialSourceKind = 'official' | 'guide' | 'national_rule';
export type WorkflowMaterialCategory =
  | 'required_registration'
  | 'address'
  | 'personnel_signature'
  | 'post_registration'
  | 'cross_border'
  | 'risk_retention';
export type RegionalActionCategory =
  | 'name_declaration'
  | 'company_registration'
  | 'individual_registration'
  | 'address_registration'
  | 'seal_carving'
  | 'tax_registration'
  | 'bank_account'
  | 'social_security'
  | 'cross_border'
  | 'national_rules'
  | 'general_portal';

export interface UserSession {
  registrationType: RegistrationType;
  companySubType?: CompanySubType;
  location: {
    province: string;
    city: string;
    district?: string;
  };
  industry: string;
  industryCategory: string;
  existingMaterials: string[];
  individualInfo?: {
    ownerName: string;
    idNumber: string;
    phone: string;
    operationType: OperationType;
    preferOnline: boolean;
  };
  companyInfo?: {
    shareholders: Array<{
      name: string;
      idNumber: string;
      investmentRatio: number;
      investmentAmount: number;
      investmentDeadline: string;
    }>;
    registeredCapital: number;
    legalRepresentative: string;
    director: string;
    supervisor: string;
    financialOfficer: { name: string; phone: string };
    contactPerson: { name: string; phone: string; email: string };
  };
  nameOptions: Array<{
    fullName: string;
    administrativeDivision: string;
    tradeName: string;
    industryTerm: string;
    organizationForm: string;
    isPrimary: boolean;
  }>;
  businessScope: {
    mainScope: string[];
    secondaryScope: string[];
    requiresLicense: boolean;
    licenseDetails?: Array<{
      item: string;
      licenseType: string;
      timing: 'pre' | 'post';
    }>;
  };
  address: {
    type: AddressType | '';
    fullAddress: string;
    documentsReady: boolean;
    documents: string[];
  };
  materialsChecklist: Array<{
    name: string;
    description: string;
    required: boolean;
    collected: boolean;
    howToPrepare?: string;
  }>;
  registrationProgress: {
    currentStep: number;
    totalSteps: number;
    status: RegistrationStatus;
    rejectionReason?: string;
  };
  postRegistration: {
    sealCarved: boolean;
    bankAccountOpened: boolean;
    taxRegistered: boolean;
    socialInsurance: boolean;
    invoiceApplied: boolean;
    bookkeepingSetup: boolean;
  };
}

export interface DialogNode {
  id: string;
  phase: number;
  question: string;
  questionType: QuestionType;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  validation?: {
    required: boolean;
    pattern?: string;
    errorMessage?: string;
  };
  fieldKey?: string;
  helperText?: string;
}

export interface WorkflowHistoryItem {
  id: string;
  nodeId: string;
  phase: number;
  question: string;
  answer: string | string[];
  createdAt: string;
}

export interface RegionalSource {
  title: string;
  url: string;
  snippet: string;
  sourceType: 'official' | 'search';
  sourceKind?: OfficialSourceKind;
}

export interface RegionalActionSource {
  id: string;
  category: RegionalActionCategory;
  officialSourceType?: OfficialSourceKind;
  title: string;
  appliesTo: string[];
  entryUrl: string;
  sourceUrl?: string;
  clickPath: string[];
  requiredInputs: string[];
  warnings: string[];
  fallbackText?: string;
}

export interface RegionalContext {
  query: string;
  locationLabel: string;
  retrievedAt: string;
  sources: RegionalSource[];
  actionCards: RegionalActionSource[];
  summary: string;
}

export interface RiskWarning {
  id: string;
  title: string;
  message: string;
  severity: WarningSeverity;
  source: 'deepseek' | 'guardrail' | 'regional';
}

export interface MaterialGap {
  name: string;
  status: MaterialStatus;
  reason: string;
  action: string;
}

export interface WorkflowMaterialItem {
  name: string;
  category: WorkflowMaterialCategory;
  status: MaterialStatus;
  required: boolean;
  appliesTo: string;
  provider: string;
  howToPrepare: string;
  officialBasis: string;
  sourceUrl?: string;
}

export interface WorkflowMaterialsByStep {
  order: number;
  stepTitle: string;
  materials: WorkflowMaterialItem[];
}

export interface WorkflowRoadmapStep {
  order: number;
  phase: number;
  title: string;
  whenToDo: string;
  agency: string;
  officialUrl: string;
  guideUrl?: string;
  materials: WorkflowMaterialItem[];
  actions: string[];
  blockingRules: string[];
  nextStepHint: string;
  actionCardIds?: string[];
}

export interface WorkflowQuestion {
  id: string;
  phase: number;
  question: string;
  questionType: QuestionType;
  fieldKey: string;
  helperText: string;
  options: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
}

export interface WorkflowStepResult {
  session: UserSession;
  currentPhase: number;
  phaseLabel: string;
  nextQuestion: WorkflowQuestion;
  riskWarnings: RiskWarning[];
  materialGaps: MaterialGap[];
  rationale: string;
  sources: RegionalSource[];
  actionCards: RegionalActionSource[];
  canGenerateFinalPlan: boolean;
  finalPlanPreview: string;
  disclaimer: string;
}

export interface WorkflowStepRequest {
  session: UserSession;
  history: WorkflowHistoryItem[];
  currentQuestion?: WorkflowQuestion | null;
  answer?: string | string[];
}

export interface FinalPlanSection {
  title: string;
  items: string[];
  actionCards?: RegionalActionSource[];
}

export interface FinalWorkflowPlan {
  title: string;
  summary: string;
  materialChecklist: MaterialGap[];
  roadmapSteps: WorkflowRoadmapStep[];
  materialsByStep: WorkflowMaterialsByStep[];
  registrationSteps: FinalPlanSection[];
  postRegistrationSteps: FinalPlanSection[];
  crossBorderSteps: FinalPlanSection[];
  riskWarnings: RiskWarning[];
  timelineEstimate: string;
  sourceNotes: RegionalSource[];
  actionCards: RegionalActionSource[];
  disclaimer: string;
}

export interface WorkflowFinalPlanRequest {
  session: UserSession;
  history: WorkflowHistoryItem[];
}
