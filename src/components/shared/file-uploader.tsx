"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FileText, Paperclip, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/lib/api/errors";
import { ACCEPT_ATTR, ALLOWED_SUMMARY, fileTypeLabel, formatBytes, isImageType, validateFile } from "@/lib/files";
import { cn } from "@/lib/utils";

export interface UploadHandlers { onProgress: (fraction: number) => void; signal: AbortSignal }

/**
 * Pick (or drop) one file, preview it, upload it with a progress bar, cancel mid-way. Validation here is a courtesy: the
 * backend re-checks type, size and the file's real signature. The upload itself is injected so this works for task
 * attachments, shared project files and the client portal alike.
 */
export function FileUploader({ onUpload, label = "Upload a file", disabled }: { onUpload: (file: File, h: UploadHandlers) => Promise<unknown>; label?: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null); // null = not uploading
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;

  // The preview URL is created in the event handler (not an effect) and released when replaced, cleared or unmounted.
  const previewUrl = useRef<string | null>(null);
  const setPreviewFor = (f: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = f && isImageType(f.type) ? URL.createObjectURL(f) : null;
    setPreview(previewUrl.current);
  };
  useEffect(() => () => { abort.current?.abort(); if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  function choose(f: File | undefined) {
    if (!f) return;
    const problem = validateFile(f);
    setError(problem);
    setFile(problem ? null : f);
    setPreviewFor(problem ? null : f);
  }
  function reset() { setFile(null); setPreviewFor(null); setError(null); setProgress(null); if (input.current) input.current.value = ""; }

  async function start() {
    if (!file) return;
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0); setError(null);
    try {
      await onUpload(file, { onProgress: setProgress, signal: controller.signal });
      toast.success(`${file.name} uploaded`);
      reset();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") { setProgress(null); return; } // cancelled on purpose: keep the file selected
      setProgress(null);
      setError(toErrorMessage(e));
    } finally { abort.current = null; }
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept={ACCEPT_ATTR} className="sr-only" id="file-uploader-input" tabIndex={-1} disabled={disabled || uploading} onChange={(e) => choose(e.target.files?.[0])} />
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) choose(e.dataTransfer.files?.[0]); }}
          className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-6 text-center", dragging && "border-primary bg-primary-soft", disabled && "opacity-60")}>
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => input.current?.click()}><Paperclip /> {label}</Button>
          <p className="text-xs text-muted-foreground">or drop it here. {ALLOWED_SUMMARY}.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            {preview ? <Image src={preview} alt={`Preview of ${file.name}`} width={48} height={48} unoptimized className="size-12 shrink-0 rounded-md border border-border object-cover" />
              : <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"><FileText className="size-5" aria-hidden /></span>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{fileTypeLabel(file.type)} · {formatBytes(file.size)}</p></div>
            {!uploading ? <Button type="button" variant="ghost" size="icon" aria-label="Remove selected file" onClick={reset}><X /></Button> : null}
          </div>
          {uploading ? (
            <div className="space-y-1.5">
              <div role="progressbar" aria-label={`Uploading ${file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{progress >= 1 ? "Processing…" : `${Math.round(progress * 100)}%`}</span><button type="button" className="font-medium text-foreground hover:underline" onClick={() => abort.current?.abort()}>Cancel</button></div>
            </div>
          ) : <div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={reset}>Cancel</Button><Button type="button" size="sm" onClick={start}>Upload</Button></div>}
        </div>
      )}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
