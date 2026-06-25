"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/services/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token found.");
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const result = await authApi.verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          setMessage(result.message);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          const msg = err instanceof Error ? err.message : "Verification failed";
          setMessage(msg);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-8">
        <h1 className="text-text-base text-xl font-bold tracking-tight normal-case">
          Email Verification
        </h1>
      </div>

      {status === "loading" && (
        <div className="text-sm text-text-secondary">
          Verifying your email...
        </div>
      )}

      {status === "success" && (
        <div>
          <div className="text-sm text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2 mb-4">
            {message}
          </div>
          <a
            href="/login"
            className="inline-block mt-4 h-12 px-8 rounded-full bg-sp-green text-black text-sm font-bold uppercase tracking-wider normal-case leading-[48px] transition-all hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            Go to Login
          </a>
        </div>
      )}

      {status === "error" && (
        <div>
          <div className="text-sm text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2 mb-4">
            {message}
          </div>
          <a
            href="/login"
            className="text-sm text-text-base underline underline-offset-4 hover:text-sp-green transition-colors"
          >
            Back to Login
          </a>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Suspense fallback={<div className="text-text-secondary">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}