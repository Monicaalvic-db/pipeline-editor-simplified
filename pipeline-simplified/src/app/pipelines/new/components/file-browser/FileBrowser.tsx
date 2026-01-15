"use client";

/**
 * FileBrowser Component
 * 
 * Main file browser panel for the left sidebar.
 * Contains file tree, add buttons, and context menu.
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ChevronDown,
  FileText,
  FolderPlus,
  Layers,
} from "lucide-react";
import { FileTree } from "./FileTree";
import { ContextMenu } from "./ContextMenu";
import type { TreeItem, ContextMenuState } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface FileBrowserProps {
  /** File tree data */
  fileTree: TreeItem[];
  /** Set of expanded folder IDs */
  expandedFolders: Set<string>;
  /** Currently selected file ID */
  selectedFileId: string | null;
  /** Set of newly created file/folder IDs */
  newlyCreatedFiles: Set<string>;
  /** Context menu state */
  contextMenu: ContextMenuState;
  /** Callback when folder is toggled */
  onToggleFolder: (id: string) => void;
  /** Callback when file is opened */
  onOpenFile: (id: string, name: string) => void;
  /** Callback for context menu */
  onContextMenu: (e: React.MouseEvent, itemId: string, type: "file" | "folder") => void;
  /** Callback to close context menu */
  onCloseContextMenu: () => void;
  /** Callback to rename item */
  onRenameItem: (itemId: string) => void;
  /** Callback to delete item */
  onDeleteItem: (itemId: string, type: "file" | "folder") => void;
  /** Callback to create new transformation */
  onNewTransformation: () => void;
  /** Callback to create new file */
  onNewFile: () => void;
  /** Callback to create new folder */
  onNewFolder: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON COMPONENT
// ═══════════════════════════════════════════════════════════════════

const SkeletonBar = ({ width }: { width: string }) => (
  <div
    className="h-4 rounded animate-pulse"
    style={{ width, backgroundColor: 'var(--color-grey-100)' }}
  />
);

export function FileTreeSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      <SkeletonBar width="100%" />
      <SkeletonBar width="90%" />
      <SkeletonBar width="75%" />
      <SkeletonBar width="85%" />
      <SkeletonBar width="60%" />
      <SkeletonBar width="95%" />
      <SkeletonBar width="70%" />
      <SkeletonBar width="80%" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function FileBrowser({
  fileTree,
  expandedFolders,
  selectedFileId,
  newlyCreatedFiles,
  contextMenu,
  onToggleFolder,
  onOpenFile,
  onContextMenu,
  onCloseContextMenu,
  onRenameItem,
  onDeleteItem,
  onNewTransformation,
  onNewFile,
  onNewFolder,
}: FileBrowserProps) {
  return (
    <>
      {/* Header with Add dropdown */}
      <div className="px-3 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Files</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onNewTransformation}>
                <Layers className="h-4 w-4 mr-2" />
                New transformation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewFile}>
                <FileText className="h-4 w-4 mr-2" />
                New file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* File Tree */}
      <FileTree
        items={fileTree}
        expandedFolders={expandedFolders}
        selectedFileId={selectedFileId}
        newlyCreatedFiles={newlyCreatedFiles}
        onToggleFolder={onToggleFolder}
        onOpenFile={onOpenFile}
        onContextMenu={onContextMenu}
      />

      {/* Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        onClose={onCloseContextMenu}
        onRename={onRenameItem}
        onDelete={onDeleteItem}
      />
    </>
  );
}

export default FileBrowser;

