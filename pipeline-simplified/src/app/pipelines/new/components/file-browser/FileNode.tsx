"use client";

/**
 * FileNode Component
 * 
 * Renders a single file or folder node in the file tree.
 * Handles click, context menu, and visual states.
 */

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  MoreVertical,
} from "lucide-react";
import type { TreeItem, FolderItem } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface FileNodeProps {
  /** The file or folder item to render */
  item: TreeItem;
  /** Nesting depth for indentation */
  depth: number;
  /** Whether folder is expanded */
  isExpanded: boolean;
  /** Whether this item is selected */
  isSelected: boolean;
  /** Whether this item was just created */
  isNewlyCreated: boolean;
  /** Callback when folder is toggled */
  onToggleFolder: (id: string) => void;
  /** Callback when file is opened */
  onOpenFile: (id: string, name: string) => void;
  /** Callback for context menu */
  onContextMenu: (e: React.MouseEvent, itemId: string, type: "file" | "folder") => void;
  /** Render function for children (for recursion) */
  renderChildren?: (children: TreeItem[], depth: number) => React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function FileNode({
  item,
  depth,
  isExpanded,
  isSelected,
  isNewlyCreated,
  onToggleFolder,
  onOpenFile,
  onContextMenu,
  renderChildren,
}: FileNodeProps) {
  const paddingLeft = depth * 12 + 8;

  if (item.type === "folder") {
    const folderItem = item as FolderItem;
    return (
      <div className={isNewlyCreated ? "animate-fade-in-highlight" : ""}>
        <div
          onClick={() => onToggleFolder(item.id)}
          onContextMenu={(e) => onContextMenu(e, item.id, "folder")}
          className={`w-full flex items-center gap-1 py-1 px-2 hover:bg-accent text-sm group cursor-pointer ${
            isNewlyCreated ? "bg-primary/10" : ""
          }`}
          style={{ paddingLeft }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
          <span className="truncate flex-1 text-left">{item.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, item.id, "folder");
            }}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        {isExpanded && folderItem.children && renderChildren && 
          renderChildren(folderItem.children, depth + 1)
        }
      </div>
    );
  }

  // File node
  return (
    <div
      onClick={() => onOpenFile(item.id, item.name)}
      onContextMenu={(e) => onContextMenu(e, item.id, "file")}
      className={`w-full flex items-center gap-1 py-1 px-2 hover:bg-accent text-sm group cursor-pointer ${
        isSelected ? "bg-accent" : ""
      } ${isNewlyCreated ? "animate-fade-in-highlight bg-primary/10" : ""}`}
      style={{ paddingLeft: paddingLeft + 16 }}
    >
      <FileCode className="h-4 w-4" style={{ color: 'var(--color-grey-400)' }} />
      <span className="truncate flex-1 text-left">{item.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e, item.id, "file");
        }}
        className={`h-5 w-5 flex items-center justify-center rounded hover:bg-muted ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <MoreVertical className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export default FileNode;

