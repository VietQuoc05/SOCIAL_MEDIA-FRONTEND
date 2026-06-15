"use client";

import { Suspense } from "react";
import PostDetailContent from "./PostDetailContent";

export default function PostDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    }>
      <PostDetailContent />
    </Suspense>
  );
}
