"use client";

import Modal from "./Modal";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onRemoveAndLogout: () => void;
  onLogout: () => void;
}

export default function LogoutConfirmModal({
  open,
  onClose,
  onRemoveAndLogout,
  onLogout,
}: LogoutConfirmModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Logout">
      <div className="p-5 space-y-4">
        <p className="text-sm text-text-base normal-case">
          Remove this account from saved accounts?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onRemoveAndLogout}
            className="w-full h-9 text-sm font-bold text-white bg-negative-red rounded-[6px] hover:opacity-90 transition-opacity"
          >
            Remove and logout
          </button>
          <button
            onClick={onLogout}
            className="w-full h-9 text-sm font-bold text-text-base bg-surface-elevated border border-border-gray rounded-[6px] hover:bg-surface transition-colors"
          >
            Keep and logout
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-text-secondary hover:text-text-base transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}