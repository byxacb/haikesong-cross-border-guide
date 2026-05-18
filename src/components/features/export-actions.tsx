'use client';

import { useState } from 'react';
import { Check, Clipboard, Download, FileText, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkspaceExportPayload } from '@/lib/export/workspace-export';

type ExportActionStatus = 'idle' | 'success' | 'error';

interface ExportActionsProps {
  payload: WorkspaceExportPayload;
  filename?: string;
  className?: string;
  onSuccess?: (action: string) => void;
  onError?: (action: string, error: Error) => void;
}

/**
 * 工作台导出操作区。主控页面传入 payload 后即可接入复制和文件导出能力。
 */
export function ExportActions({
  payload,
  filename,
  className,
  onSuccess,
  onError,
}: ExportActionsProps) {
  const [status, setStatus] = useState<ExportActionStatus>('idle');
  const [message, setMessage] = useState('');

  const runAction = async (label: string, handler: () => void | Promise<void>) => {
    try {
      await handler();
      setStatus('success');
      setMessage(`${label}已完成`);
      onSuccess?.(label);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('导出失败，请稍后重试。');
      setStatus('error');
      setMessage(normalizedError.message);
      onError?.(label, normalizedError);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction('复制文本', async () => {
            const { copyWorkspaceText } = await import('@/lib/export/workspace-export');
            await copyWorkspaceText(payload);
          })}
        >
          <Clipboard aria-hidden="true" />
          复制文本
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction('下载 Markdown', async () => {
            const { downloadMarkdown } = await import('@/lib/export/workspace-export');
            downloadMarkdown(payload, { filename });
          })}
        >
          <Download aria-hidden="true" />
          Markdown
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction('下载 HTML', async () => {
            const { downloadHtml } = await import('@/lib/export/workspace-export');
            downloadHtml(payload, { filename });
          })}
        >
          <FileText aria-hidden="true" />
          HTML
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction('下载 DOCX', async () => {
            const { exportDocx } = await import('@/lib/export/workspace-export');
            await exportDocx(payload, { filename });
          })}
        >
          <Download aria-hidden="true" />
          DOCX
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction('打印 PDF', async () => {
            const { printWorkspacePdf } = await import('@/lib/export/workspace-export');
            printWorkspacePdf(payload);
          })}
        >
          <Printer aria-hidden="true" />
          打印 PDF
        </Button>
      </div>

      {message && (
        <p
          className={cn(
            'flex items-center gap-1 text-sm',
            status === 'success' ? 'text-green-700' : 'text-red-700',
          )}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {status === 'success' && <Check className="size-4" aria-hidden="true" />}
          {message}
        </p>
      )}
    </div>
  );
}
