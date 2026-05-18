import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/ai/models';
import { verifyResultSchema } from '@/lib/ai/schemas';
import { getVerifyPrompt } from '@/lib/ai/prompts';
import { getMockVerifyResult } from '@/lib/ai/mock';
import type { QualificationCategory } from '@/types/domain';

// 允许的资质类别列表
const VALID_CATEGORIES: QualificationCategory[] = [
  'business_license',
  'id_card',
  'credit_card',
  'bank_account',
  'contact_info',
  'address_proof',
];

/**
 * POST /api/ai/verify
 * 校验单项资质材料是否符合亚马逊注册要求
 * 失败时降级到 Mock 数据
 */
export async function POST(req: NextRequest) {
  // 先解析请求体
  let category: QualificationCategory = 'business_license';
  let userInput: Record<string, string> = {};

  try {
    const body = await req.json();
    category = body.category;
    userInput = body.userInput || {};
  } catch {
    return NextResponse.json(
      { error: '请求体解析失败' },
      { status: 400 }
    );
  }

  // 参数校验
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `无效的资质类别，允许值：${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!userInput || Object.keys(userInput).length === 0) {
    return NextResponse.json(
      { error: '缺少必要参数：userInput 不能为空' },
      { status: 400 }
    );
  }

  try {
    // 调用 AI 校验用户提交的资质信息
    const result = await generateObject({
      model: getChatModel(),
      schema: verifyResultSchema,
      prompt: getVerifyPrompt(category, userInput),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    // AI 调用失败，降级到 Mock 数据
    console.error('[/api/ai/verify] AI调用失败，降级到Mock:', error);
    const mockData = getMockVerifyResult(category);

    return NextResponse.json(mockData, {
      headers: { 'X-AI-Fallback': 'true' },
    });
  }
}
