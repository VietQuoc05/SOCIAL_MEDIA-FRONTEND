"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, postsApi, usersApi } from "@/services/api";
import Header from "@/components/Header";

export default function CreatePostsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const data = (await usersApi.getMe()) as User;
        setUser(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

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
    const withPreview: { file: File; preview: string }[] = [];
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
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />

      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="bg-surface border border-border-gray rounded-[8px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border-gray flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-text-base text-base font-bold uppercase tracking-wider">Create Post</h2>
            </div>

            <div className="p-4 space-y-4">
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

            <div className="px-4 py-3 border-t border-border-gray flex justify-end gap-2">
              <button onClick={() => router.back()} className="px-4 py-2 text-sm text-text-secondary hover:text-text-base transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!caption.trim() && files.length === 0)}
                className="px-4 py-2 text-sm font-bold text-black bg-sp-green rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sp-green-border transition-colors"
              >
                {submitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
