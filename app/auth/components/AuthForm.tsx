"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/api";
import { User } from "@/app/auth/types/user";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const isLogin = mode === "login";
  const title = isLogin ? "Login" : "Create your account";
  const subtitle = isLogin
    ? "Welcome back. Please login to continue."
    : "Join the community and start sharing.";
  const submitLabel = isLogin ? "Login" : "Register";
  const switchLabel = isLogin ? "Don't have an account? " : "Already have an account? ";
  const switchHref = isLogin ? "/register" : "/login";
  const switchLinkText = isLogin ? "Register" : "Login";

  useEffect(() => {
    if (isLogin && success) {
      const timer = setTimeout(() => {
        window.location.href = "/home";
      }, 300);
      return () => clearTimeout(timer);
    }
    if (!isLogin && success) {
      window.location.href = "/login";
    }
  }, [isLogin, success, router]);

  const validate = () => {
    if (!email) return "Email is required.";
    if (!password) return "Password is required.";
    if (!isLogin && !username) return "Username is required.";
    if (!isLogin && !displayName) return "Display name is required.";
    if (!isLogin && password.length < 6) return "Password must be at least 6 characters.";
    if (!isLogin && displayName.length < 6) return "Display name must be at least 6 characters.";
    if (!isLogin && displayName.length > 30) return "Display name must be at most 30 characters.";
    const displayNameRegex = /^[a-z0-9.]+$/;
    if (!isLogin && !displayNameRegex.test(displayName)) {
      return "Display name must contain only lowercase letters, numbers, and dots.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const result = await authApi.login(email, password);
        localStorage.setItem("token", result.access_token);
        setSuccess("Login successful. Redirecting...");
      } else {
        const normalizedDisplayName = displayName.toLowerCase();
        const result = await authApi.register(email, username, normalizedDisplayName, password);
        setSuccess("Registration successful. Redirecting to login...");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      if (message.includes("Email or displayName already exists")) {
        setError("Email or displayName already exists.");
      } else if (message.includes("DisplayName must be at least 6 characters")) {
        setError("Display name must be at least 6 characters.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-text-base text-xl font-bold tracking-tight normal-case">
          {title}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {subtitle}
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

        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
               placeholder="Nguyen Van A"
            />
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
            placeholder="••••••••"
          />
        </div>

        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider normal-case">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, "");
                setDisplayName(val);
              }}
              className="h-11 rounded-[4px] bg-surface-elevated border border-border-gray text-text-base text-sm px-3 outline-none transition-all placeholder:text-text-secondary/60 hover:border-light-border focus:border-text-base"
               placeholder="vana.123"
            />
            <div className="flex justify-between">
              <span className="text-[11px] text-text-secondary/70 normal-case">
                Only lowercase letters, numbers, and dots.
              </span>
              <span className={`text-[11px] normal-case ${displayName.length >= 6 ? 'text-sp-green' : 'text-text-secondary/70'}`}>
                {displayName.length}/30
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 rounded-full bg-sp-green text-black text-sm font-bold uppercase tracking-wider normal-case transition-all hover:enabled:scale-[1.02] hover:enabled:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:enabled:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Please wait..." : submitLabel}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-secondary normal-case">
          {switchLabel}
          <a
            href={switchHref}
            className="ml-1 text-text-base underline underline-offset-4 hover:text-sp-green transition-colors"
          >
            {switchLinkText}
          </a>
        </p>
      </div>
    </div>
  );
}
