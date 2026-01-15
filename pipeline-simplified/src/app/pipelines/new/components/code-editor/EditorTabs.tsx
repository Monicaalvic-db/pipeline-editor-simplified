"use client";

/**
 * EditorTabs Component
 * 
 * Tab bar for the code editor.
 * Displays open files with options to switch, rename, and close tabs.
 */

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, Layers, FileText } from "lucide-react";
import { EditorTab } from "./EditorTab";
import type { EditorTab as EditorTabType } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface EditorTabsProps {
  /** Array of open tabs */
  tabs: EditorTabType[];
  /** ID of the active tab */
  activeTabId: string | null;
  /** ID of the tab being edited (renamed) */
  editingTabId: string | null;
  /** Current editing name value */
  editingTabName: string;
  /** Callback when a tab is clicked */
  onTabClick: (tabId: string) => void;
  /** Callback when a tab is closed */
  onTabClose: (tabId: string) => void;
  /** Callback to start editing a tab name */
  onStartEditing: (tabId: string, name: string, e: React.MouseEvent) => void;
  /** Callback when editing name changes */
  onEditingNameChange: (name: string) => void;
  /** Callback when editing is complete */
  onEditingComplete: () => void;
  /** Callback to create new transformation */
  onNewTransformation: () => void;
  /** Callback to create new file */
  onNewFile: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function EditorTabs({
  tabs,
  activeTabId,
  editingTabId,
  editingTabName,
  onTabClick,
  onTabClose,
  onStartEditing,
  onEditingNameChange,
  onEditingComplete,
  onNewTransformation,
  onNewFile,
}: EditorTabsProps) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Set tab ref for scrolling
  const setTabRef = useCallback((tabId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      tabRefs.current.set(tabId, el);
    } else {
      tabRefs.current.delete(tabId);
    }
  }, []);

  return (
    <div className="flex items-center bg-muted/20 border-b overflow-hidden">
      {/* Scrollable tabs container */}
      <div
        ref={tabsContainerRef}
        className="flex-1 flex overflow-x-auto hide-scrollbar"
      >
        {tabs.map((tab) => (
          <EditorTab
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            isEditing={editingTabId === tab.id}
            editingName={editingTabName}
            onClick={() => onTabClick(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            onDoubleClick={(e) => onStartEditing(tab.id, tab.name, e)}
            onEditingNameChange={onEditingNameChange}
            onEditingComplete={onEditingComplete}
            tabRef={setTabRef(tab.id)}
          />
        ))}
      </div>

      {/* Add button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-none border-l"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onNewTransformation}>
            <Layers className="h-4 w-4 mr-2" />
            New transformation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewFile}>
            <FileText className="h-4 w-4 mr-2" />
            New file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default EditorTabs;

