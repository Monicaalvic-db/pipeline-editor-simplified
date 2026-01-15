"use client";

/**
 * useFileOperations Hook
 * 
 * Handles file and folder CRUD operations for the file browser.
 */

import { useState, useCallback } from "react";
import type { TreeItem, FolderItem, EditorTab } from "../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface UseFileOperationsOptions {
  /** Initial file tree */
  initialFileTree: TreeItem[];
  /** Callback when file is opened */
  onFileOpen?: (tab: EditorTab) => void;
  /** Generated contents ref for storing file content */
  generatedContentsRef?: React.MutableRefObject<Record<string, { content: string; language: string }>>;
}

interface UseFileOperationsReturn {
  /** Current file tree */
  fileTree: TreeItem[];
  /** Set of expanded folder IDs */
  expandedFolders: Set<string>;
  /** Currently selected file ID */
  selectedFileId: string | null;
  /** Set of newly created file IDs (for highlight animation) */
  newlyCreatedFiles: Set<string>;
  /** Toggle folder expansion */
  toggleFolder: (folderId: string) => void;
  /** Set expanded folders */
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Select a file */
  selectFile: (fileId: string) => void;
  /** Create a new file */
  createFile: (name: string, parentFolderId?: string, content?: string) => string;
  /** Create a new folder */
  createFolder: (name: string, parentFolderId?: string) => string;
  /** Rename a file or folder */
  renameItem: (itemId: string, newName: string) => void;
  /** Delete a file or folder */
  deleteItem: (itemId: string) => void;
  /** Find item by ID */
  findItem: (itemId: string) => TreeItem | null;
  /** Update file tree */
  setFileTree: React.Dispatch<React.SetStateAction<TreeItem[]>>;
  /** Set newly created files */
  setNewlyCreatedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useFileOperations({
  initialFileTree,
  onFileOpen,
  generatedContentsRef,
}: UseFileOperationsOptions): UseFileOperationsReturn {
  const [fileTree, setFileTree] = useState<TreeItem[]>(initialFileTree);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["1", "2"]));
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [newlyCreatedFiles, setNewlyCreatedFiles] = useState<Set<string>>(new Set());

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Select a file
  const selectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  // Find item by ID (recursive)
  const findItem = useCallback((itemId: string): TreeItem | null => {
    const search = (items: TreeItem[]): TreeItem | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        if (item.type === "folder") {
          const found = search((item as FolderItem).children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(fileTree);
  }, [fileTree]);

  // Create a new file
  const createFile = useCallback((
    name: string,
    parentFolderId?: string,
    content?: string
  ): string => {
    const newId = `file-${Date.now()}`;
    const language = name.endsWith('.py') ? 'python' : 
                     name.endsWith('.sql') ? 'sql' :
                     name.endsWith('.md') ? 'markdown' : 'plaintext';

    // Store content in generated contents ref
    if (generatedContentsRef && content) {
      generatedContentsRef.current[newId] = { content, language };
    }

    setFileTree(prev => {
      if (!parentFolderId) {
        // Add to root
        return [...prev, { id: newId, name, type: "file" as const }];
      }

      // Add to folder
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.id === parentFolderId && item.type === "folder") {
            return {
              ...item,
              children: [...(item as FolderItem).children, { id: newId, name, type: "file" as const }],
            };
          }
          if (item.type === "folder") {
            return { ...item, children: updateTree((item as FolderItem).children) };
          }
          return item;
        });
      };
      return updateTree(prev);
    });

    // Expand parent folder
    if (parentFolderId) {
      setExpandedFolders(prev => new Set([...prev, parentFolderId]));
    }

    // Highlight new file
    setNewlyCreatedFiles(new Set([newId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);

    // Select new file
    setSelectedFileId(newId);

    // Open file in editor
    if (onFileOpen) {
      onFileOpen({
        id: newId,
        name,
        content: content || "",
        language,
        isDirty: !!content,
        savedContent: "",
      });
    }

    return newId;
  }, [generatedContentsRef, onFileOpen]);

  // Create a new folder
  const createFolder = useCallback((name: string, parentFolderId?: string): string => {
    const newId = `folder-${Date.now()}`;

    setFileTree(prev => {
      const newFolder: FolderItem = {
        id: newId,
        name,
        type: "folder",
        children: [],
      };

      if (!parentFolderId) {
        return [...prev, newFolder];
      }

      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.id === parentFolderId && item.type === "folder") {
            return {
              ...item,
              children: [...(item as FolderItem).children, newFolder],
            };
          }
          if (item.type === "folder") {
            return { ...item, children: updateTree((item as FolderItem).children) };
          }
          return item;
        });
      };
      return updateTree(prev);
    });

    // Expand parent and new folder
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (parentFolderId) newSet.add(parentFolderId);
      newSet.add(newId);
      return newSet;
    });

    // Highlight new folder
    setNewlyCreatedFiles(new Set([newId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);

    return newId;
  }, []);

  // Rename a file or folder
  const renameItem = useCallback((itemId: string, newName: string) => {
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.id === itemId) {
            return { ...item, name: newName };
          }
          if (item.type === "folder") {
            return { ...item, children: updateTree((item as FolderItem).children) };
          }
          return item;
        });
      };
      return updateTree(prev);
    });
  }, []);

  // Delete a file or folder
  const deleteItem = useCallback((itemId: string) => {
    setFileTree(prev => {
      const filterTree = (items: TreeItem[]): TreeItem[] => {
        return items
          .filter(item => item.id !== itemId)
          .map(item => {
            if (item.type === "folder") {
              return { ...item, children: filterTree((item as FolderItem).children) };
            }
            return item;
          });
      };
      return filterTree(prev);
    });

    // Clear selection if deleted item was selected
    if (selectedFileId === itemId) {
      setSelectedFileId(null);
    }
  }, [selectedFileId]);

  return {
    fileTree,
    expandedFolders,
    selectedFileId,
    newlyCreatedFiles,
    toggleFolder,
    setExpandedFolders,
    selectFile,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
    findItem,
    setFileTree,
    setNewlyCreatedFiles,
  };
}

export default useFileOperations;

