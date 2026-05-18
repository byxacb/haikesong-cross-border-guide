import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/response';
import { generateAdaptiveFinalPlan } from '@/lib/workflow/final-plan';
import type { WorkflowFinalPlanRequest } from '@/lib/workflow/types';

export async function POST(req: NextRequest) {
  let body: Partial<WorkflowFinalPlanRequest>;

  try {
    body = await req.json();
  } catch {
    return fail('请求体解析失败');
  }

  if (!body.session) {
    return fail('缺少必要参数：session');
  }

  try {
    const plan = await generateAdaptiveFinalPlan({
      session: body.session,
      history: Array.isArray(body.history) ? body.history : [],
    });
    return ok({ plan });
  } catch (error) {
    console.error('[/api/ai/workflow-final-plan] 最终方案生成失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return fail(`DeepSeek 自适应最终方案失败：${message}`, 502, {
      fallbackAvailable: false,
    });
  }
}
