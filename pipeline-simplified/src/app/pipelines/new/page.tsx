"use client";

/**
 * Pipeline Editor Page
 * 
 * Main orchestrator for the Pipeline Editor application.
 * This file coordinates all the modular components and manages the overall state.
 * 
 * Modular Structure:
 * - Types: ./types/index.ts
 * - Utils: ./utils/constants.ts, ./utils/helpers.ts
 * - Components: ./components/*
 * - Hooks: ./hooks/*
 * - Context: ./context/PipelineContext.tsx
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

// ═══════════════════════════════════════════════════════════════════
// MODULAR IMPORTS - Types, Utils, Components
// ═══════════════════════════════════════════════════════════════════

// Import types from centralized types module
import type {
  FileItem as FileItemType,
  FolderItem as FolderItemType,
  TreeItem as TreeItemType,
  EditorTab as EditorTabType,
  PipelineState as PipelineStateType,
  TableResult as TableResultType,
  RunHistoryEntry as RunHistoryEntryType,
  GraphNode as GraphNodeType,
  GraphEdge as GraphEdgeType,
  PipelineGraph as PipelineGraphType,
  DockZone as DockZoneType,
  DockablePanel as DockablePanelType,
  DraggedTab as DraggedTabType,
  TableColumnSchema as TableColumnSchemaType,
  TablePreviewData as TablePreviewDataType,
  ParsedTable as ParsedTableType,
  ConversationMessage as ConversationMessageType,
} from "./types";
import {
  Play,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  File,
  Folder,
  FolderOpen,
  MoreVertical,
  MoreHorizontal,
  GitBranch,
  Calendar,
  Share2,
  Zap,
  FileCode,
  Layers,
  MessageSquare,
  History,
  Sparkles,
  PanelBottomOpen,
  PanelBottomClose,
  Send,
  AtSign,
  Paperclip,
  Code,
  Database,
  Pencil,
  FolderPlus,
  Trash2,
  FileText,
  FlaskConical,
  Wrench,
  X,
  Search,
  Table,
  Eye,
  Box,
  Hash,
  Type,
  ToggleLeft,
  Binary,
  CalendarDays,
  HardDrive,
  RefreshCw,
  Filter,
  Terminal,
  Circle,
  FilePlus,
  Copy,
  Link,
  Download,
  Move,
  Settings2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Maximize2,
  Minimize2,
  BarChart3,
  GitFork,
  Square,
  Loader2,
  Gem,
  Activity,
  Check,
  Maximize,
  Minus,
  MinusCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react").then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Loading editor...</div>
    </div>
  ),
});
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════════════════
// NOTE: The types and utility functions below are also available from:
// - Types: import { ... } from "./types"
// - Utils: import { ... } from "./utils"
// - Components: import { ... } from "./components"
// 
// They are kept inline here for backwards compatibility.
// Future refactoring can replace them with imports from the modules.
// ═══════════════════════════════════════════════════════════════════

// File tree types
type FileItem = {
  id: string;
  name: string;
  type: "file";
  content?: string;
  language?: string;
};

type FolderItem = {
  id: string;
  name: string;
  type: "folder";
  expanded?: boolean;
  children: TreeItem[];
};

type TreeItem = FileItem | FolderItem;

// Tab type
type EditorTab = {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean; // unsaved changes indicator
  savedContent: string; // original content for comparison
};

// Pipeline execution state types
type PipelineState = 
  | { status: 'idle' }
  | { status: 'running'; type: 'run' | 'dryRun'; startTime: Date; progress: number; currentStage: string }
  | { status: 'stopping' }
  | { status: 'stopped'; duration: number }
  | { status: 'completed'; duration: number; type: 'run' | 'dryRun' }
  | { status: 'error'; error: string };

// Pipeline execution stages
const PIPELINE_STAGES = [
  { status: 'Initializing...', duration: 800, targetProgress: 15 },
  { status: 'Running transformations...', duration: 1500, targetProgress: 50 },
  { status: 'Processing tables...', duration: 1500, targetProgress: 85 },
  { status: 'Finalizing...', duration: 1000, targetProgress: 100 },
];

// Table result type for bottom panel
type TableResult = {
  id: string;
  status: 'success' | 'warning' | 'failed' | 'skipped';
  name: string;
  type: 'Streaming table' | 'Materialized view' | 'Persisted view' | 'Sink' | 'External source';
  duration: string;
  written: string;
  updated: string;
  expectations: string;
  dropped: number;
  warnings: number;
  failed: number;
  fileId?: string; // Reference to source file
  isExternal?: boolean; // True for external source tables
};

// Run history entry type
type RunHistoryEntry = {
  id: string;
  status: 'success' | 'failed';
  duration: number;
  timestamp: Date;
};

// Pipeline Graph types
type GraphNode = {
  id: string;
  type: 'materialized' | 'streaming' | 'persisted' | 'sink' | 'view' | 'external';
  name: string;
  status: 'success' | 'warning' | 'failed' | 'running' | 'placeholder';
  duration: string;
  outputRecords: string;
  droppedRecords?: number;
  position: { x: number; y: number };
  fileId?: string;
  isPlaceholder?: boolean; // Indicates a draft/pending node
  sourceNodeId?: string; // The node this placeholder depends on
  isExternal?: boolean; // True for external source tables
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  recordCount?: string;
  isDashed?: boolean; // For placeholder connections
};

type PipelineGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

// ═══════════════════════════════════════════════════════════════════
// DOCKING SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════

type DockZone = 'center' | 'right' | 'bottom';

type DockablePanel = {
  id: string;
  title: string;
  icon: string;
  closeable: boolean;
};

type DraggedTab = {
  panelId: string;
  sourceZone: DockZone;
  title: string;
} | null;

// Available panels that can be docked
const DOCKABLE_PANELS: Record<string, DockablePanel> = {
  tables: { id: 'tables', title: 'Tables', icon: 'Table', closeable: false },
  performance: { id: 'performance', title: 'Performance', icon: 'Activity', closeable: true },
  graph: { id: 'graph', title: 'Pipeline Graph', icon: 'GitFork', closeable: true },
  terminal: { id: 'terminal', title: 'Terminal', icon: 'Terminal', closeable: true },
};

// Parse table definitions from code content
type ParsedTable = {
  name: string;
  fileId: string;
  dependencies: string[]; // Tables this table reads from
};

// Helper to extract all file IDs from the file tree
const getFileIdsFromTree = (tree: TreeItem[]): Set<string> => {
  const ids = new Set<string>();
  
  const traverse = (items: TreeItem[]) => {
    items.forEach(item => {
      if (item.type === 'file') {
        ids.add(item.id);
      } else if (item.type === 'folder' && item.children) {
        traverse(item.children);
      }
    });
  };
  
  traverse(tree);
  return ids;
};

const parseTablesFromCode = (
  openTabs: { id: string; content: string; name: string }[],
  generatedContents: Record<string, { content: string; language: string }>,
  sampleContents: Record<string, { content: string; language: string }>,
  fileContentsMap?: Record<string, { content: string; language: string }>,
  activeFileIds?: Set<string> // IDs of files that are actually in the file tree
): ParsedTable[] => {
  const tables: ParsedTable[] = [];
  const seenFiles = new Set<string>();
  
  // Combine all code sources - prioritize open tabs (may have unsaved changes)
  const allCode: { fileId: string; content: string; fileName?: string }[] = [];
  
  // Add open tabs first (they have the latest content)
  openTabs.forEach(tab => {
    if (tab.content && tab.name.endsWith('.py')) {
      allCode.push({ fileId: tab.id, content: tab.content, fileName: tab.name });
      seenFiles.add(tab.id);
    }
  });
  
  // Add generated contents (AI-generated files) - only if they're in the active file tree
  Object.entries(generatedContents).forEach(([id, data]) => {
    if (data.language === 'python' && !seenFiles.has(id)) {
      // Only include if this file is in the active file tree (or no filter provided)
      if (!activeFileIds || activeFileIds.has(id)) {
        allCode.push({ fileId: id, content: data.content });
        seenFiles.add(id);
      }
    }
  });
  
  // Add file contents (from file tree - files that may not be open)
  if (fileContentsMap) {
    Object.entries(fileContentsMap).forEach(([id, data]) => {
      if (data.language === 'python' && !seenFiles.has(id)) {
        // Only include if this file is in the active file tree (or no filter provided)
        if (!activeFileIds || activeFileIds.has(id)) {
          allCode.push({ fileId: id, content: data.content });
          seenFiles.add(id);
        }
      }
    });
  }
  
  // Add sample contents - ONLY if they're in the active file tree
  // This ensures sample code is only parsed when user explicitly uses "Use sample code"
  Object.entries(sampleContents).forEach(([id, data]) => {
    if (data.language === 'python' && !seenFiles.has(id)) {
      // Only include sample files if they're in the active file tree
      if (activeFileIds && activeFileIds.has(id)) {
        allCode.push({ fileId: id, content: data.content });
        seenFiles.add(id);
      }
    }
  });
  
  // Parse each file for table definitions
  allCode.forEach(({ fileId, content }) => {
    // Match @dp.table or @dlt.table decorated functions
    const tableRegex = /@(?:dp|dlt)\.(?:table|view)[^]*?def\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const matchStart = match.index;
      
      // Find the function body (from match to next @dp/@dlt or end)
      const afterMatch = content.slice(matchStart);
      const nextDecorator = afterMatch.slice(match[0].length).search(/@(?:dp|dlt)\./);
      const functionBody = nextDecorator > -1 
        ? afterMatch.slice(0, match[0].length + nextDecorator)
        : afterMatch;
      
      // Find dependencies within THIS function body only
      const dependencies: string[] = [];
      
      // Pattern 1: spark.read.table("table_name") or spark.readStream.table("table_name")
      const sparkReadRegex = /spark\.read(?:Stream)?\.table\(["']([^"']+)["']\)/g;
      let depMatch;
      
      while ((depMatch = sparkReadRegex.exec(functionBody)) !== null) {
        const dep = depMatch[1];
        // Extract just the table name (remove catalog.schema prefix if present)
        const tableParts = dep.split('.');
        const tableNameOnly = tableParts[tableParts.length - 1];
        if (!dependencies.includes(tableNameOnly)) {
          dependencies.push(tableNameOnly);
        }
      }
      
      // Pattern 2: LIVE.table_name or dlt.read("table_name")
      const liveTableRegex = /(?:LIVE\.|dlt\.read\(["'])(\w+)/g;
      while ((depMatch = liveTableRegex.exec(functionBody)) !== null) {
        const dep = depMatch[1];
        if (!dependencies.includes(dep)) {
          dependencies.push(dep);
        }
      }
      
      tables.push({
        name: tableName,
        fileId,
        dependencies,
      });
    }
    
    // Also check for SQL-style CREATE statements
    const sqlCreateRegex = /CREATE\s+(?:OR\s+REFRESH\s+)?(?:MATERIALIZED\s+VIEW|STREAMING\s+TABLE|TABLE|VIEW)\s+(\w+)/gi;
    while ((match = sqlCreateRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (!tables.find(t => t.name === tableName)) {
        const dependencies: string[] = [];
        
        // Find FROM clauses after this CREATE
        const afterCreate = content.slice(match.index);
        const fromRegex = /FROM\s+(?:main\.samples\.)?(\w+)(?:\s|$|;)/gi;
        let depMatch;
        while ((depMatch = fromRegex.exec(afterCreate)) !== null) {
          const dep = depMatch[1];
          if (dep.toLowerCase() !== 'select' && !dependencies.includes(dep) && dep !== tableName) {
            dependencies.push(dep);
            break;
          }
        }
        
        tables.push({
          name: tableName,
          fileId,
          dependencies,
        });
      }
    }
  });
  
  return tables;
};

// Generate table results from parsed code
// Only shows tables defined in the pipeline (no external sources)
const generateTableResultsFromCode = (parsedTables: ParsedTable[], existingResults?: TableResult[]): TableResult[] => {
  if (parsedTables.length === 0) {
    return [{
      id: 'table-empty',
      status: 'success',
      name: 'No tables defined',
      type: 'Materialized view',
      duration: '-',
      written: '-',
      updated: '-',
      expectations: 'Not defined',
      dropped: 0,
      warnings: 0,
      failed: 0,
    }];
  }
  
  // Create results map from existing results to preserve values
  const existingResultsMap: Record<string, TableResult> = {};
  if (existingResults) {
    existingResults.forEach(r => {
      existingResultsMap[r.name] = r;
    });
  }
  
  // Only add results for defined tables (no external sources)
  return parsedTables.map((table, index) => {
    const existing = existingResultsMap[table.name];
    const isStreaming = table.name.toLowerCase().includes('stream') || 
                       table.name.toLowerCase().includes('raw') ||
                       table.name.toLowerCase().includes('cleaned');
    
    return {
      id: `table-${table.name}`,
      status: 'success' as const,
      name: table.name,
      type: isStreaming ? 'Streaming table' as const : 'Materialized view' as const,
      duration: existing?.duration || `${10 + index * 8}s`,
      written: existing?.written || `${Math.floor(Math.random() * 50 + 5)}K`,
      updated: existing?.updated || `${Math.floor(Math.random() * 10 + 1)}K`,
      expectations: index === parsedTables.length - 1 ? '3 met' : 'Not defined',
      dropped: existing?.dropped ?? (Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0),
      warnings: 0,
      failed: 0,
      fileId: table.fileId,
    };
  });
};

// Generate graph from parsed code with proper dependencies
// Supports incremental updates - preserves existing node positions
// Only shows tables defined in the pipeline (no external sources)
const generateGraphFromCode = (
  parsedTables: ParsedTable[], 
  tableResults: TableResult[],
  existingGraph?: PipelineGraph
): PipelineGraph => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  if (parsedTables.length === 0) {
    return { nodes, edges };
  }
  
  // Build a map of existing node positions for preservation
  const existingPositions: Record<string, { x: number; y: number }> = {};
  if (existingGraph) {
    existingGraph.nodes.forEach(node => {
      existingPositions[node.id] = node.position;
    });
  }
  
  // Collect all table names defined in the pipeline
  const definedTableNames = new Set(parsedTables.map(t => t.name));
  
  // Build levels map for defined tables only
  const levels: Record<string, number> = {};
  
  // Calculate level for each defined table (0 = no internal dependencies, higher = more downstream)
  const calculateLevel = (tableName: string, visited: Set<string> = new Set()): number => {
    if (levels[tableName] !== undefined) return levels[tableName];
    if (visited.has(tableName)) return 0;
    
    visited.add(tableName);
    const table = parsedTables.find(t => t.name === tableName);
    if (!table) return 0;
    
    // Only count dependencies that are INTERNAL (defined in the pipeline)
    const internalDeps = table.dependencies.filter(d => definedTableNames.has(d));
    if (internalDeps.length === 0) {
      levels[tableName] = 0;
      return 0;
    }
    
    const maxDepLevel = Math.max(...internalDeps.map(d => calculateLevel(d, visited)));
    levels[tableName] = maxDepLevel + 1;
    return levels[tableName];
  };
  
  parsedTables.forEach(t => calculateLevel(t.name));
  
  // Group defined tables by level
  const levelGroups: Record<number, ParsedTable[]> = {};
  parsedTables.forEach(table => {
    const level = levels[table.name] || 0;
    if (!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level].push(table);
  });
  
  // Position nodes
  const levelWidth = 350;
  const nodeHeight = 160;
  const startX = 80;
  const startY = 60;
  
  Object.entries(levelGroups).forEach(([level, tables]) => {
    const levelNum = parseInt(level);
    tables.forEach((table, index) => {
      const yOffset = (index - (tables.length - 1) / 2) * nodeHeight;
      const nodeId = `table-${table.name}`;
      
      // Use existing position if available, otherwise calculate new position
      const position = existingPositions[nodeId] || { 
        x: startX + levelNum * levelWidth, 
        y: startY + 100 + yOffset 
      };
      
      const result = tableResults.find(r => r.name === table.name);
      const isStreaming = table.name.toLowerCase().includes('stream') || 
                         table.name.toLowerCase().includes('raw') ||
                         table.name.toLowerCase().includes('cleaned');
      
      nodes.push({
        id: nodeId,
        type: isStreaming ? 'streaming' : 'materialized',
        name: table.name,
        status: result?.status || 'success',
        duration: result?.duration || '10s',
        outputRecords: result?.written || '10K',
        droppedRecords: result?.dropped && result.dropped > 0 ? result.dropped : undefined,
        position,
        fileId: table.fileId,
      });
    });
  });
  
  // Create edges only for INTERNAL dependencies (both source and target must be in the pipeline)
  parsedTables.forEach(table => {
    table.dependencies.forEach(dep => {
      // Only create edge if dependency is defined in the pipeline
      if (definedTableNames.has(dep)) {
        const sourceResult = tableResults.find(r => r.name === dep);
        edges.push({
          id: `table-${dep}-table-${table.name}`,
          source: `table-${dep}`,
          target: `table-${table.name}`,
          recordCount: sourceResult?.written,
        });
      }
    });
  });
  
  return { nodes, edges };
};

// Mock run history for histogram
const generateMockRunHistory = (): RunHistoryEntry[] => [
  { id: 'run-1', status: 'success', duration: 145, timestamp: new Date(Date.now() - 7200000) },
  { id: 'run-2', status: 'success', duration: 132, timestamp: new Date(Date.now() - 5400000) },
  { id: 'run-3', status: 'failed', duration: 89, timestamp: new Date(Date.now() - 3600000) },
  { id: 'run-4', status: 'success', duration: 156, timestamp: new Date(Date.now() - 1800000) },
  { id: 'run-5', status: 'success', duration: 148, timestamp: new Date(Date.now() - 900000) },
  { id: 'run-6', status: 'success', duration: 156, timestamp: new Date() },
];

// Table column schema type for data preview
type TableColumnSchema = {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'timestamp' | 'array' | 'struct';
  nullable: boolean;
  description?: string;
};

// Table preview data type
type TablePreviewData = {
  columns: TableColumnSchema[];
  rows: Record<string, unknown>[];
  totalRows: number;
  queryTime: number; // in seconds
  lastRefreshed: Date;
};

// Mock table preview data generator
const generateMockTablePreview = (tableName: string): TablePreviewData => {
  // Determine columns based on table name pattern
  const isCustomerTable = tableName.toLowerCase().includes('customer');
  const isOrderTable = tableName.toLowerCase().includes('order');
  const isJoinedTable = tableName.toLowerCase().includes('joined') || 
                        (tableName.toLowerCase().includes('customer') && tableName.toLowerCase().includes('order'));
  const isCleanedTable = tableName.toLowerCase().includes('cleaned');
  
  let columns: TableColumnSchema[];
  let rows: Record<string, unknown>[];
  
  if (isJoinedTable) {
    // Joined customers + orders table
    columns = [
      { name: 'customer_id', type: 'string', nullable: false, description: 'Unique customer identifier' },
      { name: 'customer_name', type: 'string', nullable: false, description: 'Customer full name' },
      { name: 'customer_email', type: 'string', nullable: true, description: 'Customer email address' },
      { name: 'order_id', type: 'string', nullable: false, description: 'Order identifier' },
      { name: 'order_date', type: 'timestamp', nullable: false, description: 'Date and time of order' },
      { name: 'order_amount', type: 'float', nullable: false, description: 'Total order amount' },
      { name: 'order_status', type: 'string', nullable: true, description: 'Current order status' },
      { name: 'items', type: 'array', nullable: true, description: 'List of ordered items' },
    ];
    rows = [
      { customer_id: 'CUST-001', customer_name: 'Alice Johnson', customer_email: 'alice@example.com', order_id: 'ORD-1001', order_date: '2024-12-15T10:30:00', order_amount: 299.99, order_status: 'completed', items: ['laptop', 'mouse'] },
      { customer_id: 'CUST-002', customer_name: 'Bob Smith', customer_email: 'bob@example.com', order_id: 'ORD-1002', order_date: '2024-12-15T11:45:00', order_amount: 149.50, order_status: 'shipped', items: ['keyboard'] },
      { customer_id: 'CUST-001', customer_name: 'Alice Johnson', customer_email: 'alice@example.com', order_id: 'ORD-1003', order_date: '2024-12-16T09:00:00', order_amount: 89.99, order_status: 'processing', items: ['headphones'] },
      { customer_id: 'CUST-003', customer_name: 'Carol Williams', customer_email: 'carol@example.com', order_id: 'ORD-1004', order_date: '2024-12-16T14:20:00', order_amount: 450.00, order_status: 'completed', items: ['monitor', 'cable', 'stand'] },
      { customer_id: 'CUST-004', customer_name: 'David Brown', customer_email: null, order_id: 'ORD-1005', order_date: '2024-12-17T08:15:00', order_amount: 75.25, order_status: 'pending', items: ['webcam'] },
      { customer_id: 'CUST-002', customer_name: 'Bob Smith', customer_email: 'bob@example.com', order_id: 'ORD-1006', order_date: '2024-12-17T16:30:00', order_amount: 199.99, order_status: 'completed', items: ['tablet'] },
    ];
  } else if (isCustomerTable) {
    // Customer table (cleaned or raw)
    columns = [
      { name: 'customer_id', type: 'string', nullable: false, description: 'Unique customer identifier' },
      { name: 'name', type: 'string', nullable: false, description: 'Customer full name' },
      { name: 'email', type: 'string', nullable: true, description: 'Email address' },
      { name: 'phone', type: 'string', nullable: true, description: 'Phone number' },
      { name: 'created_at', type: 'timestamp', nullable: false, description: 'Account creation date' },
      { name: 'status', type: 'string', nullable: true, description: 'Account status' },
    ];
    rows = [
      { customer_id: 'CUST-001', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1-555-0101', created_at: '2024-01-15T08:00:00', status: 'active' },
      { customer_id: 'CUST-002', name: 'Bob Smith', email: 'bob@example.com', phone: '+1-555-0102', created_at: '2024-02-20T10:30:00', status: 'active' },
      { customer_id: 'CUST-003', name: 'Carol Williams', email: 'carol@example.com', phone: null, created_at: '2024-03-10T14:45:00', status: 'active' },
      { customer_id: 'CUST-004', name: 'David Brown', email: null, phone: '+1-555-0104', created_at: '2024-04-05T09:15:00', status: 'inactive' },
      { customer_id: 'CUST-005', name: 'Eva Martinez', email: 'eva@example.com', phone: '+1-555-0105', created_at: '2024-05-22T11:00:00', status: 'active' },
    ];
  } else if (isOrderTable) {
    // Orders table (cleaned or raw)
    columns = [
      { name: 'order_id', type: 'string', nullable: false, description: 'Unique order identifier' },
      { name: 'customer_id', type: 'string', nullable: false, description: 'Reference to customer' },
      { name: 'order_date', type: 'timestamp', nullable: false, description: 'Order placement date' },
      { name: 'total_amount', type: 'float', nullable: false, description: 'Order total' },
      { name: 'status', type: 'string', nullable: true, description: 'Order status' },
      { name: 'items', type: 'array', nullable: true, description: 'Ordered items' },
    ];
    rows = [
      { order_id: 'ORD-1001', customer_id: 'CUST-001', order_date: '2024-12-15T10:30:00', total_amount: 299.99, status: 'completed', items: ['laptop', 'mouse'] },
      { order_id: 'ORD-1002', customer_id: 'CUST-002', order_date: '2024-12-15T11:45:00', total_amount: 149.50, status: 'shipped', items: ['keyboard'] },
      { order_id: 'ORD-1003', customer_id: 'CUST-001', order_date: '2024-12-16T09:00:00', total_amount: 89.99, status: 'processing', items: ['headphones'] },
      { order_id: 'ORD-1004', customer_id: 'CUST-003', order_date: '2024-12-16T14:20:00', total_amount: 450.00, status: 'completed', items: ['monitor', 'cable', 'stand'] },
      { order_id: 'ORD-1005', customer_id: 'CUST-004', order_date: '2024-12-17T08:15:00', total_amount: 75.25, status: 'pending', items: ['webcam'] },
    ];
  } else {
    // Generic table for any other name
    columns = [
      { name: 'id', type: 'string', nullable: false, description: 'Unique identifier' },
      { name: 'name', type: 'string', nullable: false, description: 'Item name' },
      { name: 'type', type: 'string', nullable: true, description: 'Category type' },
      { name: 'description', type: 'string', nullable: true, description: 'Description text' },
      { name: 'created_at', type: 'timestamp', nullable: true, description: 'Creation timestamp' },
      { name: 'value', type: 'float', nullable: true, description: 'Numeric value' },
      { name: 'tags', type: 'array', nullable: true, description: 'Associated tags' },
    ];
    rows = [
      { id: 'REC-001', name: 'Sample Record 1', type: 'type_a', description: 'First sample record in the dataset', created_at: '2024-12-01T10:00:00', value: 100.50, tags: ['sample', 'demo'] },
      { id: 'REC-002', name: 'Sample Record 2', type: 'type_b', description: 'Second sample record with different type', created_at: '2024-12-02T11:30:00', value: 250.75, tags: ['sample'] },
      { id: 'REC-003', name: 'Sample Record 3', type: 'type_a', description: null, created_at: '2024-12-03T14:15:00', value: 75.00, tags: null },
      { id: 'REC-004', name: 'Sample Record 4', type: 'type_c', description: 'Fourth record with extended information and more details in description field', created_at: '2024-12-04T09:45:00', value: null, tags: ['demo', 'test', 'extended'] },
      { id: 'REC-005', name: 'Sample Record 5', type: 'type_b', description: 'Fifth sample record', created_at: '2024-12-05T16:00:00', value: 320.00, tags: ['sample'] },
    ];
  }

  return {
    columns,
    rows,
    totalRows: Math.floor(Math.random() * 50000) + 1000,
    queryTime: Math.random() * 2 + 0.5, // 0.5 - 2.5 seconds
    lastRefreshed: new Date(Date.now() - Math.random() * 21600000), // Within last 6 hours
  };
};

// File contents storage (empty by default - files start with no content)
const fileContents: Record<string, { content: string; language: string }> = {
  "3": {
    content: "",
    language: "python",
  },
};

// Sample code templates
const sampleCodeContents: Record<string, { content: string; language: string }> = {
  "sample-users": {
    content: `from pyspark import pipelines as dp
from pyspark.sql.functions import col

# This file defines a sample transformation.
# Edit the sample below or add new transformations
# using "+ Add" in the file browser.

@dp.table
def sample_users_dec_23_1506():
    return (
        spark.read.table("samples.wanderbricks.users")
        .select("user_id", "email", "name", "user_type")
    )
`,
    language: "python",
  },
  "sample-aggregation": {
    content: `from pyspark import pipelines as dp
from pyspark.sql.functions import col, count, count_if
from utilities import utils

# This file defines a sample transformation.
# Edit the sample below or add new transformations
# using "+ Add" in the file browser.

@dp.table
def sample_aggregation_dec_23_1506():
    return (
        spark.read.table("sample_users_dec_23_1506")
        .withColumn("valid_email", utils.is_valid_email(col("email")))
        .groupBy(col("user_type"))
        .agg(
            count("user_id").alias("total_count"),
            count_if("valid_email").alias("count_valid_emails")
        )
    )
`,
    language: "python",
  },
  "sample-exploration": {
    content: `# Sample Exploration Notebook
# Use this notebook for exploratory data analysis

# Load sample data
df = spark.read.table("sample_users_dec_23_1506")

# Display basic statistics
display(df.describe())

# Show sample records
display(df.limit(10))
`,
    language: "python",
  },
  "sample-utils": {
    content: `# Utility functions for the pipeline
from pyspark.sql.functions import col, regexp_extract

def is_valid_email(email_col):
    """Check if email column contains valid email format"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return regexp_extract(email_col, email_pattern, 0) != ''

def normalize_string(str_col):
    """Normalize string column by trimming and lowercasing"""
    from pyspark.sql.functions import trim, lower
    return lower(trim(str_col))
`,
    language: "python",
  },
  "sample-readme": {
    content: `# Sample Pipeline

This pipeline demonstrates basic ETL patterns using Databricks Pipelines.

## Structure

- **transformations/**: Contains table definitions
  - \`sample_users.py\`: Loads user data from source
  - \`sample_aggregation.py\`: Aggregates user data by type

- **explorations/**: Notebooks for data analysis
  - \`sample_exploration.ipynb\`: Basic data exploration

- **utilities/**: Reusable Python modules
  - \`utils.py\`: Helper functions

## Getting Started

1. Review the sample transformations
2. Run the pipeline to see the results
3. Modify or add new transformations as needed

## Resources

- [Databricks Pipelines Documentation](https://docs.databricks.com)
`,
    language: "markdown",
  },
};

// Sample file tree structure (generated when "Get sample code" is clicked)
const sampleFileTree: TreeItem[] = [
  {
    id: "1",
    name: "New Pipeline 2025-12...[folder]",
    type: "folder",
    expanded: true,
    children: [
      {
        id: "2",
        name: "transformations",
        type: "folder",
        expanded: true,
        children: [
          { id: "sample-users", name: "sample_users.py", type: "file", language: "python" },
          { id: "sample-aggregation", name: "sample_aggregation.py", type: "file", language: "python" },
        ],
      },
      {
        id: "explorations-folder",
        name: "explorations",
        type: "folder",
        expanded: true,
        children: [
          { id: "sample-exploration", name: "sample_exploration.ipynb", type: "file", language: "python" },
        ],
      },
      {
        id: "utilities-folder",
        name: "utilities",
        type: "folder",
        expanded: true,
        children: [
          { id: "sample-utils", name: "utils.py", type: "file", language: "python" },
        ],
      },
      { id: "sample-readme", name: "README.md", type: "file", language: "markdown" },
    ],
  },
];

// Parsed prompt type for AI agent
type ParsedPrompt = {
  tables: string[];
  hasStreaming: boolean;
  hasAggregation: boolean;
  hasJoin: boolean;
  hasFilter: boolean;
  originalPrompt: string;
};

// Conversation message type for assistant panel
type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  generatedFiles?: string[];
  parsedPrompt?: ParsedPrompt;
};

// Generated file info for assistant summary
type GeneratedFileInfo = {
  id: string;
  name: string;
};

// Generate assistant summary based on actions
const generateAssistantSummary = (
  prompt: string,
  generatedFiles: GeneratedFileInfo[],
  parsedPrompt: ParsedPrompt
): string => {
  const { tables, hasJoin, hasAggregation, hasStreaming, hasFilter } = parsedPrompt;
  
  let summary = "I've created a pipeline based on your request:\n\n";
  
  // Files created
  summary += "**✓ Generated files:**\n";
  generatedFiles.forEach(file => {
    summary += `• \`${file.name}\`\n`;
  });
  
  // Sources
  if (tables.length > 0) {
    summary += "\n**✓ Reads from these sources:**\n";
    tables.forEach(table => {
      summary += `• @${table}\n`;
    });
  }
  
  // Operations
  summary += "\n**✓ Performs these operations:**\n";
  if (hasJoin) summary += "• Joins multiple tables\n";
  if (hasAggregation) summary += "• Aggregates data\n";
  if (hasStreaming) summary += "• Processes streaming data\n";
  if (hasFilter) summary += "• Filters data based on conditions\n";
  summary += "• Selects relevant columns\n";
  
  // Divider
  summary += "\n───────────────────────\n\n";
  
  // Next steps
  summary += "**Next steps:**\n";
  summary += "• Review the generated code\n";
  summary += "• Update join conditions and filters as needed\n";
  summary += "• Run the pipeline to test\n";
  
  return summary;
};

// Parse user prompt for context
const parseUserPrompt = (prompt: string): ParsedPrompt => {
  // Extract table mentions: @table_1, @table_2
  const tableMatches = prompt.match(/@(\w+)/g) || [];
  const tables = tableMatches.map(t => t.replace('@', ''));
  
  // Extract keywords
  const hasStreaming = /streaming|real-time|continuous|stream/i.test(prompt);
  const hasAggregation = /aggregate|sum|count|group|avg|average|total/i.test(prompt);
  const hasJoin = /join|merge|combine|link/i.test(prompt);
  const hasFilter = /filter|where|condition|exclude|include|only/i.test(prompt);
  
  return { tables, hasStreaming, hasAggregation, hasJoin, hasFilter, originalPrompt: prompt };
};

// Generate function name from tables
const getFunctionName = (tables: string[]): string => {
  if (tables.length === 0) return "transformed_data";
  if (tables.length === 1) return `${tables[0]}_transformed`;
  return `${tables.slice(0, 2).join('_')}_joined`;
};

// Generate docstring from parsed prompt
const generateDocstring = (parsed: ParsedPrompt): string => {
  const parts: string[] = [];
  if (parsed.tables.length > 0) {
    parts.push(`Data sources: ${parsed.tables.join(', ')}`);
  }
  if (parsed.hasJoin) parts.push("Joins multiple data sources");
  if (parsed.hasAggregation) parts.push("Includes aggregations");
  if (parsed.hasStreaming) parts.push("Streaming transformation");
  if (parsed.hasFilter) parts.push("Applies filters");
  return parts.length > 0 ? parts.join('\\n    ') : "Generated transformation";
};

// Generate code based on parsed prompt
const generateCode = (parsed: ParsedPrompt): string => {
  const funcName = getFunctionName(parsed.tables);
  const tables = parsed.tables.length > 0 ? parsed.tables : ['source_table'];
  
  let code = `from pyspark import pipelines as dp
from pyspark.sql import functions as F

`;
  
  // Add comment about the prompt
  code += `# Generated from prompt: "${parsed.originalPrompt}"
# This transformation was automatically generated.
# Edit as needed to match your requirements.

`;

  // Generate decorator
  code += `@dp.table${parsed.hasStreaming ? '  # Streaming enabled' : ''}
def ${funcName}():
    """
    ${generateDocstring(parsed)}
    """
`;

  // Read tables
  tables.forEach((table, idx) => {
    const varName = tables.length === 1 ? 'df' : table;
    code += `    ${varName} = spark.read${parsed.hasStreaming ? 'Stream' : ''}.table("${table}")\n`;
  });

  // Add join logic if needed
  if (parsed.hasJoin && tables.length >= 2) {
    code += `
    # Join tables
    result = ${tables[0]}.join(
        ${tables[1]},
        ${tables[0]}.id == ${tables[1]}.${tables[0]}_id,  # Update join condition
        "inner"
    )
`;
  } else if (tables.length === 1) {
    code += `
    result = df
`;
  } else {
    code += `
    result = ${tables[0]}
`;
  }

  // Add filter if needed
  if (parsed.hasFilter) {
    code += `
    # Apply filters
    result = result.filter(F.col("status") == "active")  # Update filter condition
`;
  }

  // Add aggregation if needed
  if (parsed.hasAggregation) {
    code += `
    # Aggregate data
    result = result.groupBy("category").agg(
        F.count("*").alias("total_count"),
        F.sum("amount").alias("total_amount")
    )
`;
  }

  // Return statement
  code += `
    return result
`;

  return code;
};

// Generate utility code
const generateUtilsCode = (): string => {
  return `# Utility functions for the pipeline
from pyspark.sql.functions import col, regexp_extract, when

def is_valid_email(email_col):
    """Check if an email column contains valid email addresses."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return regexp_extract(email_col, pattern, 0) != ''

def clean_string(string_col):
    """Clean and normalize a string column."""
    from pyspark.sql.functions import trim, lower
    return trim(lower(string_col))

def safe_divide(numerator, denominator):
    """Safely divide two columns, returning null for division by zero."""
    return when(denominator != 0, numerator / denominator).otherwise(None)
`;
};

// Generate README code based on prompt
const generateReadmeCode = (parsed: ParsedPrompt): string => {
  const funcName = getFunctionName(parsed.tables);
  return `# Generated Pipeline

This pipeline was generated based on your description:
> "${parsed.originalPrompt}"

## Structure

- **transformations/**: Contains table definitions
  - \`${funcName}.py\`: Main transformation${parsed.tables.length > 0 ? ` (reads from ${parsed.tables.join(', ')})` : ''}
${parsed.tables.map(t => `  - \`${t}_cleaned.py\`: Preprocessing for ${t}`).join('\n')}

- **utilities/**: Reusable Python modules
  - \`utils.py\`: Helper functions

## Features

${parsed.hasStreaming ? '- ✅ Streaming data processing\n' : ''}${parsed.hasJoin ? '- ✅ Table joins\n' : ''}${parsed.hasAggregation ? '- ✅ Data aggregation\n' : ''}${parsed.hasFilter ? '- ✅ Data filtering\n' : ''}

## Getting Started

1. Review the generated transformations
2. Update join conditions and filters as needed
3. Run the pipeline to see the results
4. Modify or add new transformations as needed

## Notes

- All transformations use the \`@dp.table\` decorator
- Helper functions are available in \`utilities/utils.py\`
`;
};

// Generate file tree based on parsed prompt
const generateFileTreeFromPrompt = (parsed: ParsedPrompt): { tree: TreeItem[], contents: Record<string, { content: string; language: string }> } => {
  const funcName = getFunctionName(parsed.tables);
  const mainFileId = `gen-${funcName}`;
  const utilsFileId = "gen-utils";
  const readmeFileId = "gen-readme";
  
  // Build transformation files
  const transformationFiles: FileItem[] = [
    { id: mainFileId, name: `${funcName}.py`, type: "file", language: "python" },
  ];
  
  // Add preprocessing files for each table
  parsed.tables.forEach(table => {
    transformationFiles.push({
      id: `gen-${table}-cleaned`,
      name: `${table}_cleaned.py`,
      type: "file",
      language: "python",
    });
  });

  const tree: TreeItem[] = [
    {
      id: "1",
      name: "New Pipeline 2025-12...[folder]",
      type: "folder",
      expanded: true,
      children: [
        {
          id: "2",
          name: "transformations",
          type: "folder",
          expanded: true,
          children: transformationFiles,
        },
        {
          id: "gen-utilities-folder",
          name: "utilities",
          type: "folder",
          expanded: true,
          children: [
            { id: utilsFileId, name: "utils.py", type: "file", language: "python" },
          ],
        },
        { id: readmeFileId, name: "README.md", type: "file", language: "markdown" },
      ],
    },
  ];

  // Generate contents
  const contents: Record<string, { content: string; language: string }> = {
    [mainFileId]: { content: generateCode(parsed), language: "python" },
    [utilsFileId]: { content: generateUtilsCode(), language: "python" },
    [readmeFileId]: { content: generateReadmeCode(parsed), language: "markdown" },
  };

  // Add preprocessing file contents for each table
  parsed.tables.forEach(table => {
    contents[`gen-${table}-cleaned`] = {
      content: `from pyspark import pipelines as dp
from pyspark.sql import functions as F
from utilities import utils

# Preprocessing for ${table}
# Clean and prepare data before main transformation

@dp.table
def ${table}_cleaned():
    """
    Cleaned and preprocessed ${table} data.
    """
    df = spark.read.table("${table}")
    
    # Apply cleaning transformations
    result = df
    
    # Add your preprocessing logic here
    # Example: result = result.filter(F.col("status").isNotNull())
    
    return result
`,
      language: "python",
    };
  });

  return { tree, contents };
};

// File tree data structure
const fileTreeData: TreeItem[] = [
  {
    id: "1",
    name: "New Pipeline 2025-12...[folder]",
    type: "folder",
    expanded: true,
    children: [
      {
        id: "2",
        name: "transformations",
        type: "folder",
        expanded: true,
        children: [
          { id: "3", name: "first_transformation.py", type: "file", language: "python" },
        ],
      },
    ],
  },
];

// Helper to get file language from name
const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'sql': return 'sql';
    case 'scala': return 'scala';
    case 'r': return 'r';
    case 'json': return 'json';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'md': return 'markdown';
    case 'ipynb': return 'python';
    default: return 'python';
  }
};

// Skeleton bar component for loading states
const SkeletonBar = ({ width }: { width: string }) => (
  <div 
    className="h-3 rounded animate-pulse"
    style={{ 
      width,
      backgroundColor: 'var(--color-grey-200)',
    }} 
  />
);

// File browser skeleton - simple horizontal bars
const FileTreeSkeleton = () => (
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

// Editor skeleton - simple horizontal bars like code lines
const EditorSkeleton = () => (
  <div className="h-full w-full p-6 space-y-4">
    <SkeletonBar width="45%" />
    <SkeletonBar width="65%" />
    <SkeletonBar width="55%" />
    <SkeletonBar width="75%" />
    <div className="h-3" /> {/* Empty line */}
    <SkeletonBar width="40%" />
    <SkeletonBar width="85%" />
    <SkeletonBar width="60%" />
    <SkeletonBar width="70%" />
    <SkeletonBar width="50%" />
    <div className="h-3" /> {/* Empty line */}
    <SkeletonBar width="35%" />
    <SkeletonBar width="80%" />
    <SkeletonBar width="65%" />
    <SkeletonBar width="45%" />
  </div>
);

// Unity Catalog types
type ColumnItem = {
  id: string;
  name: string;
  dataType: string;
  type: "column";
};

type TableItem = {
  id: string;
  name: string;
  type: "table" | "view";
  columns?: ColumnItem[];
};

type SchemaItem = {
  id: string;
  name: string;
  type: "schema";
  tables?: TableItem[];
};

type CatalogItem = {
  id: string;
  name: string;
  type: "catalog";
  schemas?: SchemaItem[];
};

// Unity Catalog data structure
const catalogData: CatalogItem[] = [
  {
    id: "cat-main",
    name: "main",
    type: "catalog",
    schemas: [
      {
        id: "schema-default",
        name: "default",
        type: "schema",
        tables: [
          {
            id: "tbl-customers",
            name: "customers",
            type: "table",
            columns: [
              { id: "col-1", name: "customer_id", dataType: "INT", type: "column" },
              { id: "col-2", name: "name", dataType: "STRING", type: "column" },
              { id: "col-3", name: "email", dataType: "STRING", type: "column" },
              { id: "col-4", name: "created_at", dataType: "TIMESTAMP", type: "column" },
            ],
          },
          {
            id: "tbl-orders",
            name: "orders",
            type: "table",
            columns: [
              { id: "col-5", name: "order_id", dataType: "INT", type: "column" },
              { id: "col-6", name: "customer_id", dataType: "INT", type: "column" },
              { id: "col-7", name: "total_amount", dataType: "DECIMAL", type: "column" },
              { id: "col-8", name: "order_date", dataType: "DATE", type: "column" },
            ],
          },
          {
            id: "view-customer-summary",
            name: "customer_summary",
            type: "view",
            columns: [
              { id: "col-9", name: "customer_id", dataType: "INT", type: "column" },
              { id: "col-10", name: "total_orders", dataType: "INT", type: "column" },
              { id: "col-11", name: "total_spent", dataType: "DECIMAL", type: "column" },
            ],
          },
        ],
      },
      {
        id: "schema-bronze",
        name: "bronze",
        type: "schema",
        tables: [
          {
            id: "tbl-raw-events",
            name: "raw_events",
            type: "table",
            columns: [
              { id: "col-12", name: "event_id", dataType: "STRING", type: "column" },
              { id: "col-13", name: "event_type", dataType: "STRING", type: "column" },
              { id: "col-14", name: "payload", dataType: "STRING", type: "column" },
              { id: "col-15", name: "received_at", dataType: "TIMESTAMP", type: "column" },
            ],
          },
        ],
      },
      {
        id: "schema-silver",
        name: "silver",
        type: "schema",
        tables: [
          {
            id: "tbl-processed-events",
            name: "processed_events",
            type: "table",
            columns: [
              { id: "col-16", name: "event_id", dataType: "STRING", type: "column" },
              { id: "col-17", name: "event_type", dataType: "STRING", type: "column" },
              { id: "col-18", name: "is_valid", dataType: "BOOLEAN", type: "column" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cat-workspace",
    name: "workspace",
    type: "catalog",
    schemas: [
      {
        id: "schema-samples",
        name: "samples",
        type: "schema",
        tables: [
          {
            id: "tbl-nyctaxi",
            name: "nyctaxi",
            type: "table",
            columns: [
              { id: "col-19", name: "trip_id", dataType: "STRING", type: "column" },
              { id: "col-20", name: "pickup_datetime", dataType: "TIMESTAMP", type: "column" },
              { id: "col-21", name: "fare_amount", dataType: "DOUBLE", type: "column" },
            ],
          },
        ],
      },
    ],
  },
];

// Helper function to get data type icon
const getDataTypeIcon = (dataType: string) => {
  const iconStyle = { color: 'var(--color-grey-400)' };
  switch (dataType.toUpperCase()) {
    case "INT":
    case "BIGINT":
    case "SMALLINT":
    case "TINYINT":
      return <Hash className="h-3 w-3" style={iconStyle} />;
    case "STRING":
    case "VARCHAR":
    case "CHAR":
      return <Type className="h-3 w-3" style={iconStyle} />;
    case "BOOLEAN":
      return <ToggleLeft className="h-3 w-3" style={iconStyle} />;
    case "DECIMAL":
    case "DOUBLE":
    case "FLOAT":
      return <Binary className="h-3 w-3" style={iconStyle} />;
    case "DATE":
    case "TIMESTAMP":
      return <CalendarDays className="h-3 w-3" style={iconStyle} />;
    default:
      return <Box className="h-3 w-3" style={iconStyle} />;
  }
};

// Panel size constants (in pixels)
const PANEL_SIZES = {
  left: { default: 250, min: 200, max: 350 },
  right: { default: 320, min: 280, max: 500 },
  bottom: { default: 250, min: 150, max: 400 },
  toolbar: 40, // Icon toolbar width
  minEditor: 100, // Minimum editor width (reduced to allow responsive behavior)
};

// LocalStorage keys
const STORAGE_KEYS = {
  leftWidth: "pipeline-editor-left-width",
  rightWidth: "pipeline-editor-right-width",
  bottomHeight: "pipeline-editor-bottom-height",
  leftOpen: "pipeline-editor-left-open",
  rightPanel: "pipeline-editor-right-panel",
  bottomOpen: "pipeline-editor-bottom-open",
};

export default function PipelineEditorPage() {
  const { setOpen } = useSidebar();
  const [leftPanelTab, setLeftPanelTab] = useState("pipeline");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["1", "2"]));
  const [pipelineName, setPipelineName] = useState("New Pipeline 2025-12-10 12:19");
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>("3");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; type: "file" | "folder" } | null>(null);
  
  // File tree state (mutable for rename sync)
  const [fileTree, setFileTree] = useState<TreeItem[]>(fileTreeData);
  
  // Tab name editing state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const tabNameInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Editor tabs state
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([
    {
      id: "3",
      name: "first_transformation.py",
      content: fileContents["3"]?.content || "",
      language: "python",
      isDirty: false,
      savedContent: fileContents["3"]?.content || "",
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("3");
  
  // Editor state
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true); // Quick action buttons visibility (separate from empty state text)
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("light");
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const editorRef = useRef<unknown>(null); // Monaco editor instance reference
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);
  
  // Loading states for code generation
  const [isGeneratingSample, setIsGeneratingSample] = useState(false); // Full scaffold with file tree
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false); // Editor-only template (no file tree change)
  const [newlyCreatedFiles, setNewlyCreatedFiles] = useState<Set<string>>(new Set());
  
  // Inline AI code generation (Databricks Notebooks style)
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [inlineAIPrompt, setInlineAIPrompt] = useState("");
  const [isInlineAIGenerating, setIsInlineAIGenerating] = useState(false);
  const [generatedCodeDiff, setGeneratedCodeDiff] = useState<string | null>(null);
  const inlineAIInputRef = useRef<HTMLInputElement>(null);
  
  // Unified AI Chat state - shared between center empty state and right sidebar assistant
  const [chatInput, setChatInput] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiThinkingText, setAIThinkingText] = useState("Thinking");
  const aiThinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  
  // Legacy aliases for backwards compatibility (will be removed after full migration)
  const aiPrompt = chatInput;
  const setAiPrompt = setChatInput;
  const isAgentThinking = isAIThinking;
  const setIsAgentThinking = setIsAIThinking;
  const agentThinkingText = aiThinkingText;
  const setAgentThinkingText = setAIThinkingText;
  const agentThinkingIntervalRef = aiThinkingIntervalRef;
  const followUpInput = chatInput;
  const setFollowUpInput = setChatInput;
  const isFollowUpThinking = isAIThinking;
  const setIsFollowUpThinking = setIsAIThinking;
  
  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIncludeAsSource, setNewFolderIncludeAsSource] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null); // null = root level
  
  // File creation counter for auto-naming
  const [transformationCounter, setTransformationCounter] = useState(1);
  
  // Panel states with localStorage initialization
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(PANEL_SIZES.left.default);
  const [activeRightPanel, setActiveRightPanel] = useState<"comments" | "history" | "assistant" | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(PANEL_SIZES.right.default);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(PANEL_SIZES.bottom.default);
  
  // Bottom panel tabs and state
  const [bottomPanelTab, setBottomPanelTab] = useState<"tables" | "performance" | "graph">("tables");
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(false);
  const [bottomPanelBadges, setBottomPanelBadges] = useState({ errors: 0, warnings: 0, info: 0 });
  const expandedBottomPanelHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600;
  
  // Pipeline execution state
  const [pipelineState, setPipelineState] = useState<PipelineState>({ status: 'idle' });
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  const [executionDuration, setExecutionDuration] = useState(0);
  const [hasRunPipeline, setHasRunPipeline] = useState(false); // Track if pipeline has been run at least once
  const [lastRunTimestamp, setLastRunTimestamp] = useState<Date | null>(null); // Track when the last run completed
  const [lastRunStatus, setLastRunStatus] = useState<'complete' | 'failed' | 'canceled' | null>(null); // Track last run status
  const pipelineAbortController = useRef<AbortController | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Table results state for bottom panel
  const [tableResults, setTableResults] = useState<TableResult[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [tableSearchFilter, setTableSearchFilter] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'success' | 'warning' | 'failed' | 'skipped'>('all');
  const [tableTypeFilter, setTableTypeFilter] = useState<'all' | 'Streaming table' | 'Materialized view' | 'Persisted view' | 'Sink'>('all');
  const [tableSortConfig, setTableSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'name', direction: 'asc' });
  const [showResultsView, setShowResultsView] = useState(false); // Controls transition from completed message to results
  
  // Table data preview state
  const [selectedTableForPreview, setSelectedTableForPreview] = useState<TableResult | null>(null);
  const [tablePreviewData, setTablePreviewData] = useState<TablePreviewData | null>(null);
  const [tablePreviewTab, setTablePreviewTab] = useState<'data' | 'columns' | 'metrics' | 'performance'>('data');
  const [tablePreviewRowLimit, setTablePreviewRowLimit] = useState(100);
  const [isLoadingTablePreview, setIsLoadingTablePreview] = useState(false);
  const [tablePreviewSource, setTablePreviewSource] = useState<'graph' | 'tables'>('tables');
  
  // Pipeline Graph state
  const [graphData, setGraphData] = useState<PipelineGraph>({ nodes: [], edges: [] });
  const [graphZoom, setGraphZoom] = useState(1);
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
  const [selectedGraphNode, setSelectedGraphNode] = useState<string | null>(null);
  const [hoveredGraphNode, setHoveredGraphNode] = useState<string | null>(null);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [isDraggingGraph, setIsDraggingGraph] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphDragStart = useRef<{ x: number; y: number } | null>(null);
  
  // Add Dependent Dataset state
  const [placeholderCounter, setPlaceholderCounter] = useState(1);
  
  // Resize state
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════
  // DOCKING SYSTEM STATE
  // ═══════════════════════════════════════════════════════════════════
  
  // Track which panels are in which zones
  const [bottomPanelTabs, setBottomPanelTabs] = useState<string[]>(['tables', 'performance', 'graph']);
  const [centerDockedPanels, setCenterDockedPanels] = useState<string[]>([]);
  const [rightDockedPanels, setRightDockedPanels] = useState<string[]>([]); // Panels docked to right toolbar
  
  // Drag state
  const [draggedTab, setDraggedTab] = useState<DraggedTab>(null);
  const [dropTarget, setDropTarget] = useState<DockZone | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null); // For reordering within bottom panel
  
  // Catalog browser state
  const [expandedCatalogItems, setExpandedCatalogItems] = useState<Set<string>>(new Set(["cat-main", "schema-default"]));
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<string | null>(null);
  
  // Catalog & Schema configuration panel state
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState("main");
  const [selectedSchema, setSelectedSchema] = useState("default");
  const [tempCatalog, setTempCatalog] = useState("main");
  const [tempSchema, setTempSchema] = useState("default");
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState(false);
  const [catalogSearchInput, setCatalogSearchInput] = useState("");
  const [schemaSearchInput, setSchemaSearchInput] = useState("");
  
  // First-run modal state
  const [showFirstRunModal, setShowFirstRunModal] = useState(false);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [modalCatalog, setModalCatalog] = useState("main");
  const [modalSchema, setModalSchema] = useState("default");
  const [isModalCatalogDropdownOpen, setIsModalCatalogDropdownOpen] = useState(false);
  const [isModalSchemaDropdownOpen, setIsModalSchemaDropdownOpen] = useState(false);
  const [modalCatalogSearchInput, setModalCatalogSearchInput] = useState("");
  const [modalSchemaSearchInput, setModalSchemaSearchInput] = useState("");
  const pendingRunTypeRef = useRef<'run' | 'dryRun' | null>(null);
  
  // Mock catalog and schema options
  const catalogOptions = ["main", "user_main", "test_1", "system", "abc", "123"];
  const schemaOptions = ["default", "bronze", "silver", "gold", "public"];
  
  const hasInitialized = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered and sorted table results
  const filteredTableResults = useMemo(() => {
    let results = [...tableResults];
    
    // Apply search filter
    if (tableSearchFilter) {
      const search = tableSearchFilter.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(search));
    }
    
    // Apply status filter
    if (tableStatusFilter !== 'all') {
      results = results.filter(r => r.status === tableStatusFilter);
    }
    
    // Apply type filter
    if (tableTypeFilter !== 'all') {
      results = results.filter(r => r.type === tableTypeFilter);
    }
    
    // Apply sorting
    results.sort((a, b) => {
      const { column, direction } = tableSortConfig;
      let comparison = 0;
      
      switch (column) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'duration':
          // Parse duration for sorting (simplified)
          const parseDuration = (d: string) => {
            const match = d.match(/(\d+)m?\s*(\d*)s?/);
            if (!match) return 0;
            const mins = match[1].includes('m') ? parseInt(match[1]) : 0;
            const secs = match[2] ? parseInt(match[2]) : parseInt(match[1]);
            return mins * 60 + secs;
          };
          comparison = parseDuration(a.duration) - parseDuration(b.duration);
          break;
        case 'dropped':
          comparison = a.dropped - b.dropped;
          break;
        case 'warnings':
          comparison = a.warnings - b.warnings;
          break;
        case 'failed':
          comparison = a.failed - b.failed;
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    return results;
  }, [tableResults, tableSearchFilter, tableStatusFilter, tableTypeFilter, tableSortConfig]);

  // Handle table column sort
  const handleTableSort = useCallback((column: string) => {
    setTableSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Open table data preview
  const openTablePreview = useCallback((table: TableResult, source: 'graph' | 'tables' = 'tables') => {
    setSelectedTableForPreview(table);
    setTablePreviewTab('data');
    setIsLoadingTablePreview(true);
    setTablePreviewSource(source);
    
    // Simulate loading data
    setTimeout(() => {
      const previewData = generateMockTablePreview(table.name);
      setTablePreviewData(previewData);
      setIsLoadingTablePreview(false);
    }, 500);
  }, []);

  // Close table preview and return to results list or graph
  const closeTablePreview = useCallback(() => {
    // Switch to the appropriate tab based on source
    if (tablePreviewSource === 'graph') {
      setBottomPanelTab('graph');
    } else {
      setBottomPanelTab('tables');
    }
    
    setSelectedTableForPreview(null);
    setTablePreviewData(null);
    setTablePreviewTab('data');
  }, [tablePreviewSource]);

  // Refresh table preview data
  const refreshTablePreview = useCallback(() => {
    if (!selectedTableForPreview) return;
    setIsLoadingTablePreview(true);
    
    setTimeout(() => {
      const previewData = generateMockTablePreview(selectedTableForPreview.name);
      setTablePreviewData(previewData);
      setIsLoadingTablePreview(false);
    }, 800);
  }, [selectedTableForPreview]);

  // Format relative time for "refreshed X ago"
  const formatRelativeTime = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }, []);

  // Get column type icon
  const getColumnTypeIcon = useCallback((type: TableColumnSchema['type']) => {
    switch (type) {
      case 'string': return '📝';
      case 'integer': 
      case 'float': return '🔢';
      case 'boolean': return '✓';
      case 'date':
      case 'timestamp': return '📅';
      case 'array': return '[ ]';
      case 'struct': return '{ }';
      default: return '·';
    }
  }, []);

  // Load from localStorage on mount
  // Note: Bottom panel and right panel always start closed for new pipeline entry
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLeftWidth = localStorage.getItem(STORAGE_KEYS.leftWidth);
      const savedRightWidth = localStorage.getItem(STORAGE_KEYS.rightWidth);
      const savedBottomHeight = localStorage.getItem(STORAGE_KEYS.bottomHeight);
      const savedLeftOpen = localStorage.getItem(STORAGE_KEYS.leftOpen);
      
      // Restore panel sizes (for when user opens them)
      if (savedLeftWidth) setLeftPanelWidth(parseInt(savedLeftWidth));
      if (savedRightWidth) setRightPanelWidth(parseInt(savedRightWidth));
      if (savedBottomHeight) setBottomPanelHeight(parseInt(savedBottomHeight));
      if (savedLeftOpen !== null) setIsLeftPanelOpen(savedLeftOpen === "true");
      
      // Bottom panel and right panel always start closed on new pipeline entry
      // Their open/closed state is NOT restored from localStorage
    }
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    if (typeof window !== "undefined" && hasInitialized.current) {
      localStorage.setItem(STORAGE_KEYS.leftWidth, leftPanelWidth.toString());
      localStorage.setItem(STORAGE_KEYS.leftOpen, isLeftPanelOpen.toString());
    }
  }, [leftPanelWidth, isLeftPanelOpen]);

  useEffect(() => {
    if (typeof window !== "undefined" && hasInitialized.current) {
      localStorage.setItem(STORAGE_KEYS.rightWidth, rightPanelWidth.toString());
      localStorage.setItem(STORAGE_KEYS.rightPanel, activeRightPanel || "");
    }
  }, [rightPanelWidth, activeRightPanel]);

  useEffect(() => {
    if (typeof window !== "undefined" && hasInitialized.current) {
      localStorage.setItem(STORAGE_KEYS.bottomHeight, bottomPanelHeight.toString());
      localStorage.setItem(STORAGE_KEYS.bottomOpen, isBottomPanelOpen.toString());
    }
  }, [bottomPanelHeight, isBottomPanelOpen]);

  // Save dock layout to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && hasInitialized.current) {
      localStorage.setItem('pipeline-dock-layout', JSON.stringify({
        bottomPanelTabs,
        centerDockedPanels,
        rightDockedPanels,
      }));
    }
  }, [bottomPanelTabs, centerDockedPanels, rightDockedPanels]);

  // Restore dock layout from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem('pipeline-dock-layout');
      if (saved) {
        try {
          const layout = JSON.parse(saved);
          if (layout.bottomPanelTabs) setBottomPanelTabs(layout.bottomPanelTabs);
          if (layout.centerDockedPanels) setCenterDockedPanels(layout.centerDockedPanels);
          if (layout.rightDockedPanels) setRightDockedPanels(layout.rightDockedPanels);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // DOCKING SYSTEM FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════

  // Start dragging a tab
  const handleDockTabDragStart = useCallback((e: React.DragEvent, panelId: string, sourceZone: DockZone) => {
    const panel = DOCKABLE_PANELS[panelId];
    if (!panel) return;
    
    e.dataTransfer.setData('text/plain', JSON.stringify({ panelId, sourceZone }));
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image
    const dragPreview = document.createElement('div');
    dragPreview.textContent = panel.title;
    dragPreview.style.cssText = `
      position: absolute;
      left: -9999px;
      padding: 6px 12px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 40, 15);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
    
    setDraggedTab({ panelId, sourceZone, title: panel.title });
  }, []);

  // Handle drag over a drop zone
  const handleDockDragOver = useCallback((e: React.DragEvent, zone: DockZone, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(zone);
    if (index !== undefined) {
      setDragOverIndex(index);
    }
  }, []);

  // Handle drag leave from a zone
  const handleDockDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTarget(null);
      setDragOverIndex(null);
    }
  }, []);

  // Handle drop on a zone
  const handleDockDrop = useCallback((e: React.DragEvent, targetZone: DockZone, dropIndex?: number) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { panelId, sourceZone } = data;
      
      if (!panelId) return;
      
      // If dropping in same zone at same position, do nothing
      if (sourceZone === targetZone && dropIndex === undefined) {
        setDraggedTab(null);
        setDropTarget(null);
        setDragOverIndex(null);
        return;
      }
      
      // Remove from source zone
      if (sourceZone === 'bottom') {
        setBottomPanelTabs(prev => prev.filter(id => id !== panelId));
      } else if (sourceZone === 'center') {
        setCenterDockedPanels(prev => prev.filter(id => id !== panelId));
      } else if (sourceZone === 'right') {
        setRightDockedPanels(prev => prev.filter(id => id !== panelId));
      }
      
      // Add to target zone
      if (targetZone === 'bottom') {
        setBottomPanelTabs(prev => {
          const filtered = prev.filter(id => id !== panelId);
          if (dropIndex !== undefined) {
            filtered.splice(dropIndex, 0, panelId);
            return filtered;
          }
          return [...filtered, panelId];
        });
        // Set as active tab
        setBottomPanelTab(panelId as "tables" | "performance" | "graph");
      } else if (targetZone === 'center') {
        setCenterDockedPanels(prev => {
          if (prev.includes(panelId)) return prev;
          return [...prev, panelId];
        });
      } else if (targetZone === 'right') {
        setRightDockedPanels(prev => {
          if (prev.includes(panelId)) return prev;
          return [...prev, panelId];
        });
        // Open right panel with this docked panel
        setActiveRightPanel(panelId as "comments" | "history" | "assistant");
      }
    } catch (err) {
      // Ignore parse errors
    }
    
    setDraggedTab(null);
    setDropTarget(null);
    setDragOverIndex(null);
  }, []);

  // Handle drag end (cleanup)
  const handleDockDragEnd = useCallback(() => {
    setDraggedTab(null);
    setDropTarget(null);
    setDragOverIndex(null);
  }, []);

  // Add a panel to a zone via menu
  const addPanelToZone = useCallback((panelId: string, zone: DockZone) => {
    // Remove from all zones first
    setBottomPanelTabs(prev => prev.filter(id => id !== panelId));
    setCenterDockedPanels(prev => prev.filter(id => id !== panelId));
    setRightDockedPanels(prev => prev.filter(id => id !== panelId));
    
    // Add to target zone
    if (zone === 'bottom') {
      setBottomPanelTabs(prev => [...prev, panelId]);
      setBottomPanelTab(panelId as "tables" | "performance" | "graph");
      if (!isBottomPanelOpen) setIsBottomPanelOpen(true);
    } else if (zone === 'center') {
      setCenterDockedPanels(prev => [...prev, panelId]);
    } else if (zone === 'right') {
      setRightDockedPanels(prev => [...prev, panelId]);
      setActiveRightPanel(panelId as "comments" | "history" | "assistant");
    }
  }, [isBottomPanelOpen]);

  // Get panels available to add (not in any zone)
  const getAvailablePanelsForZone = useCallback((zone: DockZone): DockablePanel[] => {
    const allPanelIds = [...bottomPanelTabs, ...centerDockedPanels, ...rightDockedPanels];
    return Object.values(DOCKABLE_PANELS).filter(panel => !allPanelIds.includes(panel.id));
  }, [bottomPanelTabs, centerDockedPanels, rightDockedPanels]);

  // Close/remove a panel from a zone
  const removePanelFromZone = useCallback((panelId: string, zone: DockZone) => {
    if (zone === 'bottom') {
      setBottomPanelTabs(prev => prev.filter(id => id !== panelId));
    } else if (zone === 'center') {
      setCenterDockedPanels(prev => prev.filter(id => id !== panelId));
    } else if (zone === 'right') {
      setRightDockedPanels(prev => prev.filter(id => id !== panelId));
    }
  }, []);

  // Auto-hide main workspace sidebar on initial page load
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setOpen(false);
    }
  }, [setOpen]);

  // Sync editor theme with app theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setEditorTheme(isDark ? "vs-dark" : "light");
    
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDarkNow = document.documentElement.classList.contains("dark");
          setEditorTheme(isDarkNow ? "vs-dark" : "light");
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Handle Monaco editor mount - register autocomplete providers
  const handleEditorMount = useCallback((editor: unknown, monaco: typeof import("monaco-editor")) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
    
    // Focus editor immediately so cursor is blinking and ready to type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any)?.focus?.();
    
    // Dispose previous provider if exists
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }
    
    // Register completion provider for Python
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['@', '.', '_', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        
        // Get the text before cursor on current line
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1).toLowerCase();
        
        const suggestions: import("monaco-editor").languages.CompletionItem[] = [];
        
        // Pipeline decorators
        if (textBeforeCursor.endsWith('@') || textBeforeCursor.includes('@dp') || textBeforeCursor.includes('@dlt')) {
          suggestions.push(
            {
              label: '@dp.table',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'dp.table\ndef ${1:table_name}():\n    """\n    ${2:Description of the table}\n    """\n    return (\n        spark.read.table("${3:source_table}")\n        ${4}\n    )',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new DLT table definition',
              detail: 'DLT Table Decorator',
              range,
            },
            {
              label: '@dp.view',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'dp.view\ndef ${1:view_name}():\n    """\n    ${2:Description of the view}\n    """\n    return (\n        spark.read.table("${3:source_table}")\n        ${4}\n    )',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new DLT view definition',
              detail: 'DLT View Decorator',
              range,
            },
            {
              label: '@dlt.table',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'dlt.table(\n    name="${1:table_name}",\n    comment="${2:Table description}"\n)\ndef ${1:table_name}():\n    return (\n        spark.read.table("${3:source_table}")\n        ${4}\n    )',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a DLT table with configuration',
              detail: 'DLT Table with Config',
              range,
            },
          );
        }
        
        // CREATE statements (SQL-like)
        if (textBeforeCursor.includes('create') || word.word.toLowerCase() === 'create') {
          suggestions.push(
            {
              label: 'CREATE MATERIALIZED VIEW',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'CREATE MATERIALIZED VIEW ${1:view_name} AS\nSELECT ${2:columns}\nFROM ${3:source_table}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a materialized view that stores query results',
              detail: 'Materialized View',
              range,
            },
            {
              label: 'CREATE STREAMING TABLE',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'CREATE STREAMING TABLE ${1:table_name} AS\nSELECT ${2:columns}\nFROM STREAM(${3:source_table})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a streaming table for real-time data',
              detail: 'Streaming Table',
              range,
            },
            {
              label: 'CREATE TABLE',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'CREATE TABLE ${1:table_name} (\n    ${2:column_definitions}\n)',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new table',
              detail: 'Table Definition',
              range,
            },
          );
        }
        
        // AS / SELECT statements
        if (textBeforeCursor.endsWith(' as') || textBeforeCursor.endsWith(' as ')) {
          suggestions.push(
            {
              label: 'SELECT',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT ${1:columns}\nFROM ${2:table}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Select columns from a table',
              range,
            },
            {
              label: 'SELECT DISTINCT',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT DISTINCT ${1:columns}\nFROM ${2:table}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Select unique rows',
              range,
            },
            {
              label: 'SELECT * FROM',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT * FROM ${1:table}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Select all columns from a table',
              range,
            },
          );
        }
        
        // Dataset references (sales_, customers_, orders_, etc.)
        if (word.word.toLowerCase().startsWith('sales')) {
          suggestions.push(
            { label: 'sales_2024', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'sales_2024', documentation: 'Sales data for 2024', detail: 'Dataset', range },
            { label: 'sales_forecast', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'sales_forecast', documentation: 'Sales forecast data', detail: 'Dataset', range },
            { label: 'sales_cleaned', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'sales_cleaned', documentation: 'Cleaned sales data', detail: 'Dataset', range },
            { label: 'sales_raw', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'sales_raw', documentation: 'Raw sales data', detail: 'Dataset', range },
          );
        }
        
        if (word.word.toLowerCase().startsWith('customer')) {
          suggestions.push(
            { label: 'customers', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'customers', documentation: 'Customer master data', detail: 'Dataset', range },
            { label: 'customers_cleaned', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'customers_cleaned', documentation: 'Cleaned customer data', detail: 'Dataset', range },
            { label: 'customers_active', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'customers_active', documentation: 'Active customers only', detail: 'Dataset', range },
          );
        }
        
        if (word.word.toLowerCase().startsWith('order')) {
          suggestions.push(
            { label: 'orders', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'orders', documentation: 'Order transaction data', detail: 'Dataset', range },
            { label: 'orders_cleaned', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'orders_cleaned', documentation: 'Cleaned order data', detail: 'Dataset', range },
            { label: 'orders_pending', kind: monaco.languages.CompletionItemKind.Variable, insertText: 'orders_pending', documentation: 'Pending orders', detail: 'Dataset', range },
          );
        }
        
        // Transformation functions
        if (word.word.toLowerCase().startsWith('transform')) {
          suggestions.push(
            {
              label: 'transform_normalize',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'transform_normalize(${1:column})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Normalize values in a column',
              detail: 'Transformation Function',
              range,
            },
            {
              label: 'transform_aggregate',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'transform_aggregate(${1:group_cols}, ${2:agg_cols})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Aggregate data by groups',
              detail: 'Transformation Function',
              range,
            },
            {
              label: 'transform_filter',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'transform_filter(${1:condition})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Filter rows by condition',
              detail: 'Transformation Function',
              range,
            },
            {
              label: 'transform_join',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'transform_join(${1:left_df}, ${2:right_df}, ${3:join_cols})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Join two dataframes',
              detail: 'Transformation Function',
              range,
            },
          );
        }
        
        // Spark functions
        if (textBeforeCursor.includes('spark.') || word.word.toLowerCase() === 'spark') {
          suggestions.push(
            {
              label: 'spark.read.table',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'spark.read.table("${1:table_name}")',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Read a table into a DataFrame',
              detail: 'Spark Read',
              range,
            },
            {
              label: 'spark.readStream.table',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'spark.readStream.table("${1:table_name}")',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Read a streaming table',
              detail: 'Spark Streaming',
              range,
            },
            {
              label: 'spark.sql',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'spark.sql("""\n    ${1:SELECT * FROM table}\n""")',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Execute SQL query',
              detail: 'Spark SQL',
              range,
            },
          );
        }
        
        // DataFrame operations (after a dot)
        if (textBeforeCursor.endsWith('.') || textBeforeCursor.match(/\)\s*$/)) {
          suggestions.push(
            { label: 'select', kind: monaco.languages.CompletionItemKind.Method, insertText: 'select(${1:columns})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Select columns', range },
            { label: 'filter', kind: monaco.languages.CompletionItemKind.Method, insertText: 'filter(${1:condition})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Filter rows', range },
            { label: 'where', kind: monaco.languages.CompletionItemKind.Method, insertText: 'where(${1:condition})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Filter rows (alias for filter)', range },
            { label: 'groupBy', kind: monaco.languages.CompletionItemKind.Method, insertText: 'groupBy(${1:columns})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Group by columns', range },
            { label: 'agg', kind: monaco.languages.CompletionItemKind.Method, insertText: 'agg(${1:aggregations})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Aggregate functions', range },
            { label: 'join', kind: monaco.languages.CompletionItemKind.Method, insertText: 'join(${1:other_df}, ${2:on}, "${3:inner}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Join with another DataFrame', range },
            { label: 'withColumn', kind: monaco.languages.CompletionItemKind.Method, insertText: 'withColumn("${1:col_name}", ${2:expression})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Add or replace a column', range },
            { label: 'drop', kind: monaco.languages.CompletionItemKind.Method, insertText: 'drop(${1:columns})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Drop columns', range },
            { label: 'orderBy', kind: monaco.languages.CompletionItemKind.Method, insertText: 'orderBy(${1:columns})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sort by columns', range },
            { label: 'distinct', kind: monaco.languages.CompletionItemKind.Method, insertText: 'distinct()', documentation: 'Remove duplicate rows', range },
            { label: 'limit', kind: monaco.languages.CompletionItemKind.Method, insertText: 'limit(${1:n})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Limit number of rows', range },
            { label: 'alias', kind: monaco.languages.CompletionItemKind.Method, insertText: 'alias("${1:name}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Rename column or expression', range },
          );
        }
        
        // Import suggestions
        if (textBeforeCursor.startsWith('from') || textBeforeCursor.startsWith('import')) {
          suggestions.push(
            { label: 'from pyspark import pipelines as dp', kind: monaco.languages.CompletionItemKind.Module, insertText: 'from pyspark import pipelines as dp', documentation: 'Import DLT pipelines module', range },
            { label: 'from pyspark.sql.functions import', kind: monaco.languages.CompletionItemKind.Module, insertText: 'from pyspark.sql.functions import ${1:col, when, lit}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import Spark SQL functions', range },
            { label: 'from pyspark.sql import functions as F', kind: monaco.languages.CompletionItemKind.Module, insertText: 'from pyspark.sql import functions as F', documentation: 'Import Spark functions as F', range },
            { label: 'import dlt', kind: monaco.languages.CompletionItemKind.Module, insertText: 'import dlt', documentation: 'Import DLT module', range },
          );
        }
        
        // Common SQL functions
        if (word.word.toLowerCase().startsWith('col') || word.word.toLowerCase().startsWith('f.')) {
          suggestions.push(
            { label: 'col', kind: monaco.languages.CompletionItemKind.Function, insertText: 'col("${1:column_name}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Reference a column', range },
            { label: 'count', kind: monaco.languages.CompletionItemKind.Function, insertText: 'count("${1:column}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Count rows', range },
            { label: 'sum', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sum("${1:column}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sum values', range },
            { label: 'avg', kind: monaco.languages.CompletionItemKind.Function, insertText: 'avg("${1:column}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Average value', range },
            { label: 'max', kind: monaco.languages.CompletionItemKind.Function, insertText: 'max("${1:column}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Maximum value', range },
            { label: 'min', kind: monaco.languages.CompletionItemKind.Function, insertText: 'min("${1:column}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Minimum value', range },
            { label: 'when', kind: monaco.languages.CompletionItemKind.Function, insertText: 'when(${1:condition}, ${2:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional expression', range },
            { label: 'otherwise', kind: monaco.languages.CompletionItemKind.Function, insertText: 'otherwise(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Default value for when()', range },
            { label: 'lit', kind: monaco.languages.CompletionItemKind.Function, insertText: 'lit(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a literal value', range },
          );
        }
        
        return { suggestions };
      },
    });
    
    // Cleanup on unmount
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  // Handle keyboard shortcuts (Cmd+S for save, Cmd+I for inline AI)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
      // Cmd+I or Ctrl+I for inline AI code generation
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setShowInlineAI(true);
        setGeneratedCodeDiff(null);
        setTimeout(() => inlineAIInputRef.current?.focus(), 50);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, openTabs]);

  // Tab management functions
  const openFile = useCallback((fileId: string, fileName: string) => {
    // Check if file is already open
    const existingTab = openTabs.find((tab) => tab.id === fileId);
    if (existingTab) {
      setActiveTabId(fileId);
      setSelectedFileId(fileId);
      setShowEmptyState(false);
      return;
    }
    
    // Get file content (check generated contents first, then sample contents, then regular contents)
    const fileData = generatedContentsRef.current[fileId] || sampleCodeContents[fileId] || fileContents[fileId];
    const content = fileData?.content || "";
    const language = fileData?.language || getLanguageFromFileName(fileName);
    
    // Create new tab
    const newTab: EditorTab = {
      id: fileId,
      name: fileName,
      content,
      language,
      isDirty: false,
      savedContent: content,
    };
    
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(fileId);
    setSelectedFileId(fileId);
    setShowEmptyState(false);
  }, [openTabs]);

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    setOpenTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex((tab) => tab.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
        setSelectedFileId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId("");
        setShowEmptyState(true);
        setShowQuickActions(true);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setSelectedFileId(tabId);
    setShowEmptyState(false);
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, content: value, isDirty: value !== tab.savedContent }
          : tab
      )
    );
    
    // Hide empty state when user types
    if (value.length > 0) {
      setShowEmptyState(false);
    }
  }, [activeTabId]);

  const handleSaveFile = useCallback(() => {
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, isDirty: false, savedContent: tab.content }
          : tab
      )
    );
    // TODO: Actually save to backend
    console.log("File saved:", activeTabId);
  }, [activeTabId]);

  // Helper to scroll tab into view and start editing
  const scrollToTabAndEdit = useCallback((tabId: string, tabName: string) => {
    // Use setTimeout to wait for the DOM to update
    setTimeout(() => {
      const tabElement = tabRefs.current.get(tabId);
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      // Start editing mode for rename
      setEditingTabId(tabId);
      setEditingTabName(tabName);
    }, 50);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ADD DEPENDENT DATASET FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  
  // Generate code template for dependent dataset
  const generateDependentCode = useCallback((
    datasetType: 'materialized' | 'streaming' | 'view',
    targetName: string,
    sourceName: string
  ): string => {
    switch (datasetType) {
      case 'materialized':
        return `CREATE MATERIALIZED VIEW ${targetName} AS
SELECT
    *
FROM ${sourceName}`;
      case 'streaming':
        return `CREATE STREAMING TABLE ${targetName} AS
SELECT
    *
FROM STREAM(LIVE.${sourceName})`;
      case 'view':
        return `CREATE VIEW ${targetName} AS
SELECT
    *
FROM ${sourceName}`;
      default:
        return '';
    }
  }, []);
  
  const addDependentDataset = useCallback((sourceNode: GraphNode, datasetType: 'materialized' | 'streaming' | 'view') => {
    const timestamp = Date.now();
    const newNodeId = `placeholder_${timestamp}`;
    const newFileId = `dependent_${timestamp}`;
    
    // Generate a clean name based on type and source
    const typePrefix = datasetType === 'materialized' ? 'mv' : datasetType === 'streaming' ? 'st' : 'v';
    const cleanSourceName = sourceNode.name.replace(/[^a-zA-Z0-9_]/g, '_');
    const newNodeName = `${typePrefix}_from_${cleanSourceName}`;
    const newFileName = `${newNodeName}.py`;
    
    // Generate code for the new transformation
    const generatedCode = generateDependentCode(datasetType, newNodeName, sourceNode.name);
    
    // Calculate position for new node (below and to the right of source)
    const existingNodes = graphData.nodes;
    let newX = sourceNode.position.x + 100;
    let newY = sourceNode.position.y + 180;
    
    // Avoid overlapping with existing nodes
    let attempts = 0;
    while (attempts < 10) {
      const hasOverlap = existingNodes.some(n => 
        Math.abs(n.position.x - newX) < 280 && Math.abs(n.position.y - newY) < 150
      );
      if (!hasOverlap) break;
      newX += 150;
      if (newX > sourceNode.position.x + 400) {
        newX = sourceNode.position.x;
        newY += 180;
      }
      attempts++;
    }
    
    // Create placeholder node (linked to the file)
    const newNode: GraphNode = {
      id: newNodeId,
      type: datasetType === 'materialized' ? 'materialized' : datasetType === 'streaming' ? 'streaming' : 'persisted',
      name: newNodeName,
      status: 'placeholder',
      duration: '',
      outputRecords: '',
      position: { x: newX, y: newY },
      isPlaceholder: true,
      sourceNodeId: sourceNode.id,
      fileId: newFileId,
    };
    
    // Create edge from source to new node
    const newEdge: GraphEdge = {
      id: `edge_${sourceNode.id}_${newNodeId}`,
      source: sourceNode.id,
      target: newNodeId,
      isDashed: true,
    };
    
    // Update graph data
    setGraphData(prev => ({
      nodes: [...prev.nodes, newNode],
      edges: [...prev.edges, newEdge],
    }));
    
    // ═══════════════════════════════════════════════════════════════════
    // FILE CREATION - Add file to transformations folder
    // ═══════════════════════════════════════════════════════════════════
    
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.type === "folder" && item.name === "transformations") {
            return {
              ...item,
              children: [...(item as FolderItem).children, { id: newFileId, name: newFileName, type: "file" as const }]
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
    
    // Ensure transformations folder is expanded
    setExpandedFolders(prev => new Set([...prev, "2"]));
    
    // Store generated content
    generatedContentsRef.current[newFileId] = { content: generatedCode, language: "python" };
    
    // Create and open new tab with generated code
    const newTab: EditorTab = {
      id: newFileId,
      name: newFileName,
      content: generatedCode,
      language: "python",
      isDirty: true,
      savedContent: "",
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newFileId);
    setSelectedFileId(newFileId);
    setShowEmptyState(false);
    
    // Increment counter for next placeholder
    setPlaceholderCounter(prev => prev + 1);
    
    // Select the new node in graph
    setSelectedGraphNode(newNodeId);
    
    // Highlight new file in tree
    setNewlyCreatedFiles(new Set([newFileId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);
    
    // Scroll to the new tab and start editing the name
    scrollToTabAndEdit(newFileId, newFileName);
    
    // Auto-pan graph to show the new node if needed
    if (graphContainerRef.current) {
      const containerRect = graphContainerRef.current.getBoundingClientRect();
      const nodeScreenX = (newX * graphZoom) + graphPan.x;
      const nodeScreenY = (newY * graphZoom) + graphPan.y;
      
      // Check if node is outside visible area
      if (nodeScreenX < 0 || nodeScreenX > containerRect.width - 280 || 
          nodeScreenY < 0 || nodeScreenY > containerRect.height - 150) {
        // Pan to center on new node
        setGraphPan({
          x: containerRect.width / 2 - (newX * graphZoom),
          y: containerRect.height / 2 - (newY * graphZoom),
        });
      }
    }
  }, [graphData, graphZoom, graphPan, placeholderCounter, generateDependentCode, scrollToTabAndEdit]);

  const createNewFile = useCallback((fileType: 'transformation' | 'exploration' | 'utility' = 'transformation') => {
    const timestamp = Date.now();
    let newId: string;
    let newName: string;
    let folderName: string;
    let folderId: string;
    let language: string;
    
    // Determine file properties based on type
    switch (fileType) {
      case 'exploration':
        newId = `exploration-${timestamp}`;
        newName = "untitled_exploration.ipynb";
        folderName = "explorations";
        folderId = "explorations-folder";
        language = "python";
        break;
      case 'utility':
        newId = `utility-${timestamp}`;
        newName = "untitled_utility.py";
        folderName = "utilities";
        folderId = "utilities-folder";
        language = "python";
        break;
      case 'transformation':
      default:
        newId = `transformation-${timestamp}`;
        newName = "untitled_transformation.py";
        folderName = "transformations";
        folderId = "2";
        language = "python";
        break;
    }
    
    // Add file to the appropriate folder in file tree
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.type === "folder" && item.name === folderName) {
            return {
              ...item,
              children: [...(item as FolderItem).children, { id: newId, name: newName, type: "file" as const }]
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
    
    // Ensure the folder is expanded
    setExpandedFolders(prev => new Set([...prev, folderId]));
    
    // Create and open new tab
    const newTab: EditorTab = {
      id: newId,
      name: newName,
      content: "",
      language: language,
      isDirty: true,
      savedContent: "",
    };
    
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setShowEmptyState(true);
    setShowQuickActions(true);
    
    // Scroll to the new tab and start editing
    scrollToTabAndEdit(newId, newName);
  }, [scrollToTabAndEdit]);

  // Tab name editing functions
  const startEditingTabName = useCallback((tabId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  }, []);

  const finishEditingTabName = useCallback(() => {
    if (!editingTabId || !editingTabName.trim()) {
      setEditingTabId(null);
      return;
    }
    
    const newName = editingTabName.trim();
    // Extract base name without extension for graph node
    const baseName = newName.replace(/\.(py|sql|json|md|txt)$/i, '');
    
    // Update tab name
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === editingTabId
          ? { ...tab, name: newName, language: getLanguageFromFileName(newName) }
          : tab
      )
    );
    
    // Update file tree - recursive function to find and update file
    const updateFileTreeName = (items: TreeItem[]): TreeItem[] => {
      return items.map((item) => {
        if (item.id === editingTabId && item.type === "file") {
          return { ...item, name: newName };
        }
        if (item.type === "folder" && item.children) {
          return { ...item, children: updateFileTreeName(item.children) };
        }
        return item;
      });
    };
    
    setFileTree((prev) => updateFileTreeName(prev));
    
    // Update graph node name if there's a linked placeholder node
    setGraphData(prev => {
      const linkedNode = prev.nodes.find(n => n.fileId === editingTabId);
      if (linkedNode) {
        // Also update the code content to reflect the new name
        const currentContent = generatedContentsRef.current[editingTabId];
        if (currentContent) {
          // Update the view/table name in the code
          const updatedContent = currentContent.content.replace(
            /(CREATE\s+(?:MATERIALIZED\s+VIEW|STREAMING\s+TABLE|VIEW)\s+)\S+/i,
            `$1${baseName}`
          );
          generatedContentsRef.current[editingTabId] = { content: updatedContent, language: currentContent.language };
          
          // Update the open tab content
          setOpenTabs(tabs => tabs.map(tab => 
            tab.id === editingTabId ? { ...tab, content: updatedContent } : tab
          ));
        }
        
        return {
          ...prev,
          nodes: prev.nodes.map(n => 
            n.fileId === editingTabId ? { ...n, name: baseName } : n
          )
        };
      }
      return prev;
    });
    
    setEditingTabId(null);
  }, [editingTabId, editingTabName]);

  const handleTabNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditingTabName();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  }, [finishEditingTabName]);

  // Focus tab name input when editing starts
  useEffect(() => {
    if (editingTabId && tabNameInputRef.current) {
      tabNameInputRef.current.focus();
      tabNameInputRef.current.select();
    }
  }, [editingTabId]);

  // Handle "Get sample code" button click
  const handleGetSampleCode = useCallback(async () => {
    // Ensure left panel is open to show file browser during generation
    setIsLeftPanelOpen(true);
    setLeftPanelTab("pipeline");
    
    // Phase 1: Show loading state
    setIsGeneratingSample(true);
    
    // Simulate generation time (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    // Phase 2: Generate file scaffold
    setFileTree(sampleFileTree);
    setExpandedFolders(new Set(["1", "2", "explorations-folder", "utilities-folder"]));
    
    // Mark newly created files for highlight animation
    const newFiles = new Set(["sample-users", "sample-aggregation", "sample-exploration", "sample-utils", "sample-readme", "explorations-folder", "utilities-folder"]);
    setNewlyCreatedFiles(newFiles);
    
    // Phase 3: Auto-open sample file
    const sampleFile = sampleCodeContents["sample-users"];
    const newTab: EditorTab = {
      id: "sample-users",
      name: "sample_users.py",
      content: sampleFile.content,
      language: sampleFile.language,
      isDirty: false,
      savedContent: sampleFile.content,
    };
    
    setOpenTabs([newTab]);
    setActiveTabId("sample-users");
    setSelectedFileId("sample-users");
    
    // Phase 4: Remove empty state and loading
    setShowEmptyState(false);
    setIsGeneratingSample(false);
    
    // Clear highlight animation after 2 seconds
    setTimeout(() => {
      setNewlyCreatedFiles(new Set());
    }, 2000);
  }, []);

  // Handle inline AI code generation (Databricks Notebooks style)
  const handleInlineAIGenerate = useCallback(async () => {
    if (!inlineAIPrompt.trim() || isInlineAIGenerating) return;
    
    const prompt = inlineAIPrompt.trim();
    setIsInlineAIGenerating(true);
    
    // Simulate AI thinking (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Parse @ mentions to extract table names
    const tableMentions = prompt.match(/@(\w+)/g);
    const tables = tableMentions ? tableMentions.map(t => t.slice(1)) : [];
    const primaryTable = tables[0] || "source_table";
    
    // Generate code based on the prompt
    let generatedCode = "";
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes("materialized view") || promptLower.includes("mv")) {
      const viewName = `${primaryTable}_mv`;
      generatedCode = `CREATE OR REFRESH MATERIALIZED VIEW ${viewName}
AS
SELECT *
FROM main.samples.${primaryTable};`;
    } else if (promptLower.includes("streaming") || promptLower.includes("stream")) {
      const tableName = `${primaryTable}_streaming`;
      generatedCode = `CREATE OR REFRESH STREAMING TABLE ${tableName}
AS
SELECT *
FROM STREAM(main.samples.${primaryTable});`;
    } else if (promptLower.includes("join") && tables.length >= 2) {
      const joinedName = tables.join("_") + "_joined";
      generatedCode = `CREATE OR REFRESH MATERIALIZED VIEW ${joinedName}
AS
SELECT *
FROM main.samples.${tables[0]} t1
JOIN main.samples.${tables[1]} t2
  ON t1.id = t2.id;`;
    } else if (promptLower.includes("filter") || promptLower.includes("where")) {
      generatedCode = `CREATE OR REFRESH MATERIALIZED VIEW ${primaryTable}_filtered
AS
SELECT *
FROM main.samples.${primaryTable}
WHERE status IS NOT NULL;`;
    } else if (promptLower.includes("aggregate") || promptLower.includes("group") || promptLower.includes("sum") || promptLower.includes("count")) {
      generatedCode = `CREATE OR REFRESH MATERIALIZED VIEW ${primaryTable}_aggregated
AS
SELECT 
  category,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM main.samples.${primaryTable}
GROUP BY category;`;
    } else {
      // Generic transformation
      generatedCode = `CREATE OR REFRESH MATERIALIZED VIEW ${primaryTable}_transformed
AS
SELECT *
FROM main.samples.${primaryTable};`;
    }
    
    setIsInlineAIGenerating(false);
    setGeneratedCodeDiff(generatedCode);
  }, [inlineAIPrompt, isInlineAIGenerating]);

  // Accept generated code from inline AI
  const acceptInlineAICode = useCallback(() => {
    if (!generatedCodeDiff) return;
    
    const currentTab = openTabs.find((tab) => tab.id === activeTabId);
    if (currentTab) {
      const currentContent = currentTab.content;
      const newContent = currentContent.trim() === "" 
        ? generatedCodeDiff 
        : currentContent + "\n\n" + generatedCodeDiff;
      
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, content: newContent, isDirty: newContent !== tab.savedContent }
            : tab
        )
      );
      setShowEmptyState(false);
      setShowQuickActions(false);
    }
    
    // Clean up
    setShowInlineAI(false);
    setInlineAIPrompt("");
    setGeneratedCodeDiff(null);
  }, [generatedCodeDiff, openTabs, activeTabId]);

  // Reject/dismiss inline AI
  const rejectInlineAI = useCallback(() => {
    setShowInlineAI(false);
    setInlineAIPrompt("");
    setGeneratedCodeDiff(null);
    setIsInlineAIGenerating(false);
  }, []);

  // Store generated contents for AI agent (so we can reference them when opening files)
  const generatedContentsRef = useRef<Record<string, { content: string; language: string }>>({});

  // Handle AI agent chat - generates pipeline from user prompt
  const handleAgentChat = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    const userPrompt = aiPrompt.trim();
    
    // Add user message to conversation immediately
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, userMessage]);
    
    // Ensure left panel is open to show file browser during generation
    setIsLeftPanelOpen(true);
    setLeftPanelTab("pipeline");
    
    // Open assistant panel to show conversation
    setActiveRightPanel("assistant");
    
    // Phase 1: Start "Thinking" animation
    setIsAgentThinking(true);
    setAgentThinkingText("Thinking");
    
    // Start animated dots
    let dotCount = 0;
    agentThinkingIntervalRef.current = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      const dots = '.'.repeat(dotCount);
      setAgentThinkingText(`Thinking${dots}`);
    }, 400);
    
    // Thinking phase (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    // Stop thinking animation
    if (agentThinkingIntervalRef.current) {
      clearInterval(agentThinkingIntervalRef.current);
      agentThinkingIntervalRef.current = null;
    }
    setIsAgentThinking(false);
    
    // Phase 2: Show loading skeleton (same as sample code)
    setIsGeneratingSample(true);
    
    // Parse the user prompt
    const parsedPrompt = parseUserPrompt(userPrompt);
    
    // Generate file tree and contents based on prompt
    const { tree, contents } = generateFileTreeFromPrompt(parsedPrompt);
    
    // Store generated contents for later file opening
    generatedContentsRef.current = contents;
    
    // Simulate skeleton display (500ms - 1s)
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Phase 3: Generate file scaffold with staggered animation
    setFileTree(tree);
    setExpandedFolders(new Set(["1", "2", "gen-utilities-folder"]));
    
    // Mark newly created files for highlight animation
    const newFileIds = new Set(Object.keys(contents));
    newFileIds.add("gen-utilities-folder");
    parsedPrompt.tables.forEach(t => newFileIds.add(`gen-${t}-cleaned`));
    setNewlyCreatedFiles(newFileIds);
    
    // Phase 4: Auto-open main transformation file
    const funcName = getFunctionName(parsedPrompt.tables);
    const mainFileId = `gen-${funcName}`;
    const mainFileContent = contents[mainFileId];
    
    // Build list of generated files for summary
    const generatedFiles: GeneratedFileInfo[] = Object.entries(contents).map(([id, data]) => {
      // Extract filename from the id
      let name = id.replace('gen-', '');
      if (id.includes('-cleaned')) {
        name = name.replace('-cleaned', '_cleaned.py');
      } else if (id === 'gen-utils') {
        name = 'utils.py';
      } else if (id === 'gen-readme') {
        name = 'README.md';
      } else {
        name = `${name}.py`;
      }
      return { id, name };
    });
    
    if (mainFileContent) {
      const newTab: EditorTab = {
        id: mainFileId,
        name: `${funcName}.py`,
        content: mainFileContent.content,
        language: mainFileContent.language,
        isDirty: false,
        savedContent: mainFileContent.content,
      };
      
      setOpenTabs([newTab]);
      setActiveTabId(mainFileId);
      setSelectedFileId(mainFileId);
    }
    
    // Phase 5: Remove empty state and loading
    setShowEmptyState(false);
    setIsGeneratingSample(false);
    setAiPrompt(""); // Clear the input
    
    // Phase 6: Add assistant response to conversation
    const summary = generateAssistantSummary(userPrompt, generatedFiles, parsedPrompt);
    const assistantMessage: ConversationMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: summary,
      timestamp: new Date(),
      generatedFiles: generatedFiles.map(f => f.id),
      parsedPrompt,
    };
    setConversationHistory(prev => [...prev, assistantMessage]);
    
    // Clear highlight animation after 2 seconds
    setTimeout(() => {
      setNewlyCreatedFiles(new Set());
    }, 2000);
    
    // Scroll to bottom of conversation
    setTimeout(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [aiPrompt]);

  // Stop agent thinking (cancel)
  const stopAgentThinking = useCallback(() => {
    if (agentThinkingIntervalRef.current) {
      clearInterval(agentThinkingIntervalRef.current);
      agentThinkingIntervalRef.current = null;
    }
    setIsAgentThinking(false);
    setIsGeneratingSample(false);
    setAgentThinkingText("Thinking");
    setIsFollowUpThinking(false);
  }, []);

  // Unified chat handler - works for both initial pipeline generation and follow-up questions
  // This is the main entry point for all AI chat interactions
  const handleUnifiedChat = useCallback(async () => {
    if (!chatInput.trim() || isAIThinking) return;
    
    const userPrompt = chatInput.trim();
    
    // Always open assistant panel to show conversation
    setActiveRightPanel("assistant");
    
    // Check if this is a pipeline generation request (first time or explicit generation keywords)
    const isPipelineGeneration = conversationHistory.length === 0 || 
      /create|build|generate|make|new.*pipeline|pipeline.*for|read.*from|join|transform/i.test(userPrompt);
    
    if (isPipelineGeneration && conversationHistory.length === 0) {
      // First message - trigger full pipeline generation via handleAgentChat
      handleAgentChat();
      return;
    }
    
    // Follow-up conversation
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, userMessage]);
    setChatInput("");
    
    // Show thinking state
    setIsAIThinking(true);
    
    // Simulate thinking (1.5-2 seconds for follow-up)
    await new Promise((resolve) => setTimeout(resolve, 1800));
    
    // Generate contextual response based on follow-up
    let responseContent = "";
    
    if (/add.*filter|filter.*for|only.*where/i.test(userPrompt)) {
      responseContent = `I've noted your request to add filtering. Here's what I suggest:\n\n**To add filtering:**\n• Open the main transformation file\n• Add a \`.filter()\` operation after reading the data\n• Example: \`result = result.filter(F.col("status") == "active")\`\n\nWould you like me to show you a specific filter example?`;
    } else if (/change.*join|left join|right join|outer join/i.test(userPrompt)) {
      responseContent = `To change the join type:\n\n**Current:** Inner join\n**Options available:**\n• \`"left"\` - Keep all records from the first table\n• \`"right"\` - Keep all records from the second table\n• \`"outer"\` - Keep all records from both tables\n\nUpdate the join type parameter in your transformation file.`;
    } else if (/add.*aggregation|aggregate|group by/i.test(userPrompt)) {
      responseContent = `To add aggregation:\n\n**Add a groupBy operation:**\n\`\`\`python\nresult = result.groupBy("category").agg(\n    F.count("*").alias("count"),\n    F.sum("amount").alias("total")\n)\n\`\`\`\n\nThis will group your data and calculate aggregates.`;
    } else if (/run|execute|test/i.test(userPrompt)) {
      responseContent = `To run the pipeline:\n\n1. Click the **"Run pipeline"** button in the top toolbar\n2. Or use **"Validate"** first to check for errors\n3. Monitor progress in the bottom panel\n\nThe pipeline will process your transformations in order.`;
    } else if (/explain|what does|how does/i.test(userPrompt)) {
      responseContent = `Here's a quick explanation of the generated code:\n\n**@dp.table decorator:**\n• Registers the function as a pipeline table\n• Databricks manages the lifecycle\n\n**spark.read.table():**\n• Reads data from a catalog table\n• Returns a DataFrame for processing\n\n**The transformation:**\n• Processes data using PySpark operations\n• Returns the final DataFrame\n\nLet me know if you'd like more details on any part!`;
    } else if (/create|build|generate|make|new/i.test(userPrompt)) {
      // New pipeline generation request
      responseContent = `I'll help you create a new transformation!\n\n**To generate new code:**\n• Describe what data you want to work with\n• Mention table names using @tablename\n• Specify operations (join, filter, aggregate)\n\n**Example:**\n"Create a pipeline that reads from @customers and @orders and joins them"\n\nWhat would you like to build?`;
    } else {
      responseContent = `I understand you're asking about: "${userPrompt}"\n\nHere are some things I can help with:\n• Adding filters or conditions\n• Changing join types\n• Adding aggregations\n• Explaining the generated code\n• Running the pipeline\n• Creating new transformations\n\nCould you provide more details about what you'd like to do?`;
    }
    
    // Add assistant response
    const assistantMessage: ConversationMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, assistantMessage]);
    setIsAIThinking(false);
    
    // Scroll to bottom
    setTimeout(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [chatInput, isAIThinking, conversationHistory.length, handleAgentChat]);

  // Legacy alias for backwards compatibility
  const handleFollowUpChat = handleUnifiedChat;

  // Handle clicking on a file reference in assistant panel
  const handleFileReferenceClick = useCallback((fileId: string) => {
    // Find the file in the tree and open it
    const findFileName = (items: TreeItem[], id: string): string | null => {
      for (const item of items) {
        if (item.id === id && item.type === 'file') {
          return item.name;
        }
        if (item.type === 'folder' && item.children) {
          const found = findFileName(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const fileName = findFileName(fileTree, fileId);
    if (fileName) {
      openFile(fileId, fileName);
    }
  }, [fileTree, openFile]);

  // Format duration (seconds) to display string
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  // Check if pipeline can be run (at least one file has content)
  const canRunPipeline = useCallback((): boolean => {
    // Check if any open tab has content
    const hasContent = openTabs.some(tab => tab.content.trim().length > 0);
    // Check if pipeline is not currently running
    const isNotRunning = pipelineState.status === 'idle' || pipelineState.status === 'completed' || pipelineState.status === 'stopped' || pipelineState.status === 'error';
    return hasContent && isNotRunning;
  }, [openTabs, pipelineState.status]);

  // Check if pipeline is "mature" (has existing content, has been run, or has multiple files)
  // This determines which empty state to show for new files
  const isPipelineMature = useCallback((): boolean => {
    // Condition 1: Pipeline has been run at least once
    if (hasRunPipeline) return true;
    
    // Condition 2: At least one OTHER file has code content (not the current file)
    const currentFileId = activeTabId;
    const otherFilesWithContent = openTabs.filter(
      tab => tab.id !== currentFileId && tab.content.trim().length > 0
    );
    if (otherFilesWithContent.length > 0) return true;
    
    // Condition 3: Multiple transformation files exist (user is adding 2nd, 3rd, etc.)
    const countFilesInTree = (items: TreeItem[]): number => {
      let count = 0;
      for (const item of items) {
        if (item.type === 'file') {
          count++;
        } else if (item.type === 'folder' && (item as FolderItem).children) {
          count += countFilesInTree((item as FolderItem).children);
        }
      }
      return count;
    };
    const totalFiles = countFilesInTree(fileTree);
    if (totalFiles > 1) return true;
    
    return false;
  }, [hasRunPipeline, openTabs, activeTabId, fileTree]);

  // Animate progress smoothly from current to target
  const animateProgress = useCallback((startProgress: number, targetProgress: number, duration: number, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const animate = () => {
        if (signal.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const currentProgress = startProgress + (targetProgress - startProgress) * easedProgress;
        
        setPipelineState(prev => {
          if (prev.status !== 'running') return prev;
          return { ...prev, progress: Math.round(currentProgress) };
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }, []);

  // Check if should show first-run modal
  const shouldShowFirstRunModal = useCallback((): boolean => {
    return (
      !hasRunPipeline &&           // First time running
      !hasCustomConfig &&          // Not customized via sidebar
      selectedCatalog === 'main' && // Still default catalog
      selectedSchema === 'default'  // Still default schema
    );
  }, [hasRunPipeline, hasCustomConfig, selectedCatalog, selectedSchema]);

  // Execute the actual pipeline run
  const executePipeline = useCallback(async (type: 'run' | 'dryRun') => {
    
    // Create abort controller for this run
    pipelineAbortController.current = new AbortController();
    const signal = pipelineAbortController.current.signal;
    
    const startTime = new Date();
    
    // Start pipeline execution
    setPipelineState({
      status: 'running',
      type,
      startTime,
      progress: 0,
      currentStage: 'Initializing...',
    });
    
    // Reset and start duration counter
    setExecutionDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setExecutionDuration(prev => prev + 1);
    }, 1000);
    
    // Reset results view state for new run
    setShowResultsView(false);
    setTableResults([]);
    setSelectedTableForPreview(null);
    setTablePreviewData(null);
    
    // Auto-open bottom panel and switch to Tables tab
    setIsBottomPanelOpen(true);
    setBottomPanelTab('tables');
    
    try {
      let currentProgress = 0;
      
      for (const stage of PIPELINE_STAGES) {
        if (signal.aborted) throw new Error('Aborted');
        
        // Update current stage
        setPipelineState(prev => {
          if (prev.status !== 'running') return prev;
          return { ...prev, currentStage: stage.status };
        });
        
        // Animate progress to this stage's target
        await animateProgress(currentProgress, stage.targetProgress, stage.duration, signal);
        currentProgress = stage.targetProgress;
      }
      
      // Stop duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Hold at 100% for a moment
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      // Mark as completed
      const finalDuration = Math.round((Date.now() - startTime.getTime()) / 1000);
      setPipelineState({ status: 'completed', duration: finalDuration, type });
      setHasRunPipeline(true); // Mark that pipeline has been run at least once
      setLastRunTimestamp(new Date());
      setLastRunStatus('complete');
      
      // Parse tables from ALL code sources and generate results/graph
      // Only parse files that are actually in the file tree (not sample code unless user loaded it)
      const activeFileIds = getFileIdsFromTree(fileTree);
      const parsedTables = parseTablesFromCode(openTabs, generatedContentsRef.current, sampleCodeContents, fileContents, activeFileIds);
      
      // Generate table results - pass existing results to preserve values where possible
      const tableResultsData = generateTableResultsFromCode(parsedTables, tableResults);
      setTableResults(tableResultsData);
      
      // Generate graph - pass existing graph to preserve node positions
      setGraphData(prevGraph => generateGraphFromCode(parsedTables, tableResultsData, prevGraph));
      
      // Add to run history
      setRunHistory(prev => [...prev, {
        id: `run-${Date.now()}`,
        status: 'success',
        duration: finalDuration,
        timestamp: new Date(),
      }]);
      
      // Transition to results view after a short delay
      setTimeout(() => {
        setShowResultsView(true);
        setBottomPanelTab("tables");
      }, 500);
      
    } catch (error) {
      if ((error as Error).message === 'Aborted') {
        // Handled by stopPipeline
        return;
      }
      // Handle other errors
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setPipelineState({ status: 'error', error: (error as Error).message || 'Pipeline execution failed' });
      setLastRunTimestamp(new Date());
      setLastRunStatus('failed');
    }
  }, [animateProgress, openTabs]);

  // Run pipeline - wrapper that checks for first-run modal
  const runPipeline = useCallback((type: 'run' | 'dryRun') => {
    if (!canRunPipeline()) return;
    
    // Check if should show first-run modal
    if (shouldShowFirstRunModal()) {
      pendingRunTypeRef.current = type;
      setModalCatalog(selectedCatalog);
      setModalSchema(selectedSchema);
      setShowFirstRunModal(true);
      return;
    }
    
    // Otherwise, proceed with run
    executePipeline(type);
  }, [canRunPipeline, shouldShowFirstRunModal, selectedCatalog, selectedSchema, executePipeline]);

  // Run single file - executes only the current file
  const runSingleFile = useCallback(async () => {
    if (!canRunPipeline()) return;
    if (!activeTabId) return;
    
    // Get the active tab
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    // Check if should show first-run modal
    if (shouldShowFirstRunModal()) {
      // For now, we'll just show a simple prompt - could extend this later
      setModalCatalog(selectedCatalog);
      setModalSchema(selectedSchema);
      setShowFirstRunModal(true);
      return;
    }
    
    // Create abort controller for this run
    pipelineAbortController.current = new AbortController();
    const signal = pipelineAbortController.current.signal;
    
    // Start execution
    setPipelineState({
      status: 'running',
      type: 'run',
      startTime: new Date(),
      progress: 0,
      currentStage: 'Initializing...'
    });
    
    // Reset and start duration counter
    setExecutionDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setExecutionDuration(prev => prev + 1);
    }, 1000);
    
    // Auto-open bottom panel and switch to Tables tab
    setIsBottomPanelOpen(true);
    setBottomPanelTab('tables');
    setShowResultsView(false);
    
    try {
      // Simulate execution stages
      let currentProgress = 0;
      
      for (const stage of PIPELINE_STAGES.slice(0, 2)) { // Only use first 2 stages for single file
        setPipelineState(prev => ({
          ...prev,
          currentStage: stage.status,
        } as PipelineState));
        
        await animateProgress(currentProgress, stage.targetProgress, stage.duration, signal);
        currentProgress = stage.targetProgress;
      }
      
      // Parse only the current file's tables
      const currentFileTables = parseTablesFromCode(
        [activeTab],
        generatedContentsRef.current,
        sampleCodeContents,
        fileContents,
        new Set([activeTabId])
      );
      
      // Get existing tables to mark as skipped
      const existingTableNames = new Set(tableResults.map(t => t.name));
      const newTableNames = new Set(currentFileTables.map(t => t.name));
      
      // Generate results for the current file
      const newTableResults = currentFileTables.map((table, index) => {
        const isStreaming = table.name.toLowerCase().includes('stream') || 
                           table.name.toLowerCase().includes('raw') ||
                           table.name.toLowerCase().includes('cleaned');
        
        return {
          id: `table-${table.name}`,
          status: 'success' as const,
          name: table.name,
          type: isStreaming ? 'Streaming table' as const : 'Materialized view' as const,
          duration: `${10 + index * 8}s`,
          written: `${Math.floor(Math.random() * 50 + 5)}K`,
          updated: `${Math.floor(Math.random() * 10 + 1)}K`,
          expectations: 'Not defined',
          dropped: 0,
          warnings: 0,
          failed: 0,
          fileId: table.fileId,
        };
      });
      
      // Mark existing tables as skipped (unless they're in the new results)
      const skippedResults = tableResults
        .filter(result => !newTableNames.has(result.name))
        .map(result => ({
          ...result,
          status: 'skipped' as const,
        }));
      
      // Combine: new results first, then skipped ones
      const combinedResults = [...newTableResults, ...skippedResults];
      
      // Complete the progress
      await animateProgress(currentProgress, 100, 800, signal);
      
      // Set final results
      setTableResults(combinedResults);
      
      // Generate graph with all tables
      const allParsedTables = [
        ...currentFileTables,
        ...parseTablesFromCode(openTabs, generatedContentsRef.current, sampleCodeContents, fileContents)
          .filter(t => !newTableNames.has(t.name))
      ];
      setGraphData(prevGraph => generateGraphFromCode(allParsedTables, combinedResults, prevGraph));
      
      // Add to run history
      const historyEntry: RunHistoryEntry = {
        id: `run-${Date.now()}`,
        timestamp: new Date(),
        status: 'success',
        duration: executionDuration,
        type: 'run',
        tablesProcessed: currentFileTables.length,
      };
      setRunHistory(prev => [historyEntry, ...prev].slice(0, 50));
      
      // Complete execution
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Clean up abort controller
      pipelineAbortController.current = null;
      
      setPipelineState({ 
        status: 'completed', 
        duration: executionDuration,
        type: 'run'
      });
      
      // Show results view after a brief delay, then open preview
      setTimeout(() => {
        setShowResultsView(true);
        
        // Automatically open data preview for the first newly created table
        if (newTableResults.length > 0) {
          setTimeout(() => {
            openTablePreview(newTableResults[0], 'tables');
          }, 300);
        }
      }, 500);
      
    } catch (error) {
      // Handle errors
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Clean up abort controller
      pipelineAbortController.current = null;
      
      setPipelineState({
        status: 'error',
        error: 'Pipeline execution failed'
      });
    }
  }, [canRunPipeline, activeTabId, openTabs, shouldShowFirstRunModal, selectedCatalog, selectedSchema, 
      animateProgress, tableResults, executionDuration, generatedContentsRef, sampleCodeContents, fileContents, openTablePreview]);

  // Handle running from the first-run modal
  const handleRunFromModal = useCallback(() => {
    // Save the config from modal
    setSelectedCatalog(modalCatalog);
    setSelectedSchema(modalSchema);
    setHasCustomConfig(true);
    
    // Close modal
    setShowFirstRunModal(false);
    setIsModalCatalogDropdownOpen(false);
    setIsModalSchemaDropdownOpen(false);
    setModalCatalogSearchInput("");
    setModalSchemaSearchInput("");
    
    // Run pipeline with the pending type
    const runType = pendingRunTypeRef.current || 'run';
    pendingRunTypeRef.current = null;
    executePipeline(runType);
  }, [modalCatalog, modalSchema, executePipeline]);

  // Cancel first-run modal
  const handleCancelFirstRunModal = useCallback(() => {
    setShowFirstRunModal(false);
    setIsModalCatalogDropdownOpen(false);
    setIsModalSchemaDropdownOpen(false);
    setModalCatalogSearchInput("");
    setModalSchemaSearchInput("");
    pendingRunTypeRef.current = null;
  }, []);

  // Stop pipeline execution
  const stopPipeline = useCallback(() => {
    setShowStopConfirmModal(true);
  }, []);

  // Confirm stop pipeline
  const confirmStopPipeline = useCallback(() => {
    // Abort the running pipeline
    if (pipelineAbortController.current) {
      pipelineAbortController.current.abort();
      pipelineAbortController.current = null;
    }
    
    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Update state
    setPipelineState({ status: 'stopped', duration: executionDuration });
    setShowStopConfirmModal(false);
    setLastRunTimestamp(new Date());
    setLastRunStatus('canceled');
    
    // Show stopped state for 2 seconds then reset to idle
    setTimeout(() => {
      setPipelineState({ status: 'idle' });
    }, 2000);
  }, [executionDuration]);

  // Cancel stop confirmation
  const cancelStopPipeline = useCallback(() => {
    setShowStopConfirmModal(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (pipelineAbortController.current) {
        pipelineAbortController.current.abort();
      }
    };
  }, []);

  // Keyboard shortcut: Escape to stop running pipeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pipelineState.status === 'running') {
        e.preventDefault();
        stopPipeline();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pipelineState.status, stopPipeline]);

  // Get active tab
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  // Helper to find parent folder in tree
  const findParentFolder = useCallback((items: TreeItem[], targetId: string): FolderItem | null => {
    for (const item of items) {
      if (item.type === "folder") {
        const folder = item as FolderItem;
        if (folder.children?.some(child => child.id === targetId)) {
          return folder;
        }
        const found = findParentFolder(folder.children || [], targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper to check if file is in transformations folder
  const isInTransformationsFolder = useCallback((fileId: string): boolean => {
    const transformationsFolder = fileTree[0]?.type === "folder" 
      ? (fileTree[0] as FolderItem).children?.find(c => c.name === "transformations")
      : null;
    if (!transformationsFolder || transformationsFolder.type !== "folder") return false;
    return (transformationsFolder as FolderItem).children?.some(c => c.id === fileId) || false;
  }, [fileTree]);

  // Create new transformation file
  const createNewTransformation = useCallback(() => {
    const newId = `transformation-${Date.now()}`;
    const newFileName = `transformation_${transformationCounter}.py`;
    
    // Add file to transformations folder
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.type === "folder" && item.name === "transformations") {
            return {
              ...item,
              children: [...(item as FolderItem).children, { id: newId, name: newFileName, type: "file" as const }]
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
    
    // Ensure transformations folder is expanded
    setExpandedFolders(prev => new Set([...prev, "2"]));
    
    // Create and open new tab
    const newTab: EditorTab = {
      id: newId,
      name: newFileName,
      content: "",
      language: "python",
      isDirty: false,
      savedContent: "",
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setSelectedFileId(newId);
    setShowEmptyState(true);
        setShowQuickActions(true);
    setTransformationCounter(prev => prev + 1);
    
    // Highlight new file
    setNewlyCreatedFiles(new Set([newId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);
    
    // Scroll to the new tab and start editing
    scrollToTabAndEdit(newId, newFileName);
  }, [transformationCounter, scrollToTabAndEdit]);

  // Create new folder
  const createNewFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    
    const newId = `folder-${Date.now()}`;
    const folderItem: FolderItem = {
      id: newId,
      name: newFolderName.trim(),
      type: "folder",
      expanded: false,
      children: [],
    };
    
    setFileTree(prev => {
      if (newFolderParentId === null || newFolderParentId === "1") {
        // Add to root level (inside pipeline folder)
        return prev.map(item => {
          if (item.id === "1" && item.type === "folder") {
            return { ...item, children: [...(item as FolderItem).children, folderItem] };
          }
          return item;
        });
      } else {
        // Add to specific parent folder
        const updateTree = (items: TreeItem[]): TreeItem[] => {
          return items.map(item => {
            if (item.id === newFolderParentId && item.type === "folder") {
              return { ...item, children: [...(item as FolderItem).children, folderItem] };
            }
            if (item.type === "folder") {
              return { ...item, children: updateTree((item as FolderItem).children) };
            }
            return item;
          });
        };
        return updateTree(prev);
      }
    });
    
    // Highlight new folder
    setNewlyCreatedFiles(new Set([newId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);
    
    // Reset modal state
    setShowNewFolderModal(false);
    setNewFolderName("");
    setNewFolderIncludeAsSource(false);
    setNewFolderParentId(null);
  }, [newFolderName, newFolderParentId]);

  // Create file in specific folder
  const createFileInFolder = useCallback((folderId: string) => {
    const newId = `file-${Date.now()}`;
    const newFileName = `new_file.py`;
    
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => {
          if (item.id === folderId && item.type === "folder") {
            return {
              ...item,
              expanded: true,
              children: [...(item as FolderItem).children, { id: newId, name: newFileName, type: "file" as const }]
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
    
    // Ensure folder is expanded
    setExpandedFolders(prev => new Set([...prev, folderId]));
    
    // Create and open new tab
    const newTab: EditorTab = {
      id: newId,
      name: newFileName,
      content: "",
      language: "python",
      isDirty: false,
      savedContent: "",
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setSelectedFileId(newId);
    setShowEmptyState(true);
        setShowQuickActions(true);
    
    // Highlight new file
    setNewlyCreatedFiles(new Set([newId]));
    setTimeout(() => setNewlyCreatedFiles(new Set()), 2000);
    
    // Scroll to the new tab and start editing
    scrollToTabAndEdit(newId, newFileName);
  }, [scrollToTabAndEdit]);

  // Open folder creation modal for specific parent
  const openNewFolderModal = useCallback((parentId: string | null = null) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setNewFolderIncludeAsSource(false);
    setShowNewFolderModal(true);
  }, []);

  // Delete file
  const deleteFile = useCallback((fileId: string) => {
    // Remove from tree
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items
          .filter(item => item.id !== fileId)
          .map(item => {
            if (item.type === "folder") {
              return { ...item, children: updateTree((item as FolderItem).children) };
            }
            return item;
          });
      };
      return updateTree(prev);
    });
    
    // Close tab if open
    closeTab(fileId);
  }, [closeTab]);

  // Delete folder
  const deleteFolder = useCallback((folderId: string) => {
    // Get all file IDs in folder to close their tabs
    const getFileIds = (items: TreeItem[]): string[] => {
      return items.flatMap(item => {
        if (item.type === "file") return [item.id];
        if (item.type === "folder") return getFileIds((item as FolderItem).children);
        return [];
      });
    };
    
    // Find folder and get its files
    const findFolder = (items: TreeItem[]): FolderItem | null => {
      for (const item of items) {
        if (item.id === folderId && item.type === "folder") return item as FolderItem;
        if (item.type === "folder") {
          const found = findFolder((item as FolderItem).children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const folder = findFolder(fileTree);
    if (folder) {
      const fileIds = getFileIds(folder.children);
      fileIds.forEach(id => closeTab(id));
    }
    
    // Remove folder from tree
    setFileTree(prev => {
      const updateTree = (items: TreeItem[]): TreeItem[] => {
        return items
          .filter(item => item.id !== folderId)
          .map(item => {
            if (item.type === "folder") {
              return { ...item, children: updateTree((item as FolderItem).children) };
            }
            return item;
          });
      };
      return updateTree(prev);
    });
  }, [fileTree, closeTab]);

  // Focus input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Close context menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  // Threshold below which dragging closes the panel
  const CLOSE_THRESHOLD = 100;

  // Calculate maximum allowed panel width based on current viewport
  const getMaxLeftPanelWidth = useCallback(() => {
    if (!containerRef.current) return PANEL_SIZES.left.max;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const rightPanelActualWidth = activeRightPanel ? rightPanelWidth : 0;
    const usedWidth = PANEL_SIZES.toolbar * 2 + rightPanelActualWidth + PANEL_SIZES.minEditor;
    return Math.min(PANEL_SIZES.left.max, Math.max(CLOSE_THRESHOLD, containerWidth - usedWidth));
  }, [activeRightPanel, rightPanelWidth]);

  const getMaxRightPanelWidth = useCallback(() => {
    if (!containerRef.current) return PANEL_SIZES.right.max;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const leftPanelActualWidth = isLeftPanelOpen ? leftPanelWidth : 0;
    const usedWidth = PANEL_SIZES.toolbar * 2 + leftPanelActualWidth + PANEL_SIZES.minEditor;
    return Math.min(PANEL_SIZES.right.max, Math.max(CLOSE_THRESHOLD, containerWidth - usedWidth));
  }, [isLeftPanelOpen, leftPanelWidth]);

  // Resize handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    if (isResizingLeft) {
      const newWidth = e.clientX - containerRect.left - PANEL_SIZES.toolbar;
      
      // If dragged below threshold, close the panel
      if (newWidth < CLOSE_THRESHOLD) {
        setIsLeftPanelOpen(false);
        setIsResizingLeft(false);
        document.body.style.cursor = "";
        return;
      }
      
      // Clamp to dynamic max based on available space
      const maxWidth = getMaxLeftPanelWidth();
      const clampedWidth = Math.min(maxWidth, Math.max(CLOSE_THRESHOLD, newWidth));
      setLeftPanelWidth(clampedWidth);
    }
    
    if (isResizingRight) {
      const newWidth = containerRect.right - e.clientX - PANEL_SIZES.toolbar;
      
      // If dragged below threshold, close the panel
      if (newWidth < CLOSE_THRESHOLD) {
        setActiveRightPanel(null);
        setIsResizingRight(false);
        document.body.style.cursor = "";
        return;
      }
      
      // Clamp to dynamic max based on available space
      const maxWidth = getMaxRightPanelWidth();
      const clampedWidth = Math.min(maxWidth, Math.max(CLOSE_THRESHOLD, newWidth));
      setRightPanelWidth(clampedWidth);
    }
    
    if (isResizingBottom) {
      const newHeight = containerRect.bottom - e.clientY;
      
      // If dragged below threshold, close the panel
      if (newHeight < CLOSE_THRESHOLD) {
        setIsBottomPanelOpen(false);
        setIsResizingBottom(false);
        document.body.style.cursor = "";
        return;
      }
      
      // Clamp to max only (no min, user can drag to close)
      const clampedHeight = Math.min(PANEL_SIZES.bottom.max, newHeight);
      setBottomPanelHeight(clampedHeight);
    }
  }, [isResizingLeft, isResizingRight, isResizingBottom, getMaxLeftPanelWidth, getMaxRightPanelWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
    setIsResizingBottom(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (isResizingLeft || isResizingRight || isResizingBottom) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingLeft, isResizingRight, isResizingBottom, handleMouseMove, handleMouseUp]);

  // Start resize handlers
  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    document.body.style.cursor = "col-resize";
  }, []);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    document.body.style.cursor = "col-resize";
  }, []);

  const startResizeBottom = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
    document.body.style.cursor = "row-resize";
  }, []);

  // Adjust panel widths when window resizes to prevent overflow
  useEffect(() => {
    const adjustPanelWidths = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      
      if (containerWidth === 0) return; // Not rendered yet
      
      // Calculate current used width
      const leftPanelActualWidth = isLeftPanelOpen ? leftPanelWidth : 0;
      const rightPanelActualWidth = activeRightPanel ? rightPanelWidth : 0;
      const toolbarsWidth = PANEL_SIZES.toolbar * 2;
      const resizeHandlesWidth = (isLeftPanelOpen ? 4 : 0) + (activeRightPanel ? 4 : 0);
      const totalUsed = toolbarsWidth + leftPanelActualWidth + rightPanelActualWidth + resizeHandlesWidth;
      
      // If total used exceeds container, reduce panel widths proportionally
      if (totalUsed > containerWidth - PANEL_SIZES.minEditor) {
        const availableForPanels = Math.max(0, containerWidth - toolbarsWidth - resizeHandlesWidth - PANEL_SIZES.minEditor);
        
        if (availableForPanels < CLOSE_THRESHOLD) {
          // Not enough space, close panels
          if (activeRightPanel) setActiveRightPanel(null);
          if (isLeftPanelOpen && availableForPanels < CLOSE_THRESHOLD) setIsLeftPanelOpen(false);
        } else if (leftPanelActualWidth > 0 && rightPanelActualWidth > 0) {
          // Both panels open, distribute available space
          const ratio = leftPanelActualWidth / (leftPanelActualWidth + rightPanelActualWidth);
          const newLeftWidth = Math.max(CLOSE_THRESHOLD, Math.floor(availableForPanels * ratio));
          const newRightWidth = Math.max(CLOSE_THRESHOLD, availableForPanels - newLeftWidth);
          setLeftPanelWidth(newLeftWidth);
          setRightPanelWidth(newRightWidth);
        } else if (leftPanelActualWidth > 0) {
          // Only left panel open
          setLeftPanelWidth(Math.max(CLOSE_THRESHOLD, Math.min(leftPanelWidth, availableForPanels)));
        } else if (rightPanelActualWidth > 0) {
          // Only right panel open
          setRightPanelWidth(Math.max(CLOSE_THRESHOLD, Math.min(rightPanelWidth, availableForPanels)));
        }
      }
    };

    window.addEventListener('resize', adjustPanelWidths);
    
    // Run on mount and after a short delay to ensure container is rendered
    adjustPanelWidths();
    const timeoutId = setTimeout(adjustPanelWidths, 100);
    
    return () => {
      window.removeEventListener('resize', adjustPanelWidths);
      clearTimeout(timeoutId);
    };
  }, [isLeftPanelOpen, leftPanelWidth, activeRightPanel, rightPanelWidth]);

  // Toggle handlers using existing toolbar icons
  const handleLeftToolbarClick = (tab: string) => {
    if (isLeftPanelOpen && leftPanelTab === tab) {
      // Close panel if clicking the same tab
      setIsLeftPanelOpen(false);
    } else {
      // Open panel and switch to tab
      setIsLeftPanelOpen(true);
      setLeftPanelTab(tab);
    }
  };

  const handleRightToolbarClick = (panel: "comments" | "history" | "assistant") => {
    if (activeRightPanel === panel) {
      // Close panel if clicking the same icon
      setActiveRightPanel(null);
    } else {
      // Open panel with content
      setActiveRightPanel(panel);
    }
  };

  const handleBottomPanelToggle = () => {
    setIsBottomPanelOpen(!isBottomPanelOpen);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCatalogItem = (id: string) => {
    setExpandedCatalogItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Render catalog tree
  const renderCatalogTree = () => {
    const filteredCatalogs = catalogSearch
      ? catalogData.filter((cat) =>
          cat.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          cat.schemas?.some(
            (schema) =>
              schema.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
              schema.tables?.some((table) =>
                table.name.toLowerCase().includes(catalogSearch.toLowerCase())
              )
          )
        )
      : catalogData;

    return filteredCatalogs.map((catalog) => {
      const isCatalogExpanded = expandedCatalogItems.has(catalog.id);
      
      return (
        <div key={catalog.id}>
          <button
            onClick={() => toggleCatalogItem(catalog.id)}
            className={`w-full flex items-center gap-1.5 py-1.5 px-2 hover:bg-accent text-sm group ${
              selectedCatalogItem === catalog.id ? "bg-accent" : ""
            }`}
          >
            {isCatalogExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <HardDrive className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-grey-400)' }} />
            <span className="truncate flex-1 text-left font-medium">{catalog.name}</span>
          </button>
          
          {isCatalogExpanded && catalog.schemas?.map((schema) => {
            const isSchemaExpanded = expandedCatalogItems.has(schema.id);
            
            return (
              <div key={schema.id}>
                <button
                  onClick={() => toggleCatalogItem(schema.id)}
                  className={`w-full flex items-center gap-1.5 py-1.5 px-2 hover:bg-accent text-sm group ${
                    selectedCatalogItem === schema.id ? "bg-accent" : ""
                  }`}
                  style={{ paddingLeft: "20px" }}
                >
                  {isSchemaExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <Database className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-grey-400)' }} />
                  <span className="truncate flex-1 text-left">{schema.name}</span>
                </button>
                
                {isSchemaExpanded && schema.tables?.map((table) => {
                  const isTableExpanded = expandedCatalogItems.has(table.id);
                  
                  return (
                    <div key={table.id}>
                      <button
                        onClick={() => {
                          toggleCatalogItem(table.id);
                          setSelectedCatalogItem(table.id);
                        }}
                        className={`w-full flex items-center gap-1.5 py-1.5 px-2 hover:bg-accent text-sm group ${
                          selectedCatalogItem === table.id ? "bg-accent" : ""
                        }`}
                        style={{ paddingLeft: "40px" }}
                      >
                        {table.columns && table.columns.length > 0 ? (
                          isTableExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )
                        ) : (
                          <div className="w-3" />
                        )}
                        {table.type === "view" ? (
                          <Eye className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-grey-400)' }} />
                        ) : (
                          <Table className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-grey-400)' }} />
                        )}
                        <span className="truncate flex-1 text-left">{table.name}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                          {table.type}
                        </span>
                      </button>
                      
                      {isTableExpanded && table.columns?.map((column) => (
                        <div
                          key={column.id}
                          className="flex items-center gap-1.5 py-1 px-2 text-sm text-muted-foreground"
                          style={{ paddingLeft: "60px" }}
                        >
                          {getDataTypeIcon(column.dataType)}
                          <span className="truncate">{column.name}</span>
                          <span className="text-xs ml-auto opacity-70">{column.dataType}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string, type: "file" | "folder") => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, itemId, type });
  };

  const closeContextMenu = () => setContextMenu(null);

  const renderFileTree = (items: TreeItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.id);
      const isSelected = selectedFileId === item.id;
      const isNewlyCreated = newlyCreatedFiles.has(item.id);
      const paddingLeft = depth * 12 + 8;

      if (item.type === "folder") {
        const folderItem = item as FolderItem;
        return (
          <div 
            key={item.id}
            className={isNewlyCreated ? "animate-fade-in-highlight" : ""}
          >
            <div
              onClick={() => toggleFolder(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item.id, "folder")}
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
                  handleContextMenu(e, item.id, "folder");
                }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            {isExpanded && folderItem.children && renderFileTree(folderItem.children, depth + 1)}
          </div>
        );
      }

      return (
        <div
          key={item.id}
          onClick={() => openFile(item.id, item.name)}
          onContextMenu={(e) => handleContextMenu(e, item.id, "file")}
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
              handleContextMenu(e, item.id, "file");
            }}
            className={`h-5 w-5 flex items-center justify-center rounded hover:bg-muted ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <MoreVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      );
    });
  };

  // Left sidebar content
  const renderLeftSidebarContent = () => {
    if (leftPanelTab === "catalog") {
      return (
        <>
          <div className="px-3 py-2 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Catalog</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search catalog..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="h-7 pl-7 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto py-1">
            {renderCatalogTree()}
          </div>
          <div className="border-t px-3 py-2">
            <Button variant="ghost" size="sm" className="w-full h-7 text-sm gap-1.5 justify-start">
              <Filter className="h-3.5 w-3.5" />
              Filter catalogs
            </Button>
          </div>
        </>
      );
    }

    // Show skeleton during sample code generation
    if (isGeneratingSample) {
      return (
        <>
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-primary text-foreground`}
            >
              Pipeline
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground`}
            >
              All files
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <FileTreeSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex border-b">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
              leftPanelTab === "pipeline"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLeftPanelTab("pipeline")}
          >
            Pipeline
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
              leftPanelTab === "files"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLeftPanelTab("files")}
          >
            All files
          </button>
        </div>
        <div className="flex-1 overflow-auto py-1" onClick={closeContextMenu}>
          <div>
            <div className="flex items-center gap-1 py-1 px-2 hover:bg-accent text-sm group">
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
              <FolderOpen className="h-4 w-4 text-blue-500" />
              <span className="truncate flex-1 text-left">{pipelineName}</span>
              
              {/* + Button - Always visible on root folder */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem 
                    className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                    onClick={createNewTransformation}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" />
                      Transformation
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">
                      SQL or Python files with table definitions
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-0.5 py-2 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium">
                      <FlaskConical className="h-4 w-4" />
                      Exploration
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">
                      Notebooks for explorative data analysis
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-0.5 py-2 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium">
                      <Wrench className="h-4 w-4" />
                      Utility
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">
                      Files to define reusable Python modules
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => openNewFolderModal("1")}
                  >
                    <FolderPlus className="h-4 w-4" />
                    New folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3-dots Button - Always visible on root folder */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                    <Move className="h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                    <Settings2 className="h-4 w-4" />
                    Configure new root folder
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                    <Link className="h-4 w-4" />
                    Copy URL path
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete pipeline folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {fileTree[0].type === "folder" && renderFileTree((fileTree[0] as FolderItem).children, 1)}
          </div>
        </div>

        {contextMenu && (
          <div
            className="fixed bg-popover border rounded-md shadow-md py-1 z-50 min-w-48"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === "folder" ? (
              <>
                {/* Folder context menu */}
                <button 
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                  onClick={() => {
                    createFileInFolder(contextMenu.itemId);
                    closeContextMenu();
                  }}
                >
                  <FilePlus className="h-4 w-4" />
                  Create file
                </button>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                  onClick={() => {
                    openNewFolderModal(contextMenu.itemId);
                    closeContextMenu();
                  }}
                >
                  <FolderPlus className="h-4 w-4" />
                  Create folder
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Pencil className="h-4 w-4" />
                  Rename folder
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Move className="h-4 w-4" />
                  Move folder
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Copy className="h-4 w-4" />
                  Clone
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Link className="h-4 w-4" />
                  Copy URL path
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <div className="h-px bg-border my-1" />
                <button 
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left text-destructive"
                  onClick={() => {
                    deleteFolder(contextMenu.itemId);
                    closeContextMenu();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete folder
                </button>
              </>
            ) : (
              <>
                {/* File context menu */}
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Pencil className="h-4 w-4" />
                  Rename
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Move className="h-4 w-4" />
                  Move
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Copy className="h-4 w-4" />
                  Clone
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                  <Link className="h-4 w-4" />
                  Copy URL path
                </button>
                {/* Show "Include as pipeline source code" only for files outside transformations folder */}
                {!isInTransformationsFolder(contextMenu.itemId) && (
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left">
                    <Settings2 className="h-4 w-4" />
                    Include as pipeline source code
                  </button>
                )}
                <div className="h-px bg-border my-1" />
                <button 
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left text-destructive"
                  onClick={() => {
                    deleteFile(contextMenu.itemId);
                    closeContextMenu();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete file
                </button>
              </>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
      {/* Pipeline Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-card gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-shrink overflow-hidden">
          <div className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-grey-50)' }}>
            <Zap className="h-4 w-4" style={{ color: 'var(--color-grey-500)' }} />
          </div>
          
          {isEditingName ? (
            <Input
              ref={nameInputRef}
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={handleNameKeyDown}
              className="h-7 text-sm font-medium w-64 px-2"
            />
          ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-1.5 hover:bg-accent px-2 py-1 rounded text-sm font-medium truncate group"
          >
            <span className="truncate">{pipelineName}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Catalog and Schema tags */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
          <button
            onClick={() => {
              setTempCatalog(selectedCatalog);
              setTempSchema(selectedSchema);
              setIsConfigPanelOpen(true);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            title="Configure catalog and schema"
          >
            <Database className="h-3 w-3" />
            <span>{selectedCatalog}</span>
          </button>
          <span>·</span>
          <button
            onClick={() => {
              setTempCatalog(selectedCatalog);
              setTempSchema(selectedSchema);
              setIsConfigPanelOpen(true);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            title="Configure catalog and schema"
          >
            <Database className="h-3 w-3" />
            <span>{selectedSchema}</span>
          </button>
        </div>
        
          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
                disabled={pipelineState.status === 'running' || pipelineState.status === 'stopping'}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-3.5 w-3.5" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <ExternalLink className="h-3.5 w-3.5" />
                Go to monitoring
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="h-3.5 w-3.5" />
                Delete pipeline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Compute button with tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
                disabled={pipelineState.status === 'running' || pipelineState.status === 'stopping'}
              >
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pipeline compute</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Settings action */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 gap-1.5"
            disabled={pipelineState.status === 'running' || pipelineState.status === 'stopping'}
          >
            <Settings className="h-3.5 w-3.5 lg:hidden" />
            <span className="hidden lg:inline">Settings</span>
          </Button>
          
          {/* Primary actions - Dry Run / Stop (for dry run) */}
          {pipelineState.status === 'running' && pipelineState.type === 'dryRun' ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1.5"
              onClick={stopPipeline}
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7"
              onClick={() => runPipeline('dryRun')}
              disabled={!canRunPipeline() || (pipelineState.status === 'running' && pipelineState.type === 'run')}
              title={!canRunPipeline() ? "Add code to a file to run the pipeline" : undefined}
            >
              Dry run
            </Button>
          )}
          
          {/* Run Pipeline / Stop (for run) */}
          {pipelineState.status === 'running' && pipelineState.type === 'run' ? (
            <Button 
              size="sm" 
              className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              onClick={stopPipeline}
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="h-7 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => runPipeline('run')}
              disabled={!canRunPipeline() || (pipelineState.status === 'running' && pipelineState.type === 'dryRun')}
              title={!canRunPipeline() ? "Add code to a file to run the pipeline" : undefined}
            >
              Run pipeline
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden w-full max-w-full">
        {/* Left Icon Toolbar */}
        <div className="w-10 border-r bg-card flex flex-col items-center py-2 gap-1 flex-shrink-0">
          <Button
            variant={(isLeftPanelOpen && leftPanelTab === "pipeline") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleLeftToolbarClick("pipeline")}
            title="Files"
          >
            <Folder className="h-4 w-4" />
          </Button>
          <Button
            variant={(isLeftPanelOpen && leftPanelTab === "catalog") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleLeftToolbarClick("catalog")}
            title="Catalog"
          >
            <Database className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
        </div>

        {/* Left Panel - File Browser / Catalog */}
        <div 
          className={`bg-card/50 flex flex-col border-r transition-[width,flex-shrink] duration-250 ease-in-out overflow-hidden ${
            isLeftPanelOpen ? "flex-shrink" : "w-0 border-r-0 flex-shrink-0"
          }`}
          style={{ 
            width: isLeftPanelOpen ? leftPanelWidth : 0,
            minWidth: isLeftPanelOpen ? Math.min(leftPanelWidth, 100) : 0,
          }}
        >
          {isLeftPanelOpen && renderLeftSidebarContent()}
        </div>

        {/* Left Resize Handle */}
        {isLeftPanelOpen && (
          <div
            className={`w-1 flex-shrink-0 cursor-col-resize group relative hover:bg-primary/20 active:bg-primary/40 transition-colors ${
              isResizingLeft ? "bg-primary/40" : ""
            }`}
            onMouseDown={startResizeLeft}
          >
            <div className={`absolute inset-y-0 left-0 w-px bg-border group-hover:bg-primary/50 ${
              isResizingLeft ? "bg-primary" : ""
            }`} />
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Vertical layout for editor + bottom panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Code Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Bar - accepts drops from other zones */}
              <div 
                className={`flex items-center border-b bg-muted/30 flex-shrink-0 relative transition-colors ${
                  draggedTab && draggedTab.sourceZone !== 'center' && dropTarget === 'center' 
                    ? 'bg-gray-100 dark:bg-gray-800' 
                    : ''
                }`}
                onDragOver={(e) => {
                  if (draggedTab && draggedTab.sourceZone !== 'center') {
                    handleDockDragOver(e, 'center');
                  }
                }}
                onDragLeave={handleDockDragLeave}
                onDrop={(e) => {
                  if (draggedTab && draggedTab.sourceZone !== 'center') {
                    handleDockDrop(e, 'center');
                  }
                }}
              >
                {/* Drop zone indicator for center */}
                {draggedTab && draggedTab.sourceZone !== 'center' && dropTarget === 'center' && (
                  <div className="absolute inset-0 border-2 border-dashed border-gray-400 rounded bg-gray-100/50 dark:bg-gray-800/50 pointer-events-none z-10 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Drop here to dock</span>
                  </div>
                )}
                
                <div ref={tabsContainerRef} className="flex items-center flex-1 overflow-x-auto hide-scrollbar">
                  {/* Code file tabs */}
                  {openTabs.map((tab) => (
                    <div
                      key={tab.id}
                      ref={(el) => {
                        if (el) {
                          tabRefs.current.set(tab.id, el);
                        } else {
                          tabRefs.current.delete(tab.id);
                        }
                      }}
                      onClick={() => {
                        switchTab(tab.id);
                        // Clear docked panel selection when clicking a file tab
                        if (centerDockedPanels.length > 0) {
                          setCenterDockedPanels([]);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm border-r cursor-pointer flex-shrink-0 ${
                        activeTabId === tab.id && centerDockedPanels.length === 0
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <FileCode 
                        className="h-4 w-4" 
                        style={{ color: activeTabId === tab.id ? 'var(--color-blue-500)' : 'var(--color-grey-400)' }} 
                      />
                      {editingTabId === tab.id ? (
                        <input
                          ref={tabNameInputRef}
                          type="text"
                          value={editingTabName}
                          onChange={(e) => setEditingTabName(e.target.value)}
                          onBlur={finishEditingTabName}
                          onKeyDown={handleTabNameKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent border border-primary rounded px-1 py-0.5 text-sm outline-none min-w-[80px] max-w-[200px]"
                          style={{ width: `${Math.max(80, editingTabName.length * 8)}px` }}
                        />
                      ) : (
                        <span 
                          className="flex items-center gap-1 cursor-text hover:bg-accent/50 px-1 rounded"
                          onClick={(e) => startEditingTabName(tab.id, tab.name, e)}
                          title="Click to rename"
                        >
                          {tab.name}
                          {tab.isDirty && (
                            <Circle className="h-2 w-2 fill-current text-muted-foreground" />
                          )}
                        </span>
                      )}
                      <button 
                        className="hover:bg-accent rounded p-0.5 ml-1"
                        onClick={(e) => closeTab(tab.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Docked panels in center */}
                  {centerDockedPanels.map((panelId) => {
                    const panel = DOCKABLE_PANELS[panelId];
                    if (!panel) return null;
                    
                    return (
                      <div
                        key={`center-${panelId}`}
                        draggable
                        onDragStart={(e) => handleDockTabDragStart(e, panelId, 'center')}
                        onDragEnd={handleDockDragEnd}
                        onClick={() => {
                          // Make this the active docked panel in center
                          setCenterDockedPanels(prev => {
                            const filtered = prev.filter(id => id !== panelId);
                            return [...filtered, panelId]; // Move to end to make active
                          });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 text-sm border-r cursor-grab active:cursor-grabbing flex-shrink-0 ${
                          centerDockedPanels[centerDockedPanels.length - 1] === panelId
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {panelId === 'graph' && <GitFork className="h-4 w-4" />}
                        {panelId === 'tables' && <Table className="h-4 w-4" />}
                        {panelId === 'performance' && <Activity className="h-4 w-4" />}
                        {panelId === 'terminal' && <Terminal className="h-4 w-4" />}
                        <span>{panel.title}</span>
                        {panel.closeable && (
                          <button 
                            className="hover:bg-accent rounded p-0.5 ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePanelFromZone(panelId, 'center');
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 ml-1 flex-shrink-0"
                      title="New file"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => createNewFile('transformation')}>
                      <Zap className="h-3.5 w-3.5" />
                      New transformation
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FlaskConical className="h-3.5 w-3.5" />
                      New exploration notebook
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Wrench className="h-3.5 w-3.5" />
                      New utility
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Editor Toolbar */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-card/50 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 gap-1"
                  disabled={!canRunPipeline() || pipelineState.status === 'running'}
                  title={!canRunPipeline() ? "Add code to a file to run" : undefined}
                  onClick={() => runSingleFile()}
                >
                  <Play className="h-3 w-3" />
                  Run file
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1">
                      {activeTab?.language === "python" ? "Python" : 
                       activeTab?.language === "sql" ? "SQL" : 
                       activeTab?.language === "scala" ? "Scala" : "Python"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Python</DropdownMenuItem>
                    <DropdownMenuItem>SQL</DropdownMenuItem>
                    <DropdownMenuItem>Scala</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>ETL Pipeline editor:</span>
                  <span className="text-green-500 font-medium">ON</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                <div className="flex-1" />
                
                {activeTab?.isDirty && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 gap-1 text-xs"
                    onClick={handleSaveFile}
                  >
                    Save (⌘S)
                  </Button>
                )}
              </div>

              {/* Code Editor or Center Docked Panel Content */}
              <div className="flex-1 overflow-hidden bg-background relative">
                {/* Show docked panel content if a docked panel is active */}
                {centerDockedPanels.length > 0 && centerDockedPanels[centerDockedPanels.length - 1] && (() => {
                  const activeDockedPanel = centerDockedPanels[centerDockedPanels.length - 1];
                  const panel = DOCKABLE_PANELS[activeDockedPanel];
                  if (!panel) return null;
                  
                  return (
                    <div className="h-full flex flex-col">
                      {/* Panel Content */}
                      {activeDockedPanel === 'graph' && (
                        graphData.nodes.length > 0 ? (
                          // Show actual graph when data available
                          <div 
                            ref={graphContainerRef}
                            className="flex-1 relative overflow-hidden"
                            style={{
                              backgroundImage: 'radial-gradient(circle, var(--color-grey-300) 1px, transparent 1px)',
                              backgroundSize: '20px 20px',
                              backgroundPosition: `${graphPan.x % 20}px ${graphPan.y % 20}px`,
                              cursor: isDraggingGraph ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setIsDraggingGraph(true);
                                graphDragStart.current = { x: e.clientX - graphPan.x, y: e.clientY - graphPan.y };
                              }
                            }}
                            onMouseMove={(e) => {
                              if (isDraggingGraph && graphDragStart.current) {
                                setGraphPan({
                                  x: e.clientX - graphDragStart.current.x,
                                  y: e.clientY - graphDragStart.current.y,
                                });
                              }
                            }}
                            onMouseUp={() => {
                              setIsDraggingGraph(false);
                              graphDragStart.current = null;
                            }}
                            onMouseLeave={() => {
                              setIsDraggingGraph(false);
                              graphDragStart.current = null;
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              const delta = e.deltaY > 0 ? 0.9 : 1.1;
                              setGraphZoom(prev => Math.min(Math.max(prev * delta, 0.25), 2));
                            }}
                          >
                            {/* Zoom controls */}
                            <div className="absolute top-3 right-3 flex items-center gap-2 z-10 bg-background/90 rounded-lg px-2 py-1 border shadow-sm">
                              <button
                                className="p-1 hover:bg-muted rounded"
                                onClick={() => setGraphZoom(prev => Math.max(prev * 0.8, 0.25))}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(graphZoom * 100)}%</span>
                              <button
                                className="p-1 hover:bg-muted rounded"
                                onClick={() => setGraphZoom(prev => Math.min(prev * 1.2, 2))}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                className="p-1 hover:bg-muted rounded"
                                onClick={() => { setGraphZoom(1); setGraphPan({ x: 50, y: 50 }); }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </div>
                            {/* SVG content - simplified for center dock */}
                            <svg 
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={{ 
                                transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                                transformOrigin: '0 0',
                              }}
                            >
                              {/* Render edges */}
                              {graphData.edges.map(edge => {
                                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                                if (!sourceNode || !targetNode) return null;
                                const nodeWidth = 280;
                                const outerHeaderHeight = 20;
                                const cardHeight = 95;
                                const startX = sourceNode.position.x + nodeWidth;
                                const startY = sourceNode.position.y + outerHeaderHeight + cardHeight / 2;
                                const endX = targetNode.position.x;
                                const endY = targetNode.position.y + outerHeaderHeight + cardHeight / 2;
                                const midX = (startX + endX) / 2;
                                return (
                                  <g key={edge.id}>
                                    <path
                                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                                      fill="none"
                                      stroke="#9ca3af"
                                      strokeWidth={2}
                                    />
                                    <polygon
                                      points={`${endX},${endY} ${endX - 10},${endY - 5} ${endX - 10},${endY + 5}`}
                                      fill="#9ca3af"
                                    />
                                  </g>
                                );
                              })}
                            </svg>
                            {/* Render nodes */}
                            <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                                transformOrigin: '0 0',
                              }}
                            >
                              {graphData.nodes.filter(n => !n.isPlaceholder).map(node => (
                                <div
                                  key={node.id}
                                  className="absolute pointer-events-auto cursor-pointer"
                                  style={{ left: node.position.x, top: node.position.y, width: 280 }}
                                >
                                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-2">
                                    <span className={`uppercase tracking-wider ${node.isExternal ? 'text-orange-600' : ''}`}>
                                      {node.type === 'materialized' ? 'Materialized view' : 
                                       node.type === 'streaming' ? 'Streaming table' :
                                       node.type === 'view' ? 'View' : 
                                       node.type === 'external' ? 'External source' : node.type}
                                    </span>
                                    {!node.isExternal && <span>{node.duration}</span>}
                                  </div>
                                  <div className="rounded-lg bg-background border shadow-sm p-3">
                                    <div className="flex items-center gap-2">
                                      {node.status === 'skipped' ? (
                                        <MinusCircle className="h-3.5 w-3.5 text-gray-400" />
                                      ) : (
                                        <div className={`w-2 h-2 rounded-full ${
                                          node.status === 'success' ? 'bg-green-500' :
                                          node.status === 'warning' ? 'bg-yellow-500' :
                                          node.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                                        }`} />
                                      )}
                                      <Gem className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="font-medium text-sm truncate">{node.name}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                                      <span>Output: {node.outputRecords}</span>
                                      {node.droppedRecords && node.droppedRecords > 0 && (
                                        <span className="text-orange-500">{node.droppedRecords} dropped</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <GitFork className="h-16 w-16 mx-auto mb-4 opacity-30" />
                              <p className="font-medium text-lg">Pipeline Graph</p>
                              <p className="text-sm mt-2">Run the pipeline to see the visualization</p>
                            </div>
                          </div>
                        )
                      )}
                      {activeDockedPanel === 'tables' && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Table className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="font-medium text-lg">Tables</p>
                            <p className="text-sm mt-2">Run the pipeline to see table results</p>
                          </div>
                        </div>
                      )}
                      {activeDockedPanel === 'performance' && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Activity className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="font-medium text-lg">Performance</p>
                            <p className="text-sm mt-2">Run the pipeline to see metrics</p>
                          </div>
                        </div>
                      )}
                      {activeDockedPanel === 'terminal' && (
                        <div className="flex-1 bg-gray-900 text-gray-100 font-mono p-4">
                          <div className="text-green-400">$ _</div>
                          <div className="text-gray-500 mt-2">Terminal ready</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Show editor when no docked panel is active or when a file tab is clicked */}
                {(centerDockedPanels.length === 0 || !centerDockedPanels[centerDockedPanels.length - 1]) && (
                  (isGeneratingSample || isGeneratingTemplate) ? (
                  <EditorSkeleton />
                ) : activeTab ? (
                  <>
                    {/* Monaco Editor - always shown so user can type */}
                    <Editor
                      height="100%"
                      language={activeTab.language}
                      theme={editorTheme}
                      value={activeTab.content}
                      onChange={handleEditorChange}
                      onMount={handleEditorMount}
                      options={{
                        fontSize: 14,
                        lineNumbers: "on",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                        tabSize: 4,
                        insertSpaces: true,
                        bracketPairColorization: { enabled: true },
                        autoIndent: "full",
                        formatOnPaste: true,
                        formatOnType: true,
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        folding: true,
                        foldingHighlight: true,
                        showFoldingControls: "mouseover",
                        matchBrackets: "always",
                        renderLineHighlight: "line",
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        smoothScrolling: true,
                        padding: { top: 12, bottom: 12 },
                      }}
                    />

                    {/* Empty State - Clean inline design */}
                    {showEmptyState && !isGeneratingSample && !isGeneratingTemplate && (
                      <div 
                        className="absolute top-3 left-16 pointer-events-auto"
                        style={{ zIndex: 1 }}
                      >
                        {/* Line 1: Start typing or generate with AI - Always visible when empty state is shown */}
                        <div className="text-muted-foreground/50 text-sm font-mono select-none mb-4">
                          Start typing or{' '}
                          <button
                            className="underline hover:text-muted-foreground transition-colors cursor-pointer"
                            onClick={() => {
                              // Open inline AI code generation (Databricks Notebooks style)
                              setShowInlineAI(true);
                              setGeneratedCodeDiff(null);
                              setTimeout(() => inlineAIInputRef.current?.focus(), 50);
                            }}
                          >
                            generate
                          </button>
                          {' '}with AI{' '}
                          <span className="text-muted-foreground/40">(⌘ + I)</span>
                          {' '}...
                        </div>
                        
                        {/* Quick Action Buttons - Horizontal row (can be dismissed separately) */}
                        {showQuickActions && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Use sample code */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-xs"
                            onClick={handleGetSampleCode}
                            disabled={isGeneratingSample}
                          >
                            <Code className="h-3.5 w-3.5" />
                            Use sample code
                          </Button>
                          
                          {/* Materialized view */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-xs"
                            disabled={isGeneratingSample || isGeneratingTemplate}
                            onClick={async () => {
                              // Show editor-only skeleton loading (file browser unchanged)
                              setIsGeneratingTemplate(true);
                              
                              // Simulate generation time
                              await new Promise((resolve) => setTimeout(resolve, 1500));
                              
                              const template = `from pyspark import pipelines as dp
from pyspark.sql import functions as F

# Materialized View
# A materialized view stores the result of a query as a physical table

@dp.table(
    comment="Materialized view description"
)
def my_materialized_view():
    """
    Creates a materialized view from source data.
    Edit the source table and transformations as needed.
    """
    df = spark.read.table("source_table")
    
    result = df.select("col1", "col2").filter(F.col("status").isNotNull())
    
    return result
`;
                              if (activeTab) {
                                handleEditorChange(template);
                                setShowEmptyState(false);
                              }
                              setIsGeneratingTemplate(false);
                            }}
                          >
                            <Gem className="h-3.5 w-3.5" />
                            Materialized view
                          </Button>
                          
                          {/* Streaming table */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-xs"
                            disabled={isGeneratingSample || isGeneratingTemplate}
                            onClick={async () => {
                              // Show editor-only skeleton loading (file browser unchanged)
                              setIsGeneratingTemplate(true);
                              
                              // Simulate generation time
                              await new Promise((resolve) => setTimeout(resolve, 1500));
                              
                              const template = `from pyspark import pipelines as dp
from pyspark.sql import functions as F

# Streaming Table
# A streaming table processes data incrementally as it arrives

@dp.table(
    comment="Streaming table description"
)
def my_streaming_table():
    """
    Creates a streaming table for incremental data processing.
    Edit the source path and transformations as needed.
    """
    df = spark.readStream.table("source_table")
    
    result = df.select("*")
    
    return result
`;
                              if (activeTab) {
                                handleEditorChange(template);
                                setShowEmptyState(false);
                              }
                              setIsGeneratingTemplate(false);
                            }}
                          >
                            <Activity className="h-3.5 w-3.5" />
                            Streaming table
                          </Button>
                          
                          {/* Add existing assets */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-xs"
                            disabled={isGeneratingSample || isGeneratingTemplate}
                            onClick={() => {
                              console.log('Add existing assets clicked');
                            }}
                          >
                            <Database className="h-3.5 w-3.5" />
                            Add existing assets
                          </Button>
                          
                          {/* More dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                disabled={isGeneratingSample || isGeneratingTemplate}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => {
                                const template = `from pyspark import pipelines as dp
from pyspark.sql import functions as F

# Sink
# A sink writes data to an external destination

@dp.table(
    comment="Sink table description"
)
def my_sink():
    """
    Creates a sink to write data to external storage.
    """
    df = spark.read.table("source_table")
    
    return df
`;
                                if (activeTab) {
                                  handleEditorChange(template);
                                  setShowEmptyState(false);
                                }
                              }}>
                                <Box className="h-4 w-4 mr-2" />
                                Sink
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const template = `from pyspark import pipelines as dp
from pyspark.sql import functions as F

# Persisted View
# A view that is stored and can be queried like a table

@dp.view(
    comment="Persisted view description"
)
def my_persisted_view():
    """
    Creates a persisted view from source data.
    """
    df = spark.read.table("source_table")
    
    result = df.select("col1", "col2").where(F.col("filter_condition"))
    
    return result
`;
                                if (activeTab) {
                                  handleEditorChange(template);
                                  setShowEmptyState(false);
                                }
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Persisted view
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                console.log('Set up source control clicked');
                              }}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Set up as a source-controlled project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* Close/Dismiss button - only hides quick actions, not the text */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowQuickActions(false)}
                            disabled={isGeneratingSample || isGeneratingTemplate}
                            title="Dismiss quick actions"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        )}
                      </div>
                    )}

                    {/* Inline AI Code Generation (Databricks Notebooks style) */}
                    {showInlineAI && (
                      <div 
                        className="absolute inset-x-0 top-0 pointer-events-auto bg-background"
                        style={{ zIndex: 10 }}
                      >
                        {/* Input bar with gradient border */}
                        <div 
                          className="mx-2 mt-2 rounded-lg p-[1px]"
                          style={{
                            background: 'linear-gradient(90deg, #F97316 0%, #FBBF24 50%, #22C55E 100%)',
                          }}
                        >
                          <div className="bg-background rounded-lg flex items-center px-3 py-2 gap-2">
                            {/* Input with @ mention support */}
                            <div className="flex-1 flex items-center gap-1 flex-wrap">
                              {/* Render parsed prompt with @ mentions as tags */}
                              {inlineAIPrompt.split(/(@\w+)/g).map((part, idx) => {
                                if (part.startsWith('@')) {
                                  const tableName = part.slice(1);
                                  return (
                                    <span 
                                      key={idx}
                                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm font-medium"
                                    >
                                      <Table className="h-3 w-3" />
                                      {tableName}
                                    </span>
                                  );
                                }
                                return null;
                              })}
                              <input
                                ref={inlineAIInputRef}
                                type="text"
                                value={inlineAIPrompt}
                                onChange={(e) => setInlineAIPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && inlineAIPrompt.trim() && !isInlineAIGenerating && !generatedCodeDiff) {
                                    e.preventDefault();
                                    handleInlineAIGenerate();
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    rejectInlineAI();
                                  }
                                  if (e.key === 'Tab' && generatedCodeDiff) {
                                    e.preventDefault();
                                    acceptInlineAICode();
                                  }
                                }}
                                placeholder="Describe what you want to generate..."
                                className="flex-1 min-w-[200px] bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground/50"
                                disabled={isInlineAIGenerating}
                              />
                            </div>
                            
                            {/* Loading indicator */}
                            {isInlineAIGenerating && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Generating...</span>
                              </div>
                            )}
                            
                            {/* More options */}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            
                            {/* Divider */}
                            <div className="w-px h-6 bg-border" />
                            
                            {/* Reject button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5"
                              onClick={rejectInlineAI}
                            >
                              Reject
                              <span className="text-muted-foreground text-[10px]">Esc</span>
                            </Button>
                            
                            {/* Accept button */}
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={generatedCodeDiff ? acceptInlineAICode : handleInlineAIGenerate}
                              disabled={!inlineAIPrompt.trim() || isInlineAIGenerating}
                            >
                              {generatedCodeDiff ? 'Accept' : 'Generate'}
                              <span className="text-blue-200 text-[10px]">{generatedCodeDiff ? '↵ / Tab' : '↵'}</span>
                            </Button>
                          </div>
                        </div>
                        
                        {/* Generated code diff preview */}
                        {generatedCodeDiff && (
                          <div className="mx-2 mt-0 border-x border-b border-border rounded-b-lg overflow-hidden">
                            <div className="font-mono text-sm">
                              {generatedCodeDiff.split('\n').map((line, idx) => (
                                <div 
                                  key={idx}
                                  className="flex"
                                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
                                >
                                  <span className="w-10 text-right pr-3 text-muted-foreground select-none border-r border-border/50 bg-green-50">
                                    {idx + 1}
                                  </span>
                                  <span className="pl-3 text-green-700 whitespace-pre">{line || ' '}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No file selected
                  </div>
                  )
                )}
              </div>
            </div>

            {/* Bottom Resize Handle */}
            {isBottomPanelOpen && (
              <div
                className={`h-1 flex-shrink-0 cursor-row-resize group relative hover:bg-primary/20 active:bg-primary/40 transition-colors ${
                  isResizingBottom ? "bg-primary/40" : ""
                }`}
                onMouseDown={startResizeBottom}
              >
                <div className={`absolute inset-x-0 top-0 h-px bg-border group-hover:bg-primary/50 ${
                  isResizingBottom ? "bg-primary" : ""
                }`} />
              </div>
            )}

            {/* Bottom Panel - Tables/Performance/Pipeline Graph */}
            <div 
              className={`bg-card/50 border-t flex-shrink-0 transition-[height] duration-250 ease-in-out overflow-hidden ${
                isBottomPanelOpen ? "" : "h-0 border-t-0"
              }`}
              style={{ height: isBottomPanelOpen ? (isBottomPanelExpanded ? expandedBottomPanelHeight : bottomPanelHeight) : 0 }}
            >
              {isBottomPanelOpen && (
                <div className="h-full flex flex-col">
                  {/* Bottom Panel Header */}
                  <div className="flex items-center justify-between border-b flex-shrink-0">
                    {selectedTableForPreview && pipelineState.status === 'completed' && showResultsView ? (
                      // Preview Header - replaces main tabs when viewing table details
                      <>
                        <div className="flex items-center gap-3 px-3 min-w-0 flex-1">
                          {/* Back Button - contextual based on source */}
                      <button 
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 whitespace-nowrap flex-shrink-0"
                            onClick={closeTablePreview}
                          >
                            <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                            {tablePreviewSource === 'graph' ? 'Back to Graph' : 'Back to All tables'}
                          </button>
                          
                          <div className="w-px h-4 bg-border flex-shrink-0" />
                          
                          {/* Table Selector Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 gap-1.5 flex-shrink-0">
                                <Table className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[150px]">{selectedTableForPreview.name}</span>
                                <ChevronDown className="h-3 w-3 flex-shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {tableResults.map(table => (
                                <DropdownMenuItem 
                                  key={table.id}
                                  onClick={() => openTablePreview(table, tablePreviewSource)}
                                  className={table.id === selectedTableForPreview.id ? 'bg-accent' : ''}
                                >
                                  <Table className="h-4 w-4 mr-2" />
                                  {table.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <div className="w-px h-4 bg-border flex-shrink-0" />
                          
                          {/* Detail Tabs - horizontally scrollable */}
                          <div className="flex items-center overflow-x-auto min-w-0 flex-1 hide-scrollbar">
                            <button
                              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                                tablePreviewTab === 'data' 
                                  ? 'border-primary text-foreground' 
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setTablePreviewTab('data')}
                            >
                              Data
                      </button>
                      <button 
                              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                                tablePreviewTab === 'columns' 
                                  ? 'border-primary text-foreground' 
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setTablePreviewTab('columns')}
                            >
                              Columns
                            </button>
                            <button
                              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                                tablePreviewTab === 'metrics' 
                                  ? 'border-primary text-foreground' 
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setTablePreviewTab('metrics')}
                            >
                              Table metrics
                            </button>
                            <button
                              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                                tablePreviewTab === 'performance' 
                                  ? 'border-primary text-foreground' 
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setTablePreviewTab('performance')}
                      >
                        Performance
                      </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Regular Tabs - Draggable and Reorderable
                      <div 
                        className="flex relative"
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedTab && draggedTab.sourceZone !== 'bottom') {
                            handleDockDragOver(e, 'bottom');
                          }
                        }}
                        onDragLeave={handleDockDragLeave}
                        onDrop={(e) => {
                          if (draggedTab && draggedTab.sourceZone !== 'bottom') {
                            handleDockDrop(e, 'bottom');
                          }
                        }}
                      >
                        {/* Drop zone indicator when dragging from other zones */}
                        {draggedTab && draggedTab.sourceZone !== 'bottom' && dropTarget === 'bottom' && (
                          <div className="absolute inset-0 border-2 border-dashed border-gray-400 rounded bg-gray-100/50 dark:bg-gray-800/50 pointer-events-none z-10" />
                        )}
                        
                        {bottomPanelTabs.map((panelId, index) => {
                          const panel = DOCKABLE_PANELS[panelId];
                          if (!panel) return null;
                          
                          const isActive = bottomPanelTab === panelId;
                          const isDragged = draggedTab?.panelId === panelId;
                          const showDropIndicator = draggedTab?.sourceZone === 'bottom' && dragOverIndex === index;
                          
                          return (
                            <div key={panelId} className="relative flex items-center">
                              {/* Drop indicator line for reordering */}
                              {showDropIndicator && (
                                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary z-20" />
                              )}
                      <button 
                                draggable
                                onDragStart={(e) => handleDockTabDragStart(e, panelId, 'bottom')}
                                onDragEnd={handleDockDragEnd}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (draggedTab?.sourceZone === 'bottom' && draggedTab?.panelId !== panelId) {
                                    setDragOverIndex(index);
                                  }
                                }}
                                onDrop={(e) => {
                                  if (draggedTab?.sourceZone === 'bottom') {
                                    handleDockDrop(e, 'bottom', index);
                                  }
                                }}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-grab active:cursor-grabbing ${
                                  isActive 
                            ? "border-primary text-foreground" 
                            : "border-transparent text-muted-foreground hover:text-foreground"
                                } ${isDragged ? 'opacity-50' : ''}`}
                                onClick={() => setBottomPanelTab(panelId as "tables" | "performance" | "graph")}
                      >
                                {panel.title}
                      </button>
                    </div>
                          );
                        })}
                        
                        {/* Add Panel Menu (3 dots) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                              title="More panels"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="z-50">
                            {getAvailablePanelsForZone('bottom').length > 0 ? (
                              getAvailablePanelsForZone('bottom').map((panel) => (
                                <DropdownMenuItem 
                                  key={panel.id}
                                  onClick={() => addPanelToZone(panel.id, 'bottom')}
                                >
                                  {panel.title}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                All panels visible
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    
                    {/* Right Side - Badge Icons & Controls */}
                    <div className="flex items-center gap-2 pr-3">
                      {/* Error Badge */}
                      <button 
                        className={`flex items-center gap-1 px-1.5 py-1 rounded hover:bg-muted ${
                          bottomPanelBadges.errors === 0 ? "opacity-50" : ""
                        }`}
                        title="Errors"
                      >
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        {bottomPanelBadges.errors > 0 && (
                          <span className="text-xs font-medium text-red-500">{bottomPanelBadges.errors}</span>
                        )}
                      </button>
                      
                      {/* Warning Badge */}
                      <button 
                        className={`flex items-center gap-1 px-1.5 py-1 rounded hover:bg-muted ${
                          bottomPanelBadges.warnings === 0 ? "opacity-50" : ""
                        }`}
                        title="Warnings"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        {bottomPanelBadges.warnings > 0 && (
                          <span className="text-xs font-medium text-yellow-500">{bottomPanelBadges.warnings}</span>
                        )}
                      </button>
                      
                      {/* Info Badge */}
                      <button 
                        className={`flex items-center gap-1 px-1.5 py-1 rounded hover:bg-muted ${
                          bottomPanelBadges.info === 0 ? "opacity-50" : ""
                        }`}
                        title="Info"
                      >
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        {bottomPanelBadges.info > 0 && (
                          <span className="text-xs font-medium text-blue-500">{bottomPanelBadges.info}</span>
                        )}
                      </button>
                      
                      <div className="w-px h-4 bg-border mx-1" />
                      
                      {/* Expand/Collapse Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setIsBottomPanelExpanded(!isBottomPanelExpanded)}
                        title={isBottomPanelExpanded ? "Restore panel size" : "Expand panel"}
                      >
                        {isBottomPanelExpanded ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      
                      {/* Close Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleBottomPanelToggle}
                        title="Close panel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="flex-1 overflow-auto">
                    {/* Running State - Progress Indicator (shown for all tabs when running) */}
                    {(pipelineState.status === 'running' || pipelineState.status === 'stopping') && (
                      <div className="h-full flex flex-col items-center justify-center p-6">
                        {/* Status Text */}
                        <p className="text-base font-medium mb-6 transition-all duration-200" style={{ color: 'var(--color-grey-700)' }}>
                          {pipelineState.status === 'stopping' ? 'Stopping...' : pipelineState.currentStage}
                        </p>
                        
                        {/* Segmented Progress Bar */}
                        <div className="w-full max-w-[400px] mb-6">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 20 }).map((_, i) => {
                              const segmentProgress = (i + 1) * 5;
                              const isComplete = pipelineState.status === 'running' && pipelineState.progress >= segmentProgress;
                              // Calculate gradient color for completed segments
                              const gradientPosition = i / 20;
                              const getSegmentColor = () => {
                                if (!isComplete) return 'var(--color-grey-200)';
                                if (gradientPosition < 0.33) {
                                  return '#10B981'; // green
                                } else if (gradientPosition < 0.66) {
                                  return '#3B82F6'; // blue
                                } else {
                                  return '#8B5CF6'; // purple
                                }
                              };
                              return (
                                <div
                                  key={i}
                                  className="flex-1 h-2 rounded-sm transition-colors duration-300"
                                  style={{ 
                                    backgroundColor: getSegmentColor(),
                                  }}
                                />
                              );
                            })}
                          </div>
                          <div className="text-center mt-2 text-sm font-medium" style={{ color: 'var(--color-grey-600)' }}>
                            {pipelineState.status === 'running' ? `${pipelineState.progress}%` : ''}
                          </div>
                        </div>
                        
                        {/* Info Table */}
                        <div className="w-full max-w-[300px] space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--color-grey-500)' }}>Update type</span>
                            <span className="font-medium" style={{ color: 'var(--color-grey-700)' }}>
                              {pipelineState.status === 'running' && pipelineState.type === 'dryRun' ? 'Dry run' : 'Refresh all'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--color-grey-500)' }}>Start time</span>
                            <span className="font-medium" style={{ color: 'var(--color-grey-700)' }}>
                              {pipelineState.status === 'running' && pipelineState.startTime.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--color-grey-500)' }}>Duration</span>
                            <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--color-grey-700)' }}>
                              <span className="font-mono">{formatDuration(executionDuration)}</span>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--color-grey-400)' }} />
                            </span>
                          </div>
                        </div>
                        
                        {/* Stop Button */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={stopPipeline}
                        >
                          <Square className="h-3.5 w-3.5" />
                          Stop
                        </Button>
                      </div>
                    )}
                    
                    {/* Stopped State */}
                    {pipelineState.status === 'stopped' && (
                      <div className="h-full flex flex-col items-center justify-center p-6">
                        <AlertCircle className="h-12 w-12 mb-4" style={{ color: 'var(--color-orange-500)' }} />
                        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                          Pipeline run stopped
                        </h3>
                        <p className="text-sm text-center max-w-[400px] mb-2" style={{ color: 'var(--color-grey-500)' }}>
                          The pipeline run was stopped by user
                        </p>
                        <p className="text-sm mb-6" style={{ color: 'var(--color-grey-500)' }}>
                          Duration: <span className="font-mono font-medium">{formatDuration(pipelineState.duration)}</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Completed State - Show Results View */}
                    {pipelineState.status === 'completed' && (
                      <div className="h-full flex flex-col overflow-hidden">
                        {!showResultsView ? (
                          // Brief completion message before transition
                          <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="h-12 w-12 mb-4 rounded-full bg-green-100 flex items-center justify-center">
                          <Play className="h-6 w-6" style={{ color: '#10B981' }} />
                        </div>
                        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                          {pipelineState.type === 'dryRun' ? 'Dry run completed' : 'Pipeline run completed'}
                        </h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--color-grey-500)' }}>
                          Duration: <span className="font-mono font-medium">{formatDuration(pipelineState.duration)}</span>
                        </p>
                      </div>
                        ) : bottomPanelTab === "tables" && selectedTableForPreview ? (
                          // Table Data Preview View
                          <div className="h-full flex flex-col animate-in fade-in duration-300">
                              {isLoadingTablePreview ? (
                                <div className="flex-1 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : tablePreviewTab === 'data' && tablePreviewData ? (
                                <>
                                  {/* Data Table */}
                                  <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm border-collapse">
                                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                        <tr>
                                          <th className="w-12 px-3 py-2 text-right text-muted-foreground font-normal border-b">
                                            #
                                          </th>
                                          {tablePreviewData.columns.map(col => (
                                            <th 
                                              key={col.name}
                                              className="px-3 py-2 text-left font-medium border-b whitespace-nowrap"
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs opacity-60">{getColumnTypeIcon(col.type)}</span>
                                                {col.name}
                                              </div>
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tablePreviewData.rows.slice(0, tablePreviewRowLimit).map((row, rowIdx) => (
                                          <tr 
                                            key={rowIdx}
                                            className={`border-b hover:bg-muted/30 transition-colors ${rowIdx % 2 === 1 ? 'bg-muted/10' : ''}`}
                                          >
                                            <td className="px-3 py-2 text-right text-muted-foreground font-mono text-xs">
                                              {rowIdx + 1}
                                            </td>
                                            {tablePreviewData.columns.map(col => {
                                              const value = row[col.name];
                                              const isNull = value === null || value === undefined;
                                              const isArray = Array.isArray(value);
                                              const isNumber = typeof value === 'number';
                                              const isLongText = typeof value === 'string' && value.length > 50;
                                              
                                              return (
                                                <td 
                                                  key={col.name}
                                                  className={`px-3 py-2 ${isNumber ? 'text-right font-mono' : 'text-left'} max-w-[200px]`}
                                                >
                                                  {isNull ? (
                                                    <span className="text-muted-foreground italic">null</span>
                                                  ) : isArray ? (
                                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                      {JSON.stringify(value)}
                                                    </span>
                                                  ) : isLongText ? (
                                                    <div className="flex items-center gap-1 truncate" title={String(value)}>
                                                      <span className="truncate">{String(value)}</span>
                                                      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                                    </div>
                                                  ) : (
                                                    <span className="truncate block">{String(value)}</span>
                                                  )}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Data Preview Footer */}
                                  <div className="flex items-center gap-3 px-4 py-2 border-t bg-background flex-shrink-0">
                                    {/* Download Button */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                          <Download className="h-3.5 w-3.5" />
                                          Download
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem>
                                          <FileText className="h-4 w-4 mr-2" />
                                          Export as CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Code className="h-4 w-4 mr-2" />
                                          Export as JSON
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    
                                    <div className="w-px h-4 bg-border" />
                                    
                                    {/* Row Count */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                                          {tablePreviewData.totalRows.toLocaleString()} rows
                                          <ChevronDown className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => setTablePreviewRowLimit(50)}>
                                          Show first 50 rows
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTablePreviewRowLimit(100)}>
                                          Show first 100 rows
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTablePreviewRowLimit(500)}>
                                          Show first 500 rows
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    
                                    <span className="text-sm text-muted-foreground">
                                      {tablePreviewData.queryTime.toFixed(2)}s runtime
                                    </span>
                                    
                                    <span className="text-sm text-muted-foreground">
                                      Refreshed {formatRelativeTime(tablePreviewData.lastRefreshed)}
                                    </span>
                                    
                                    <div className="flex-1" />
                                    
                                    {/* Refresh Button */}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 gap-1.5"
                                      onClick={refreshTablePreview}
                                      disabled={isLoadingTablePreview}
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTablePreview ? 'animate-spin' : ''}`} />
                                      Refresh
                                    </Button>
                                  </div>
                                </>
                              ) : tablePreviewTab === 'columns' && tablePreviewData ? (
                                // Columns Schema View
                                <div className="flex-1 overflow-auto p-4">
                                  <table className="w-full text-sm">
                                    <thead className="border-b">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">Column Name</th>
                                        <th className="px-3 py-2 text-left font-medium">Data Type</th>
                                        <th className="px-3 py-2 text-center font-medium">Nullable</th>
                                        <th className="px-3 py-2 text-left font-medium">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tablePreviewData.columns.map((col, idx) => (
                                        <tr key={col.name} className={`border-b ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                          <td className="px-3 py-2 font-mono">{col.name}</td>
                                          <td className="px-3 py-2">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-xs font-mono">
                                              <span>{getColumnTypeIcon(col.type)}</span>
                                              {col.type.toUpperCase()}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            {col.nullable ? (
                                              <span className="text-muted-foreground">Yes</span>
                                            ) : (
                                              <span className="text-foreground font-medium">No</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-muted-foreground">
                                            {col.description || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                // Placeholder for other tabs
                                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                  <div className="text-center">
                                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>{tablePreviewTab === 'metrics' ? 'Table metrics' : 'Performance data'} coming soon</p>
                                  </div>
                                </div>
                              )}
                          </div>
                        ) : bottomPanelTab === "tables" && bottomPanelTabs.includes("tables") ? (
                          // Full Results View (Tables List) - only render if tables is still in bottom panel
                          <div className="h-full flex flex-col animate-in fade-in duration-300">
                            {/* Filters Bar */}
                            <div className="flex items-center gap-3 px-4 py-2 border-b">
                              {/* Search Input */}
                              <div className="relative flex-shrink-0 w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search table"
                                  className="h-8 pl-8 pr-8 text-sm"
                                  value={tableSearchFilter}
                                  onChange={(e) => setTableSearchFilter(e.target.value)}
                                />
                                {tableSearchFilter && (
                                  <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setTableSearchFilter("")}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              
                              {/* Status Filter */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                    Status
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => setTableStatusFilter('all')}>
                                    All
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableStatusFilter('success')}>
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                    Success
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableStatusFilter('warning')}>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                    Warning
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableStatusFilter('failed')}>
                                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                    Failed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableStatusFilter('skipped')}>
                                    <MinusCircle className="w-3 h-3 text-gray-500 mr-2" />
                                    Skipped
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              {/* Type Filter */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                    Type
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => setTableTypeFilter('all')}>
                                    All
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableTypeFilter('Materialized view')}>
                                    Materialized view
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableTypeFilter('Streaming table')}>
                                    Streaming table
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableTypeFilter('Persisted view')}>
                                    Persisted view
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setTableTypeFilter('Sink')}>
                                    Sink
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {/* Results Table */}
                            <div className="flex-1 overflow-auto">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/50 border-b">
                                  <tr>
                                    <th className="w-10 px-3 py-2 text-center">
                                      {/* Status column - no header text */}
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium">
                                      Name
                                    </th>
                                    <th 
                                      className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80"
                                      onClick={() => handleTableSort('type')}
                                    >
                                      <div className="flex items-center gap-1">
                                        Type
                                        {tableSortConfig.column === 'type' && (
                                          <span className="text-xs">{tableSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-muted/80"
                                      onClick={() => handleTableSort('duration')}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        Duration
                                        {tableSortConfig.column === 'duration' && (
                                          <span className="text-xs">{tableSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                      </div>
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">Written</th>
                                    <th className="px-3 py-2 text-right font-medium">Updated</th>
                                    <th className="px-3 py-2 text-left font-medium">Expectations</th>
                                    <th 
                                      className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-muted/80"
                                      onClick={() => handleTableSort('dropped')}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        Dropped
                                        {tableSortConfig.column === 'dropped' && (
                                          <span className="text-xs">{tableSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-muted/80"
                                      onClick={() => handleTableSort('warnings')}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        Warnings
                                        {tableSortConfig.column === 'warnings' && (
                                          <span className="text-xs">{tableSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-muted/80"
                                      onClick={() => handleTableSort('failed')}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        Failed
                                        {tableSortConfig.column === 'failed' && (
                                          <span className="text-xs">{tableSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                      </div>
                                    </th>
                                    <th className="w-28 px-3 py-2 text-center font-medium">
                                      {/* Actions column */}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredTableResults.map((result) => (
                                    <tr 
                                      key={result.id} 
                                      className="border-b hover:bg-muted/30 transition-colors"
                                      style={{ height: '48px' }}
                                    >
                                      {/* Status */}
                                      <td className="px-3 py-2 text-center">
                                        {result.status === 'success' && (
                                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                        {result.status === 'warning' && (
                                          <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                                            <AlertTriangle className="w-3 h-3 text-yellow-600" />
                                          </div>
                                        )}
                                        {result.status === 'failed' && (
                                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                            <X className="w-3 h-3 text-red-600" />
                                          </div>
                                        )}
                                        {result.status === 'skipped' && (
                                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                                            <MinusCircle className="w-3 h-3 text-gray-500" />
                                          </div>
                                        )}
                                      </td>
                                      
                                      {/* Name */}
                                      <td className="px-3 py-2">
                                        <button 
                                          className="flex items-center gap-2 text-primary hover:underline"
                                          title="View data preview"
                                          onClick={() => openTablePreview(result)}
                                        >
                                          <Table className="w-4 h-4 text-muted-foreground" />
                                          {result.name}
                                        </button>
                                      </td>
                                      
                                      {/* Type */}
                                      <td className="px-3 py-2">
                                        {result.type}
                                      </td>
                                      
                                      {/* Duration */}
                                      <td className="px-3 py-2 text-right font-mono">
                                        {result.duration}
                                      </td>
                                      
                                      {/* Written */}
                                      <td className="px-3 py-2 text-right font-mono">
                                        {result.written}
                                      </td>
                                      
                                      {/* Updated */}
                                      <td className="px-3 py-2 text-right font-mono">
                                        {result.updated === '-' ? <span className="text-muted-foreground">-</span> : result.updated}
                                      </td>
                                      
                                      {/* Expectations */}
                                      <td className="px-3 py-2">
                                        {result.expectations === 'Not defined' ? (
                                          <span className="text-muted-foreground">{result.expectations}</span>
                                        ) : result.expectations.includes('unmet') ? (
                                          <span>
                                            <span className="text-green-600">{result.expectations.split(' | ')[0]}</span>
                                            <span className="text-muted-foreground"> | </span>
                                            <span className="text-red-600">{result.expectations.split(' | ')[1]}</span>
                                          </span>
                                        ) : (
                                          <span className="text-green-600">{result.expectations}</span>
                                        )}
                                      </td>
                                      
                                      {/* Dropped */}
                                      <td className="px-3 py-2 text-center">
                                        {result.dropped > 0 ? (
                                          <span className="flex items-center justify-center gap-1">
                                            <span className="w-2 h-2 bg-foreground rounded-sm" />
                                            {result.dropped}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      
                                      {/* Warnings */}
                                      <td className="px-3 py-2 text-center">
                                        {result.warnings > 0 ? (
                                          <span className="flex items-center justify-center gap-1 text-yellow-600">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {result.warnings}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">0</span>
                                        )}
                                      </td>
                                      
                                      {/* Failed */}
                                      <td className="px-3 py-2 text-center">
                                        {result.failed > 0 ? (
                                          <span className="flex items-center justify-center gap-1 text-red-600">
                                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                                            {result.failed}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">0</span>
                                        )}
                                      </td>
                                      
                                      {/* Actions */}
                                      <td className="px-3 py-2">
                                        <div className="flex items-center justify-center gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8"
                                            title="Preview data"
                                            onClick={() => openTablePreview(result)}
                                          >
                                            <Table className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8"
                                            title="Go to transformation"
                                          >
                                            <Code className="h-4 w-4" />
                                          </Button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                title="More actions"
                                              >
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy table name
                                              </DropdownMenuItem>
                                              <DropdownMenuItem>
                                                <GitFork className="h-4 w-4 mr-2" />
                                                View flows
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              
                              {filteredTableResults.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                  <Search className="h-8 w-8 mb-2" />
                                  <p>No tables match your filters</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Run Summary Bar - Footer */}
                            <div className="flex items-center gap-3 px-4 py-2 border-t bg-background flex-shrink-0">
                              {/* Run Info Section with Tooltip */}
                              <div className="relative group">
                                {/* Hoverable Run Info Content */}
                                <div className="flex items-center gap-3 px-2 py-1 -mx-2 -my-1 rounded-md cursor-default transition-colors group-hover:bg-muted/50">
                                  {/* Run History Histogram */}
                                  <div className="flex items-center gap-0.5 h-6">
                                    {runHistory.slice(-10).map((run) => (
                                      <div
                                        key={run.id}
                                        className="w-1.5 rounded-sm"
                                        style={{
                                          height: `${Math.min(100, (run.duration / 200) * 100)}%`,
                                          minHeight: '4px',
                                          backgroundColor: run.status === 'success' ? '#10B981' : '#EF4444',
                                        }}
                                      />
                                    ))}
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="font-mono font-medium">{formatDuration(pipelineState.duration)}</span>
                                  </div>
                                  
                                  <span className="text-sm text-muted-foreground">·</span>
                                  
                                  <span className="text-sm">
                                    {pipelineState.type === 'dryRun' ? 'Dry run' : 'Refresh all'}
                                  </span>
                                </div>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                                  style={{ backgroundColor: 'var(--color-grey-800, #1f2937)' }}
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">Status:</span>
                                      <span className="font-medium capitalize">{lastRunStatus || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">Type:</span>
                                      <span className="font-medium">
                                        {pipelineState.status === 'completed' && pipelineState.type === 'dryRun' 
                                          ? 'Dry run' 
                                          : pipelineState.status === 'completed' && pipelineState.type === 'run'
                                          ? 'Refresh all'
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">Creation time:</span>
                                      <span className="font-medium">
                                        {lastRunTimestamp 
                                          ? `${lastRunTimestamp.getDate().toString().padStart(2, '0')}/${(lastRunTimestamp.getMonth() + 1).toString().padStart(2, '0')}/${lastRunTimestamp.getFullYear()}, ${lastRunTimestamp.getHours().toString().padStart(2, '0')}:${lastRunTimestamp.getMinutes().toString().padStart(2, '0')}:${lastRunTimestamp.getSeconds().toString().padStart(2, '0')}`
                                          : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Tooltip arrow */}
                                  <div 
                                    className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4"
                                    style={{ borderTopColor: 'var(--color-grey-800, #1f2937)' }}
                                  />
                                </div>
                              </div>
                              
                              <span className="text-sm text-muted-foreground">·</span>
                              
                              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                                View all runs
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : bottomPanelTab === "graph" && bottomPanelTabs.includes("graph") ? (
                          // Pipeline Graph View (only render if graph is still in bottom panel)
                          <div 
                            ref={graphContainerRef}
                            className="h-full relative overflow-hidden animate-in fade-in duration-300"
                            style={{
                              backgroundImage: 'radial-gradient(circle, var(--color-grey-300) 1px, transparent 1px)',
                              backgroundSize: '20px 20px',
                              backgroundPosition: `${graphPan.x % 20}px ${graphPan.y % 20}px`,
                              cursor: isDraggingGraph ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setIsDraggingGraph(true);
                                graphDragStart.current = { x: e.clientX - graphPan.x, y: e.clientY - graphPan.y };
                              }
                            }}
                            onMouseMove={(e) => {
                              if (isDraggingGraph && graphDragStart.current) {
                                setGraphPan({
                                  x: e.clientX - graphDragStart.current.x,
                                  y: e.clientY - graphDragStart.current.y,
                                });
                              }
                            }}
                            onMouseUp={() => {
                              setIsDraggingGraph(false);
                              graphDragStart.current = null;
                            }}
                            onMouseLeave={() => {
                              setIsDraggingGraph(false);
                              graphDragStart.current = null;
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              const delta = e.deltaY > 0 ? 0.9 : 1.1;
                              setGraphZoom(prev => Math.min(Math.max(prev * delta, 0.25), 2));
                            }}
                          >
                            {/* Graph Canvas */}
                            <svg 
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={{ 
                                transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                                transformOrigin: '0 0',
                              }}
                            >
                              {/* Render Edges */}
                              {graphData.edges.map(edge => {
                                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                                if (!sourceNode || !targetNode) return null;
                                
                                const nodeWidth = 280;
                                const outerHeaderHeight = 20; // Type label height
                                const cardHeight = 95; // Card content height
                                
                                // Calculate Y positions accounting for outer header
                                const startX = sourceNode.position.x + nodeWidth;
                                const startY = sourceNode.position.y + outerHeaderHeight + cardHeight / 2;
                                const endX = targetNode.position.x;
                                const endY = targetNode.position.y + outerHeaderHeight + cardHeight / 2;
                                
                                const midX = (startX + endX) / 2;
                                const isHovered = hoveredGraphNode === edge.source || hoveredGraphNode === edge.target;
                                const isDashedEdge = edge.isDashed || targetNode.isPlaceholder;
                                const edgeColor = isDashedEdge 
                                  ? (isHovered ? '#3b82f6' : '#60a5fa') 
                                  : (isHovered ? '#3b82f6' : '#9ca3af');
                                
                                return (
                                  <g key={edge.id}>
                                    <path
                                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                                      fill="none"
                                      stroke={edgeColor}
                                      strokeWidth={isHovered ? 3 : 2}
                                      strokeDasharray={isDashedEdge ? '8 4' : undefined}
                                      className="transition-all duration-200"
                                    />
                                    {/* Arrow head */}
                                    <polygon
                                      points={`${endX},${endY} ${endX - 10},${endY - 5} ${endX - 10},${endY + 5}`}
                                      fill={edgeColor}
                                      className="transition-all duration-200"
                                    />
                                    {/* Record count label */}
                                    {edge.recordCount && !isDashedEdge && (
                                      <text
                                        x={midX}
                                        y={((startY + endY) / 2) - 8}
                                        textAnchor="middle"
                                        className="text-xs fill-muted-foreground"
                                        style={{ fontSize: '11px' }}
                                      >
                                        {edge.recordCount}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                            
                            {/* Render Nodes */}
                            <div 
                              className="absolute inset-0"
                              style={{ 
                                transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                                transformOrigin: '0 0',
                              }}
                            >
                              {graphData.nodes.map(node => {
                                const isSelected = selectedGraphNode === node.id;
                                const isHovered = hoveredGraphNode === node.id;
                                
                                const typeLabel = node.type === 'streaming' ? 'Streaming table' :
                                                  node.type === 'materialized' ? 'Materialized view' :
                                                  node.type === 'persisted' ? 'View' :
                                                  node.type === 'view' ? 'View' : 
                                                  node.type === 'external' ? 'External source' : 'Sink';
                                
                                return (
                                  <div
                                    key={node.id}
                                    className="absolute w-[280px] pointer-events-auto"
                                    style={{
                                      left: node.position.x,
                                      top: node.position.y,
                                    }}
                                    onClick={() => setSelectedGraphNode(isSelected ? null : node.id)}
                                    onMouseEnter={() => setHoveredGraphNode(node.id)}
                                    onMouseLeave={() => setHoveredGraphNode(null)}
                                  >
                                    {/* Floating Action Menu - positioned above the outer header */}
                                    {(isHovered || isSelected) && (
                                      <div 
                                        className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border rounded-lg shadow-lg p-1 z-50 animate-in fade-in duration-200"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                          title="Run this transformation"
                                        >
                                          <Play className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                          title="Go to transformation code"
                                          onClick={() => {
                                            if (node.fileId) {
                                              const file = [...openTabs].find(f => f.id === node.fileId);
                                              if (file) {
                                                setActiveTabId(file.id);
                                              }
                                            }
                                          }}
                                        >
                                          <FileCode className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                          title="Preview data"
                                          onClick={() => {
                                            const tableResult = tableResults.find(t => t.id === node.id);
                                            if (tableResult) {
                                              openTablePreview(tableResult, 'graph');
                                              setBottomPanelTab("tables");
                                            }
                                          }}
                                        >
                                          <Search className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                          title="Copy table name"
                                          onClick={() => {
                                            navigator.clipboard.writeText(node.name);
                                          }}
                                        >
                                          <Copy className="h-4 w-4" />
                                        </button>
                                        {/* Add Dependent Dataset Menu */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                              title="Add dependent dataset"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="center" className="z-50 w-[220px]">
                                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                              Create new dataset
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                              onClick={() => addDependentDataset(node, 'materialized')}
                                              className="gap-2"
                                            >
                                              <Gem className="h-4 w-4 text-purple-500" />
                                              <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">Materialized View</span>
                                                <span className="text-xs text-muted-foreground">Pre-computed, stored results</span>
                                              </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => addDependentDataset(node, 'streaming')}
                                              className="gap-2"
                                            >
                                              <RefreshCw className="h-4 w-4 text-blue-500" />
                                              <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">Streaming Table</span>
                                                <span className="text-xs text-muted-foreground">Incremental, real-time updates</span>
                                              </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => addDependentDataset(node, 'view')}
                                              className="gap-2"
                                            >
                                              <Eye className="h-4 w-4 text-gray-500" />
                                              <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">View</span>
                                                <span className="text-xs text-muted-foreground">Virtual, computed on read</span>
                                              </div>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                              title="More actions"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="z-50">
                                            <DropdownMenuItem>
                                              <RefreshCw className="h-4 w-4 mr-2" />
                                              Refresh table
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                              <BarChart3 className="h-4 w-4 mr-2" />
                                              View full metrics
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    )}
                                    
                                    {/* Outer Header - Type label and Duration OUTSIDE the card */}
                                    <div className="flex items-center justify-between px-1 mb-1">
                                      <span className={`text-xs ${
                                        node.isPlaceholder ? 'text-blue-500 font-medium' : 
                                        node.isExternal ? 'text-orange-600 font-medium' : 
                                        'text-muted-foreground'
                                      }`}>
                                        {node.isPlaceholder ? 'New ' : ''}{typeLabel}
                                      </span>
                                      {!node.isPlaceholder && !node.isExternal && (
                                        <span className="text-xs font-mono text-muted-foreground">{node.duration}</span>
                                      )}
                                    </div>
                                    
                                    {/* Node Card */}
                                    <div 
                                      className={`rounded-lg overflow-hidden transition-all duration-200 ${
                                        node.isPlaceholder
                                          ? 'border-2 border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm animate-in fade-in duration-300'
                                          : node.isExternal
                                            ? 'border border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm'
                                          : isSelected 
                                            ? 'border border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg' 
                                            : isHovered 
                                              ? 'border border-muted-foreground/50 bg-card shadow-md' 
                                              : 'border border-border bg-card shadow-sm'
                                      }`}
                                    >
                                      {/* Title Row - bordered section */}
                                      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${
                                        node.isPlaceholder 
                                          ? 'border-blue-200 dark:border-blue-800/50 border-dashed'
                                          : node.isExternal
                                            ? 'border-orange-200 dark:border-orange-800/50'
                                          : isSelected 
                                            ? 'border-blue-200 dark:border-blue-800' 
                                            : 'border-border'
                                      }`}>
                                        {/* Icon based on type */}
                                        {node.isPlaceholder ? (
                                          node.type === 'materialized' ? (
                                            <Gem className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                          ) : node.type === 'streaming' ? (
                                            <RefreshCw className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                          )
                                        ) : node.isExternal ? (
                                          <Database className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                        ) : (
                                          <Table className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span className={`font-medium text-sm truncate flex-1 ${node.isPlaceholder ? 'text-blue-600 dark:text-blue-400' : ''}`} title={node.name}>
                                          {node.name}
                                        </span>
                                        {node.status === 'success' && (
                                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                            <Check className="h-3 w-3 text-white" />
                                          </div>
                                        )}
                                        {node.status === 'placeholder' && (
                                          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 flex items-center justify-center flex-shrink-0">
                                            <Plus className="h-3 w-3 text-blue-500" />
                                          </div>
                                        )}
                                        {node.status === 'warning' && (
                                          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                                        )}
                                        {node.status === 'failed' && (
                                          <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                                        )}
                                        {node.status === 'running' && (
                                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                                        )}
                                      </div>
                                      
                                      {/* Content */}
                                      <div className="px-3 py-2">
                                        {node.isPlaceholder ? (
                                          /* Placeholder node content */
                                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                            <button 
                                              className="text-blue-500 hover:text-blue-600 hover:underline italic text-left flex items-center gap-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (node.fileId) {
                                                  setActiveTabId(node.fileId);
                                                  setSelectedFileId(node.fileId);
                                                }
                                              }}
                                            >
                                              <FileCode className="h-3 w-3" />
                                              View code...
                                            </button>
                                            {node.sourceNodeId && (
                                              <span className="text-[10px]">
                                                Reads from: {graphData.nodes.find(n => n.id === node.sourceNodeId)?.name || 'source'}
                                              </span>
                                            )}
                                          </div>
                                        ) : node.isExternal ? (
                                          /* External source node content */
                                          <div className="flex items-center text-xs text-orange-600">
                                            <span>External table reference</span>
                                          </div>
                                        ) : (
                                          /* Regular node content - Output records row with dropped records on same line */
                                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Output records: {node.outputRecords}</span>
                                            {node.droppedRecords && node.droppedRecords > 0 && (
                                              <span className="flex items-center gap-1 text-foreground">
                                                <span className="text-[10px]">■</span> {node.droppedRecords}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Canvas Controls */}
                            <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-card border rounded-lg shadow-lg p-1">
                              <button
                                className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Fullscreen"
                                onClick={() => setIsGraphFullscreen(!isGraphFullscreen)}
                              >
                                {isGraphFullscreen ? (
                                  <Minimize2 className="h-4 w-4" />
                                ) : (
                                  <Maximize2 className="h-4 w-4" />
                                )}
                              </button>
                              <div className="w-full h-px bg-border" />
                              <button
                                className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Zoom in"
                                onClick={() => setGraphZoom(prev => Math.min(prev * 1.2, 2))}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Zoom out"
                                onClick={() => setGraphZoom(prev => Math.max(prev * 0.8, 0.25))}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <div className="w-full h-px bg-border" />
                              <button
                                className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Fit to screen"
                                onClick={() => {
                                  setGraphZoom(1);
                                  setGraphPan({ x: 0, y: 0 });
                                }}
                              >
                                <Maximize className="h-4 w-4" />
                              </button>
                              <button
                                className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Reset view"
                                onClick={() => {
                                  setGraphZoom(1);
                                  setGraphPan({ x: 0, y: 0 });
                                  setSelectedGraphNode(null);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Zoom indicator */}
                            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded border">
                              {Math.round(graphZoom * 100)}%
                            </div>
                          </div>
                        ) : bottomPanelTab === "performance" && bottomPanelTabs.includes("performance") ? (
                          // Performance View (only render if performance is still in bottom panel)
                          <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                            <BarChart3 className="h-12 w-12 mb-4" style={{ color: 'var(--color-grey-400)' }} />
                            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                              Performance metrics
                            </h3>
                            <p className="text-sm text-center max-w-[400px]" style={{ color: 'var(--color-grey-500)' }}>
                              Performance visualization coming soon
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                    
                    {/* Error State */}
                    {pipelineState.status === 'error' && (
                      <div className="h-full flex flex-col items-center justify-center p-6">
                        <AlertCircle className="h-12 w-12 mb-4" style={{ color: '#EF4444' }} />
                        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                          Pipeline execution failed
                        </h3>
                        <p className="text-sm text-center max-w-[400px] mb-6" style={{ color: 'var(--color-grey-500)' }}>
                          {pipelineState.error}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => setPipelineState({ status: 'idle' })}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                    
                    {/* Idle State - Show tab-specific empty states */}
                    {pipelineState.status === 'idle' && (
                      <>
                        {/* Tables Tab - Empty State */}
                        {bottomPanelTab === "tables" && (
                          <div className="h-full flex flex-col items-center justify-center p-6">
                            <Table className="h-12 w-12 mb-4" style={{ color: 'var(--color-grey-400)' }} />
                            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                              No table insights available
                            </h3>
                            <p className="text-sm text-center max-w-[400px] mb-6" style={{ color: 'var(--color-grey-500)' }}>
                              Run the pipeline to generate tables and view table insights
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => runPipeline('run')}
                              disabled={!canRunPipeline()}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Run Pipeline
                            </Button>
                          </div>
                        )}
                        
                        {/* Performance Tab - Empty State */}
                        {bottomPanelTab === "performance" && bottomPanelTabs.includes("performance") && (
                          <div className="h-full flex flex-col items-center justify-center p-6">
                            <BarChart3 className="h-12 w-12 mb-4" style={{ color: 'var(--color-grey-400)' }} />
                            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-grey-700)' }}>
                              No query history
                            </h3>
                            <p className="text-sm text-center max-w-[450px] mb-6" style={{ color: 'var(--color-grey-500)' }}>
                              Run your pipeline or refresh one or more tables to see query history.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => runPipeline('run')}
                              disabled={!canRunPipeline()}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Run Pipeline
                            </Button>
                          </div>
                        )}
                        
                        {/* Pipeline Graph Tab - Empty State */}
                        {bottomPanelTab === "graph" && bottomPanelTabs.includes("graph") && (
                          <div 
                            className="h-full flex flex-col items-center justify-center p-6"
                            style={{
                              backgroundImage: 'radial-gradient(circle, var(--color-grey-300) 1px, transparent 1px)',
                              backgroundSize: '20px 20px',
                            }}
                          >
                            <GitFork className="h-12 w-12 mb-4" style={{ color: 'var(--color-grey-400)' }} />
                            <p className="text-sm text-center max-w-[350px]" style={{ color: 'var(--color-grey-600)' }}>
                              A graph will appear here after you run the pipeline
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Resize Handle */}
        {activeRightPanel && (
          <div
            className={`w-1 flex-shrink-0 cursor-col-resize group relative hover:bg-primary/20 active:bg-primary/40 transition-colors ${
              isResizingRight ? "bg-primary/40" : ""
            }`}
            onMouseDown={startResizeRight}
          >
            <div className={`absolute inset-y-0 right-0 w-px bg-border group-hover:bg-primary/50 ${
              isResizingRight ? "bg-primary" : ""
            }`} />
          </div>
        )}

        {/* Right Panel - Properties/Comments */}
        <div 
          className={`bg-card/50 flex flex-col border-l transition-[width,flex-shrink] duration-250 ease-in-out overflow-hidden ${
            activeRightPanel ? "flex-shrink" : "w-0 border-l-0 flex-shrink-0"
          }`}
          style={{ 
            width: activeRightPanel ? rightPanelWidth : 0,
            minWidth: activeRightPanel ? Math.min(rightPanelWidth, 100) : 0,
          }}
        >
          {activeRightPanel && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
                <span className="text-sm font-medium">
                  {activeRightPanel === "comments" && "Comments"}
                  {activeRightPanel === "history" && "Version History"}
                  {activeRightPanel === "assistant" && "Assistant"}
                </span>
                <div className="flex items-center gap-1">
                  {/* Close button for docked panels - returns to bottom */}
                  {rightDockedPanels.includes(activeRightPanel || '') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        if (activeRightPanel) {
                          addPanelToZone(activeRightPanel, 'bottom');
                        }
                      }}
                      title="Move back to bottom panel"
                    >
                      <PanelBottomOpen className="h-3 w-3" />
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setActiveRightPanel(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeRightPanel === "comments" && (
                  <div className="flex-1 p-3 overflow-auto text-sm text-muted-foreground">
                    <p>No comments yet.</p>
                    <p className="mt-2">Select code and add a comment to start a discussion.</p>
                  </div>
                )}
                {activeRightPanel === "history" && (
                  <div className="flex-1 p-3 overflow-auto text-sm text-muted-foreground">
                    <p>Version history will appear here.</p>
                    <p className="mt-2">Save your pipeline to create versions.</p>
                  </div>
                )}
                {activeRightPanel === "assistant" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Conversation Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                      {conversationHistory.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="font-medium">AI Assistant ready to help</p>
                          <p className="mt-1 text-xs">
                            Describe what you want to build in the chat box below,<br />
                            or ask questions about your pipeline.
                          </p>
                  </div>
                      ) : (
                        <>
                          {conversationHistory.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                              {/* Avatar */}
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === 'assistant' 
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                                  : 'bg-muted'
                              }`}>
                                {message.role === 'assistant' ? (
                                  <Sparkles className="h-4 w-4 text-white" />
                                ) : (
                                  <span className="text-xs font-medium">You</span>
                                )}
                              </div>
                              
                              {/* Message Content */}
                              <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`inline-block max-w-full text-left rounded-lg px-3 py-2 text-sm ${
                                  message.role === 'assistant' 
                                    ? 'bg-muted/50' 
                                    : 'bg-primary/10'
                                }`}>
                                  {/* Parse and render message content with clickable elements */}
                                  <div className="whitespace-pre-wrap break-words">
                                    {message.content.split('\n').map((line, lineIdx) => {
                                      // Check for file references (backticks)
                                      const fileMatch = line.match(/`([^`]+\.(?:py|md|sql|ipynb))`/);
                                      if (fileMatch && message.generatedFiles) {
                                        const fileName = fileMatch[1];
                                        const fileId = message.generatedFiles.find(id => {
                                          const idFileName = id.replace('gen-', '').replace('-cleaned', '_cleaned');
                                          return fileName.includes(idFileName) || idFileName.includes(fileName.replace('.py', '').replace('.md', ''));
                                        });
                                        
                                        return (
                                          <div key={lineIdx}>
                                            {line.split(/(`[^`]+`)/g).map((part, partIdx) => {
                                              if (part.startsWith('`') && part.endsWith('`')) {
                                                const innerFileName = part.slice(1, -1);
                                                return (
                                                  <button
                                                    key={partIdx}
                                                    className="text-primary hover:underline font-mono text-xs bg-primary/10 px-1 rounded"
                                                    onClick={() => {
                                                      if (fileId) handleFileReferenceClick(fileId);
                                                    }}
                                                  >
                                                    {innerFileName}
                                                  </button>
                                                );
                                              }
                                              return <span key={partIdx}>{part}</span>;
                                            })}
                                          </div>
                                        );
                                      }
                                      
                                      // Check for table references (@table)
                                      if (line.includes('@')) {
                                        return (
                                          <div key={lineIdx}>
                                            {line.split(/(@\w+)/g).map((part, partIdx) => {
                                              if (part.startsWith('@')) {
                                                return (
                                                  <span
                                                    key={partIdx}
                                                    className="text-blue-600 dark:text-blue-400 font-medium"
                                                  >
                                                    {part}
                                                  </span>
                                                );
                                              }
                                              return <span key={partIdx}>{part}</span>;
                                            })}
                                          </div>
                                        );
                                      }
                                      
                                      // Check for bold text
                                      if (line.includes('**')) {
                                        return (
                                          <div key={lineIdx}>
                                            {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIdx) => {
                                              if (part.startsWith('**') && part.endsWith('**')) {
                                                return (
                                                  <span key={partIdx} className="font-semibold">
                                                    {part.slice(2, -2)}
                                                  </span>
                                                );
                                              }
                                              return <span key={partIdx}>{part}</span>;
                                            })}
                                          </div>
                                        );
                                      }
                                      
                                      // Check for divider
                                      if (line.includes('───')) {
                                        return <hr key={lineIdx} className="my-2 border-border" />;
                                      }
                                      
                                      return <div key={lineIdx}>{line}</div>;
                                    })}
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 px-1">
                                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Thinking indicator */}
                          {isAIThinking && (
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="inline-block bg-muted/50 rounded-lg px-3 py-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-muted-foreground">{aiThinkingText}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div ref={conversationEndRef} />
                        </>
                      )}
                    </div>
                    
                    {/* Chat Input - Unified styling with center empty state */}
                    <div className="flex-shrink-0 border-t p-3">
                      <div className="relative p-[1px] rounded-lg bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30">
                        <div className="bg-background rounded-lg p-3">
                          {/* Multi-line text input */}
                          <textarea
                            placeholder={conversationHistory.length === 0 ? "Describe what you'd like to build..." : "Continue conversation..."}
                            className="w-full text-sm border-0 bg-muted/30 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-0 min-h-[36px] max-h-[100px]"
                            style={{ height: 'auto' }}
                            rows={1}
                            value={chatInput}
                            onChange={(e) => {
                              setChatInput(e.target.value);
                              // Auto-resize textarea
                              e.target.style.height = 'auto';
                              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                            }}
                            onKeyDown={(e) => {
                              // Enter to send, Shift+Enter for new line
                              if (e.key === 'Enter' && !e.shiftKey && chatInput.trim() && !isAIThinking) {
                                e.preventDefault();
                                handleUnifiedChat();
                              }
                            }}
                            disabled={isAIThinking}
                          />
                          
                          {/* Action Row - Same as center chat */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Mention (@)"
                                disabled={isAIThinking}
                              >
                                <AtSign className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Attach files"
                                disabled={isAIThinking}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 gap-1 text-xs px-2"
                                    disabled={isAIThinking}
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Agent
                                    <ChevronDown className="h-2.5 w-2.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Agent
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Assistant
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {isAIThinking ? (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="h-7 px-2 gap-1 text-xs"
                                  onClick={stopAgentThinking}
                                >
                                  <Square className="h-2.5 w-2.5 fill-current" />
                                  Stop
                                </Button>
                              ) : (
                                <Button 
                                  size="icon" 
                                  className="h-7 w-7 bg-primary hover:bg-primary/90"
                                  onClick={handleUnifiedChat}
                                  disabled={!chatInput.trim()}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Icon Toolbar */}
        {/* Right Toolbar - accepts drops */}
        <div 
          className={`w-10 border-l bg-card flex flex-col items-center py-2 flex-shrink-0 relative transition-colors ${
            draggedTab && draggedTab.sourceZone !== 'right' && dropTarget === 'right' 
              ? 'bg-gray-100 dark:bg-gray-800' 
              : ''
          }`}
          onDragOver={(e) => {
            if (draggedTab && draggedTab.sourceZone !== 'right') {
              handleDockDragOver(e, 'right');
            }
          }}
          onDragLeave={handleDockDragLeave}
          onDrop={(e) => {
            if (draggedTab && draggedTab.sourceZone !== 'right') {
              handleDockDrop(e, 'right');
            }
          }}
        >
          {/* Drop zone indicator for right */}
          {draggedTab && draggedTab.sourceZone !== 'right' && dropTarget === 'right' && (
            <div className="absolute inset-1 border-2 border-dashed border-gray-400 rounded bg-gray-100/50 dark:bg-gray-800/50 pointer-events-none z-10" />
          )}
          
          <div className="flex flex-col items-center gap-1">
            <Button
              variant={activeRightPanel === "comments" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRightToolbarClick("comments")}
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant={activeRightPanel === "history" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRightToolbarClick("history")}
              title="Version History"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant={activeRightPanel === "assistant" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRightToolbarClick("assistant")}
              title="Assistant"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            
            {/* Docked panels in right toolbar */}
            {rightDockedPanels.map((panelId) => {
              const panel = DOCKABLE_PANELS[panelId];
              if (!panel) return null;
              
              return (
                <Button
                  key={`right-${panelId}`}
                  variant={activeRightPanel === panelId ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  draggable
                  onDragStart={(e) => handleDockTabDragStart(e, panelId, 'right')}
                  onDragEnd={handleDockDragEnd}
                  onClick={() => {
                    if (activeRightPanel === panelId) {
                      setActiveRightPanel(null);
                    } else {
                      setActiveRightPanel(panelId as "comments" | "history" | "assistant");
                    }
                  }}
                  title={panel.title}
                >
                  {panelId === 'graph' && <GitFork className="h-4 w-4" />}
                  {panelId === 'tables' && <Table className="h-4 w-4" />}
                  {panelId === 'performance' && <Activity className="h-4 w-4" />}
                  {panelId === 'terminal' && <Terminal className="h-4 w-4" />}
                </Button>
              );
            })}
          </div>

          <div className="flex-1" />
          <div className="h-px w-6 bg-border my-2" />

          <div className="flex flex-col items-center gap-1">
            <Button
              variant={isBottomPanelOpen ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={handleBottomPanelToggle}
              title="Toggle Output Panel"
            >
              {isBottomPanelOpen ? (
                <PanelBottomClose className="h-4 w-4" />
              ) : (
                <PanelBottomOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="bg-popover border rounded-lg shadow-lg w-[400px] p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Create New Folder</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowNewFolderModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Folder name</label>
                <Input
                  placeholder="my_folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderName.trim()) {
                      createNewFolder();
                    } else if (e.key === "Escape") {
                      setShowNewFolderModal(false);
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeAsSource"
                  checked={newFolderIncludeAsSource}
                  onChange={(e) => setNewFolderIncludeAsSource(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="includeAsSource" className="text-sm">
                  Include as pipeline source code
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolderModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={createNewFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Pipeline Confirmation Modal */}
      {showStopConfirmModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={cancelStopPipeline}
        >
          <div 
            className="bg-popover border rounded-lg shadow-lg w-[400px] p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Stop Pipeline Execution?</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={cancelStopPipeline}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm" style={{ color: 'var(--color-grey-600)' }}>
                This will cancel the current run. Any progress made will be lost.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelStopPipeline}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmStopPipeline}
              >
                Stop Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog & Schema Configuration Sidebar Panel */}
      {isConfigPanelOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/30 z-50 transition-opacity duration-300"
            onClick={() => setIsConfigPanelOpen(false)}
          />
          
          {/* Sidebar panel */}
          <div 
            className="fixed top-0 right-0 h-full w-[400px] bg-background z-50 flex flex-col animate-in slide-in-from-right duration-300"
            style={{ boxShadow: '-4px 0 16px rgba(0,0,0,0.1)' }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b h-16 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsConfigPanelOpen(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-semibold">Default location for data assets</h2>
              </div>
              <button
                onClick={() => setIsConfigPanelOpen(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Pipeline tables will be created in this destination
              </p>

              {/* Default Catalog Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Default catalog<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCatalogDropdownOpen(!isCatalogDropdownOpen);
                      setIsSchemaDropdownOpen(false);
                    }}
                    className="w-full h-10 px-3 flex items-center justify-between border rounded-md bg-background hover:bg-muted/50 transition-colors text-sm"
                  >
                    <span>{tempCatalog}</span>
                    <div className="flex items-center gap-1">
                      {tempCatalog && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempCatalog("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              setTempCatalog("");
                            }
                          }}
                          className="p-0.5 hover:bg-muted rounded cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCatalogDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Catalog Dropdown */}
                  {isCatalogDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg z-10 overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search catalogs..."
                          value={catalogSearchInput}
                          onChange={(e) => setCatalogSearchInput(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {catalogOptions
                          .filter(opt => opt.toLowerCase().includes(catalogSearchInput.toLowerCase()))
                          .map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setTempCatalog(option);
                                setIsCatalogDropdownOpen(false);
                                setCatalogSearchInput("");
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                tempCatalog === option ? 'bg-muted' : ''
                              }`}
                            >
                              <span>{option}</span>
                              {tempCatalog === option && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          ))}
                        {catalogOptions.filter(opt => opt.toLowerCase().includes(catalogSearchInput.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No catalogs found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Default Schema Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Default schema<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSchemaDropdownOpen(!isSchemaDropdownOpen);
                      setIsCatalogDropdownOpen(false);
                    }}
                    className="w-full h-10 px-3 flex items-center justify-between border rounded-md bg-background hover:bg-muted/50 transition-colors text-sm"
                  >
                    <span>{tempSchema}</span>
                    <div className="flex items-center gap-1">
                      {tempSchema && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempSchema("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              setTempSchema("");
                            }
                          }}
                          className="p-0.5 hover:bg-muted rounded cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSchemaDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Schema Dropdown */}
                  {isSchemaDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg z-10 overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search schemas..."
                          value={schemaSearchInput}
                          onChange={(e) => setSchemaSearchInput(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {schemaOptions
                          .filter(opt => opt.toLowerCase().includes(schemaSearchInput.toLowerCase()))
                          .map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setTempSchema(option);
                                setIsSchemaDropdownOpen(false);
                                setSchemaSearchInput("");
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                tempSchema === option ? 'bg-muted' : ''
                              }`}
                            >
                              <span>{option}</span>
                              {tempSchema === option && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          ))}
                        {schemaOptions.filter(opt => opt.toLowerCase().includes(schemaSearchInput.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No schemas found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-background flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfigPanelOpen(false);
                  setCatalogSearchInput("");
                  setSchemaSearchInput("");
                  setIsCatalogDropdownOpen(false);
                  setIsSchemaDropdownOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSelectedCatalog(tempCatalog);
                  setSelectedSchema(tempSchema);
                  setHasCustomConfig(true);
                  setIsConfigPanelOpen(false);
                  setCatalogSearchInput("");
                  setSchemaSearchInput("");
                  setIsCatalogDropdownOpen(false);
                  setIsSchemaDropdownOpen(false);
                }}
                disabled={!tempCatalog || !tempSchema || (tempCatalog === selectedCatalog && tempSchema === selectedSchema)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </>
      )}

      {/* First-Run Configuration Modal */}
      {showFirstRunModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelFirstRunModal();
            }
          }}
        >
          <div 
            className="bg-background rounded-lg w-[600px] max-w-[90vw] flex flex-col"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h2 className="text-xl font-semibold">Default location for data assets</h2>
              <button
                onClick={handleCancelFirstRunModal}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Pipeline tables will be created in this destination
              </p>

              {/* Two Column Form */}
              <div className="grid grid-cols-2 gap-4">
                {/* Catalog Field */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Catalog
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalCatalogDropdownOpen(!isModalCatalogDropdownOpen);
                        setIsModalSchemaDropdownOpen(false);
                      }}
                      className="w-full h-10 px-3 flex items-center justify-between border rounded-md bg-background hover:bg-muted/50 transition-colors text-sm"
                    >
                      <span>{modalCatalog || 'Select catalog'}</span>
                      <div className="flex items-center gap-1">
                        {modalCatalog && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalCatalog("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setModalCatalog("");
                              }
                            }}
                            className="p-0.5 hover:bg-muted rounded cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isModalCatalogDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {/* Catalog Dropdown */}
                    {isModalCatalogDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg z-10 overflow-hidden">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search catalogs..."
                            value={modalCatalogSearchInput}
                            onChange={(e) => setModalCatalogSearchInput(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {catalogOptions
                            .filter(opt => opt.toLowerCase().includes(modalCatalogSearchInput.toLowerCase()))
                            .map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setModalCatalog(option);
                                  setIsModalCatalogDropdownOpen(false);
                                  setModalCatalogSearchInput("");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                  modalCatalog === option ? 'bg-muted' : ''
                                }`}
                              >
                                <span>{option}</span>
                                {modalCatalog === option && <Check className="h-4 w-4 text-primary" />}
                              </button>
                            ))}
                          {catalogOptions.filter(opt => opt.toLowerCase().includes(modalCatalogSearchInput.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No catalogs found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schema Field */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Schema
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalSchemaDropdownOpen(!isModalSchemaDropdownOpen);
                        setIsModalCatalogDropdownOpen(false);
                      }}
                      className="w-full h-10 px-3 flex items-center justify-between border rounded-md bg-background hover:bg-muted/50 transition-colors text-sm"
                    >
                      <span>{modalSchema || 'Select schema'}</span>
                      <div className="flex items-center gap-1">
                        {modalSchema && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalSchema("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setModalSchema("");
                              }
                            }}
                            className="p-0.5 hover:bg-muted rounded cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isModalSchemaDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {/* Schema Dropdown */}
                    {isModalSchemaDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg z-10 overflow-hidden">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search schemas..."
                            value={modalSchemaSearchInput}
                            onChange={(e) => setModalSchemaSearchInput(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {schemaOptions
                            .filter(opt => opt.toLowerCase().includes(modalSchemaSearchInput.toLowerCase()))
                            .map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setModalSchema(option);
                                  setIsModalSchemaDropdownOpen(false);
                                  setModalSchemaSearchInput("");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                  modalSchema === option ? 'bg-muted' : ''
                                }`}
                              >
                                <span>{option}</span>
                                {modalSchema === option && <Check className="h-4 w-4 text-primary" />}
                              </button>
                            ))}
                          {schemaOptions.filter(opt => opt.toLowerCase().includes(modalSchemaSearchInput.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No schemas found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancelFirstRunModal}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRunFromModal}
                disabled={!modalCatalog || !modalSchema}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Run pipeline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
