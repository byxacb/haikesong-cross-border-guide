import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/response';
import {
  buildInitialWorkflowStep,
  runAdaptiveWorkflowStep,
} from '@/lib/workflow/adaptive-orchestrator';
import { createEmptyUserSession } from '@/lib/workflow/guardrails';
import type { WorkflowStepRequest } from '@/lib/workflow/types';

export async function POST(req: NextRequest) {
  let body: Partial<WorkflowStepRequest>;

  try {
    body = await req.json();
  } catch {
    return fail('请求体解析失败');
  }

  const session = body.session ?? createEmptyUserSession();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!body.currentQuestion && body.answer === undefined && history.length === 0 && !session.registrationType) {
    return ok({ step: buildInitialWorkflowStep(session) });
  }

  try {
    const step = await runAdaptiveWorkflowStep({
      session,
      history,
      currentQuestion: body.currentQuestion ?? null,
      answer: body.answer,
    });
    return ok({ step });
  } catch (error) {
    console.error('[/api/ai/workflow-step] 自适应工作流失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return fail(`DeepSeek 自适应下一步失败：${message}`, 502, {
      fallbackAvailable: false,
    });
  }
}
