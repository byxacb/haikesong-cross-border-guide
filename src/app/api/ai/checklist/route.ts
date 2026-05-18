import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/ai/models';
import { checklistSchema } from '@/lib/ai/schemas';
import { getChecklistPrompt } from '@/lib/ai/prompts';
import { getMockChecklist } from '@/lib/ai/mock';

/**
 * POST /api/ai/checklist
 * 根据卖家类型和地区生成个性化注册材料清单
 * 失败时降级到 Mock 数据
 */
export async function POST(req: NextRequest) {
  // 先解析请求体，保存参数供降级使用
  let sellerType = 'professional';
  let region = 'CN';

  try {
    const body = await req.json();
    sellerType = body.sellerType || 'professional';
    region = body.region || 'CN';
  } catch {
    return NextResponse.json(
      { error: '请求体解析失败' },
      { status: 400 }
    );
  }

  // 参数校验
  if (!sellerType || !region) {
    return NextResponse.json(
      { error: '缺少必要参数：sellerType 和 region' },
      { status: 400 }
    );
  }

  try {
    // 调用 AI 生成结构化材料清单
    const result = await generateObject({
      model: getChatModel(),
      schema: checklistSchema,
      prompt: getChecklistPrompt(sellerType, region),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    // AI 调用失败，降级到 Mock 数据
    console.error('[/api/ai/checklist] AI调用失败，降级到Mock:', error);
    const mockData = getMockChecklist(sellerType, region);

    return NextResponse.json(mockData, {
      headers: { 'X-AI-Fallback': 'true' },
    });
  }
}
