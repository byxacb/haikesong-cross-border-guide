'use client';

import { Badge } from '@/components/ui/badge';
import type { AICheckResult } from '@/types/domain';

interface CheckResultProps {
  result: AICheckResult;
}

/**
 * AI 校验结果展示组件
 * 展示校验结果（通过/警告/错误），问题列表和建议
 */
export function CheckResult({ result }: CheckResultProps) {
  // 风险等级对应的颜色样式
  const riskColors = {
    low: 'text-green-700 bg-green-50 border-green-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    high: 'text-red-700 bg-red-50 border-red-200',
  };

  // 风险等级中文标签
  const riskLabels = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${riskColors[result.riskLevel]}`}>
      {/* 标题行：通过/问题 + 风险等级标签 */}
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {result.passed ? '✓ 校验通过' : '⚠ 发现问题'}
        </span>
        <Badge variant={result.riskLevel === 'low' ? 'secondary' : 'destructive'}>
          {riskLabels[result.riskLevel]}
        </Badge>
      </div>

      {/* 总结信息 */}
      <p className="text-sm">{result.summary}</p>

      {/* 问题列表 */}
      {result.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">需要修改的问题：</p>
          {result.issues.map((issue, i) => (
            <div key={i} className="text-sm pl-3 border-l-2 border-current/30">
              <p className="font-medium">字段：{issue.field}</p>
              <p>问题：{issue.problem}</p>
              <p className="opacity-80">建议：{issue.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
