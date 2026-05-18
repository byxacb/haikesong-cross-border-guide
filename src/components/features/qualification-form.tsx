'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistItem } from '@/types/domain';

interface QualificationFormProps {
  item: ChecklistItem;
  initialValues: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  isLoading: boolean;
}

/**
 * 资料表单组件
 * 动态渲染表单字段，基于 ChecklistItem.fields 生成对应输入框
 */
export function QualificationForm({ item, initialValues, onSubmit, isLoading }: QualificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  // 更新字段值
  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  // 检查是否所有必填字段都已填写
  const allFilled = item.fields.every((field) => values[field.key]?.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 动态渲染字段 */}
      {item.fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type={field.type === 'date' ? 'date' : 'text'}
            placeholder={field.placeholder}
            value={values[field.key] || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
          />
          {/* 验证提示 */}
          {field.validation && (
            <p className="text-xs text-muted-foreground">{field.validation}</p>
          )}
        </div>
      ))}

      {/* 要求提示区域 */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-xs font-medium">填写要求：</p>
        {item.requirements.map((req, i) => (
          <p key={i} className="text-xs text-muted-foreground">• {req}</p>
        ))}
      </div>

      {/* 提交按钮 */}
      <Button type="submit" disabled={!allFilled || isLoading} className="w-full">
        {isLoading ? 'AI 校验中...' : '提交校验'}
      </Button>
    </form>
  );
}
