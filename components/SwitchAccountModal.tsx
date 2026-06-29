"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, usersApi, getFileUrl } from "@/services/api";

interface SavedAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  token: string;
}

interface SwitchAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "saved_accounts";
const MAX_SAVED = 3;

function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export default function SwitchAccountModal({ open, onClose }: SwitchAccountModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Use key to force re-initialize form when modal opens
  const [formKey, setFormKey] = useState(0);

  // Get saved accounts directly each render
  const savedAccounts: SavedAccount[] = open ? getSavedAccounts() : [];

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError("");
      setFormKey(prev => prev + 1);
    }
  }, [open]);

  const switchToAccount = (account: SavedAccount) => {
    localStorage.setItem("token", account.token);
    onClose();
    window.location.href = "/home";
  };

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await authApi.login(email.trim(), password);
      const token = res.access_token;

      // Save token temporarily to fetch user info
      localStorage.setItem("token", token);

      // Fetch user info
      const user = await usersApi.getMe();

      // Build saved account entry
      const newAccount: SavedAccount = {
        id: user.id,
        email: email.trim(),
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        token,
      };

      // Update saved accounts: remove existing by id, prepend new, limit to MAX_SAVED
      const existing = getSavedAccounts().filter(a => a.id !== user.id);
      const updated = [newAccount, ...existing].slice(0, MAX_SAVED);
      saveAccounts(updated);

      onClose();
      window.location.href = "/home";
    } catch (err: unknown) {
      // Remove token if login failed after we set it
      localStorage.removeItem("token");
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const removeAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.id !== id);
    saveAccounts(updated);
    setFormKey(prev => prev + 1); // force re-render
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-elevated border border-border-gray rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-gray">
          <h2 className="text-lg font-bold text-text-base normal-case">Switch account</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div key={formKey} className="p-5 space-y-4">
          {/* Previously saved accounts */}
          {savedAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary normal-case font-bold">Saved accounts</p>
              {savedAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => switchToAccount(account)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-border-gray bg-surface hover:bg-surface-elevated transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full border border-border-gray bg-surface-elevated overflow-hidden flex-shrink-0">
                    {account.avatar ? (
                      <img src={getFileUrl(account.avatar) || ""} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-text-secondary m-auto mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 text-left">
                    <span className="text-sm text-text-base font-bold normal-case truncate">
                      {account.displayName || account.username}
                    </span>
                    <span className="text-xs text-text-secondary normal-case truncate">
                      {account.email}
                    </span>
                  </div>
                  <button
                    onClick={(e) => removeAccount(account.id, e)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-text-secondary hover:text-negative-red hover:bg-negative-red/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {savedAccounts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border-gray" />
              <span className="text-xs text-text-secondary normal-case">or</span>
              <div className="flex-1 h-px bg-border-gray" />
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSwitch} className="space-y-3">
            <p className="text-xs text-text-secondary normal-case font-bold">Log in to another account</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full h-9 px-3 text-sm text-text-base normal-case bg-surface border border-border-gray rounded-[6px] focus:outline-none focus:border-sp-green placeholder:text-text-secondary"
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-9 px-3 text-sm text-text-base normal-case bg-surface border border-border-gray rounded-[6px] focus:outline-none focus:border-sp-green placeholder:text-text-secondary"
              autoComplete="current-password"
            />
            {error && (
              <p className="text-xs text-negative-red normal-case">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-sm font-bold text-white bg-sp-green rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Switch"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}