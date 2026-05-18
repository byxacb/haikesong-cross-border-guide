import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/response';
import { getTemplateDraftPrompt } from '@/lib/ai/prompts';
import { getMockTemplates } from '@/lib/ai/mock';
import { generateDeepSeekJson, validateTemplateDraft } from '@/lib/ai/deepseek-json';
import type { ApplicationCase, TemplateType } from '@/types/domain';

export async function POST(req: NextRequest) {
  let caseData: ApplicationCase;
  let templateTypes: TemplateType[] | undefined;
  let demoMode = false;

  try {
    const body = await req.json();
    caseData = body.caseData;
    templateTypes = body.templateTypes;
    demoMode = Boolean(body.demoMode);
  } catch {
    return fail('请求体解析失败');
  }

  if (!caseData?.id) {
    return fail('缺少必要参数：caseData');
  }

  if (demoMode) {
    return ok({ templates: getMockTemplates(caseData, templateTypes) }, { fallback: true });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return fail('缺少 DEEPSEEK_API_KEY，严格联网模式下不会生成离线模板。请配置密钥或手动开启演示模式。', 503, {
      fallbackAvailable: true,
    });
  }

  try {
    const result = await generateDeepSeekJson<unknown>(
      'deepseek-chat',
      getTemplateDraftPrompt(caseData, templateTypes),
      '模板生成',
    );

    return ok(validateTemplateDraft(result));
  } catch (error) {
    console.error('[/api/ai/template-draft] AI调用失败:', error);
    const reason = error instanceof Error ? error.message : '未知错误';
    return fail(`AI 模板生成调用失败：${reason}。严格联网模式下不自动使用离线模板。`, 502, {
      fallbackAvailable: true,
    });
  }
}
