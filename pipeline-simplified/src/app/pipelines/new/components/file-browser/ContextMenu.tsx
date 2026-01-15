"use client";

/**
 * ContextMenu Component
 * 
 * Right-click context menu for file/folder operations.
 * Displays different options based on item type.
 */

import { useEffect, useRef } from "react";
import {
  Pencil,
  Trash2,
  Copy,
  Move,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import type { ContextMenuState } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ContextMenuProps {
  /** Context menu state (position and target item) */
  contextMenu: ContextMenuState;
  /** Callback to close the menu */
  onClose: () => void;
  /** Callback to rename item */
  onRename: (itemId: string) => void;
  /** Callback to delete item */
  onDelete: (itemId: string, type: "file" | "folder") => void;
  /** Callback to duplicate file */
  onDuplicate?: (itemId: string) => void;
  /** Callback to move item */
  onMove?: (itemId: string) => void;
  /** Callback to create new file in folder */
  onNewFile?: (folderId: string) => void;
  /** Callback to create new subfolder */
  onNewFolder?: (folderId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// MENU ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, onClick, destructive }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent ${
        destructive ? "text-red-600 hover:text-red-600" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ContextMenu({
  contextMenu,
  onClose,
  onRename,
  onDelete,
  onDuplicate,
  onMove,
  onNewFile,
  onNewFolder,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!contextMenu) return null;

  const { x, y, itemId, type } = contextMenu;

  return (
    <div
      ref={menuRef}
      className="fixed bg-popover border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {/* Folder-specific options */}
      {type === "folder" && (
        <>
          {onNewFile && (
            <MenuItem
              icon={<FilePlus className="h-4 w-4" />}
              label="New file"
              onClick={() => {
                onNewFile(itemId);
                onClose();
              }}
            />
          )}
          {onNewFolder && (
            <MenuItem
              icon={<FolderPlus className="h-4 w-4" />}
              label="New folder"
              onClick={() => {
                onNewFolder(itemId);
                onClose();
              }}
            />
          )}
          <div className="h-px bg-border my-1" />
        </>
      )}

      {/* Common options */}
      <MenuItem
        icon={<Pencil className="h-4 w-4" />}
        label="Rename"
        onClick={() => {
          onRename(itemId);
          onClose();
        }}
      />

      {type === "file" && onDuplicate && (
        <MenuItem
          icon={<Copy className="h-4 w-4" />}
          label="Duplicate"
          onClick={() => {
            onDuplicate(itemId);
            onClose();
          }}
        />
      )}

      {onMove && (
        <MenuItem
          icon={<Move className="h-4 w-4" />}
          label="Move"
          onClick={() => {
            onMove(itemId);
            onClose();
          }}
        />
      )}

      <div className="h-px bg-border my-1" />

      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label="Delete"
        onClick={() => {
          onDelete(itemId, type);
          onClose();
        }}
        destructive
      />
    </div>
  );
}

export default ContextMenu;

