'use client';

import { Badge } from '@/components/ui/badge';
import type { ChecklistItem } from '@/types/domain';

interface ChecklistDisplayProps {
  items: ChecklistItem[];
}

/**
 * 清单展示组件
 * 展示材料清单列表，每项显示名称、要求、提示、状态标记
 */
export function ChecklistDisplay({ items }: ChecklistDisplayProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.category} className="rounded-lg border p-4 space-y-2">
          {/* 标题行：序号 + 名称 + 必需/推荐标记 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">{index + 1}.</span>
              <h3 className="font-semibold">{item.name}</h3>
            </div>
            <Badge variant={item.required ? 'default' : 'secondary'}>
              {item.required ? '必需' : '推荐'}
            </Badge>
          </div>

          {/* 要求列表 */}
          <ul className="text-sm text-muted-foreground space-y-1 pl-6">
            {item.requirements.map((req, i) => (
              <li key={i} className="list-disc">{req}</li>
            ))}
          </ul>

          {/* 提示信息 */}
          {item.tips && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
              💡 {item.tips}
            </p>
          )}

          {/* 需填字段数量 */}
          <p className="text-xs text-muted-foreground">
            需填写 {item.fields.length} 个字段
          </p>
        </div>
      ))}
    </div>
  );
}
