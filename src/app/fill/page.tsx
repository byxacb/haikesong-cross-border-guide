'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/app-store';
import { QualificationForm } from '@/components/features/qualification-form';
import { CheckResult } from '@/components/features/check-result';
import type { AICheckResult } from '@/types/domain';

/**
 * 逐项填写页面
 * 支持逐项填写资质，每项填完后调用 AI 校验
 */
export default function FillPage() {
  const router = useRouter();
  const {
    checklist,
    currentQualificationIndex,
    setCurrentQualificationIndex,
    qualifications,
    updateQualification,
    setCurrentStep,
  } = useAppStore();

  const [checkResult, setCheckResult] = useState<AICheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // 如果没有清单数据，跳回清单页
  useEffect(() => {
    if (checklist.length === 0) {
      router.push('/checklist');
    }
  }, [checklist, router]);

  if (checklist.length === 0) {
    return null;
  }

  const currentItem = checklist[currentQualificationIndex];
  const progress = ((currentQualificationIndex + 1) / checklist.length) * 100;
  const isLastItem = currentQualificationIndex === checklist.length - 1;

  /**
   * 提交单项校验
   * 调用 /api/ai/verify 进行 AI 校验
   */
  const handleVerify = async (userInput: Record<string, string>) => {
    if (!currentItem) return;

    setIsChecking(true);
    setCheckResult(null);

    try {
      const res = await fetch('/api/ai/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: currentItem.category,
          userInput,
        }),
      });

      if (!res.ok) throw new Error('校验请求失败');

      const result: AICheckResult = await res.json();
      setCheckResult(result);

      // 保存到 store
      updateQualification(currentItem.category, {
        userInput,
        checkResult: result,
        status: result.passed ? 'verified' : result.riskLevel === 'high' ? 'error' : 'warning',
      });
    } catch (err) {
      console.error('校验失败:', err);
      // 即使校验失败也保存用户输入
      updateQualification(currentItem.category, {
        userInput,
        status: 'filled',
      });
      setCheckResult({
        passed: true,
        riskLevel: 'low',
        issues: [],
        summary: '离线模式：已保存填写内容，建议联网后重新校验。',
      });
    } finally {
      setIsChecking(false);
    }
  };

  // 下一项
  const handleNext = () => {
    if (isLastItem) {
      // 全部填完，进入报告页
      setCurrentStep('report');
      router.push('/report');
    } else {
      setCurrentQualificationIndex(currentQualificationIndex + 1);
      setCheckResult(null);
    }
  };

  // 上一项
  const handlePrev = () => {
    if (currentQualificationIndex > 0) {
      setCurrentQualificationIndex(currentQualificationIndex - 1);
      setCheckResult(null);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xl">填写资料信息</CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentQualificationIndex + 1} / {checklist.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 当前材料标题 */}
          <div>
            <h3 className="text-lg font-semibold">{currentItem.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              请按照以下要求填写信息
            </p>
          </div>

          {/* 填写表单 */}
          <QualificationForm
            key={currentItem.category}
            item={currentItem}
            initialValues={qualifications[currentItem.category]?.userInput || {}}
            onSubmit={handleVerify}
            isLoading={isChecking}
          />

          {/* AI 校验结果 */}
          {checkResult && <CheckResult result={checkResult} />}

          {/* 导航按钮 */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQualificationIndex === 0}
            >
              上一项
            </Button>
            <Button onClick={handleNext} disabled={!checkResult}>
              {isLastItem ? '生成评估报告' : '下一项'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
