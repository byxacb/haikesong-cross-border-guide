import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { ok, fail } from '@/lib/api/response';
import { getVisionModel, hasVisionKey } from '@/lib/ai/models';
import { getVisionExtractPrompt } from '@/lib/ai/prompts';
import { documentTypeSchema, visionExtractSchema } from '@/lib/ai/schemas';
import { getMockVisionExtract } from '@/lib/ai/mock';
import type { DocumentType } from '@/types/domain';

export async function POST(req: NextRequest) {
  let documentType: DocumentType;
  let imageBase64 = '';
  let mimeType = 'image/jpeg';
  let pastedText = '';
  let demoMode = false;

  try {
    const body = await req.json();
    const parsedType = documentTypeSchema.safeParse(body.documentType);
    if (!parsedType.success) return fail('无效的 documentType');
    documentType = parsedType.data;
    imageBase64 = body.imageBase64 || '';
    mimeType = body.mimeType || 'image/jpeg';
    pastedText = body.pastedText || '';
    demoMode = Boolean(body.demoMode);
  } catch {
    return fail('请求体解析失败');
  }

  if (demoMode) {
    return ok(getMockVisionExtract(documentType, pastedText), { fallback: true });
  }

  if (!imageBase64 && !pastedText.trim()) {
    return fail('请上传证照图片或粘贴证照文字。严格联网模式下不会自动生成演示 OCR 结果。', 400, {
      fallbackAvailable: true,
    });
  }

  if (pastedText.trim()) {
    return ok(getMockVisionExtract(documentType, pastedText));
  }

  if (!hasVisionKey()) {
    return fail('缺少 ZHIPU_API_KEY，无法进行图片 OCR。可先粘贴证照文字做“文本解析”，或配置视觉 Key 后重试。', 503, {
      fallbackAvailable: true,
    });
  }

  try {
    const result = await generateObject({
      model: getVisionModel(),
      schema: visionExtractSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: getVisionExtractPrompt(documentType, pastedText) },
            {
              type: 'image',
              image: `data:${mimeType};base64,${imageBase64}`,
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    return ok(result.object);
  } catch (error) {
    console.error('[/api/ai/vision-extract] 视觉AI调用失败:', error);
    return fail('视觉 OCR 调用失败，严格联网模式下不自动使用离线证照结果。请检查 ZHIPU_API_KEY、余额或网络后重试。', 502, {
      fallbackAvailable: true,
    });
  }
}
