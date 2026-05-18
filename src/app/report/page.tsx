'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/app-store';
import { RiskReport } from '@/components/features/risk-report';
import type { RiskAssessmentReport } from '@/types/domain';

/**
 * 风险评估报告页面
 * 用户从 /fill 全部填完后跳转到此页
 * 调用 /api/ai/risk-assess 获取综合风险评估并展示
 */
export default function ReportPage() {
  const router = useRouter();
  const { qualifications, setRiskReport, riskReport, reset } = useAppStore();

  const [report, setReport] = useState<RiskAssessmentReport | null>(riskReport);
  const [loading, setLoading] = useState(!riskReport);
  const [error, setError] = useState<string | null>(null);

  // 抽取请求逻辑为独立函数，供 useEffect 和重试按钮共用
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // 构造请求数据
      const allQualifications = Object.entries(qualifications).map(
        ([category, data]) => ({
          category,
          userInput: data.userInput,
          status: data.status,
        })
      );

      const res = await fetch('/api/ai/risk-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: 'demo-' + Date.now(),
          allQualifications,
        }),
      });

      if (!res.ok) throw new Error('风险评估请求失败');

      const data: RiskAssessmentReport = await res.json();
      setReport(data);
      setRiskReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 已有报告（从 store 恢复），不重新请求
    if (riskReport) return;

    // 如果没有填写数据，跳回填写页
    const hasData = Object.values(qualifications).some(
      (q) => Object.keys(q.userInput).length > 0
    );
    if (!hasData) {
      router.push('/fill');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifications, riskReport, router]);

  // 重新开始
  const handleRestart = () => {
    reset();
    router.push('/');
  };

  // 重试请求
  const handleRetry = () => {
    setRiskReport(null);
    fetchReport();
  };

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">注册就绪评估报告</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI 已综合分析您的所有注册材料，以下是评估结果
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 加载状态 */}
          {loading && <ReportSkeleton />}

          {/* 错误状态 */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive text-sm">
              {error}
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={handleRetry}
              >
                重试
              </Button>
            </div>
          )}

          {/* 报告内容 */}
          {!loading && !error && report && <RiskReport report={report} />}

          {/* 底部操作按钮 */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => router.push('/fill')}>
              返回修改资料
            </Button>
            <Button onClick={handleRestart}>
              重新开始
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * 加载骨架屏组件
 * 在等待 AI 评估结果时展示
 */
function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI 正在综合评估您的注册材料...
      </p>
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
