'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from '@/stores/app-store';

// 首页 - 跨境电商开店注册引导工具
export default function Home() {
  const reset = useAppStore((s) => s.reset);

  // 点击"开始"时重置状态，开始新流程
  const handleStart = () => {
    reset();
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-[#f9f7f2] p-8">
      <Card className="w-full max-w-3xl border-red-200/70 bg-white/80 shadow-sm backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-normal">
            AI 开店资料代办工作台
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            从没开公司、办照材料、证照上传解析，到 Amazon 北美站可复制填表包
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="AI 问答采集"
              description="围绕有没有公司、经营范围、地址和负责人信息连续追问"
            />
            <FeatureCard
              title="模板草稿生成"
              description="生成办照清单、公司章程、住所证明和风险修正清单"
            />
            <FeatureCard
              title="证照上传解析"
              description="营业执照和身份证字段抽取后写入本地资料库"
            />
            <FeatureCard
              title="亚马逊填表包"
              description="按 Seller Central 字段列出推荐填写值和来源材料"
            />
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/60 p-4 text-sm leading-6 text-stone-700">
            工具只做资料准备、草稿生成和风险提示，不自动操作亚马逊后台，不构成法律或税务意见。
          </div>
          <div className="flex justify-center pt-4">
            <Link href="/workspace" onClick={handleStart}>
              <Button size="lg" className="text-lg px-8 cursor-pointer">
                进入资料工作台
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// 功能卡片组件
function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
