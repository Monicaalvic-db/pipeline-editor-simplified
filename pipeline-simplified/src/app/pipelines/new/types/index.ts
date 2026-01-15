/**
 * Pipeline Editor Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used across
 * the Pipeline Editor components.
 */

// ═══════════════════════════════════════════════════════════════════
// FILE SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════

/** Represents a file in the file tree */
export type FileItem = {
  id: string;
  name: string;
  type: "file";
  content?: string;
  language?: string;
};

/** Represents a folder in the file tree */
export type FolderItem = {
  id: string;
  name: string;
  type: "folder";
  expanded?: boolean;
  children: TreeItem[];
};

/** Union type for file tree items */
export type TreeItem = FileItem | FolderItem;

// ═══════════════════════════════════════════════════════════════════
// EDITOR TYPES
// ═══════════════════════════════════════════════════════════════════

/** Represents an open tab in the code editor */
export type EditorTab = {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  savedContent: string;
};

// ═══════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION TYPES
// ═══════════════════════════════════════════════════════════════════

/** Pipeline execution state machine */
export type PipelineState =
  | { status: 'idle' }
  | { status: 'running'; type: 'run' | 'dryRun'; startTime: Date; progress: number; currentStage: string }
  | { status: 'stopping' }
  | { status: 'stopped'; duration: number }
  | { status: 'completed'; duration: number; type: 'run' | 'dryRun' }
  | { status: 'error'; error: string };

/** Pipeline execution stage */
export type PipelineStage = {
  status: string;
  duration: number;
  targetProgress: number;
};

/** Run history entry for tracking pipeline runs */
export type RunHistoryEntry = {
  id: string;
  status: 'success' | 'failed';
  duration: number;
  timestamp: Date;
};

// ═══════════════════════════════════════════════════════════════════
// TABLE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Table result displayed in the bottom panel after pipeline run */
export type TableResult = {
  id: string;
  status: 'success' | 'warning' | 'failed';
  name: string;
  type: 'Streaming table' | 'Materialized view' | 'Persisted view' | 'Sink';
  duration: string;
  written: string;
  updated: string;
  expectations: string;
  dropped: number;
  warnings: number;
  failed: number;
  fileId?: string;
};

/** Column schema for table data preview */
export type TableColumnSchema = {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'timestamp' | 'array' | 'struct';
  nullable: boolean;
  description?: string;
};

/** Table preview data structure */
export type TablePreviewData = {
  columns: TableColumnSchema[];
  rows: Record<string, unknown>[];
  totalRows: number;
  queryTime: number;
  lastRefreshed: Date;
};

/** Parsed table from code analysis */
export type ParsedTable = {
  name: string;
  fileId: string;
  dependencies: string[];
};

// ═══════════════════════════════════════════════════════════════════
// PIPELINE GRAPH TYPES
// ═══════════════════════════════════════════════════════════════════

/** Node in the pipeline graph visualization */
export type GraphNode = {
  id: string;
  type: 'materialized' | 'streaming' | 'persisted' | 'sink' | 'view';
  name: string;
  status: 'success' | 'warning' | 'failed' | 'running' | 'placeholder';
  duration: string;
  outputRecords: string;
  droppedRecords?: number;
  position: { x: number; y: number };
  fileId?: string;
  isPlaceholder?: boolean;
  sourceNodeId?: string;
};

/** Edge connecting nodes in the pipeline graph */
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  recordCount?: string;
  isDashed?: boolean;
};

/** Complete pipeline graph data structure */
export type PipelineGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

// ═══════════════════════════════════════════════════════════════════
// DOCKING SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════

/** Available dock zones for panels */
export type DockZone = 'center' | 'right' | 'bottom';

/** Dockable panel configuration */
export type DockablePanel = {
  id: string;
  title: string;
  icon: string;
  closeable: boolean;
};

/** Currently dragged tab information */
export type DraggedTab = {
  panelId: string;
  sourceZone: DockZone;
  title: string;
} | null;

// ═══════════════════════════════════════════════════════════════════
// UI STATE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Context menu state for file browser */
export type ContextMenuState = {
  x: number;
  y: number;
  itemId: string;
  type: "file" | "folder";
} | null;

/** Right panel options */
export type RightPanelType = "comments" | "history" | "assistant" | "graph" | "tables" | "performance" | "terminal" | null;

/** Bottom panel tab options */
export type BottomPanelTab = "tables" | "performance" | "graph";

/** Table sort configuration */
export type TableSortConfig = {
  column: string;
  direction: 'asc' | 'desc';
};

/** Table status filter options */
export type TableStatusFilter = 'all' | 'success' | 'warning' | 'failed';

/** Table type filter options */
export type TableTypeFilter = 'all' | 'Streaming table' | 'Materialized view' | 'Persisted view' | 'Sink';

/** Table preview tab options */
export type TablePreviewTabType = 'data' | 'columns' | 'metrics' | 'performance';

// ═══════════════════════════════════════════════════════════════════
// ASSISTANT/CONVERSATION TYPES
// ═══════════════════════════════════════════════════════════════════

/** Message in the assistant conversation */
export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  codeBlocks?: Array<{
    language: string;
    code: string;
    fileName?: string;
  }>;
};

// ═══════════════════════════════════════════════════════════════════
// CATALOG TYPES
// ═══════════════════════════════════════════════════════════════════

/** Catalog item in the catalog browser */
export type CatalogItem = {
  id: string;
  name: string;
  type: 'catalog' | 'schema' | 'table';
  dataType?: string;
  children?: CatalogItem[];
};

// ═══════════════════════════════════════════════════════════════════
// PIPELINE CONFIG TYPES
// ═══════════════════════════════════════════════════════════════════

/** Pipeline configuration for catalog/schema */
export type PipelineConfig = {
  catalog: string;
  schema: string;
  hasCustomConfig: boolean;
  hasRunBefore: boolean;
};

