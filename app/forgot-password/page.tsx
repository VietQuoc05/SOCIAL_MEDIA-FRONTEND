"use client";

import React, { useState } from "react";
import { authApi } from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await authApi.forgotPassword(email);
      setSuccess(result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-text-base text-xl font-bold tracking-tight normal-case">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="text-xs text-negative-red bg-negative-red/10 border border-negative-red/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-sp-green bg-sp-green/10 border border-sp-green/30 rounded-sm px-3 py-2">
              {success}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 rounded-full bg-sp-green text-black text-sm font-bold uppercase tracking-wider normal-case transition-all hover:enabled:scale-[1.02] hover:enabled:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary normal-case">
            Remember your password?{" "}
            <a
              href="/login"
              className="ml-1 text-text-base underline underline-offset-4 hover:text-sp-green transition-colors"
            >
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}