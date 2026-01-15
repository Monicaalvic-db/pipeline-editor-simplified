"use client";

/**
 * CodeEditor Component
 * 
 * Monaco-based code editor with tabs and empty state.
 * Handles code editing, tab management, and AI prompt integration.
 */

import dynamic from "next/dynamic";
import { EditorTabs } from "./EditorTabs";
import { EmptyState } from "./EmptyState";
import type { EditorTab } from "../../types";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading editor...</div>
      </div>
    ),
  }
);

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface CodeEditorProps {
  /** Array of open tabs */
  tabs: EditorTab[];
  /** ID of the active tab */
  activeTabId: string | null;
  /** The active tab content */
  activeTab: EditorTab | undefined;
  /** Whether to show empty state */
  showEmptyState: boolean;
  /** ID of the tab being renamed */
  editingTabId: string | null;
  /** Current editing name value */
  editingTabName: string;
  /** Editor theme */
  theme: "vs-dark" | "light";
  /** Callback when tab is clicked */
  onTabClick: (tabId: string) => void;
  /** Callback when tab is closed */
  onTabClose: (tabId: string) => void;
  /** Callback to start editing tab name */
  onStartEditing: (tabId: string, name: string, e: React.MouseEvent) => void;
  /** Callback when editing name changes */
  onEditingNameChange: (name: string) => void;
  /** Callback when editing is complete */
  onEditingComplete: () => void;
  /** Callback when editor content changes */
  onContentChange: (value: string | undefined) => void;
  /** Callback to create new transformation */
  onNewTransformation: () => void;
  /** Callback to create new file */
  onNewFile: () => void;
  /** Callback to generate sample code */
  onGenerateSample: () => void;
  /** Callback to show AI prompt */
  onShowAIPrompt: () => void;
  /** Whether sample generation is loading */
  isGeneratingSample: boolean;
  /** Monaco editor mount callback */
  onEditorMount?: (editor: unknown, monaco: unknown) => void;
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

export function EditorSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-3">
      <SkeletonBar width="70%" />
      <SkeletonBar width="85%" />
      <SkeletonBar width="60%" />
      <SkeletonBar width="90%" />
      <SkeletonBar width="45%" />
      <SkeletonBar width="75%" />
      <div className="h-4" />
      <SkeletonBar width="80%" />
      <SkeletonBar width="55%" />
      <SkeletonBar width="95%" />
      <SkeletonBar width="65%" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function CodeEditor({
  tabs,
  activeTabId,
  activeTab,
  showEmptyState,
  editingTabId,
  editingTabName,
  theme,
  onTabClick,
  onTabClose,
  onStartEditing,
  onEditingNameChange,
  onEditingComplete,
  onContentChange,
  onNewTransformation,
  onNewFile,
  onGenerateSample,
  onShowAIPrompt,
  isGeneratingSample,
  onEditorMount,
}: CodeEditorProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      {tabs.length > 0 && (
        <EditorTabs
          tabs={tabs}
          activeTabId={activeTabId}
          editingTabId={editingTabId}
          editingTabName={editingTabName}
          onTabClick={onTabClick}
          onTabClose={onTabClose}
          onStartEditing={onStartEditing}
          onEditingNameChange={onEditingNameChange}
          onEditingComplete={onEditingComplete}
          onNewTransformation={onNewTransformation}
          onNewFile={onNewFile}
        />
      )}

      {/* Editor content */}
      {showEmptyState && !activeTab?.content ? (
        <EmptyState
          onGenerateSample={onGenerateSample}
          onShowAIPrompt={onShowAIPrompt}
          onAddManualCode={onNewFile}
          isGenerating={isGeneratingSample}
        />
      ) : activeTab ? (
        <MonacoEditor
          height="100%"
          language={activeTab.language}
          theme={theme}
          value={activeTab.content}
          onChange={onContentChange}
          onMount={onEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            folding: true,
            bracketPairColorization: { enabled: true },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a file to edit
        </div>
      )}
    </div>
  );
}

export default CodeEditor;

