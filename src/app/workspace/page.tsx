'use client';

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ExportActions } from '@/components/features/export-actions';
import type { ApiResponse } from '@/types/api';
import { createEmptyUserSession, WORKFLOW_DISCLAIMER } from '@/lib/workflow/guardrails';
import type {
  FinalWorkflowPlan,
  MaterialGap,
  RegionalActionSource,
  RiskWarning,
  UserSession,
  WorkflowMaterialItem,
  WorkflowHistoryItem,
  WorkflowQuestion,
  WorkflowRoadmapStep,
  WorkflowStepResult,
} from '@/lib/workflow/types';
import type { WorkspaceExportPayload } from '@/lib/export/workspace-export';
import {
  buildDownloadableTemplates,
  downloadTemplate,
  downloadTemplatesZip,
  type DownloadableTemplate,
  type TemplateFormat,
} from '@/lib/export/template-export';

type BusyAction = 'step' | 'plan' | null;

interface WorkflowStepApiData {
  step: WorkflowStepResult;
}

interface FinalPlanApiData {
  plan: FinalWorkflowPlan;
}

type InteractiveSurfaceTone = 'light' | 'cream' | 'dark' | 'warning';

const STORAGE_KEY = 'adaptive-workflow-session';
const PRODUCT_NAME = '跨境开店注册助手';
const WORKSPACE_NATIVE_FALLBACK_SCRIPT = String.raw`
(() => {
  if (window.__WORKSPACE_NATIVE_FALLBACK_BOUND__ === true) return;
  window.__WORKSPACE_NATIVE_FALLBACK_BOUND__ = true;

  const emptySession = {
    registrationType: null,
    location: { province: '', city: '', district: '' },
    industry: '',
    industryCategory: '',
    existingMaterials: [],
    nameOptions: [],
    businessScope: { mainScope: [], secondaryScope: [], requiresLicense: false, licenseDetails: [] },
    address: { type: '', fullAddress: '', documentsReady: false, documents: [] },
    materialsChecklist: [],
    registrationProgress: { currentStep: 0, totalSteps: 9, status: 'preparing' },
    postRegistration: {
      sealCarved: false,
      bankAccountOpened: false,
      taxRegistered: false,
      socialInsurance: false,
      invoiceApplied: false,
      bookkeepingSetup: false,
    },
  };

  const state = {
    session: emptySession,
    history: [],
    currentQuestion: null,
    stepResult: null,
    busy: false,
  };

  const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-[#cc785c] bg-[#cc785c] px-5 py-2.5 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-50';
  const outlineButtonClass = 'inline-flex min-h-11 items-center justify-start rounded-lg border border-[#e6dfd8] bg-white px-5 py-2.5 text-left text-sm font-medium text-[#141413] hover:bg-[#fff1e9] disabled:pointer-events-none disabled:opacity-50';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function userMessage(message) {
    return String(message || '处理失败，请稍后重试。')
      .replaceAll('DeepSeek 自适应下一步失败', '下一步生成失败')
      .replaceAll('DeepSeek 最终方案生成失败', '办理方案生成失败')
      .replaceAll('DeepSeek', '系统')
      .replaceAll('AI', '智能助手');
  }

  function ensureStatus() {
    let el = document.getElementById('workflow-native-status');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'workflow-native-status';
    const disclaimer = document.querySelector('[data-workflow-disclaimer]');
    const parent = disclaimer?.parentElement;
    if (parent && disclaimer) parent.insertBefore(el, disclaimer.nextSibling);
    return el;
  }

  function setStatus(message, type = 'info') {
    const el = ensureStatus();
    if (!el) return;
    el.className = type === 'error'
      ? 'rounded-xl border border-[#e76f51]/35 bg-[#fff1eb] px-4 py-3 text-sm text-[#9b3f28]'
      : 'rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] px-4 py-3 text-sm text-[#3d3d3a]';
    el.textContent = message;
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || '请求失败');
    }
    return json.data;
  }

  async function requestStep(answer) {
    syncFromStorage();
    if (state.busy) return;
    state.busy = true;
    setBusy(true);
    setStatus('正在生成下一步...');
    try {
      const nextHistory = answer !== null && state.currentQuestion
        ? state.history.concat([{
            id: 'native-history-' + Date.now(),
            nodeId: state.currentQuestion.id,
            phase: state.currentQuestion.phase,
            question: state.currentQuestion.question,
            answer,
            createdAt: new Date().toISOString(),
          }])
        : state.history;

      const data = await postJson('/api/ai/workflow-step', {
        session: state.session,
        history: state.history,
        currentQuestion: state.currentQuestion,
        answer: answer ?? undefined,
      });

      state.stepResult = data.step;
      state.session = data.step.session;
      state.currentQuestion = data.step.nextQuestion;
      state.history = nextHistory;
      renderQuestion(data.step);
      setStatus('已生成下一步。');
    } catch (error) {
      setStatus(userMessage(error.message), 'error');
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  async function requestFinalPlan() {
    syncFromStorage();
    if (state.busy || !state.stepResult) return;
    state.busy = true;
    setBusy(true);
    setStatus('正在生成完整办理方案，可能需要几十秒...');
    try {
      const data = await postJson('/api/ai/workflow-final-plan', {
        session: state.session,
        history: state.history,
      });
      renderFinalPlan(data.plan);
      setStatus('完整办理方案已生成。');
    } catch (error) {
      setStatus(userMessage(error.message), 'error');
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  function setBusy(busy) {
    document.querySelectorAll('[data-workflow-native-busy]').forEach((item) => {
      item.disabled = busy;
    });
  }

  function syncFromStorage() {
    try {
      const raw = window.localStorage?.getItem('adaptive-workflow-session');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.session) state.session = parsed.session;
      if (Array.isArray(parsed?.history)) state.history = parsed.history;
      if (parsed?.currentQuestion) state.currentQuestion = parsed.currentQuestion;
      if (parsed?.stepResult) state.stepResult = parsed.stepResult;
    } catch {
      // localStorage 不可用或旧缓存无法解析时，继续使用当前兜底状态。
    }
  }

  function reactIsHandling() {
    const shell = document.querySelector('[data-workflow-react-busy]');
    return Boolean(shell?.getAttribute('data-workflow-react-busy'));
  }

  function scheduleFallback(kind, value) {
    window.setTimeout(() => {
      if (reactIsHandling()) return;

      if (kind === 'start' && document.querySelector('[data-workflow-start]')) {
        requestStep(null);
        return;
      }

      if (kind === 'option' && value && document.querySelector('[data-workflow-option="' + cssEscape(value) + '"]')) {
        requestStep(value);
        return;
      }

      if (kind === 'text') {
        const textarea = document.getElementById('workflow-answer') || document.getElementById('workflow-native-answer');
        const answer = textarea?.value?.trim();
        if (answer) requestStep(answer);
        return;
      }

      if (kind === 'plan' && document.querySelector('[data-workflow-generate-plan]')) {
        requestFinalPlan();
      }
    }, 1200);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replaceAll('"', '\\"');
  }

  function renderQuestion(step) {
    const root = document.getElementById('workflow-current-content');
    if (!root) return;
    const q = step.nextQuestion || {};
    const options = Array.isArray(q.options) ? q.options : [];
    const isText = q.questionType === 'text_input' || options.length === 0;
    const optionHtml = !isText
      ? '<div class="grid gap-2 sm:grid-cols-2">' + options.map((option) => {
          const value = escapeHtml(option.value || option.label);
          const label = escapeHtml(option.label || option.value);
          const description = option.description
            ? '<span class="mt-1 block text-xs text-[#71717a]">' + escapeHtml(option.description) + '</span>'
            : '';
          return '<button type="button" class="' + outlineButtonClass + '" data-workflow-option="' + value + '" data-workflow-native-busy="true">' +
            '<span>' +
              '<span class="block">' + label + '</span>' +
              description +
            '</span>' +
          '</button>';
        }).join('') + '</div>'
      : '<div class="space-y-2">' +
          '<label class="text-sm font-medium" for="workflow-native-answer">你的回答</label>' +
          '<textarea id="workflow-native-answer" class="min-h-28 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm" placeholder="例如：我在上海，准备做跨境电商，想注册有限公司。"></textarea>' +
          '<button type="button" class="' + buttonClass + '" data-workflow-submit-text="true" data-workflow-native-busy="true">提交并继续</button>' +
        '</div>';

    root.innerHTML =
      '<div class="space-y-5">' +
        '<div class="rounded-xl border border-[#e6dfd8] bg-[#f5f0e8] p-4">' +
          '<p class="text-xs font-medium text-[#71717a]">阶段 ' + escapeHtml(q.phase ?? step.currentPhase ?? '') + ' · ' + escapeHtml(q.fieldKey || '待确认') + '</p>' +
          '<h2 class="mt-2 text-xl font-semibold tracking-normal">' + escapeHtml(q.question || '请补充你的真实情况。') + '</h2>' +
          '<p class="mt-2 text-sm leading-6 text-[#52525b]">' + escapeHtml(q.helperText || '该信息会影响后续材料清单、风险提示和办理路径。') + '</p>' +
        '</div>' +
        optionHtml +
        '<p class="border-t border-[#e6dfd8] pt-4 text-xs leading-5 text-[#6f6860]">' + escapeHtml(userMessage(step.rationale || '已根据你的回答判断下一步。')) + '</p>' +
      '</div>';

    updateText('[data-workflow-phase]', step.phaseLabel || '注册引导');
    updateText('[data-workflow-rounds]', String(state.history.length));
    updateText('[data-workflow-registration-type]', formatRegistrationType(state.session.registrationType));
    updateText('[data-workflow-location]', [state.session.location?.province, state.session.location?.city, state.session.location?.district].filter(Boolean).join(' ') || '待回答');
    updateText('[data-workflow-industry]', state.session.industry || '待回答');
    updateText('[data-workflow-industry-category]', state.session.industryCategory || '待判断');
    updateText('[data-workflow-address-type]', formatAddressType(state.session.address?.type));

    const planButtons = Array.from(document.querySelectorAll('button')).filter((button) => button.textContent?.includes('生成完整办理方案'));
    planButtons.forEach((button) => {
      button.removeAttribute('disabled');
      button.setAttribute('data-workflow-generate-plan', 'true');
      button.setAttribute('data-workflow-native-busy', 'true');
    });
  }

  function renderFinalPlan(plan) {
    const root = document.getElementById('workflow-final-output');
    if (!root) return;
    const steps = Array.isArray(plan.roadmapSteps) ? plan.roadmapSteps : [];
    const stepHtml = steps.map((step) => {
      const officialLink = step.officialUrl
        ? '<button type="button" class="mt-3 inline-flex rounded-lg border border-[#cc785c]/35 px-3 py-2 text-sm font-medium text-[#8b412c]" data-official-url="' + escapeHtml(step.officialUrl) + '">打开官网</button>' +
          '<p class="mt-2 break-all text-xs text-[#71717a]">官网 URL：' + escapeHtml(step.officialUrl) + '</p>'
        : '';
      return '<div class="rounded-xl border border-[#e6dfd8] bg-white p-4">' +
          '<p class="text-sm font-medium text-[#141413]">第 ' + escapeHtml(step.order) + ' 步</p>' +
          '<h4 class="mt-1 font-semibold">' + escapeHtml(step.title) + '</h4>' +
          '<p class="mt-2 text-sm text-[#71717a]">' + escapeHtml(step.whenToDo || '') + '</p>' +
          '<p class="mt-2 text-sm"><span class="font-medium">办理机构：</span>' + escapeHtml(step.agency || '') + '</p>' +
          officialLink +
        '</div>';
    }).join('');
    root.innerHTML =
      '<div class="space-y-4 border-t pt-4">' +
        '<div class="rounded-xl border border-[#cc785c]/20 bg-[#fff1e9] p-4">' +
          '<h3 class="font-semibold">' + escapeHtml(plan.title || '注册办理方案') + '</h3>' +
          '<p class="mt-2 text-sm leading-6 text-[#52525b]">' + escapeHtml(plan.summary || '') + '</p>' +
        '</div>' +
        '<div class="space-y-3">' +
          '<h3 class="font-semibold">办理路线图</h3>' +
          stepHtml +
        '</div>' +
      '</div>';
  }

  function updateText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function formatRegistrationType(value) {
    if (value === 'individual') return '个体工商户';
    if (value === 'company') return '有限责任公司';
    return '待回答';
  }

  function formatAddressType(value) {
    const labels = {
      owned: '自有房产',
      rented: '租赁地址',
      residential: '住宅地址',
      virtual: '虚拟/挂靠地址',
      incubator: '园区/孵化器地址',
    };
    return value ? labels[value] || value : '待回答';
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const start = target.closest('[data-workflow-start]');
    if (start) {
      scheduleFallback('start');
      return;
    }

    const option = target.closest('[data-workflow-option]');
    if (option) {
      scheduleFallback('option', option.getAttribute('data-workflow-option'));
      return;
    }

    const textSubmit = target.closest('[data-workflow-submit-text]');
    if (textSubmit) {
      scheduleFallback('text');
      return;
    }

    const plan = target.closest('[data-workflow-generate-plan]');
    if (plan) {
      scheduleFallback('plan');
      return;
    }

    const official = target.closest('[data-official-url]');
    if (official) {
      const url = official.getAttribute('data-official-url');
      if (!url) return;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        try {
          navigator.clipboard?.writeText(url);
        } catch {
          // 复制失败时仍然允许当前页跳转。
        }
        window.location.href = url;
      }
    }
  }, true);
})();
`;

interface StoredWorkflowState {
  session: UserSession;
  currentQuestion: WorkflowQuestion | null;
  history: WorkflowHistoryItem[];
  stepResult: WorkflowStepResult | null;
  finalPlan: FinalWorkflowPlan | null;
}

function createFallbackWorkflowState(): StoredWorkflowState {
  return {
    session: createEmptyUserSession(),
    currentQuestion: null,
    history: [],
    stepResult: null,
    finalPlan: null,
  };
}

function getInitialWorkflowState(): StoredWorkflowState {
  return createFallbackWorkflowState();
}

function restoreStoredWorkflowState(fallback: StoredWorkflowState): StoredWorkflowState {
  if (typeof window === 'undefined') return fallback;

  const raw = readStoredWorkflowState();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredWorkflowState>;
    return normalizeStoredWorkflowState(parsed, fallback);
  } catch {
    removeStoredWorkflowState();
    return fallback;
  }
}

export default function WorkspacePage() {
  const initialState = useMemo(() => getInitialWorkflowState(), []);
  const [session, setSession] = useState<UserSession>(() => initialState.session);
  const [currentQuestion, setCurrentQuestion] = useState<WorkflowQuestion | null>(() => initialState.currentQuestion);
  const [history, setHistory] = useState<WorkflowHistoryItem[]>(() => initialState.history);
  const [stepResult, setStepResult] = useState<WorkflowStepResult | null>(() => initialState.stepResult);
  const [finalPlan, setFinalPlan] = useState<FinalWorkflowPlan | null>(() => initialState.finalPlan);
  const [answerDraft, setAnswerDraft] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = restoreStoredWorkflowState(createFallbackWorkflowState());
      setSession(restored.session);
      setCurrentQuestion(restored.currentQuestion);
      setHistory(restored.history);
      setStepResult(restored.stepResult);
      setFinalPlan(restored.finalPlan);
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    writeStoredWorkflowState(
      STORAGE_KEY,
      JSON.stringify({ session, currentQuestion, history, stepResult, finalPlan }),
    );
  }, [currentQuestion, finalPlan, history, session, stepResult, storageReady]);

  const progressValue = useMemo(() => {
    const phase = stepResult?.currentPhase ?? currentQuestion?.phase ?? 0;
    return Math.min(100, Math.max(8, Math.round(((phase + 1) / 10) * 100)));
  }, [currentQuestion, stepResult]);

  const exportPayload = useMemo(() => finalPlan ? buildExportPayload(finalPlan) : null, [finalPlan]);
  const downloadableTemplates = useMemo(
    () => finalPlan ? buildDownloadableTemplates(finalPlan, session) : [],
    [finalPlan, session],
  );
  const shouldShowAnswerSubmit = currentQuestion ? shouldShowSubmitButton(currentQuestion) : false;
  const canGeneratePlan = Boolean(stepResult?.canGenerateFinalPlan);

  const startWorkflow = async () => {
    await requestWorkflowStep(null);
  };

  const submitAnswer = async (valueOverride?: string | string[]) => {
    if (!currentQuestion) return;
    const answer = valueOverride ?? resolveAnswer();
    if ((Array.isArray(answer) && answer.length === 0) || (!Array.isArray(answer) && !answer.trim())) return;
    await requestWorkflowStep(answer);
  };

  const requestWorkflowStep = async (answer: string | string[] | null) => {
    setBusyAction('step');
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/ai/workflow-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          history,
          currentQuestion,
          answer: answer ?? undefined,
        }),
      });
      const json = (await response.json()) as ApiResponse<WorkflowStepApiData>;

      if (!response.ok || !json.success || !json.data?.step) {
        throw new Error(json.error || '下一步生成失败');
      }

      const next = json.data.step;
      const nextHistory = answer !== null && currentQuestion
        ? [
            ...history,
            {
              id: `history-${Date.now()}`,
              nodeId: currentQuestion.id,
              phase: currentQuestion.phase,
              question: currentQuestion.question,
              answer,
              createdAt: new Date().toISOString(),
            },
          ]
        : history;

      setSession(next.session);
      setStepResult(next);
      setCurrentQuestion(next.nextQuestion);
      setHistory(nextHistory);
      setFinalPlan(null);
      setAnswerDraft('');
      setSelectedValues([]);
      setNotice('已根据你的回答生成下一步。');
    } catch (err) {
      setError(toUserFacingMessage(err instanceof Error ? err.message : '下一步生成失败'));
    } finally {
      setBusyAction(null);
    }
  };

  const generateFinalPlan = async () => {
    setBusyAction('plan');
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/ai/workflow-final-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, history }),
      });
      const json = (await response.json()) as ApiResponse<FinalPlanApiData>;

      if (!response.ok || !json.success || !json.data?.plan) {
        throw new Error(json.error || '办理方案生成失败');
      }

      setFinalPlan(json.data.plan);
      setNotice('完整办理方案已生成。');
    } catch (err) {
      setError(toUserFacingMessage(err instanceof Error ? err.message : '办理方案生成失败'));
    } finally {
      setBusyAction(null);
    }
  };

  const goBack = () => {
    if (history.length === 0) return;
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setNotice('已回退一条记录。请重新提交当前信息，继续生成下一步。');
    setError('');
  };

  const resetWorkflow = () => {
    const empty = createEmptyUserSession();
    setSession(empty);
    setCurrentQuestion(null);
    setHistory([]);
    setStepResult(null);
    setFinalPlan(null);
    setAnswerDraft('');
    setSelectedValues([]);
    setError('');
    setNotice('');
    removeStoredWorkflowState();
  };

  const retry = async () => {
    await requestWorkflowStep(null);
  };

  const resolveAnswer = () => {
    if (!currentQuestion) return '';
    if (currentQuestion.questionType === 'multi_choice') return selectedValues;
    return answerDraft;
  };

  const currentInfoItems = [
    { label: '主体类型', value: formatRegistrationType(session.registrationType), attr: 'data-workflow-registration-type' },
    {
      label: '地区',
      value: [session.location.province, session.location.city, session.location.district].filter(Boolean).join(' ') || '待回答',
      attr: 'data-workflow-location',
    },
    { label: '行业', value: formatDisplayValue(session.industry) || '待回答', attr: 'data-workflow-industry' },
    { label: '行业分类', value: formatDisplayValue(session.industryCategory) || '待判断', attr: 'data-workflow-industry-category' },
    { label: '地址类型', value: formatAddressType(session.address.type), attr: 'data-workflow-address-type' },
    { label: '确认轮数', value: `${history.length}`, attr: 'data-workflow-rounds' },
  ];
  const actionCards = stepResult?.actionCards || [];
  const riskWarnings = stepResult?.riskWarnings || [];
  const materialGaps = stepResult?.materialGaps || [];
  const phaseLabel = stepResult?.phaseLabel || '尚未开始';
  const missingMaterialCount = materialGaps.filter((item) => item.status !== 'ready').length;
  const primaryOfficialEntry = actionCards[0];

  return (
    <main
      data-workflow-react-busy={busyAction ? 'true' : undefined}
      className="min-h-screen overflow-x-hidden bg-[#faf9f5] text-[#141413]"
    >
      <Script
        id="workspace-native-fallback"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: WORKSPACE_NATIVE_FALLBACK_SCRIPT }}
      />
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[#141413] focus:ring-2 focus:ring-[#cc785c]"
      >
        跳到办理工作台
      </a>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-8">
        <header className="editorial-card overflow-hidden bg-[#fffdf8]/90 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:px-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#cc785c]/35 bg-[#fff1e9] text-[#8b412c]">
                  注册准备
                </Badge>
                <Badge variant="outline" className="border-[#e6dfd8] bg-[#faf9f5] text-[#6f6860]">
                  材料核验
                </Badge>
              </div>
              <h1 className="editorial-heading mt-1 text-2xl leading-tight text-[#141413] md:text-3xl">{PRODUCT_NAME}</h1>
            </div>

            <div className="w-full shrink-0 rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-3 xl:w-[34rem]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#6f6860]">当前阶段</span>
                    <span className="min-w-0 truncate font-medium text-[#141413]" data-workflow-phase>{phaseLabel}</span>
                  </div>
                  <Progress
                    value={progressValue}
                    aria-label={`完成进度 ${progressValue}%`}
                    getAriaValueText={() => `完成进度 ${progressValue}%`}
                    className="mt-2 h-2"
                  />
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-2 text-center text-xs md:w-56">
                  <MetricPill value={history.length} label="已确认" />
                  <MetricPill value={missingMaterialCount} label="待补" />
                  <MetricPill value={riskWarnings.length} label="风险" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={!history.length || Boolean(busyAction)}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  返回上一步
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetWorkflow} disabled={Boolean(busyAction)}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  重新开始
                </Button>
              </div>
            </div>
          </div>
        </header>

        {(notice || error) && (
          <div
            aria-live="polite"
            className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-[#e4b49d] bg-[#fff1e9] text-[#7e321f]' : 'border-[#d8cfc6] bg-[#f5f0e8] text-[#3d3d3a]'}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">{error || notice}</span>
              {error && (
                <Button type="button" size="sm" variant="outline" onClick={retry} disabled={Boolean(busyAction)}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  重试当前判断
                </Button>
              )}
            </div>
          </div>
        )}

        <section id="workspace-main" className="grid gap-5 scroll-mt-6 lg:grid-cols-2">
          <InteractiveSurface as="section" tone="light" intensity={8} className="editorial-card overflow-hidden">
            <div className="space-y-5 px-4 py-5 md:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[#8b412c]">
                    <FileText aria-hidden="true" className="size-4" />
                    当前要确认
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#6f6860]">
                    一次只处理一个关键判断，确认后再进入下一步。
                  </p>
                </div>
                {busyAction === 'step' && (
                  <Badge variant="outline" className="border-[#cc785c]/35 bg-[#fff1e9] text-[#8b412c]">
                    正在生成…
                  </Badge>
                )}
              </div>
              <div id="workflow-current-content">
                {!currentQuestion ? (
                  <StartPanel busy={busyAction === 'step'} onStart={startWorkflow} />
                ) : (
                  <QuestionPanel
                    question={currentQuestion}
                    answerDraft={answerDraft}
                    selectedValues={selectedValues}
                    setAnswerDraft={setAnswerDraft}
                    setSelectedValues={setSelectedValues}
                    onSubmit={submitAnswer}
                    busy={busyAction === 'step'}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e6dfd8] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#8b412c]">本步依据</p>
                  <p className="mt-1 text-sm leading-6 text-[#3d3d3a]">
                    {toUserFacingMessage(stepResult?.rationale || '先确认主体类型，再根据地区、行业和材料状态继续判断下一步。')}
                  </p>
                </div>
                {currentQuestion && shouldShowAnswerSubmit && (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => submitAnswer()}
                    data-workflow-submit-text={shouldShowAnswerSubmit ? 'true' : undefined}
                    data-workflow-native-busy="true"
                    disabled={busyAction === 'step' || !hasAnswer(currentQuestion, answerDraft, selectedValues)}
                  >
                    {busyAction === 'step' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                    提交并继续
                  </Button>
                )}
              </div>
            </div>
          </InteractiveSurface>

          <DarkSummaryPanel
            phaseLabel={phaseLabel}
            progressValue={progressValue}
            currentQuestion={currentQuestion}
            missingMaterialCount={missingMaterialCount}
            riskWarnings={riskWarnings}
            materialGaps={materialGaps}
            primaryOfficialEntry={primaryOfficialEntry}
            historyCount={history.length}
          />
        </section>

        <details data-workflow-disclaimer className="rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] px-4 py-3 text-sm leading-6 text-[#3d3d3a]">
          <summary className="cursor-pointer list-none font-medium text-[#141413] marker:hidden">
            办理前说明
          </summary>
          <p className="mt-2">{WORKFLOW_DISCLAIMER}</p>
        </details>

        <StatusRail warnings={riskWarnings} materialGaps={materialGaps} />

        <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <WorkspaceSidePanel
              currentInfoItems={currentInfoItems}
              actionCards={actionCards}
              materialGaps={materialGaps}
              history={history}
            />
          </aside>

          <InteractiveSurface as="section" tone="cream" intensity={6} className="editorial-card p-4 md:p-5">
            <div className="cream-panel p-4 md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[#8b412c]">
                    <FileText aria-hidden="true" className="size-4" />
                    办理路线
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#3d3d3a]">
                    {toUserFacingMessage(stepResult?.finalPlanPreview || '完成主体类型、地区、行业、地址等关键回答后，可以生成个性化办理方案。')}
                  </p>
                  {busyAction === 'plan' && (
                    <p className="mt-2 text-sm leading-6 text-[#8b412c]">
                      正在生成办理方案，通常需要 40-60 秒…
                    </p>
                  )}
                  {!finalPlan && (
                    <p className="mt-2 text-xs leading-5 text-[#6f6860]">
                      生成完整办理方案后可下载公司章程草案、住所证明草案、材料清单和平台填表清单。
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={generateFinalPlan}
                  data-workflow-generate-plan={canGeneratePlan ? 'true' : undefined}
                  data-workflow-native-busy="true"
                  disabled={busyAction === 'plan' || !canGeneratePlan}
                >
                  {busyAction === 'plan' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
                  生成完整办理方案
                </Button>
              </div>
            </div>
            <div id="workflow-final-output" className={finalPlan ? 'mt-5' : ''}>
              {finalPlan && (
                <FinalPlanView
                  plan={finalPlan}
                  exportPayload={exportPayload}
                  templates={downloadableTemplates}
                />
              )}
            </div>
          </InteractiveSurface>
        </section>
      </div>
    </main>
  );
}

function readStoredWorkflowState() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredWorkflowState(key: string, value: string) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // 浏览器或嵌入式预览禁用 localStorage 时，保留当前 React 状态即可。
  }
}

function removeStoredWorkflowState() {
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // 浏览器或嵌入式预览禁用 localStorage 时无需处理。
  }
}

function normalizeStoredWorkflowState(
  parsed: Partial<StoredWorkflowState>,
  fallback: StoredWorkflowState,
): StoredWorkflowState {
  const session = normalizeStoredSession(parsed.session ?? fallback.session);
  return {
    session,
    currentQuestion: normalizeStoredQuestion(parsed.currentQuestion) ?? fallback.currentQuestion,
    history: normalizeStoredHistory(parsed.history ?? fallback.history),
    stepResult: normalizeStoredStepResult(parsed.stepResult, session) ?? fallback.stepResult,
    finalPlan: normalizeStoredFinalPlan(parsed.finalPlan) ?? fallback.finalPlan,
  };
}

function normalizeStoredSession(value: unknown): UserSession {
  const empty = createEmptyUserSession();
  if (!isRecord(value)) return empty;
  const row = value as Partial<UserSession>;
  const companyInfo = isRecord(row.companyInfo)
    ? {
        shareholders: Array.isArray(row.companyInfo.shareholders) ? row.companyInfo.shareholders : [],
        registeredCapital: toNumber(row.companyInfo.registeredCapital),
        legalRepresentative: toStringValue(row.companyInfo.legalRepresentative),
        director: toStringValue(row.companyInfo.director),
        supervisor: toStringValue(row.companyInfo.supervisor),
        financialOfficer: {
          name: toStringValue(row.companyInfo.financialOfficer?.name),
          phone: toStringValue(row.companyInfo.financialOfficer?.phone),
        },
        contactPerson: {
          name: toStringValue(row.companyInfo.contactPerson?.name),
          phone: toStringValue(row.companyInfo.contactPerson?.phone),
          email: toStringValue(row.companyInfo.contactPerson?.email),
        },
      }
    : undefined;
  const individualInfo = isRecord(row.individualInfo)
    ? {
        ownerName: toStringValue(row.individualInfo.ownerName),
        idNumber: toStringValue(row.individualInfo.idNumber),
        phone: toStringValue(row.individualInfo.phone),
        operationType: row.individualInfo.operationType === 'family' ? 'family' as const : 'personal' as const,
        preferOnline: Boolean(row.individualInfo.preferOnline),
      }
    : undefined;

  return {
    ...empty,
    ...row,
    registrationType: row.registrationType === 'individual' || row.registrationType === 'company' ? row.registrationType : null,
    companySubType: row.companySubType === 'one_person' || row.companySubType === 'multi_person' ? row.companySubType : undefined,
    location: {
      province: toStringValue(row.location?.province),
      city: toStringValue(row.location?.city),
      district: toStringValue(row.location?.district),
    },
    industry: toStringValue(row.industry),
    industryCategory: toStringValue(row.industryCategory),
    existingMaterials: toStringArray(row.existingMaterials),
    individualInfo,
    companyInfo,
    nameOptions: Array.isArray(row.nameOptions) ? row.nameOptions : [],
    businessScope: {
      mainScope: toStringArray(row.businessScope?.mainScope),
      secondaryScope: toStringArray(row.businessScope?.secondaryScope),
      requiresLicense: Boolean(row.businessScope?.requiresLicense),
      licenseDetails: Array.isArray(row.businessScope?.licenseDetails) ? row.businessScope.licenseDetails : [],
    },
    address: {
      type: isAddressType(row.address?.type) ? row.address.type : '',
      fullAddress: toStringValue(row.address?.fullAddress),
      documentsReady: Boolean(row.address?.documentsReady),
      documents: toStringArray(row.address?.documents),
    },
    materialsChecklist: Array.isArray(row.materialsChecklist) ? row.materialsChecklist : [],
    registrationProgress: {
      currentStep: toNumber(row.registrationProgress?.currentStep),
      totalSteps: toNumber(row.registrationProgress?.totalSteps) || empty.registrationProgress.totalSteps,
      status: isRegistrationStatus(row.registrationProgress?.status) ? row.registrationProgress.status : 'preparing',
      rejectionReason: toStringValue(row.registrationProgress?.rejectionReason) || undefined,
    },
    postRegistration: {
      sealCarved: Boolean(row.postRegistration?.sealCarved),
      bankAccountOpened: Boolean(row.postRegistration?.bankAccountOpened),
      taxRegistered: Boolean(row.postRegistration?.taxRegistered),
      socialInsurance: Boolean(row.postRegistration?.socialInsurance),
      invoiceApplied: Boolean(row.postRegistration?.invoiceApplied),
      bookkeepingSetup: Boolean(row.postRegistration?.bookkeepingSetup),
    },
  };
}

function normalizeStoredQuestion(value: unknown): WorkflowQuestion | null {
  if (!isRecord(value)) return null;
  const question = toStringValue(value.question);
  if (!question) return null;
  return {
    id: toStringValue(value.id) || `stored-question-${Date.now()}`,
    phase: toPhaseNumber(value.phase),
    question,
    questionType: isQuestionType(value.questionType) ? value.questionType : 'text_input',
    fieldKey: toStringValue(value.fieldKey) || 'general',
    helperText: toStringValue(value.helperText) || '该信息会影响后续材料清单、风险提示和办理路径。',
    options: normalizeQuestionOptions(value.options),
  };
}

function normalizeStoredHistory(value: unknown): WorkflowHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const question = toStringValue(item.question);
      if (!question) return null;
      const answer = Array.isArray(item.answer) ? toStringArray(item.answer) : toStringValue(item.answer);
      return {
        id: toStringValue(item.id) || `stored-history-${index}`,
        nodeId: toStringValue(item.nodeId),
        phase: toPhaseNumber(item.phase),
        question,
        answer,
        createdAt: toStringValue(item.createdAt) || new Date().toISOString(),
      };
    })
    .filter((item): item is WorkflowHistoryItem => Boolean(item));
}

function normalizeStoredStepResult(value: unknown, session: UserSession): WorkflowStepResult | null {
  if (!isRecord(value)) return null;
  const nextQuestion = normalizeStoredQuestion(value.nextQuestion);
  if (!nextQuestion) return null;
  return {
    session: normalizeStoredSession(value.session || session),
    currentPhase: toPhaseNumber(value.currentPhase ?? value.phase),
    phaseLabel: toStringValue(value.phaseLabel) || '注册引导',
    nextQuestion,
    riskWarnings: normalizeRiskWarnings(value.riskWarnings),
    materialGaps: normalizeMaterialGaps(value.materialGaps),
    rationale: toStringValue(value.rationale),
    sources: normalizeRegionalSources(value.sources),
    actionCards: normalizeRegionalActionCards(value.actionCards),
    canGenerateFinalPlan: Boolean(value.canGenerateFinalPlan),
    finalPlanPreview: toStringValue(value.finalPlanPreview),
    disclaimer: toStringValue(value.disclaimer) || WORKFLOW_DISCLAIMER,
  };
}

function normalizeStoredFinalPlan(value: unknown): FinalWorkflowPlan | null {
  if (!isRecord(value)) return null;
  const title = toStringValue(value.title);
  const summary = toStringValue(value.summary);
  if (!title && !summary) return null;
  const roadmapSteps = normalizeRoadmapSteps(value.roadmapSteps);
  const materialsByStep = normalizeMaterialsByStep(value.materialsByStep, roadmapSteps);

  return {
    title: title || '注册办理方案',
    summary: summary || '该方案来自上次保存的进度，已自动补齐缺失内容；如内容不完整，请重新生成最终方案。',
    materialChecklist: normalizeMaterialGaps(value.materialChecklist),
    roadmapSteps,
    materialsByStep,
    registrationSteps: normalizeFinalPlanSections(value.registrationSteps),
    postRegistrationSteps: normalizeFinalPlanSections(value.postRegistrationSteps),
    crossBorderSteps: normalizeFinalPlanSections(value.crossBorderSteps),
    riskWarnings: normalizeRiskWarnings(value.riskWarnings),
    timelineEstimate: toStringValue(value.timelineEstimate),
    sourceNotes: normalizeRegionalSources(value.sourceNotes),
    actionCards: normalizeRegionalActionCards(value.actionCards),
    disclaimer: toStringValue(value.disclaimer) || WORKFLOW_DISCLAIMER,
  };
}

function normalizeRoadmapSteps(value: unknown): WorkflowRoadmapStep[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<WorkflowRoadmapStep[]>((steps, item, index) => {
    if (!isRecord(item)) return steps;
    const title = toStringValue(item.title);
    if (!title) return steps;
    steps.push({
      order: toNumber(item.order) || index + 1,
      phase: toPhaseNumber(item.phase),
      title,
      whenToDo: toStringValue(item.whenToDo),
      agency: toStringValue(item.agency),
      officialUrl: toStringValue(item.officialUrl),
      guideUrl: toStringValue(item.guideUrl) || undefined,
      materials: normalizeWorkflowMaterials(item.materials),
      actions: toStringArray(item.actions),
      blockingRules: toStringArray(item.blockingRules),
      nextStepHint: toStringValue(item.nextStepHint),
      actionCardIds: toStringArray(item.actionCardIds),
    });
    return steps;
  }, []);
}

function normalizeMaterialsByStep(
  value: unknown,
  roadmapSteps: WorkflowRoadmapStep[],
): FinalWorkflowPlan['materialsByStep'] {
  if (Array.isArray(value)) {
    const groups = value
      .map((item, index) => {
        if (!isRecord(item)) return null;
        const stepTitle = toStringValue(item.stepTitle);
        return {
          order: toNumber(item.order) || index + 1,
          stepTitle: stepTitle || `步骤 ${index + 1}`,
          materials: normalizeWorkflowMaterials(item.materials),
        };
      })
      .filter((item): item is FinalWorkflowPlan['materialsByStep'][number] => Boolean(item));
    if (groups.length) return groups;
  }

  return roadmapSteps.map((step) => ({
    order: step.order,
    stepTitle: step.title,
    materials: step.materials,
  }));
}

function normalizeWorkflowMaterials(value: unknown): WorkflowMaterialItem[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<WorkflowMaterialItem[]>((materials, item) => {
    if (!isRecord(item)) return materials;
    const name = toStringValue(item.name);
    if (!name) return materials;
    materials.push({
      name,
      category: isWorkflowMaterialCategory(item.category) ? item.category : 'required_registration',
      status: isMaterialStatus(item.status) ? item.status : 'missing',
      required: typeof item.required === 'boolean' ? item.required : true,
      appliesTo: toStringValue(item.appliesTo),
      provider: toStringValue(item.provider),
      howToPrepare: toStringValue(item.howToPrepare),
      officialBasis: toStringValue(item.officialBasis),
      sourceUrl: toStringValue(item.sourceUrl) || undefined,
    });
    return materials;
  }, []);
}

function normalizeFinalPlanSections(value: unknown): FinalWorkflowPlan['registrationSteps'] {
  if (!Array.isArray(value)) return [];
  return value.reduce<FinalWorkflowPlan['registrationSteps']>((sections, item, index) => {
    if (!isRecord(item)) return sections;
    sections.push({
      title: toStringValue(item.title) || `补充说明 ${index + 1}`,
      items: toStringArray(item.items),
      actionCards: normalizeRegionalActionCards(item.actionCards),
    });
    return sections;
  }, []);
}

function normalizeRiskWarnings(value: unknown): RiskWarning[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      return {
        id: toStringValue(item.id) || `stored-warning-${index}`,
        title: toStringValue(item.title) || '风险提示',
        message: toStringValue(item.message),
        severity: item.severity === 'critical' || item.severity === 'info' || item.severity === 'warning' ? item.severity : 'warning',
        source: item.source === 'deepseek' || item.source === 'guardrail' || item.source === 'regional' ? item.source : 'guardrail',
      };
    })
    .filter((item): item is RiskWarning => Boolean(item));
}

function normalizeMaterialGaps(value: unknown): MaterialGap[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<MaterialGap[]>((materials, item) => {
    if (!isRecord(item)) return materials;
    const name = toStringValue(item.name);
    if (!name) return materials;
    materials.push({
      name,
      status: isMaterialStatus(item.status) ? item.status : 'missing',
      reason: toStringValue(item.reason),
      action: toStringValue(item.action),
    });
    return materials;
  }, []);
}

function normalizeRegionalSources(value: unknown): FinalWorkflowPlan['sourceNotes'] {
  if (!Array.isArray(value)) return [];
  return value.reduce<FinalWorkflowPlan['sourceNotes']>((sources, item) => {
    if (!isRecord(item)) return sources;
    const url = toStringValue(item.url);
    const title = toStringValue(item.title);
    if (!url || !title) return sources;
    sources.push({
      title,
      url,
      snippet: toStringValue(item.snippet),
      sourceType: item.sourceType === 'search' ? 'search' : 'official',
      sourceKind: item.sourceKind === 'guide' || item.sourceKind === 'national_rule' || item.sourceKind === 'official' ? item.sourceKind : undefined,
    });
    return sources;
  }, []);
}

function normalizeRegionalActionCards(value: unknown): RegionalActionSource[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<RegionalActionSource[]>((cards, item, index) => {
    if (!isRecord(item)) return cards;
    const title = toStringValue(item.title);
    const entryUrl = toStringValue(item.entryUrl);
    if (!title || !entryUrl) return cards;
    cards.push({
      id: toStringValue(item.id) || `stored-action-${index}`,
      category: isRegionalActionCategory(item.category) ? item.category : 'general_portal',
      officialSourceType: item.officialSourceType === 'guide' || item.officialSourceType === 'national_rule' || item.officialSourceType === 'official' ? item.officialSourceType : undefined,
      title,
      appliesTo: toStringArray(item.appliesTo),
      entryUrl,
      sourceUrl: toStringValue(item.sourceUrl),
      clickPath: toStringArray(item.clickPath),
      requiredInputs: toStringArray(item.requiredInputs),
      warnings: toStringArray(item.warnings),
      fallbackText: toStringValue(item.fallbackText),
    });
    return cards;
  }, []);
}

function normalizeQuestionOptions(value: unknown): WorkflowQuestion['options'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { label: item, value: item };
      if (!isRecord(item)) return null;
      const label = toStringValue(item.label || item.value);
      if (!label) return null;
      return {
        label,
        value: toStringValue(item.value || item.label),
        description: toStringValue(item.description) || undefined,
      };
    })
    .filter((item): item is WorkflowQuestion['options'][number] => Boolean(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => toStringValue(item)).filter(Boolean);
  const text = toStringValue(value);
  return text ? [text] : [];
}

function toNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toPhaseNumber(value: unknown): number {
  return Math.max(0, Math.min(9, Math.round(toNumber(value))));
}

function isQuestionType(value: unknown): value is WorkflowQuestion['questionType'] {
  return value === 'single_choice' || value === 'multi_choice' || value === 'text_input' || value === 'confirm';
}

function isMaterialStatus(value: unknown): value is MaterialGap['status'] {
  return value === 'ready' || value === 'missing' || value === 'needs_review';
}

function isAddressType(value: unknown): value is UserSession['address']['type'] {
  return value === '' || value === 'owned' || value === 'rented' || value === 'residential' || value === 'virtual' || value === 'incubator';
}

function isRegistrationStatus(value: unknown): value is UserSession['registrationProgress']['status'] {
  return value === 'preparing' || value === 'submitted' || value === 'reviewing' || value === 'approved' || value === 'rejected';
}

function isWorkflowMaterialCategory(value: unknown): value is WorkflowMaterialItem['category'] {
  return value === 'required_registration' ||
    value === 'address' ||
    value === 'personnel_signature' ||
    value === 'post_registration' ||
    value === 'cross_border' ||
    value === 'risk_retention';
}

function isRegionalActionCategory(value: unknown): value is RegionalActionSource['category'] {
  return value === 'name_declaration' ||
    value === 'company_registration' ||
    value === 'individual_registration' ||
    value === 'address_registration' ||
    value === 'seal_carving' ||
    value === 'tax_registration' ||
    value === 'bank_account' ||
    value === 'social_security' ||
    value === 'cross_border' ||
    value === 'national_rules' ||
    value === 'general_portal';
}

function InteractiveSurface({
  children,
  className = '',
  tone = 'light',
  intensity = 18,
  disabled = false,
  as: Component = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: InteractiveSurfaceTone;
  intensity?: number;
  disabled?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  const ref = useRef<HTMLDivElement | HTMLElement | null>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (disabled || !ref.current || event.pointerType === 'touch') return;
    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * intensity;
    const rotateX = -((y / rect.height) - 0.5) * intensity;
    ref.current.style.setProperty('--spotlight-x', `${x}px`);
    ref.current.style.setProperty('--spotlight-y', `${y}px`);
    ref.current.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    ref.current.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--tilt-x', '0deg');
    ref.current.style.setProperty('--tilt-y', '0deg');
  };

  const surfaceProps = {
    ref,
    'data-interactive-surface': tone,
    onPointerMove: handlePointerMove,
    onPointerLeave: reset,
    onBlur: reset,
    className: `interactive-surface ${className}`,
  };

  if (Component === 'section') {
    return <section {...surfaceProps} ref={ref as React.Ref<HTMLElement>}>{children}</section>;
  }
  if (Component === 'article') {
    return <article {...surfaceProps} ref={ref as React.Ref<HTMLElement>}>{children}</article>;
  }
  if (Component === 'aside') {
    return <aside {...surfaceProps} ref={ref as React.Ref<HTMLElement>}>{children}</aside>;
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      data-interactive-surface={tone}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onBlur={reset}
      className={`interactive-surface ${className}`}
    >
      {children}
    </div>
  );
}

function MagnetWrap({
  children,
  className = '',
  strength = 8,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !ref.current || event.pointerType === 'touch') return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
    const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
    ref.current.style.setProperty('--magnet-x', `${offsetX.toFixed(2)}px`);
    ref.current.style.setProperty('--magnet-y', `${offsetY.toFixed(2)}px`);
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--magnet-x', '0px');
    ref.current.style.setProperty('--magnet-y', '0px');
  };

  return (
    <div
      ref={ref}
      className={`magnet-wrap ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </div>
  );
}

function RevealOnView({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-on-view ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function MetricPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-white px-2 py-2">
      <p className="font-semibold text-[#141413]">{value}</p>
      <p className="mt-0.5 text-[#6f6860]">{label}</p>
    </div>
  );
}

function DarkSummaryPanel({
  phaseLabel,
  progressValue,
  currentQuestion,
  missingMaterialCount,
  riskWarnings,
  materialGaps,
  primaryOfficialEntry,
  historyCount,
}: {
  phaseLabel: string;
  progressValue: number;
  currentQuestion: WorkflowQuestion | null;
  missingMaterialCount: number;
  riskWarnings: RiskWarning[];
  materialGaps: MaterialGap[];
  primaryOfficialEntry?: RegionalActionSource;
  historyCount: number;
}) {
  const topWarning = riskWarnings[0];
  const topMaterial = materialGaps.find((item) => item.status !== 'ready') || materialGaps[0];
  return (
    <InteractiveSurface as="aside" tone="dark" intensity={7} className="dark-product-card flex min-h-[32rem] flex-col justify-between overflow-hidden p-5 md:p-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#d7cfc3]">办理摘要</p>
            <h2 className="editorial-heading mt-2 text-3xl leading-tight text-[#fffaf2] md:text-4xl">
              {phaseLabel}
            </h2>
          </div>
          <Badge variant="outline" className="border-[#cc785c]/45 bg-[#cc785c]/15 text-[#ffd8cb]">
            {historyCount} 轮确认
          </Badge>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[#b8afa4]">完成进度</span>
            <span className="font-medium text-[#fffaf2]">{progressValue}%</span>
          </div>
          <Progress
            value={progressValue}
            aria-label={`完成进度 ${progressValue}%`}
            getAriaValueText={() => `完成进度 ${progressValue}%`}
            className="mt-3 h-2 bg-white/12"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DarkMetric label="待补材料" value={missingMaterialCount} />
          <DarkMetric label="风险核验" value={riskWarnings.length} />
          <DarkMetric label="官方入口" value={primaryOfficialEntry ? 1 : 0} />
        </div>

        <div className="mt-5 space-y-3">
          <SummaryItem
            title="当前问题"
            value={currentQuestion?.question || '先确定注册主体类型'}
            icon={<Bot aria-hidden="true" className="size-4" />}
          />
          <SummaryItem
            title="优先材料"
            value={topMaterial ? `${topMaterial.name} · ${formatMaterialStatus(topMaterial.status)}` : '继续回答后开始核验'}
            icon={<ShieldCheck aria-hidden="true" className="size-4" />}
          />
          <SummaryItem
            title="风险核验"
            value={topWarning ? topWarning.title : '暂无风险提示'}
            tone={topWarning ? 'warning' : 'default'}
            icon={<AlertTriangle aria-hidden="true" className="size-4" />}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#cc785c]/30 bg-[#cc785c]/12 p-4">
        <p className="text-xs font-medium text-[#ffd8cb]">最重要入口</p>
        {primaryOfficialEntry ? (
          <div className="mt-2">
            <p className="line-clamp-2 text-sm font-medium leading-5 text-[#fffaf2]">{primaryOfficialEntry.title}</p>
            <div className="mt-3">
              <MagnetWrap strength={5}>
                <OfficialLinkButton
                  url={primaryOfficialEntry.entryUrl}
                  label="打开官网"
                  variant="outline"
                  className="border-[#cc785c]/55 bg-[#fffaf2] text-[#141413] hover:bg-[#f5f0e8]"
                />
              </MagnetWrap>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#d7cfc3]">回答注册地区后，会把官方入口放到这里。</p>
        )}
      </div>
    </InteractiveSurface>
  );
}

function DarkMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-xl font-semibold text-[#fffaf2]">{value}</p>
      <p className="mt-1 text-xs text-[#b8afa4]">{label}</p>
    </div>
  );
}

function SummaryItem({
  title,
  value,
  icon,
  tone = 'default',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className={`rounded-lg border p-3 ${tone === 'warning' ? 'border-[#cc785c]/40 bg-[#cc785c]/12' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-[#b8afa4]">
        {icon}
        {title}
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#fffaf2]">{value}</p>
    </div>
  );
}

function DisclosurePanel({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group editorial-card overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#141413]">{title}</h2>
          {count !== undefined && <p className="mt-1 text-xs text-[#6f6860]">{count}</p>}
        </div>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[#6f6860] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#e6dfd8] px-4 py-4">
        {children}
      </div>
    </details>
  );
}

function WorkspaceSidePanel({
  currentInfoItems,
  actionCards,
  materialGaps,
  history,
}: {
  currentInfoItems: Array<{ label: string; value: string; attr: string }>;
  actionCards: RegionalActionSource[];
  materialGaps: MaterialGap[];
  history: WorkflowHistoryItem[];
}) {
  const visibleHistory = history.slice().reverse().slice(0, 5);
  return (
    <div className="space-y-4">
      <InteractiveSurface as="section" tone="light" intensity={5} className="editorial-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#141413]">开店档案</h2>
          <Badge variant="outline" className="border-[#cc785c]/35 bg-[#fff1e9] text-[#8b412c]">
            {history.length} 轮确认
          </Badge>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          {currentInfoItems.map((item) => (
            <InfoLine key={item.label} label={item.label} value={item.value} valueDataAttribute={item.attr} />
          ))}
        </div>
      </InteractiveSurface>

      <DisclosurePanel title="官方办理入口" count={actionCards.length ? `${actionCards.length} 个入口` : '回答地区后匹配'} defaultOpen={actionCards.length > 0}>
        <div>
          {actionCards.length ? (
            <ActionCardsList cards={actionCards.slice(0, 3)} compact />
          ) : (
            <p className="text-sm leading-6 text-[#6f6860]">
              回答注册地区后，这里会出现官方入口、页面路径、准备信息和注意事项。
            </p>
          )}
        </div>
      </DisclosurePanel>

      <DisclosurePanel title="待补材料" count={materialGaps.length ? `${materialGaps.length} 项` : '暂无缺口'} defaultOpen={materialGaps.length > 0}>
        <div>
          {materialGaps.length ? (
            <MaterialList items={materialGaps.slice(0, 4)} compact />
          ) : (
            <p className="text-sm leading-6 text-[#6f6860]">继续回答后，会按步骤列出缺口材料。</p>
          )}
        </div>
      </DisclosurePanel>

      <DisclosurePanel title="已确认信息" count={visibleHistory.length ? `最近 ${visibleHistory.length} 条` : '还没有确认记录'}>
        {visibleHistory.length ? (
          <div className="space-y-2">
            {visibleHistory.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#e6dfd8] bg-[#faf7f1] p-3 text-sm">
                <p className="line-clamp-2 font-medium text-[#141413]">{item.question}</p>
                <p className="mt-1 line-clamp-3 text-[#6f6860]">{formatHistoryAnswer(item.answer)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6f6860]">还没有确认记录。</p>
        )}
      </DisclosurePanel>
    </div>
  );
}

function StatusRail({
  warnings,
  materialGaps,
}: {
  warnings: RiskWarning[];
  materialGaps: MaterialGap[];
}) {
  const warningCount = warnings.length;
  const missingCount = materialGaps.filter((item) => item.status !== 'ready').length;
  return (
    <section className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
      <InteractiveSurface tone="warning" intensity={5} className="warm-warning-strip p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#7e321f]">
            <AlertTriangle aria-hidden="true" className="size-4" />
            需要先核验
          </p>
          <Badge variant="outline" className="border-[#e4b49d] bg-white/70 text-[#7e321f]">
            {warningCount} 项
          </Badge>
        </div>
        <div className="mt-3">
          <RiskList warnings={warnings.slice(0, 3)} compact />
        </div>
      </InteractiveSurface>

      <InteractiveSurface tone="cream" intensity={5} className="rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#141413]">
            <ShieldCheck aria-hidden="true" className="size-4" />
            材料缺口
          </p>
          <Badge variant="outline" className="border-[#d8cfc6] bg-white text-[#141413]">
            {missingCount} 项待补
          </Badge>
        </div>
        <div className="mt-3">
          <MaterialList items={materialGaps.slice(0, 3)} compact />
        </div>
      </InteractiveSurface>
    </section>
  );
}

function StartPanel({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return (
    <InteractiveSurface tone="cream" intensity={7} className="cream-panel p-5 md:p-6">
      <p className="text-sm font-medium text-[#8b412c]">第一步：确定开店主体</p>
      <h2 className="editorial-heading mt-2 text-3xl leading-tight text-pretty text-[#141413] md:text-5xl">先确认你准备用哪类主体开店。</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d3a]">
        从主体类型开始，继续确认地区、行业、地址和已有材料，最后整理成一份可照着办理的注册路线。
      </p>
      <MagnetWrap className="mt-4 inline-flex" strength={6} disabled={busy}>
        <Button type="button" size="lg" onClick={onStart} data-workflow-start="true" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          开始注册引导
        </Button>
      </MagnetWrap>
    </InteractiveSurface>
  );
}

function QuestionPanel({
  question,
  answerDraft,
  selectedValues,
  setAnswerDraft,
  setSelectedValues,
  onSubmit,
  busy,
}: {
  question: WorkflowQuestion;
  answerDraft: string;
  selectedValues: string[];
  setAnswerDraft: (value: string) => void;
  setSelectedValues: (value: string[]) => void;
  onSubmit: (value?: string | string[]) => void;
  busy: boolean;
}) {
  const toggleValue = (value: string) => {
    setSelectedValues(selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value]);
  };

  return (
    <div className="space-y-4">
      <InteractiveSurface tone="cream" intensity={6} className="cream-panel p-5 md:p-6">
        <p className="text-xs font-medium text-[#8b412c]">阶段 {question.phase}</p>
        <h2 className="editorial-heading mt-2 text-2xl leading-tight text-pretty text-[#141413] md:text-4xl">{question.question}</h2>
        <p className="mt-3 text-sm leading-6 text-[#3d3d3a]">{question.helperText}</p>
      </InteractiveSurface>

      {(question.questionType === 'single_choice' || question.questionType === 'confirm') && (question.options || []).length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(question.options || []).map((option) => (
            <MagnetWrap key={option.value} strength={4} disabled={busy}>
              <Button
                type="button"
                variant="outline"
                className="h-full w-full justify-start whitespace-normal border-[#e6dfd8] bg-white p-3 text-left text-[#141413] hover:border-[#cc785c]/60 hover:bg-[#fff1e9]"
                onClick={() => onSubmit(option.value)}
                data-workflow-option={option.value}
                data-workflow-native-busy="true"
                disabled={busy}
              >
                <span>
                  <span className="block font-medium">{option.label}</span>
                  {option.description && <span className="mt-1 block text-xs text-[#6f6860]">{option.description}</span>}
                </span>
              </Button>
            </MagnetWrap>
          ))}
        </div>
      )}

      {question.questionType === 'multi_choice' && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {(question.options || []).map((option) => (
              <MagnetWrap key={option.value} strength={4} disabled={busy}>
                <Button
                  type="button"
                  variant={selectedValues.includes(option.value) ? 'default' : 'outline'}
                  className="h-full w-full justify-start whitespace-normal border-[#e6dfd8] p-3 text-left"
                  onClick={() => toggleValue(option.value)}
                  data-workflow-native-busy="true"
                  disabled={busy}
                >
                  {selectedValues.includes(option.value) && <CheckCircle2 aria-hidden="true" className="size-4" />}
                  <span>{option.label}</span>
                </Button>
              </MagnetWrap>
            ))}
          </div>
          <p className="text-xs text-[#6f6860]">可多选，选好后点击提交。</p>
        </div>
      )}

      {(question.questionType === 'text_input' || (question.options || []).length === 0) && (
        <div className="space-y-2">
          <Label htmlFor="workflow-answer">你的回答</Label>
          <Textarea
            id="workflow-answer"
            value={answerDraft}
            onChange={(event) => setAnswerDraft(event.target.value)}
            placeholder="例如：我在上海，准备做跨境电商，想注册有限公司…"
            className="min-h-28 rounded-lg border-[#e6dfd8] bg-white focus-visible:ring-[#cc785c]/25"
            name="workflow-answer"
            autoComplete="off"
            disabled={busy}
          />
        </div>
      )}
    </div>
  );
}

function RiskList({ warnings, compact = false }: { warnings: RiskWarning[]; compact?: boolean }) {
  warnings = warnings || [];
  if (!warnings.length) {
    return <p className="text-sm leading-6 text-[#6f6860]">暂无风险提示。涉及注册资本、地址、许可项目等情况时，这里会主动提醒。</p>;
  }
  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <div key={warning.id} className="rounded-lg border border-[#e4b49d] bg-white/75 p-3 text-sm text-[#7e321f]">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle aria-hidden="true" className="size-4" />
            {warning.title}
          </p>
          <p className={`${compact ? 'line-clamp-3' : ''} mt-1 leading-6`}>{warning.message}</p>
          <p className="mt-1 text-xs text-[#9b604d]">来源：{formatRiskSource(warning.source)}</p>
        </div>
      ))}
    </div>
  );
}

function MaterialList({ items, compact = false }: { items: MaterialGap[]; compact?: boolean }) {
  items = items || [];
  if (!items.length) {
    return <p className="text-sm leading-6 text-[#6f6860]">回答更多信息后会生成材料缺口。</p>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item) => (
        <div key={`${item.name}-${item.status}`} className="rounded-lg border border-[#e6dfd8] bg-white/75 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-[#141413]">{item.name}</p>
            <Badge variant={item.status === 'ready' ? 'secondary' : 'outline'}>{formatMaterialStatus(item.status)}</Badge>
          </div>
          <p className={`${compact ? 'line-clamp-2' : ''} mt-1 text-[#6f6860]`}>{item.reason}</p>
          <p className={`${compact ? 'line-clamp-2' : ''} mt-1 text-[#141413]`}>{item.action}</p>
        </div>
      ))}
    </div>
  );
}

function FinalPlanView({
  plan,
  exportPayload,
  templates,
}: {
  plan: FinalWorkflowPlan;
  exportPayload: WorkspaceExportPayload | null;
  templates: DownloadableTemplate[];
}) {
  const actionCards = plan.actionCards || [];
  const roadmapSteps = plan.roadmapSteps || [];
  const materialsByStep = plan.materialsByStep || [];
  const registrationSteps = plan.registrationSteps || [];
  const postRegistrationSteps = plan.postRegistrationSteps || [];
  const crossBorderSteps = plan.crossBorderSteps || [];
  return (
    <div className="space-y-5 border-t border-[#e6dfd8] pt-5">
      <InteractiveSurface tone="dark" intensity={7} className="dark-product-card p-5 md:p-6">
        <p className="text-xs font-medium text-[#d7cfc3]">路线摘要</p>
        <h3 className="editorial-heading mt-2 text-2xl leading-tight text-[#fffaf2] md:text-4xl">{plan.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#d7cfc3]">{plan.summary}</p>
      </InteractiveSurface>
      <TemplateDownloadsPanel templates={templates} />
      <RoadmapView steps={roadmapSteps} />
      <DisclosurePanel title="材料清单按步骤分组" count={materialsByStep.length ? `${materialsByStep.length} 组` : '暂无材料'} defaultOpen>
        <MaterialsByStepView groups={materialsByStep} embedded />
      </DisclosurePanel>
      <DisclosurePanel title="补充操作说明" count={registrationSteps.length ? `${registrationSteps.length} 组` : '暂无补充'}>
        <PlanSections sections={registrationSteps} embedded />
      </DisclosurePanel>
      <DisclosurePanel title="注册后续事项补充" count={postRegistrationSteps.length ? `${postRegistrationSteps.length} 组` : '暂无补充'}>
        <PlanSections sections={postRegistrationSteps} embedded />
      </DisclosurePanel>
      {crossBorderSteps.length > 0 && (
        <DisclosurePanel title="跨境电商附加说明" count={`${crossBorderSteps.length} 组`} defaultOpen>
          <PlanSections sections={crossBorderSteps} embedded />
        </DisclosurePanel>
      )}
      {actionCards.length > 0 && (
        <DisclosurePanel title="官方办理入口总览" count={`${actionCards.length} 个入口`}>
          <ActionCardsList cards={actionCards} />
        </DisclosurePanel>
      )}
      <p className="rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-3 text-sm leading-6 text-[#3d3d3a]">{plan.disclaimer}</p>
      {exportPayload && (
        <ExportActions payload={exportPayload} filename="注册办理方案" />
      )}
    </div>
  );
}

function TemplateDownloadsPanel({ templates }: { templates: DownloadableTemplate[] }) {
  const [status, setStatus] = useState('');
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);

  const runTemplateAction = async (
    templateId: string,
    label: string,
    handler: () => void | Promise<void>,
  ) => {
    setBusyTemplateId(templateId);
    setStatus('');
    try {
      await handler();
      setStatus(`${label}已开始下载。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '模板下载失败，请稍后重试。');
    } finally {
      setBusyTemplateId(null);
    }
  };

  if (!templates.length) {
    return (
      <InteractiveSurface as="section" tone="light" intensity={4} className="rounded-xl border border-[#e6dfd8] bg-white p-4">
        <p className="text-sm font-semibold text-[#141413]">模板文件下载</p>
        <p className="mt-2 text-sm leading-6 text-[#6f6860]">生成完整办理方案后可下载模板文件。</p>
      </InteractiveSurface>
    );
  }

  return (
    <InteractiveSurface as="section" tone="light" intensity={5} className="rounded-xl border border-[#e6dfd8] bg-[#fffdf8] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#141413]">
            <Download aria-hidden="true" className="size-4" />
            文件抽屉
          </p>
          <p className="mt-1 text-sm leading-6 text-[#6f6860]">
            按当前方案生成草案和清单，提交前仍需按官网页面核验。
          </p>
        </div>
        <MagnetWrap className="shrink-0" strength={5} disabled={Boolean(busyTemplateId)}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => runTemplateAction(
              'all-templates',
              '全部模板',
              () => downloadTemplatesZip(templates),
            )}
            data-template-id="all-templates"
            disabled={Boolean(busyTemplateId)}
          >
            {busyTemplateId === 'all-templates' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Package aria-hidden="true" className="size-4" />}
            全部下载
          </Button>
        </MagnetWrap>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {templates.map((template) => (
          <TemplateDownloadCard
            key={template.id}
            template={template}
            busy={busyTemplateId === template.id}
            disabled={Boolean(busyTemplateId)}
            onDownload={(format) => runTemplateAction(
              template.id,
              `${template.title} ${format.toUpperCase()}`,
              () => downloadTemplate(template, format),
            )}
          />
        ))}
      </div>

      {status && (
        <p className="mt-3 rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] px-3 py-2 text-xs leading-5 text-[#3d3d3a]" role="status">
          {status}
        </p>
      )}
    </InteractiveSurface>
  );
}

function TemplateDownloadCard({
  template,
  busy,
  disabled,
  onDownload,
}: {
  template: DownloadableTemplate;
  busy: boolean;
  disabled: boolean;
  onDownload: (format: TemplateFormat) => void;
}) {
  return (
    <InteractiveSurface as="article" tone="cream" intensity={4} className="rounded-lg border border-[#e6dfd8] bg-[#faf7f1] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[#141413]">{template.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#6f6860]">{template.description}</p>
        </div>
        {busy && <Loader2 aria-hidden="true" className="mt-1 size-4 shrink-0 animate-spin text-[#cc785c]" />}
      </div>
      <p className="mt-2 text-xs leading-5 text-[#3d3d3a]">
        <span className="font-medium text-[#141413]">适用：</span>
        {template.appliesTo}
      </p>
      {template.warnings.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {template.warnings[0]}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {(['docx', 'md', 'html'] as const).map((format) => (
          <MagnetWrap key={format} strength={3} disabled={disabled}>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onDownload(format)}
              data-template-id={template.id}
              data-template-format={format}
              disabled={disabled}
            >
              <Download aria-hidden="true" className="size-3" />
              {format === 'md' ? 'Markdown' : format.toUpperCase()}
            </Button>
          </MagnetWrap>
        ))}
      </div>
    </InteractiveSurface>
  );
}

function RoadmapView({ steps }: { steps: WorkflowRoadmapStep[] }) {
  steps = steps || [];
  if (!steps.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-[#141413]">办理路线图</h3>
      <div className="relative space-y-3 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-[#cc785c]/35">
        {steps.map((step, index) => (
          <RevealOnView key={`${step.order}-${step.title}`} delay={Math.min(index * 70, 420)}>
            <RoadmapStepCard step={step} />
          </RevealOnView>
        ))}
      </div>
    </div>
  );
}

function RoadmapStepCard({ step }: { step: WorkflowRoadmapStep }) {
  const materials = step.materials || [];
  const actions = step.actions || [];
  const blockingRules = step.blockingRules || [];
  return (
    <InteractiveSurface tone="light" intensity={4} className="relative rounded-xl border border-[#e6dfd8] bg-white p-4 pl-12">
      <div className="absolute left-[9px] top-5 flex size-7 items-center justify-center rounded-full border border-[#cc785c] bg-[#cc785c] text-xs font-semibold text-white">
        {step.order}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#cc785c]/30 bg-[#fff1e9] text-[#8b412c]">第 {step.order} 步</Badge>
            <Badge variant="outline" className="border-[#e6dfd8] bg-[#faf7f1] text-[#6f6860]">阶段 {step.phase}</Badge>
          </div>
          <h4 className="text-base font-semibold text-[#141413]">{step.title}</h4>
          <p className="text-sm leading-6 text-[#6f6860]">{step.whenToDo}</p>
          <p className="text-sm leading-6 text-[#3d3d3a]">
            <span className="font-medium text-[#141413]">办理机构：</span>
            {step.agency}
          </p>
        </div>
        <OfficialLinkGroup officialUrl={step.officialUrl} guideUrl={step.guideUrl} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DisclosurePanel title="具体怎么做" count={actions.length ? `${actions.length} 项` : '暂无操作'} defaultOpen>
          <TextListBlock items={actions} ordered embedded />
        </DisclosurePanel>
        <DisclosurePanel title="不能继续的情况" count={blockingRules.length ? `${blockingRules.length} 项` : '暂无阻塞'} defaultOpen={blockingRules.length > 0}>
          <TextListBlock items={blockingRules} tone="warning" embedded />
        </DisclosurePanel>
      </div>

      {materials.length > 0 && (
        <div className="mt-4 border-t border-[#e6dfd8] pt-4">
          <p className="text-sm font-medium text-[#141413]">本步要准备的材料</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {materials.map((material) => (
              <WorkflowMaterialCard key={`${step.order}-${material.name}`} material={material} />
            ))}
          </div>
        </div>
      )}

      {step.nextStepHint && (
        <p className="mt-4 rounded-lg border border-[#d8cfc6] bg-[#f5f0e8] px-3 py-2 text-sm leading-6 text-[#3d3d3a]">
          下一步：{step.nextStepHint}
        </p>
      )}
    </InteractiveSurface>
  );
}

function OfficialLinkGroup({
  officialUrl,
  guideUrl,
}: {
  officialUrl: string;
  guideUrl?: string;
}) {
  return (
    <div className="w-full space-y-2 lg:w-72">
      {officialUrl ? (
        <>
          <MagnetWrap strength={4}>
            <OfficialLinkButton url={officialUrl} label="打开官网" className="w-full justify-center" />
          </MagnetWrap>
          <CopyableUrl value={officialUrl} label="官网 URL" />
        </>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          该步骤以线下窗口或页面搜索为准，当前不编造精确入口。
        </p>
      )}
      {guideUrl && (
        <>
          <MagnetWrap strength={4}>
            <OfficialLinkButton url={guideUrl} label="查看依据" variant="ghost" className="w-full justify-center" />
          </MagnetWrap>
          <CopyableUrl value={guideUrl} label="依据 URL" />
        </>
      )}
    </div>
  );
}

function MaterialsByStepView({
  groups,
  embedded = false,
}: {
  groups: FinalWorkflowPlan['materialsByStep'];
  embedded?: boolean;
}) {
  groups = groups || [];
  if (!groups.length) return null;
  return (
    <div className="space-y-3">
      {!embedded && <h3 className="font-semibold text-[#141413]">材料清单按步骤分组</h3>}
      <div className="space-y-3">
        {groups.map((group) => (
          <InteractiveSurface key={`${group.order}-${group.stepTitle}`} tone="cream" intensity={4} className="rounded-lg border border-[#e6dfd8] bg-[#faf7f1] p-4">
            <p className="text-sm font-medium text-[#141413]">第 {group.order} 步 · {group.stepTitle}</p>
            {(group.materials || []).length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(group.materials || []).map((material) => (
                  <WorkflowMaterialCard key={`${group.order}-${material.name}`} material={material} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#6f6860]">该步骤暂无额外材料。</p>
            )}
          </InteractiveSurface>
        ))}
      </div>
    </div>
  );
}

function WorkflowMaterialCard({ material }: { material: WorkflowMaterialItem }) {
  return (
    <InteractiveSurface tone="light" intensity={3} className="rounded-lg border border-[#e6dfd8] bg-white p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[#141413]">{material.name || '未命名材料'}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={material.required ? 'default' : 'outline'}>{material.required ? '必须' : '留存/按需'}</Badge>
          <Badge variant={material.status === 'ready' ? 'secondary' : 'outline'}>{formatMaterialStatus(material.status)}</Badge>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6f6860]">{formatWorkflowMaterialCategory(material.category)}</p>
      <MaterialInfoLine label="适用场景" value={material.appliesTo} />
      <MaterialInfoLine label="谁提供/去哪办" value={material.provider} />
      <MaterialInfoLine label="如何准备" value={material.howToPrepare} />
      <MaterialInfoLine label="官方依据" value={material.officialBasis} />
      {material.sourceUrl && (
        <OfficialInlineLink url={material.sourceUrl} label="查看材料依据" />
      )}
    </InteractiveSurface>
  );
}

function MaterialInfoLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="mt-2 text-xs leading-5 text-[#6f6860]">
      <span className="font-medium text-[#141413]">{label}：</span>
      {value}
    </p>
  );
}

function TextListBlock({
  title,
  items,
  ordered = false,
  tone = 'default',
  embedded = false,
}: {
  title?: string;
  items: string[];
  ordered?: boolean;
  tone?: 'default' | 'warning';
  embedded?: boolean;
}) {
  items = items || [];
  if (!items.length) return null;
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <div className={embedded ? '' : 'rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-3'}>
      {!embedded && title && <p className="text-sm font-medium text-[#141413]">{title}</p>}
      <ListTag className={`${embedded ? '' : 'mt-2'} space-y-1 pl-5 text-sm leading-6 ${ordered ? 'list-decimal' : 'list-disc'} ${tone === 'warning' ? 'text-[#7e321f]' : 'text-[#3d3d3a]'}`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ListTag>
    </div>
  );
}

function PlanSections({
  title,
  sections,
  embedded = false,
}: {
  title?: string;
  sections: FinalWorkflowPlan['registrationSteps'];
  embedded?: boolean;
}) {
  sections = sections || [];
  if (!sections.length) return null;
  return (
    <div className="space-y-3">
      {!embedded && title && <h3 className="font-semibold text-[#141413]">{title}</h3>}
      {sections.map((section) => (
        <InteractiveSurface key={section.title} tone="cream" intensity={4} className="rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-4">
          <p className="font-medium text-[#141413]">{section.title}</p>
          {(section.items || []).length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#3d3d3a]">
              {(section.items || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {(section.actionCards || []).length > 0 && (
            <div className="mt-3 border-t pt-3">
              <ActionCardsList cards={section.actionCards || []} compact />
            </div>
          )}
        </InteractiveSurface>
      ))}
    </div>
  );
}

function ActionCardsList({
  cards,
  compact = false,
}: {
  cards: RegionalActionSource[];
  compact?: boolean;
}) {
  cards = cards || [];
  if (!cards.length) return null;
  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <InteractiveSurface key={card.id} tone="cream" intensity={4} className="rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] p-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-[#141413]">{card.title}</p>
              <p className="mt-1 text-xs text-[#6f6860]">{formatActionCategory(card.category)}</p>
            </div>
            <MagnetWrap className="shrink-0" strength={4}>
              <OfficialLinkButton url={card.entryUrl} label="打开官网" />
            </MagnetWrap>
          </div>
          <CopyableUrl value={card.entryUrl} label="入口 URL" />

          {(card.appliesTo || []).length > 0 && (
            <p className="mt-2 text-xs leading-5 text-[#6f6860]">
              <span className="font-medium text-[#141413]">适用：</span>
              {(card.appliesTo || []).join('、')}
            </p>
          )}

          <ActionCardBlock title="点击路径" items={card.clickPath || []} compact={compact} ordered />
          <ActionCardBlock title="准备信息" items={card.requiredInputs || []} compact={compact} />
          <ActionCardBlock title="注意事项" items={card.warnings || []} compact={compact} tone="warning" />

          {card.fallbackText && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              {card.fallbackText}
            </p>
          )}
          {card.sourceUrl && card.sourceUrl !== card.entryUrl && (
            <div className="mt-2 space-y-1">
              <OfficialInlineLink url={card.sourceUrl} label="查看依据" />
              <CopyableUrl value={card.sourceUrl} label="依据 URL" />
            </div>
          )}
        </InteractiveSurface>
      ))}
    </div>
  );
}

function OfficialLinkButton({
  url,
  label,
  variant = 'outline',
  className,
}: {
  url: string;
  label: string;
  variant?: 'outline' | 'ghost';
  className?: string;
}) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const openOfficialUrl = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      setCopied(false);
      setFallbackOpen(false);
      return;
    }

    await copyText(url);
    setCopied(true);
    setFallbackOpen(true);
  };

  const openInCurrentPage = () => {
    window.location.href = url;
  };

  return (
    <div className="space-y-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={openOfficialUrl}
        data-official-url={url}
        className={buttonVariants({ variant, size: 'sm', className })}
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        {label}
      </a>
      {fallbackOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          <p>{copied ? '浏览器拦截了新窗口，链接已复制。' : '浏览器拦截了新窗口。'}</p>
          <button
            type="button"
            onClick={openInCurrentPage}
            data-official-url={url}
            className="mt-2 inline-flex rounded-lg border border-amber-900/30 bg-white px-3 py-1 font-medium text-amber-950 hover:bg-[#fff1e9]"
          >
            当前页打开
          </button>
        </div>
      )}
    </div>
  );
}

function OfficialInlineLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const openOfficialUrl = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      await copyText(url);
      setCopied(true);
    }
  };

  return (
    <span className="mt-2 inline-flex flex-wrap items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={openOfficialUrl}
        data-official-url={url}
        className="inline-flex text-xs font-medium text-[#8b412c] hover:text-[#a9583e]"
      >
        {label}
      </a>
      {copied && <span className="text-xs text-amber-800">已复制链接</span>}
    </span>
  );
}

function CopyableUrl({ value, label }: { value: string; label: string }) {
  if (!value) return null;
  const copyUrl = async () => {
    await copyText(value);
  };
  return (
    <div className="mt-2 rounded-lg border border-[#e6dfd8] bg-white px-2 py-1 text-xs leading-5 text-[#6f6860]">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0">
          <span className="font-medium text-[#141413]">{label}：</span>
          <span className="break-all">{value}</span>
        </p>
        <button
          type="button"
          onClick={copyUrl}
          className="shrink-0 rounded-lg border border-[#e6dfd8] px-2 py-1 text-xs font-medium text-[#141413] hover:bg-[#fff1e9] focus-visible:ring-2 focus-visible:ring-[#cc785c]"
        >
          <Copy aria-hidden="true" className="mr-1 inline size-3" />
          复制链接
        </button>
      </div>
    </div>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // 浏览器不允许写剪贴板时，使用隐藏 textarea 兜底。
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function ActionCardBlock({
  title,
  items,
  compact,
  ordered = false,
  tone = 'default',
}: {
  title: string;
  items: string[];
  compact?: boolean;
  ordered?: boolean;
  tone?: 'default' | 'warning';
}) {
  items = items || [];
  const visibleItems = compact ? items.slice(0, 4) : items;
  if (!visibleItems.length) return null;
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-[#141413]">{title}</p>
      <ListTag className={`mt-1 space-y-1 pl-5 text-xs leading-5 ${ordered ? 'list-decimal' : 'list-disc'} ${tone === 'warning' ? 'text-[#7e321f]' : 'text-[#6f6860]'}`}>
        {visibleItems.map((item) => <li key={item}>{item}</li>)}
      </ListTag>
      {compact && items.length > visibleItems.length && (
        <p className="mt-1 text-xs text-[#6f6860]">还有 {items.length - visibleItems.length} 项会在最终方案中展开。</p>
      )}
    </div>
  );
}

function InfoLine({ label, value, valueDataAttribute }: { label: string; value: string; valueDataAttribute?: string }) {
  const valueProps = valueDataAttribute ? { [valueDataAttribute]: true } : {};
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e6dfd8] pb-2">
      <span className="text-[#6f6860]">{label}</span>
      <span className="max-w-48 break-words text-right font-medium text-[#141413]" {...valueProps}>{value}</span>
    </div>
  );
}

function hasAnswer(question: WorkflowQuestion, answerDraft: string, selectedValues: string[]) {
  if (question.questionType === 'multi_choice') return selectedValues.length > 0;
  if (question.questionType === 'single_choice' && (question.options || []).length > 0) return true;
  return Boolean(answerDraft.trim());
}

function shouldShowSubmitButton(question: WorkflowQuestion) {
  if (question.questionType === 'multi_choice') return true;
  if (question.questionType === 'text_input') return true;
  return !(question.options || []).length;
}

function toUserFacingMessage(message: string) {
  return message
    .replaceAll('DeepSeek 自适应下一步失败', '下一步生成失败')
    .replaceAll('DeepSeek 最终方案生成失败', '办理方案生成失败')
    .replaceAll('DeepSeek', '系统')
    .replaceAll('deepseek', '方案生成')
    .replaceAll('AI 动态判断', '注册路径判断')
    .replaceAll('AI', '智能助手')
    .replaceAll('官方入口资料包', '官方办理资料')
    .replaceAll('工作流护栏', '规则校验')
    .replaceAll('本地护栏', '规则校验');
}

function formatDisplayValue(value: string) {
  const labels: Record<string, string> = {
    cross_border_ecommerce: '跨境电商',
    technology: '科技/信息技术',
    trade: '商贸/贸易',
    consulting: '咨询服务',
    food: '餐饮/食品',
    other: '其他',
  };
  return labels[value] || value;
}

function formatHistoryAnswer(answer: string | string[]) {
  if (Array.isArray(answer)) return answer.map(formatDisplayValue).join('、');
  return formatDisplayValue(answer);
}

function formatRiskSource(source: RiskWarning['source']) {
  const labels: Record<RiskWarning['source'], string> = {
    deepseek: '方案生成',
    guardrail: '规则校验',
    regional: '地区规则',
  };
  return labels[source] || toUserFacingMessage(source);
}

function buildExportPayload(plan: FinalWorkflowPlan): WorkspaceExportPayload {
  const actionCards = plan.actionCards || [];
  const roadmapSteps = plan.roadmapSteps || [];
  const materialsByStep = plan.materialsByStep || [];
  const materialChecklist = plan.materialChecklist || [];
  const registrationSteps = plan.registrationSteps || [];
  const postRegistrationSteps = plan.postRegistrationSteps || [];
  const crossBorderSteps = plan.crossBorderSteps || [];
  const riskWarnings = plan.riskWarnings || [];
  const sourceNotes = plan.sourceNotes || [];
  return {
    title: plan.title,
    subtitle: PRODUCT_NAME,
    summary: plan.summary,
    sections: [
      {
        title: '办理路线图',
        content: roadmapSteps.map(formatRoadmapStepForExport),
      },
      {
        title: '材料缺口按步骤分组',
        content: materialsByStep.map((group) => [
          `第 ${group.order} 步：${group.stepTitle}`,
          ...(group.materials || []).map(formatWorkflowMaterialForExport),
        ].join('\n')),
      },
      {
        title: '材料清单',
        content: materialChecklist.map((item) => `${item.name}：${formatMaterialStatus(item.status)}。${item.action}`),
      },
      ...registrationSteps.map((section) => ({ title: section.title, content: section.items || [] })),
      ...postRegistrationSteps.map((section) => ({ title: section.title, content: section.items || [] })),
      ...crossBorderSteps.map((section) => ({ title: section.title, content: section.items || [] })),
      {
        title: '官方办理入口',
        content: actionCards.map(formatActionCardForExport),
      },
      {
        title: '风险提示',
        content: riskWarnings.map((warning) => `${warning.title}：${warning.message}`),
      },
      {
        title: '依据来源',
        content: sourceNotes.map((source) => `${source.title} ${source.url}`),
      },
      {
        title: '免责声明',
        content: plan.disclaimer,
      },
    ],
    generatedAt: new Date(),
  };
}

function formatRoadmapStepForExport(step: WorkflowRoadmapStep) {
  const actions = step.actions || [];
  const materials = step.materials || [];
  const blockingRules = step.blockingRules || [];
  return [
    `第 ${step.order} 步：${step.title}`,
    `什么时候办：${step.whenToDo}`,
    `办理机构：${step.agency}`,
    step.officialUrl ? `官网入口：${step.officialUrl}` : '',
    step.guideUrl ? `官方教程/依据：${step.guideUrl}` : '',
    actions.length ? `操作：${actions.join(' -> ')}` : '',
    materials.length ? `材料：${materials.map((material) => material.name).join('、')}` : '',
    blockingRules.length ? `注意：${blockingRules.join('；')}` : '',
    step.nextStepHint ? `下一步：${step.nextStepHint}` : '',
  ].filter(Boolean).join('\n');
}

function formatWorkflowMaterialForExport(material: WorkflowMaterialItem) {
  return [
    `${material.name}：${material.required ? '必须' : '留存/按需'}，${formatMaterialStatus(material.status)}`,
    `适用：${material.appliesTo}`,
    `谁提供/去哪办：${material.provider}`,
    `如何准备：${material.howToPrepare}`,
    `依据：${material.officialBasis}${material.sourceUrl ? ` ${material.sourceUrl}` : ''}`,
  ].join('\n');
}

function formatActionCardForExport(card: RegionalActionSource) {
  const appliesTo = card.appliesTo || [];
  const clickPath = card.clickPath || [];
  const requiredInputs = card.requiredInputs || [];
  const warnings = card.warnings || [];
  return [
    `${card.title}：${card.entryUrl}`,
    appliesTo.length ? `适用：${appliesTo.join('、')}` : '',
    clickPath.length ? `点击路径：${clickPath.join(' -> ')}` : '',
    requiredInputs.length ? `准备信息：${requiredInputs.join('、')}` : '',
    warnings.length ? `注意事项：${warnings.join('；')}` : '',
    card.fallbackText ? `补充：${card.fallbackText}` : '',
  ].filter(Boolean).join('\n');
}

function formatActionCategory(value: RegionalActionSource['category']) {
  const labels: Record<RegionalActionSource['category'], string> = {
    name_declaration: '名称自主申报',
    company_registration: '企业设立登记',
    individual_registration: '个体户登记',
    address_registration: '住所登记',
    seal_carving: '刻章备案',
    tax_registration: '税务登记',
    bank_account: '银行开户',
    social_security: '社保/公积金',
    cross_border: '跨境电商附加事项',
    national_rules: '全国材料规范',
    general_portal: '通用官方入口',
  };
  return labels[value] || value;
}

function formatRegistrationType(value: UserSession['registrationType']) {
  if (value === 'individual') return '个体工商户';
  if (value === 'company') return '有限责任公司';
  return '待回答';
}

function formatAddressType(value: UserSession['address']['type']) {
  const labels: Record<string, string> = {
    owned: '自有房产',
    rented: '租赁地址',
    residential: '住宅地址',
    virtual: '虚拟/挂靠地址',
    incubator: '园区/孵化器地址',
  };
  return value ? labels[value] || value : '待回答';
}

function formatMaterialStatus(value: MaterialGap['status']) {
  if (value === 'ready') return '已具备';
  if (value === 'needs_review') return '需核验';
  return '待准备';
}

function formatWorkflowMaterialCategory(value: WorkflowMaterialItem['category']) {
  const labels: Record<WorkflowMaterialItem['category'], string> = {
    required_registration: '必备登记材料',
    address: '地址相关材料',
    personnel_signature: '人员/签名材料',
    post_registration: '后续办理材料',
    cross_border: '跨境电商材料',
    risk_retention: '风险留存材料',
  };
  return labels[value] || value;
}
