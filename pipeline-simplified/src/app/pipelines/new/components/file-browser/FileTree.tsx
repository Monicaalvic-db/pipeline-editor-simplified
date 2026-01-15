"use client";

/**
 * FileTree Component
 * 
 * Renders a recursive file tree with folders and files.
 * Handles expansion, selection, and context menu events.
 */

import { useCallback } from "react";
import { FileNode } from "./FileNode";
import type { TreeItem } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface FileTreeProps {
  /** Array of tree items (files and folders) */
  items: TreeItem[];
  /** Set of expanded folder IDs */
  expandedFolders: Set<string>;
  /** Currently selected file ID */
  selectedFileId: string | null;
  /** Set of newly created file/folder IDs */
  newlyCreatedFiles: Set<string>;
  /** Callback when folder is toggled */
  onToggleFolder: (id: string) => void;
  /** Callback when file is opened */
  onOpenFile: (id: string, name: string) => void;
  /** Callback for context menu */
  onContextMenu: (e: React.MouseEvent, itemId: string, type: "file" | "folder") => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function FileTree({
  items,
  expandedFolders,
  selectedFileId,
  newlyCreatedFiles,
  onToggleFolder,
  onOpenFile,
  onContextMenu,
}: FileTreeProps) {
  // Recursive render function
  const renderItems = useCallback((treeItems: TreeItem[], depth = 0) => {
    return treeItems.map((item) => (
      <FileNode
        key={item.id}
        item={item}
        depth={depth}
        isExpanded={expandedFolders.has(item.id)}
        isSelected={selectedFileId === item.id}
        isNewlyCreated={newlyCreatedFiles.has(item.id)}
        onToggleFolder={onToggleFolder}
        onOpenFile={onOpenFile}
        onContextMenu={onContextMenu}
        renderChildren={renderItems}
      />
    ));
  }, [expandedFolders, selectedFileId, newlyCreatedFiles, onToggleFolder, onOpenFile, onContextMenu]);

  return (
    <div className="flex-1 overflow-auto py-1">
      {renderItems(items, 0)}
    </div>
  );
}

export default FileTree;

