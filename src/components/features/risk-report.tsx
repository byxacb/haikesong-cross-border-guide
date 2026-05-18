'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { RiskAssessmentReport } from '@/types/domain';

/**
 * 风险评估报告展示组件
 * 展示总体评级、通过概率、风险列表、优势列表和综合建议
 */
interface RiskReportProps {
  report: RiskAssessmentReport;
}

export function RiskReport({ report }: RiskReportProps) {
  // 风险等级对应的样式配置
  const riskConfig = {
    low: { label: '低风险', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    medium: { label: '中风险', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    high: { label: '高风险', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  };

  const config = riskConfig[report.overallRisk];

  return (
    <div className="space-y-6">
      {/* 总体评级卡片 */}
      <div className={`rounded-lg border ${config.border} ${config.bg} p-6 text-center`}>
        <div className={`text-3xl font-bold ${config.color}`}>
          {config.label}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">总体风险等级</div>

        {/* 通过概率 */}
        <div className="mt-4 max-w-xs mx-auto">
          <div className="flex justify-between text-sm mb-1">
            <span>预估通过概率</span>
            <span className="font-semibold">{report.passRate}%</span>
          </div>
          <Progress value={report.passRate} className="h-3" />
        </div>
      </div>

      {/* 风险列表 */}
      {report.risks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">需要关注的问题</h3>
          {report.risks.map((risk, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={risk.severity === 'error' ? 'destructive' : 'secondary'}>
                  {risk.severity === 'error' ? '严重' : '注意'}
                </Badge>
                <span className="text-sm font-medium">{risk.category}</span>
              </div>
              <p className="text-sm">{risk.description}</p>
              <p className="text-sm text-muted-foreground">
                建议：{risk.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 做得好的方面 */}
      {report.strengths.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">做得好的方面</h3>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <ul className="space-y-1">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-sm text-green-700">✓ {s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 综合建议 */}
      <div className="rounded-lg bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">综合建议</h3>
        <p className="text-sm">{report.readySummary}</p>
      </div>
    </div>
  );
}
