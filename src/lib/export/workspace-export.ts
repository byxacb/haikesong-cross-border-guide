'use client';

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export interface WorkspaceExportSection {
  title: string;
  content: string | string[];
}

export interface WorkspaceExportPayload {
  title: string;
  subtitle?: string;
  summary?: string;
  sections: WorkspaceExportSection[];
  generatedAt?: Date;
}

export interface WorkspaceExportOptions {
  filename?: string;
}

/**
 * 将工作台报告转换为纯文本，供剪贴板或降级导出使用。
 */
export function buildPlainText(payload: WorkspaceExportPayload) {
  const parts = [
    payload.title,
    payload.subtitle,
    payload.summary,
    ...payload.sections.flatMap((section) => [
      section.title,
      ...toLines(section.content),
    ]),
    `生成时间：${formatExportTime(payload.generatedAt)}`,
  ].filter(Boolean);

  return parts.join('\n\n');
}

/**
 * 将工作台报告转换为 Markdown 文本。
 */
export function buildMarkdown(payload: WorkspaceExportPayload) {
  const lines = [
    `# ${payload.title}`,
    payload.subtitle ? `> ${payload.subtitle}` : '',
    payload.summary ?? '',
    ...payload.sections.flatMap((section) => [
      `## ${section.title}`,
      ...toLines(section.content).map((line) => `- ${line}`),
    ]),
    `生成时间：${formatExportTime(payload.generatedAt)}`,
  ].filter(Boolean);

  return `${lines.join('\n\n')}\n`;
}

/**
 * 将工作台报告转换为可独立打开的 HTML 文档。
 */
export function buildHtml(payload: WorkspaceExportPayload) {
  const sectionHtml = payload.sections
    .map((section) => {
      const items = toLines(section.content)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('');

      return `<section><h2>${escapeHtml(section.title)}</h2><ul>${items}</ul></section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body { margin: 0; background: #f9f7f2; color: #1f2933; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 820px; margin: 0 auto; padding: 40px 24px; }
    h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.2; }
    h2 { margin: 28px 0 12px; font-size: 20px; }
    p, li { font-size: 15px; line-height: 1.75; }
    .subtitle { color: #6b7280; margin: 0 0 20px; }
    .summary { border-left: 4px solid #ef4444; padding: 12px 16px; background: rgba(255, 255, 255, 0.72); }
    .meta { margin-top: 32px; color: #6b7280; font-size: 13px; }
    @media print { body { background: #fff; } main { padding: 24px; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(payload.title)}</h1>
    ${payload.subtitle ? `<p class="subtitle">${escapeHtml(payload.subtitle)}</p>` : ''}
    ${payload.summary ? `<p class="summary">${escapeHtml(payload.summary)}</p>` : ''}
    ${sectionHtml}
    <p class="meta">生成时间：${escapeHtml(formatExportTime(payload.generatedAt))}</p>
  </main>
</body>
</html>`;
}

/**
 * 复制报告纯文本到剪贴板。
 */
export async function copyWorkspaceText(payload: WorkspaceExportPayload) {
  assertBrowser();

  const text = buildPlainText(payload);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  copyWithTextarea(text);
}

/**
 * 下载 Markdown 文件。
 */
export function downloadMarkdown(payload: WorkspaceExportPayload, options?: WorkspaceExportOptions) {
  downloadTextFile(
    buildMarkdown(payload),
    resolveFilename(options?.filename ?? payload.title, 'md'),
    'text/markdown;charset=utf-8',
  );
}

/**
 * 下载 HTML 文件。
 */
export function downloadHtml(payload: WorkspaceExportPayload, options?: WorkspaceExportOptions) {
  downloadTextFile(
    buildHtml(payload),
    resolveFilename(options?.filename ?? payload.title, 'html'),
    'text/html;charset=utf-8',
  );
}

/**
 * 通过浏览器打印对话框导出 PDF。
 */
export function printWorkspacePdf(payload: WorkspaceExportPayload) {
  assertBrowser();

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('浏览器阻止了打印窗口，请允许弹窗后重试。');
  }

  printWindow.document.open();
  printWindow.document.write(buildHtml(payload));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/**
 * 下载 DOCX 文件。项目已安装 docx 依赖，因此这里提供真实导出能力。
 */
export async function exportDocx(payload: WorkspaceExportPayload, options?: WorkspaceExportOptions) {
  assertBrowser();

  const blob = await buildDocxBlob(payload);
  downloadBlob(blob, resolveFilename(options?.filename ?? payload.title, 'docx'));
}

/**
 * 将报告转换为 DOCX Blob，供单文件下载和 ZIP 打包复用。
 */
export async function buildDocxBlob(payload: WorkspaceExportPayload) {
  const children = [
    new Paragraph({
      text: payload.title,
      heading: HeadingLevel.TITLE,
    }),
    ...optionalParagraphs([payload.subtitle, payload.summary]),
    ...payload.sections.flatMap((section) => [
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
      }),
      ...toLines(section.content).map(
        (line) =>
          new Paragraph({
            children: [new TextRun(line)],
            bullet: { level: 0 },
          }),
      ),
    ]),
    new Paragraph({
      children: [
        new TextRun({
          text: `生成时间：${formatExportTime(payload.generatedAt)}`,
          italics: true,
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

function optionalParagraphs(values: Array<string | undefined>) {
  return values.filter(isNonEmptyString).map(
    (value) =>
      new Paragraph({
        children: [new TextRun(value)],
      }),
  );
}

function toLines(content: string | string[]) {
  return Array.isArray(content) ? content.filter(isNonEmptyString) : [content].filter(isNonEmptyString);
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}

export function downloadTextFile(content: string, filename: string, type: string) {
  assertBrowser();
  downloadBlob(new Blob([content], { type }), filename);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function resolveFilename(filename: string, extension: string) {
  const safeName = filename
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    || '注册就绪报告';

  return safeName.endsWith(`.${extension}`) ? safeName : `${safeName}.${extension}`;
}

function formatExportTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function copyWithTextarea(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function assertBrowser() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('导出功能只能在浏览器端使用。');
  }
}
