"use client";

/**
 * NewFolderModal Component
 * 
 * Modal dialog for creating a new folder.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface NewFolderModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial folder name */
  initialName?: string;
  /** Whether to include as source (optional checkbox) */
  showIncludeAsSource?: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when folder is created */
  onCreate: (name: string, includeAsSource: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function NewFolderModal({
  isOpen,
  initialName = "",
  showIncludeAsSource = false,
  onClose,
  onCreate,
}: NewFolderModalProps) {
  const [folderName, setFolderName] = useState(initialName);
  const [includeAsSource, setIncludeAsSource] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setFolderName(initialName);
      setIncludeAsSource(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim(), includeAsSource);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-background rounded-lg shadow-lg z-50"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">New folder</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Folder name
              </label>
              <Input
                ref={inputRef}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="h-10"
              />
            </div>

            {showIncludeAsSource && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAsSource}
                  onChange={(e) => setIncludeAsSource(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Include as source in pipeline
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

export default NewFolderModal;

