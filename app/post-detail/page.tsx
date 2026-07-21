"use client";

import { Suspense } from "react";
import PostDetailContent from "./PostDetailContent";
import { PostDetailSkeleton } from "@/components/Skeleton";

export default function PostDetailPage() {
  return (
    <Suspense fallback={<PostDetailSkeleton />}>
      <PostDetailContent />
    </Suspense>
  );
}
