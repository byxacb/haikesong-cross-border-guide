import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/response';
import { getAmazonPacketPrompt } from '@/lib/ai/prompts';
import { getMockAmazonPacket } from '@/lib/ai/mock';
import { generateDeepSeekJson, validateAmazonPacket } from '@/lib/ai/deepseek-json';
import type { ApplicationCase } from '@/types/domain';

export async function POST(req: NextRequest) {
  let caseData: ApplicationCase;
  let demoMode = false;

  try {
    const body = await req.json();
    caseData = body.caseData;
    demoMode = Boolean(body.demoMode);
  } catch {
    return fail('请求体解析失败');
  }

  if (!caseData?.id) {
    return fail('缺少必要参数：caseData');
  }

  if (demoMode) {
    return ok({ packet: getMockAmazonPacket(caseData) }, { fallback: true });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return fail('缺少 DEEPSEEK_API_KEY，严格联网模式下不会生成离线填表包。请配置密钥或手动开启演示模式。', 503, {
      fallbackAvailable: true,
    });
  }

  try {
    const result = await generateDeepSeekJson<unknown>(
      'deepseek-reasoner',
      getAmazonPacketPrompt(caseData),
      '填表包',
    );

    return ok({ packet: validateAmazonPacket(result) });
  } catch (error) {
    console.error('[/api/ai/amazon-packet] AI调用失败:', error);
    const reason = error instanceof Error ? error.message : '未知错误';
    return fail(`AI 填表包生成调用失败：${reason}。严格联网模式下不自动使用离线数据。`, 502, {
      fallbackAvailable: true,
    });
  }
}
