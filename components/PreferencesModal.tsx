"use client";

import { useEffect } from "react";
import { useTheme } from "./ThemeProvider";

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { theme, setTheme } = useTheme();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
          <h2 className="text-lg font-bold text-text-base normal-case">Preferences</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Selection */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-secondary normal-case">Display theme</p>

          <button
            onClick={() => setTheme("dark")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] border transition-colors ${
              theme === "dark"
                ? "border-sp-green bg-sp-green/10"
                : "border-border-gray bg-surface hover:bg-surface-elevated"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#121212] border border-border-gray flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-text-base normal-case">Dark</span>
              <span className="text-xs text-text-secondary normal-case">Dark background, green accent</span>
            </div>
            {theme === "dark" && (
              <svg className="w-5 h-5 text-sp-green ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setTheme("bright")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] border transition-colors ${
              theme === "bright"
                ? "border-sp-green bg-sp-green/10"
                : "border-border-gray bg-surface hover:bg-surface-elevated"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white border border-border-gray flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-text-base normal-case">Bright</span>
              <span className="text-xs text-text-secondary normal-case">Light background, blue accent</span>
            </div>
            {theme === "bright" && (
              <svg className="w-5 h-5 text-sp-green ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}