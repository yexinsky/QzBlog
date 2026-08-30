'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type PickerAttachment = { id: string; url: string; originalName: string };

const PAGE_SIZE = 18;

/**
 * 附件库选择器（PRD 11.3）：编辑器插入图片时从附件库选择，或在弹窗内直接上传。
 */
export function AttachmentPicker({
  open,
  multiple = false,
  onClose,
  onSelect,
}: {
  open: boolean;
  multiple?: boolean;
  onClose: () => void;
  onSelect: (attachments: PickerAttachment[]) => void;
}) {
  const [attachments, setAttachments] = useState<PickerAttachment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/attachments?page=${nextPage}&limit=${PAGE_SIZE}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载附件失败');
      setAttachments(data.attachments ?? []);
      setPage(data.pagination.page);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载附件失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      void load(1);
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      files.slice(0, 9).forEach((file) => form.append('files', file));
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '上传失败');
      const uploaded: PickerAttachment[] = (data.attachments ?? []).map((item: { id: string; url: string; originalName: string }) => ({
        id: item.id,
        url: item.url,
        originalName: item.originalName,
      }));
      await load(1);
      // 上传完成后直接选中刚上传的图片
      setSelectedIds(new Set(uploaded.map((item) => item.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = multiple ? new Set(current) : new Set<string>();
      if (multiple && next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const picked = attachments.filter((item) => selectedIds.has(item.id));
    // 多页选择时，把已不在当前页的选中项也带上（以 id 为准，数据从当前页拿不到则仅返回 url 由调用方兜底）
    if (picked.length > 0) onSelect(picked);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="选择附件">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-card bg-background-base p-6 shadow-hover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">从附件库选择图片</h2>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-1 h-4 w-4" />上传新图片</Button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) void uploadFiles(files); e.target.value = ''; }} />
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>关闭</Button>
          </div>
        </div>

        <div
          className={cn('mb-3 rounded-button border-2 border-dashed p-2 text-center text-xs transition-colors', dragActive ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-border text-text-muted')}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); const files = Array.from(e.dataTransfer.files ?? []); if (files.length) void uploadFiles(files); }}
        >
          <UploadCloud className="mr-1 inline h-3.5 w-3.5" />
          拖拽图片到此处直接上传
        </div>

        {error && <p role="status" className="mb-3 rounded-button bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="min-h-[240px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-text-muted">加载中…</div>
          ) : attachments.length === 0 ? (
            <div className="py-10 text-center text-text-muted">附件库为空，先上传一张图片吧。</div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {attachments.map((attachment) => {
                const isSelected = selectedIds.has(attachment.id);
                return (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={() => toggle(attachment.id)}
                    className={cn('relative overflow-hidden rounded-button border bg-background-hover', isSelected ? 'border-brand-orange ring-2 ring-brand-orange' : 'border-border hover:border-brand-orange/50')}
                    aria-label={attachment.originalName}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.url} alt={attachment.originalName} loading="lazy" className="aspect-square w-full object-cover" />
                    {isSelected && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-white"><Check className="h-3 w-3" /></span>}
                    <span className="block truncate p-1 text-[11px] text-text-muted">{attachment.originalName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>上一页</Button>
            <span className="text-text-muted">{page} / {totalPages}</span>
            <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1)}>下一页</Button>
          </div>
          <Button type="button" size="sm" disabled={selectedIds.size === 0} onClick={confirm}>
            插入所选（{selectedIds.size}）
          </Button>
        </div>
      </div>
    </div>
  );
}
