"use client";

import { useState, useRef, useEffect } from "react";
import { postsApi } from "@/services/api";
import Modal from "./Modal";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewFile {
  file: File;
  preview: string;
}

export default function CreatePostModal({ open, onClose, onSuccess }: CreatePostModalProps) {
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setCaption("");
      setFiles([]);
      setError("");
    }
  }, [open]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remaining = 10 - files.length;
    if (remaining <= 0) return;
    const sliced = selected.slice(0, remaining);
    const withPreview: PreviewFile[] = [];
    for (const file of sliced) {
      try {
        const preview = await readFileAsDataURL(file);
        withPreview.push({ file, preview });
      } catch {
        // skip unreadable file
      }
    }
    setFiles(prev => [...prev, ...withPreview]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await postsApi.createPost(caption.trim(), files.map(f => f.file));
      setCaption("");
      setFiles([]);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-2xl">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="shrink-0 border-b border-border-gray px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-text-base text-base font-bold uppercase tracking-wider">Create Post</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-base text-xl leading-none">&times;</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full bg-surface border border-border-gray rounded-[6px] p-3 text-sm text-text-base placeholder:text-text-secondary focus:outline-none focus:border-sp-green resize-none"
          />

          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-base transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add images ({files.length}/10)
            </button>
          </div>

          {error && <p className="text-xs text-negative-red">{error}</p>}

          {files.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {files.map((f, i) => (
                <div key={`${f.file.name}-${i}`} className="relative aspect-square bg-surface-elevated border border-border-gray rounded-[6px] overflow-hidden group">
                  <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/70 rounded-full text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border-gray px-4 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-base transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!caption.trim() && files.length === 0)}
            className="px-4 py-2 text-sm font-bold text-black bg-sp-green rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sp-green-border transition-colors"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
