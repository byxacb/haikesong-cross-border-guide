'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/app-store';
import type { SellerType } from '@/types/domain';

// 卖家类型和地区选择页面
export default function SelectPage() {
  const router = useRouter();
  const setSellerInfo = useAppStore((s) => s.setSellerInfo);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);

  const [sellerType, setSellerType] = useState<SellerType | null>(null);
  const [region, setRegion] = useState('CN');

  // 点击下一步，保存选择并跳转到材料清单页
  const handleNext = () => {
    if (!sellerType) return;
    setSellerInfo(sellerType, region);
    setCurrentStep('checklist');
    router.push('/checklist');
  };

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">选择卖家类型</CardTitle>
          <CardDescription>请选择您的注册类型和所在地区</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 卖家类型选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">卖家类型</label>
            <div className="grid grid-cols-2 gap-4">
              <SellerTypeCard
                title="专业卖家"
                description="月费39.99美元，完整功能，适合正式经营"
                selected={sellerType === 'professional'}
                onClick={() => setSellerType('professional')}
              />
              <SellerTypeCard
                title="个人卖家"
                description="无月费，功能受限，适合试水"
                selected={sellerType === 'individual'}
                onClick={() => setSellerType('individual')}
              />
            </div>
          </div>

          {/* 地区选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">所在地区</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'CN', label: '中国大陆' },
                { value: 'HK', label: '中国香港' },
                { value: 'TW', label: '中国台湾' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setRegion(item.value)}
                  className={`rounded-lg border p-3 text-center text-sm transition-colors cursor-pointer ${
                    region === item.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'hover:border-primary/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => router.push('/')}>
              返回首页
            </Button>
            <Button
              onClick={handleNext}
              disabled={!sellerType}
            >
              下一步：生成材料清单
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// 卖家类型卡片组件
function SellerTypeCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'hover:border-primary/50'
      }`}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{description}</div>
    </button>
  );
}
