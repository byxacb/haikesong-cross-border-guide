'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/app-store';
import { ChecklistDisplay } from '@/components/features/checklist-display';
import type { ChecklistItem } from '@/types/domain';

/**
 * 材料清单页面
 * 用户从 /select 跳转过来后：
 * 1. 从 store 读取 sellerType 和 region
 * 2. 调用 /api/ai/checklist 获取 AI 生成的材料清单
 * 3. 展示加载状态（骨架屏）
 * 4. 展示清单列表
 * 5. 底部"开始填写"按钮跳转到 /fill
 */
export default function ChecklistPage() {
  const router = useRouter();
  const { sellerType, region, setChecklist, setCurrentStep } = useAppStore();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 如果没有选择卖家类型，跳回选择页
    if (!sellerType) {
      router.push('/select');
      return;
    }

    // 调用 AI 生成材料清单
    async function fetchChecklist() {
      try {
        setLoading(true);
        const res = await fetch('/api/ai/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellerType, region }),
        });

        if (!res.ok) throw new Error('获取材料清单失败');

        const data = await res.json();
        setItems(data.items || []);
        setChecklist(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }

    fetchChecklist();
  }, [sellerType, region, router, setChecklist]);

  // 点击"开始填写"跳转到填写页
  const handleStartFill = () => {
    setCurrentStep('fill');
    router.push('/fill');
  };

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">注册材料清单</CardTitle>
          <p className="text-sm text-muted-foreground">
            以下是{sellerType === 'professional' ? '专业卖家' : '个人卖家'}注册亚马逊所需的材料
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 加载状态 */}
          {loading && <LoadingSkeleton />}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* 清单展示 */}
          {!loading && !error && <ChecklistDisplay items={items} />}

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => router.push('/select')}>
              返回修改
            </Button>
            <Button onClick={handleStartFill} disabled={loading || items.length === 0}>
              开始逐项填写
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * 加载骨架屏组件
 * AI 生成清单时展示的占位动画
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">AI 正在生成个性化材料清单...</p>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
