"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, getFileUrl, usersApi } from "@/services/api";
import Header from "@/components/Header";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const [userData, searchResults] = await Promise.all([
          usersApi.getMe() as Promise<User>,
          query ? usersApi.search(query) as Promise<User[]> : Promise.resolve([]),
        ]);
        setUser(userData);
        setResults(searchResults || []);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, query]);

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
          <h2 className="text-text-base text-lg font-bold normal-case mb-4">
            Search results for &#34;{query}&#34;
          </h2>
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => router.push(`/profile?userId=${u.id}`)}
                  className="flex items-center gap-3 w-full p-3 bg-surface rounded-[8px] hover:bg-surface-elevated transition-colors"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                    {u.avatar ? (
                      <img
                        src={getFileUrl(u.avatar) || ""}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-6 h-6 text-text-secondary m-auto mt-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-text-base font-bold normal-case">
                      {u.displayName || u.username}
                    </span>
                    <span className="text-sm text-text-secondary normal-case">
                      @{u.username}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm normal-case">No users found</p>
          )}
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

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary text-sm uppercase tracking-wider">Loading...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}