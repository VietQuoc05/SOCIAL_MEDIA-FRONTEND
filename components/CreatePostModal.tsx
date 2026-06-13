"use client";

import { useState, useRef, useEffect } from "react";
import { postsApi } from "@/services/api";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ open, onClose, onSuccess }: CreatePostModalProps) {
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remaining = 10 - files.length;
    if (remaining <= 0) return;
    setFiles(prev => [...prev, ...selected.slice(0, remaining)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) return;
    setSubmitting(true);
    try {
      await postsApi.createPost(caption.trim(), files);
      setCaption("");
      setFiles([]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] sm:w-96 sm:left-auto sm:translate-x-0 sm:right-0 bg-surface-elevated border border-border-gray rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-gray">
        <h2 className="text-text-base text-base font-bold uppercase tracking-wider">Create Post</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-base text-xl leading-none">&times;</button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
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

        {files.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square bg-surface-elevated border border-border-gray rounded-[6px] overflow-hidden group">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
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

      <div className="px-4 py-3 border-t border-border-gray flex justify-end gap-2">
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
  );
}
