import type {
  AmazonFieldPacket,
  ApplicationCase,
  DocumentType,
  GapAnalysis,
  GeneratedTemplate,
  NextQuestion,
  QualificationCategory,
  QualificationItem,
  TemplateType,
} from './domain';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
  fallbackAvailable?: boolean;
}

// 材料清单请求
export interface ChecklistRequest {
  sellerType: 'individual' | 'professional';
  region: string;
}

// 单项校验请求
export interface VerifyRequest {
  category: QualificationCategory;
  userInput: Record<string, string>;
}

// 风险评估请求
export interface RiskAssessRequest {
  applicationId: string;
  allQualifications: QualificationItem[];
}

export interface NextQuestionRequest {
  caseData: ApplicationCase;
  demoMode?: boolean;
}

export interface NextQuestionResponse {
  question: NextQuestion;
}

export interface GapAnalysisRequest {
  caseData: ApplicationCase;
  demoMode?: boolean;
}

export interface GapAnalysisResponse {
  analysis: GapAnalysis;
}

export interface TemplateDraftRequest {
  caseData: ApplicationCase;
  templateTypes?: TemplateType[];
  demoMode?: boolean;
}

export interface TemplateDraftResponse {
  templates: GeneratedTemplate[];
}

export interface AmazonPacketRequest {
  caseData: ApplicationCase;
  demoMode?: boolean;
}

export interface AmazonPacketResponse {
  packet: AmazonFieldPacket;
}

export interface VisionExtractRequest {
  documentType: DocumentType;
  imageBase64?: string;
  mimeType?: string;
  pastedText?: string;
  demoMode?: boolean;
}

export interface VisionExtractResponse {
  documentType: DocumentType;
  fields: Record<string, string>;
  confidence: number;
  issues: string[];
  source: 'vision' | 'manual' | 'mock';
}
