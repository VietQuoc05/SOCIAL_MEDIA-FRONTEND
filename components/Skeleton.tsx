"use client";

function SkeletonBase({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-[4px] ${className || ""}`} />;
}

function PostCardSkeleton() {
  return (
    <div className="bg-surface rounded-[8px] overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 p-3">
        <SkeletonBase className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <SkeletonBase className="h-3 w-32" />
          <SkeletonBase className="h-2.5 w-20" />
        </div>
      </div>
      <SkeletonBase className="w-full aspect-square bg-surface-elevated" />
      <div className="p-3">
        <div className="flex items-center gap-4 mb-3">
          <SkeletonBase className="w-6 h-6 rounded-full" />
          <SkeletonBase className="w-6 h-6 rounded-full" />
        </div>
        <SkeletonBase className="h-3 w-3/4 mb-2" />
        <SkeletonBase className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="h-14 bg-surface border-b border-border-gray" />
      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="bg-surface rounded-[8px] overflow-hidden animate-pulse">
            <SkeletonBase className="w-full h-28 sm:h-40 bg-surface-elevated" />
            <div className="px-4 sm:px-6 pt-12 sm:pt-16 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                <SkeletonBase className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface bg-surface-elevated flex-shrink-0" />
                <div className="flex-1 pt-4 sm:pt-4">
                  <div className="flex flex-col gap-2 sm:hidden mb-4">
                    <SkeletonBase className="h-3 w-32" />
                    <SkeletonBase className="h-5 w-40" />
                    <div className="flex items-center gap-4">
                      <SkeletonBase className="h-4 w-12" />
                      <SkeletonBase className="h-4 w-12" />
                      <SkeletonBase className="h-4 w-12" />
                    </div>
                    <SkeletonBase className="h-3 w-48" />
                  </div>
                  <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <SkeletonBase className="h-4 w-32" />
                      <SkeletonBase className="h-5 w-40" />
                    </div>
                    <div className="flex items-center gap-4">
                      <SkeletonBase className="h-4 w-12" />
                      <SkeletonBase className="h-4 w-12" />
                      <SkeletonBase className="h-4 w-12" />
                    </div>
                  </div>
                  <div className="hidden sm:block mt-3">
                    <SkeletonBase className="h-3 w-64" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 sm:px-6 pb-6">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBase key={i} className="aspect-square bg-surface-elevated" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="h-14 bg-surface border-b border-border-gray" />
      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="bg-surface rounded-[8px] overflow-hidden animate-pulse">
            <SkeletonBase className="w-full max-h-96 bg-surface-elevated" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <SkeletonBase className="w-10 h-10 rounded-full border-2 border-border-gray bg-surface-elevated flex-shrink-0" />
                <div className="flex flex-col gap-2">
                  <SkeletonBase className="h-4 w-36" />
                  <SkeletonBase className="h-3 w-24" />
                </div>
              </div>
              <SkeletonBase className="h-3 w-full mb-2" />
              <SkeletonBase className="h-3 w-2/3 mb-4" />
              <div className="flex items-center gap-2 pt-2 border-t border-border-gray">
                <SkeletonBase className="w-6 h-6 rounded-full" />
                <SkeletonBase className="w-6 h-6 rounded-full" />
                <SkeletonBase className="w-6 h-6 rounded-full" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-2 py-2">
                    <SkeletonBase className="w-8 h-8 rounded-full border border-border-gray bg-surface-elevated flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <SkeletonBase className="h-3 w-28" />
                      <SkeletonBase className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-surface border-t border-border-gray">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-xs text-text-secondary normal-case">
            © {new Date().getFullYear()} Social Media
          </span>
        </div>
      </footer>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="h-14 bg-surface border-b border-border-gray flex-shrink-0" />
      <div className="flex-1 flex overflow-hidden">
        <div className="block md:flex w-full md:w-80 lg:w-96 border-r border-border-gray bg-surface flex-col">
          <div className="py-5 px-3 border-b border-border-gray">
            <SkeletonBase className="h-5 w-32" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border-gray/50">
                <SkeletonBase className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <SkeletonBase className="h-3 w-28" />
                  <SkeletonBase className="h-2.5 w-40" />
                </div>
                <SkeletonBase className="w-5 h-5 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 flex-col">
          <div className="flex items-center gap-3 p-3 border-b border-border-gray bg-surface flex-shrink-0">
            <SkeletonBase className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <SkeletonBase className="h-4 w-36" />
              <SkeletonBase className="h-3 w-24" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <SkeletonBase className="w-16 h-16 rounded-full mx-auto mb-4 bg-surface-elevated" />
              <SkeletonBase className="h-4 w-40 mx-auto mb-2" />
              <SkeletonBase className="h-3 w-56 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="h-14 bg-surface border-b border-border-gray" />
      <main className="flex-1">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <SkeletonBase className="h-6 w-40" />
            <SkeletonBase className="h-4 w-28" />
          </div>
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBase key={i} className="h-9 w-16 rounded-full" />
            ))}
          </div>
          <div className="bg-surface rounded-[8px] overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 border-b border-border-gray/50 last:border-b-0">
                <SkeletonBase className="w-10 h-10 rounded-full border border-border-gray bg-surface-elevated flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <SkeletonBase className="h-3 w-full" />
                  <SkeletonBase className="h-2.5 w-24" />
                </div>
                <SkeletonBase className="w-2 h-2 rounded-full flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="bg-surface border-t border-border-gray">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-xs text-text-secondary normal-case">
            © {new Date().getFullYear()} Social Media
          </span>
        </div>
      </footer>
    </div>
  );
}

export { SkeletonBase, PostCardSkeleton, ProfileSkeleton, PostDetailSkeleton, ChatSkeleton, NotificationsSkeleton };
