"use client";

/**
 * EditorTab Component
 * 
 * Individual tab in the editor tab bar.
 * Supports inline renaming, dirty indicator, and close button.
 */

import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import type { EditorTab as EditorTabType } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface EditorTabProps {
  /** Tab data */
  tab: EditorTabType;
  /** Whether this tab is active */
  isActive: boolean;
  /** Whether this tab is being renamed */
  isEditing: boolean;
  /** Current editing name value */
  editingName: string;
  /** Callback when tab is clicked */
  onClick: () => void;
  /** Callback when tab is closed */
  onClose: (e: React.MouseEvent) => void;
  /** Callback when double-clicked to start editing */
  onDoubleClick: (e: React.MouseEvent) => void;
  /** Callback when editing name changes */
  onEditingNameChange: (name: string) => void;
  /** Callback when editing is complete */
  onEditingComplete: () => void;
  /** Ref callback for tab element */
  tabRef?: (el: HTMLDivElement | null) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function EditorTab({
  tab,
  isActive,
  isEditing,
  editingName,
  onClick,
  onClose,
  onDoubleClick,
  onEditingNameChange,
  onEditingComplete,
  tabRef,
}: EditorTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select just the filename without extension
      const dotIndex = editingName.lastIndexOf('.');
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current.select();
      }
    }
  }, [isEditing, editingName]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onEditingComplete();
    } else if (e.key === "Escape") {
      onEditingComplete();
    }
  };

  return (
    <div
      ref={tabRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r whitespace-nowrap flex-shrink-0 ${
        isActive
          ? "bg-background border-b-2 border-b-primary"
          : "bg-muted/30 hover:bg-muted/50"
      }`}
    >
      {/* Dirty indicator */}
      {tab.isDirty && (
        <span className="w-2 h-2 rounded-full bg-blue-500" />
      )}

      {/* Tab name or editing input */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onBlur={onEditingComplete}
          onKeyDown={handleKeyDown}
          className="h-5 py-0 px-1 text-sm w-32 min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate max-w-[120px]">{tab.name}</span>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className={`h-4 w-4 rounded flex items-center justify-center hover:bg-muted ${
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default EditorTab;

