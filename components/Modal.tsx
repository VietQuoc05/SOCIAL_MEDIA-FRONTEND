"use client";

import React, { useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** If true, positions below header (default). If false, uses custom positioning */
  centered?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, className = "", centered = true }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 ${centered ? "flex justify-center" : ""}`}
      onClick={onClose}
    >
      {/* Click outside to close */}
      <div
        className={
          centered
            ? `mt-[72px] bg-surface-elevated border border-border-gray rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4 overflow-hidden ${className}`
            : className
        }
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-gray">
            <h2 className="text-lg font-bold text-text-base normal-case">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-base hover:bg-surface transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}