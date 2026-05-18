import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentStage,
  AmazonFieldPacket,
  ApplicationCase,
  DocumentAsset,
  EntityStatus,
  ExtractedDocument,
  GapAnalysis,
  GeneratedTemplate,
  NextQuestion,
  QuestionHistoryItem,
  SellerType,
  QualificationCategory,
  ChecklistItem,
  AICheckResult,
  RiskAssessmentReport,
} from '@/types/domain';
import { createEmptyCase } from '@/lib/ai/mock';
import { saveCaseToIndexedDb } from '@/lib/storage/indexed-db';

// 流程步骤
export type FlowStep = 'home' | 'select' | 'checklist' | 'fill' | 'report';

interface AppState {
  // 当前流程步骤
  currentStep: FlowStep;
  setCurrentStep: (step: FlowStep) => void;

  // 卖家选择
  sellerType: SellerType | null;
  region: string;
  setSellerInfo: (sellerType: SellerType, region: string) => void;

  // 材料清单（AI生成的）
  checklist: ChecklistItem[];
  setChecklist: (items: ChecklistItem[]) => void;

  // 当前正在填写的资质项索引
  currentQualificationIndex: number;
  setCurrentQualificationIndex: (index: number) => void;

  // 各项资质的用户输入和校验结果
  qualifications: Record<QualificationCategory, {
    userInput: Record<string, string>;
    checkResult?: AICheckResult;
    status: 'pending' | 'filled' | 'verified' | 'warning' | 'error';
  }>;
  updateQualification: (category: QualificationCategory, data: {
    userInput?: Record<string, string>;
    checkResult?: AICheckResult;
    status?: 'pending' | 'filled' | 'verified' | 'warning' | 'error';
  }) => void;

  // 风险评估报告
  riskReport: RiskAssessmentReport | null;
  setRiskReport: (report: RiskAssessmentReport | null) => void;

  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 重置全部状态（重新开始）
  reset: () => void;

  // 工作台档案
  activeCase: ApplicationCase;
  fallbackMode: boolean;
  agentStage: AgentStage;
  currentQuestion: NextQuestion | null;
  questionHistory: QuestionHistoryItem[];
  lastAiError: string;
  demoModeEnabled: boolean;
  setFallbackMode: (fallback: boolean) => void;
  setAgentStage: (stage: AgentStage) => void;
  setCurrentQuestion: (question: NextQuestion | null) => void;
  appendQuestionHistory: (item: QuestionHistoryItem) => void;
  setLastAiError: (message: string) => void;
  setDemoModeEnabled: (enabled: boolean) => void;
  updateCase: (patch: Partial<ApplicationCase>) => void;
  updateFounder: (patch: Partial<ApplicationCase['founder']>) => void;
  updateCompanyPlan: (patch: Partial<ApplicationCase['companyPlan']>) => void;
  setEntityStatus: (status: EntityStatus) => void;
  setAnswer: (key: string, value: string) => void;
  addDocumentAsset: (asset: DocumentAsset) => void;
  addExtractedDocument: (document: ExtractedDocument) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  setTemplates: (templates: GeneratedTemplate[]) => void;
  setAmazonPacket: (packet: AmazonFieldPacket | null) => void;
  persistActiveCase: () => Promise<void>;
  startNewCase: () => void;
}

// 资质初始状态
const initialQualifications: AppState['qualifications'] = {
  business_license: { userInput: {}, status: 'pending' },
  id_card: { userInput: {}, status: 'pending' },
  credit_card: { userInput: {}, status: 'pending' },
  bank_account: { userInput: {}, status: 'pending' },
  contact_info: { userInput: {}, status: 'pending' },
  address_proof: { userInput: {}, status: 'pending' },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentStep: 'home',
      setCurrentStep: (step) => set({ currentStep: step }),

      sellerType: null,
      region: 'CN',
      setSellerInfo: (sellerType, region) => set({ sellerType, region }),

      checklist: [],
      setChecklist: (items) => set({ checklist: items }),

      currentQualificationIndex: 0,
      setCurrentQualificationIndex: (index) => set({ currentQualificationIndex: index }),

      qualifications: initialQualifications,
      updateQualification: (category, data) =>
        set((state) => ({
          qualifications: {
            ...state.qualifications,
            [category]: {
              ...state.qualifications[category],
              ...data,
              userInput: data.userInput
                ? { ...state.qualifications[category].userInput, ...data.userInput }
                : state.qualifications[category].userInput,
            },
          },
        })),

      riskReport: null,
      setRiskReport: (report) => set({ riskReport: report }),

      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      activeCase: createEmptyCase(),
      fallbackMode: false,
      agentStage: 'start',
      currentQuestion: null,
      questionHistory: [],
      lastAiError: '',
      demoModeEnabled: false,
      setFallbackMode: (fallback) => set({ fallbackMode: fallback }),
      setAgentStage: (stage) => set({ agentStage: stage }),
      setCurrentQuestion: (question) => set({ currentQuestion: question }),
      appendQuestionHistory: (item) =>
        set((state) => ({
          questionHistory: [item, ...state.questionHistory],
        })),
      setLastAiError: (message) => set({ lastAiError: message }),
      setDemoModeEnabled: (enabled) =>
        set({
          demoModeEnabled: enabled,
          lastAiError: enabled ? '' : get().lastAiError,
        }),
      updateCase: (patch) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })),
      updateFounder: (patch) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            founder: { ...state.activeCase.founder, ...patch },
            updatedAt: new Date().toISOString(),
          },
        })),
      updateCompanyPlan: (patch) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            companyPlan: { ...state.activeCase.companyPlan, ...patch },
            updatedAt: new Date().toISOString(),
          },
        })),
      setEntityStatus: (status) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            entityStatus: status,
            updatedAt: new Date().toISOString(),
          },
        })),
      setAnswer: (key, value) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            answers: { ...state.activeCase.answers, [key]: value },
            updatedAt: new Date().toISOString(),
          },
        })),
      addDocumentAsset: (asset) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            documents: [asset, ...state.activeCase.documents.filter((item) => item.id !== asset.id)],
            updatedAt: new Date().toISOString(),
          },
        })),
      addExtractedDocument: (document) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            extractedDocuments: [
              document,
              ...state.activeCase.extractedDocuments.filter((item) => item.id !== document.id),
            ],
            companyPlan:
              document.type === 'business_license'
                ? {
                    ...state.activeCase.companyPlan,
                    companyName: document.fields.companyName || state.activeCase.companyPlan.companyName,
                    registeredAddress:
                      document.fields.registeredAddress || state.activeCase.companyPlan.registeredAddress,
                    businessScope: document.fields.businessScope || state.activeCase.companyPlan.businessScope,
                  }
                : state.activeCase.companyPlan,
            founder: {
              ...state.activeCase.founder,
              name:
                document.fields.legalRepresentative ||
                document.fields.name ||
                state.activeCase.founder.name,
              address: document.fields.address || state.activeCase.founder.address,
              idNumber: document.fields.idNumber || state.activeCase.founder.idNumber,
            },
            updatedAt: new Date().toISOString(),
          },
        })),
      setGapAnalysis: (analysis) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            gapAnalysis: analysis,
            tasks: analysis
              ? analysis.missingItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  description: item.action,
                  status: 'todo',
                  priority: item.required ? 'high' : 'medium',
                  source: item.reason,
                }))
              : state.activeCase.tasks,
            updatedAt: new Date().toISOString(),
          },
        })),
      setTemplates: (templates) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            templates,
            updatedAt: new Date().toISOString(),
          },
        })),
      setAmazonPacket: (packet) =>
        set((state) => ({
          activeCase: {
            ...state.activeCase,
            amazonPacket: packet,
            updatedAt: new Date().toISOString(),
          },
        })),
      persistActiveCase: async () => {
        await saveCaseToIndexedDb(get().activeCase);
      },
      startNewCase: () =>
        set({
          activeCase: createEmptyCase(),
          agentStage: 'start',
          currentQuestion: null,
          questionHistory: [],
          lastAiError: '',
          demoModeEnabled: false,
          fallbackMode: false,
          isLoading: false,
        }),

      reset: () =>
        set({
          currentStep: 'home',
          sellerType: null,
          region: 'CN',
          checklist: [],
          currentQualificationIndex: 0,
          qualifications: initialQualifications,
          riskReport: null,
          isLoading: false,
          activeCase: createEmptyCase(),
          fallbackMode: false,
          agentStage: 'start',
          currentQuestion: null,
          questionHistory: [],
          lastAiError: '',
          demoModeEnabled: false,
        }),
    }),
    {
      name: 'amazon-registration-workbench',
    }
  )
);
