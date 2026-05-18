import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/ai/models';
import { riskAssessmentSchema } from '@/lib/ai/schemas';
import { getRiskAssessPrompt } from '@/lib/ai/prompts';
import { getMockRiskAssessment } from '@/lib/ai/mock';

/**
 * POST /api/ai/risk-assess
 * 综合评估所有资质材料的注册通过概率
 * 失败时降级到 Mock 数据
 */
export async function POST(req: NextRequest) {
  // 先解析请求体
  let applicationId = '';
  let allQualifications: Array<{
    category: string;
    userInput: Record<string, string>;
    status: string;
  }> = [];

  try {
    const body = await req.json();
    applicationId = body.applicationId || '';
    allQualifications = body.allQualifications || [];
  } catch {
    return NextResponse.json(
      { error: '请求体解析失败' },
      { status: 400 }
    );
  }

  // 参数校验
  if (!applicationId) {
    return NextResponse.json(
      { error: '缺少必要参数：applicationId' },
      { status: 400 }
    );
  }

  if (!allQualifications || allQualifications.length === 0) {
    return NextResponse.json(
      { error: '缺少必要参数：allQualifications 不能为空' },
      { status: 400 }
    );
  }

  try {
    // 调用 AI 进行综合风险评估
    const result = await generateObject({
      model: getChatModel(),
      schema: riskAssessmentSchema,
      prompt: getRiskAssessPrompt(allQualifications),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    // AI 调用失败，降级到 Mock 数据
    console.error('[/api/ai/risk-assess] AI调用失败，降级到Mock:', error);
    const mockData = getMockRiskAssessment();

    return NextResponse.json(mockData, {
      headers: { 'X-AI-Fallback': 'true' },
    });
  }
}
