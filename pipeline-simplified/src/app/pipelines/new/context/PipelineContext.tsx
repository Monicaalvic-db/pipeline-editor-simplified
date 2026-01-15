"use client";

/**
 * Pipeline Editor Context
 * 
 * Centralized state management for the Pipeline Editor.
 * Provides state and actions for all child components.
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, ReactNode, useMemo } from 'react';
import type {
  TreeItem,
  FolderItem,
  EditorTab,
  PipelineState,
  TableResult,
  RunHistoryEntry,
  PipelineGraph,
  GraphNode,
  GraphEdge,
  DraggedTab,
  DockZone,
  ContextMenuState,
  RightPanelType,
  BottomPanelTab,
  TableSortConfig,
  TableStatusFilter,
  TableTypeFilter,
  TablePreviewData,
  TablePreviewTabType,
  ConversationMessage,
} from '../types';
import {
  PANEL_SIZES,
  STORAGE_KEYS,
  INITIAL_FILE_TREE,
  FILE_CONTENTS,
  SAMPLE_CODE_CONTENTS,
  PIPELINE_STAGES,
} from '../utils/constants';
import {
  parseTablesFromCode,
  generateTableResultsFromCode,
  generateGraphFromCode,
  generateMockRunHistory,
  generateMockTablePreview,
} from '../utils/helpers';

// ═══════════════════════════════════════════════════════════════════
// STATE INTERFACE
// ═══════════════════════════════════════════════════════════════════

interface PipelineEditorState {
  // Pipeline metadata
  pipelineName: string;
  isEditingName: boolean;
  
  // File system
  fileTree: TreeItem[];
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  contextMenu: ContextMenuState;
  newlyCreatedFiles: Set<string>;
  
  // Editor tabs
  openTabs: EditorTab[];
  activeTabId: string | null;
  editingTabId: string | null;
  editingTabName: string;
  showEmptyState: boolean;
  
  // Pipeline execution
  pipelineState: PipelineState;
  hasRunPipeline: boolean;
  lastRunTimestamp: Date | null;
  lastRunStatus: 'complete' | 'failed' | 'canceled' | null;
  executionDuration: number;
  
  // Table results
  tableResults: TableResult[];
  runHistory: RunHistoryEntry[];
  tableSearchFilter: string;
  tableStatusFilter: TableStatusFilter;
  tableTypeFilter: TableTypeFilter;
  tableSortConfig: TableSortConfig;
  showResultsView: boolean;
  
  // Table preview
  selectedTableForPreview: TableResult | null;
  tablePreviewData: TablePreviewData | null;
  tablePreviewTab: TablePreviewTabType;
  tablePreviewRowLimit: number;
  isLoadingTablePreview: boolean;
  
  // Pipeline graph
  graphData: PipelineGraph;
  graphZoom: number;
  graphPan: { x: number; y: number };
  selectedGraphNode: string | null;
  hoveredGraphNode: string | null;
  isGraphFullscreen: boolean;
  
  // Panel states
  isLeftPanelOpen: boolean;
  leftPanelWidth: number;
  leftPanelTab: string;
  activeRightPanel: RightPanelType;
  rightPanelWidth: number;
  isBottomPanelOpen: boolean;
  bottomPanelHeight: number;
  bottomPanelTab: BottomPanelTab;
  isBottomPanelExpanded: boolean;
  
  // Docking system
  bottomPanelTabs: string[];
  centerDockedPanels: string[];
  rightDockedPanels: string[];
  draggedTab: DraggedTab;
  dropTarget: DockZone | null;
  dragOverIndex: number | null;
  
  // Catalog/Schema config
  selectedCatalog: string;
  selectedSchema: string;
  isConfigPanelOpen: boolean;
  showFirstRunModal: boolean;
  hasCustomConfig: boolean;
  
  // Assistant
  conversationHistory: ConversationMessage[];
  aiPrompt: string;
  isAgentThinking: boolean;
  
  // Loading states
  isGeneratingSample: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════

const getDefaultPipelineName = (): string => {
  const now = new Date();
  return `New Pipeline ${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
};

const initialState: PipelineEditorState = {
  // Pipeline metadata
  pipelineName: getDefaultPipelineName(),
  isEditingName: false,
  
  // File system
  fileTree: INITIAL_FILE_TREE,
  selectedFileId: "3",
  expandedFolders: new Set(["1", "2"]),
  contextMenu: null,
  newlyCreatedFiles: new Set(),
  
  // Editor tabs
  openTabs: [
    {
      id: "3",
      name: "first_transformation.py",
      content: FILE_CONTENTS["3"]?.content || "",
      language: "python",
      isDirty: false,
      savedContent: FILE_CONTENTS["3"]?.content || "",
    },
  ],
  activeTabId: "3",
  editingTabId: null,
  editingTabName: "",
  showEmptyState: true,
  
  // Pipeline execution
  pipelineState: { status: 'idle' },
  hasRunPipeline: false,
  lastRunTimestamp: null,
  lastRunStatus: null,
  executionDuration: 0,
  
  // Table results
  tableResults: [],
  runHistory: [],
  tableSearchFilter: "",
  tableStatusFilter: 'all',
  tableTypeFilter: 'all',
  tableSortConfig: { column: 'name', direction: 'asc' },
  showResultsView: false,
  
  // Table preview
  selectedTableForPreview: null,
  tablePreviewData: null,
  tablePreviewTab: 'data',
  tablePreviewRowLimit: 100,
  isLoadingTablePreview: false,
  
  // Pipeline graph
  graphData: { nodes: [], edges: [] },
  graphZoom: 1,
  graphPan: { x: 0, y: 0 },
  selectedGraphNode: null,
  hoveredGraphNode: null,
  isGraphFullscreen: false,
  
  // Panel states
  isLeftPanelOpen: true,
  leftPanelWidth: PANEL_SIZES.left.default,
  leftPanelTab: "pipeline",
  activeRightPanel: null,
  rightPanelWidth: PANEL_SIZES.right.default,
  isBottomPanelOpen: false,
  bottomPanelHeight: PANEL_SIZES.bottom.default,
  bottomPanelTab: "tables",
  isBottomPanelExpanded: false,
  
  // Docking system
  bottomPanelTabs: ['tables', 'performance', 'graph'],
  centerDockedPanels: [],
  rightDockedPanels: [],
  draggedTab: null,
  dropTarget: null,
  dragOverIndex: null,
  
  // Catalog/Schema config
  selectedCatalog: "main",
  selectedSchema: "default",
  isConfigPanelOpen: false,
  showFirstRunModal: false,
  hasCustomConfig: false,
  
  // Assistant
  conversationHistory: [],
  aiPrompt: "",
  isAgentThinking: false,
  
  // Loading states
  isGeneratingSample: false,
};

// ═══════════════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════════════

type PipelineAction =
  | { type: 'SET_PIPELINE_NAME'; payload: string }
  | { type: 'SET_IS_EDITING_NAME'; payload: boolean }
  | { type: 'SET_FILE_TREE'; payload: TreeItem[] }
  | { type: 'SET_SELECTED_FILE_ID'; payload: string | null }
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'SET_EXPANDED_FOLDERS'; payload: Set<string> }
  | { type: 'SET_CONTEXT_MENU'; payload: ContextMenuState }
  | { type: 'SET_NEWLY_CREATED_FILES'; payload: Set<string> }
  | { type: 'SET_OPEN_TABS'; payload: EditorTab[] }
  | { type: 'SET_ACTIVE_TAB_ID'; payload: string | null }
  | { type: 'SET_EDITING_TAB_ID'; payload: string | null }
  | { type: 'SET_EDITING_TAB_NAME'; payload: string }
  | { type: 'SET_SHOW_EMPTY_STATE'; payload: boolean }
  | { type: 'SET_PIPELINE_STATE'; payload: PipelineState }
  | { type: 'SET_HAS_RUN_PIPELINE'; payload: boolean }
  | { type: 'SET_LAST_RUN_TIMESTAMP'; payload: Date | null }
  | { type: 'SET_LAST_RUN_STATUS'; payload: 'complete' | 'failed' | 'canceled' | null }
  | { type: 'SET_EXECUTION_DURATION'; payload: number }
  | { type: 'SET_TABLE_RESULTS'; payload: TableResult[] }
  | { type: 'SET_RUN_HISTORY'; payload: RunHistoryEntry[] }
  | { type: 'SET_TABLE_SEARCH_FILTER'; payload: string }
  | { type: 'SET_TABLE_STATUS_FILTER'; payload: TableStatusFilter }
  | { type: 'SET_TABLE_TYPE_FILTER'; payload: TableTypeFilter }
  | { type: 'SET_TABLE_SORT_CONFIG'; payload: TableSortConfig }
  | { type: 'SET_SHOW_RESULTS_VIEW'; payload: boolean }
  | { type: 'SET_SELECTED_TABLE_FOR_PREVIEW'; payload: TableResult | null }
  | { type: 'SET_TABLE_PREVIEW_DATA'; payload: TablePreviewData | null }
  | { type: 'SET_TABLE_PREVIEW_TAB'; payload: TablePreviewTabType }
  | { type: 'SET_TABLE_PREVIEW_ROW_LIMIT'; payload: number }
  | { type: 'SET_IS_LOADING_TABLE_PREVIEW'; payload: boolean }
  | { type: 'SET_GRAPH_DATA'; payload: PipelineGraph }
  | { type: 'SET_GRAPH_ZOOM'; payload: number }
  | { type: 'SET_GRAPH_PAN'; payload: { x: number; y: number } }
  | { type: 'SET_SELECTED_GRAPH_NODE'; payload: string | null }
  | { type: 'SET_HOVERED_GRAPH_NODE'; payload: string | null }
  | { type: 'SET_IS_GRAPH_FULLSCREEN'; payload: boolean }
  | { type: 'SET_IS_LEFT_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_LEFT_PANEL_WIDTH'; payload: number }
  | { type: 'SET_LEFT_PANEL_TAB'; payload: string }
  | { type: 'SET_ACTIVE_RIGHT_PANEL'; payload: RightPanelType }
  | { type: 'SET_RIGHT_PANEL_WIDTH'; payload: number }
  | { type: 'SET_IS_BOTTOM_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_BOTTOM_PANEL_HEIGHT'; payload: number }
  | { type: 'SET_BOTTOM_PANEL_TAB'; payload: BottomPanelTab }
  | { type: 'SET_IS_BOTTOM_PANEL_EXPANDED'; payload: boolean }
  | { type: 'SET_BOTTOM_PANEL_TABS'; payload: string[] }
  | { type: 'SET_CENTER_DOCKED_PANELS'; payload: string[] }
  | { type: 'SET_RIGHT_DOCKED_PANELS'; payload: string[] }
  | { type: 'SET_DRAGGED_TAB'; payload: DraggedTab }
  | { type: 'SET_DROP_TARGET'; payload: DockZone | null }
  | { type: 'SET_DRAG_OVER_INDEX'; payload: number | null }
  | { type: 'SET_SELECTED_CATALOG'; payload: string }
  | { type: 'SET_SELECTED_SCHEMA'; payload: string }
  | { type: 'SET_IS_CONFIG_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_SHOW_FIRST_RUN_MODAL'; payload: boolean }
  | { type: 'SET_HAS_CUSTOM_CONFIG'; payload: boolean }
  | { type: 'SET_CONVERSATION_HISTORY'; payload: ConversationMessage[] }
  | { type: 'SET_AI_PROMPT'; payload: string }
  | { type: 'SET_IS_AGENT_THINKING'; payload: boolean }
  | { type: 'SET_IS_GENERATING_SAMPLE'; payload: boolean }
  | { type: 'UPDATE_TAB_CONTENT'; payload: { tabId: string; content: string } }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'ADD_TAB'; payload: EditorTab }
  | { type: 'RESET_STATE' };

// ═══════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════

function pipelineReducer(state: PipelineEditorState, action: PipelineAction): PipelineEditorState {
  switch (action.type) {
    case 'SET_PIPELINE_NAME':
      return { ...state, pipelineName: action.payload };
    case 'SET_IS_EDITING_NAME':
      return { ...state, isEditingName: action.payload };
    case 'SET_FILE_TREE':
      return { ...state, fileTree: action.payload };
    case 'SET_SELECTED_FILE_ID':
      return { ...state, selectedFileId: action.payload };
    case 'TOGGLE_FOLDER': {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedFolders: newExpanded };
    }
    case 'SET_EXPANDED_FOLDERS':
      return { ...state, expandedFolders: action.payload };
    case 'SET_CONTEXT_MENU':
      return { ...state, contextMenu: action.payload };
    case 'SET_NEWLY_CREATED_FILES':
      return { ...state, newlyCreatedFiles: action.payload };
    case 'SET_OPEN_TABS':
      return { ...state, openTabs: action.payload };
    case 'SET_ACTIVE_TAB_ID':
      return { ...state, activeTabId: action.payload };
    case 'SET_EDITING_TAB_ID':
      return { ...state, editingTabId: action.payload };
    case 'SET_EDITING_TAB_NAME':
      return { ...state, editingTabName: action.payload };
    case 'SET_SHOW_EMPTY_STATE':
      return { ...state, showEmptyState: action.payload };
    case 'SET_PIPELINE_STATE':
      return { ...state, pipelineState: action.payload };
    case 'SET_HAS_RUN_PIPELINE':
      return { ...state, hasRunPipeline: action.payload };
    case 'SET_LAST_RUN_TIMESTAMP':
      return { ...state, lastRunTimestamp: action.payload };
    case 'SET_LAST_RUN_STATUS':
      return { ...state, lastRunStatus: action.payload };
    case 'SET_EXECUTION_DURATION':
      return { ...state, executionDuration: action.payload };
    case 'SET_TABLE_RESULTS':
      return { ...state, tableResults: action.payload };
    case 'SET_RUN_HISTORY':
      return { ...state, runHistory: action.payload };
    case 'SET_TABLE_SEARCH_FILTER':
      return { ...state, tableSearchFilter: action.payload };
    case 'SET_TABLE_STATUS_FILTER':
      return { ...state, tableStatusFilter: action.payload };
    case 'SET_TABLE_TYPE_FILTER':
      return { ...state, tableTypeFilter: action.payload };
    case 'SET_TABLE_SORT_CONFIG':
      return { ...state, tableSortConfig: action.payload };
    case 'SET_SHOW_RESULTS_VIEW':
      return { ...state, showResultsView: action.payload };
    case 'SET_SELECTED_TABLE_FOR_PREVIEW':
      return { ...state, selectedTableForPreview: action.payload };
    case 'SET_TABLE_PREVIEW_DATA':
      return { ...state, tablePreviewData: action.payload };
    case 'SET_TABLE_PREVIEW_TAB':
      return { ...state, tablePreviewTab: action.payload };
    case 'SET_TABLE_PREVIEW_ROW_LIMIT':
      return { ...state, tablePreviewRowLimit: action.payload };
    case 'SET_IS_LOADING_TABLE_PREVIEW':
      return { ...state, isLoadingTablePreview: action.payload };
    case 'SET_GRAPH_DATA':
      return { ...state, graphData: action.payload };
    case 'SET_GRAPH_ZOOM':
      return { ...state, graphZoom: action.payload };
    case 'SET_GRAPH_PAN':
      return { ...state, graphPan: action.payload };
    case 'SET_SELECTED_GRAPH_NODE':
      return { ...state, selectedGraphNode: action.payload };
    case 'SET_HOVERED_GRAPH_NODE':
      return { ...state, hoveredGraphNode: action.payload };
    case 'SET_IS_GRAPH_FULLSCREEN':
      return { ...state, isGraphFullscreen: action.payload };
    case 'SET_IS_LEFT_PANEL_OPEN':
      return { ...state, isLeftPanelOpen: action.payload };
    case 'SET_LEFT_PANEL_WIDTH':
      return { ...state, leftPanelWidth: action.payload };
    case 'SET_LEFT_PANEL_TAB':
      return { ...state, leftPanelTab: action.payload };
    case 'SET_ACTIVE_RIGHT_PANEL':
      return { ...state, activeRightPanel: action.payload };
    case 'SET_RIGHT_PANEL_WIDTH':
      return { ...state, rightPanelWidth: action.payload };
    case 'SET_IS_BOTTOM_PANEL_OPEN':
      return { ...state, isBottomPanelOpen: action.payload };
    case 'SET_BOTTOM_PANEL_HEIGHT':
      return { ...state, bottomPanelHeight: action.payload };
    case 'SET_BOTTOM_PANEL_TAB':
      return { ...state, bottomPanelTab: action.payload };
    case 'SET_IS_BOTTOM_PANEL_EXPANDED':
      return { ...state, isBottomPanelExpanded: action.payload };
    case 'SET_BOTTOM_PANEL_TABS':
      return { ...state, bottomPanelTabs: action.payload };
    case 'SET_CENTER_DOCKED_PANELS':
      return { ...state, centerDockedPanels: action.payload };
    case 'SET_RIGHT_DOCKED_PANELS':
      return { ...state, rightDockedPanels: action.payload };
    case 'SET_DRAGGED_TAB':
      return { ...state, draggedTab: action.payload };
    case 'SET_DROP_TARGET':
      return { ...state, dropTarget: action.payload };
    case 'SET_DRAG_OVER_INDEX':
      return { ...state, dragOverIndex: action.payload };
    case 'SET_SELECTED_CATALOG':
      return { ...state, selectedCatalog: action.payload };
    case 'SET_SELECTED_SCHEMA':
      return { ...state, selectedSchema: action.payload };
    case 'SET_IS_CONFIG_PANEL_OPEN':
      return { ...state, isConfigPanelOpen: action.payload };
    case 'SET_SHOW_FIRST_RUN_MODAL':
      return { ...state, showFirstRunModal: action.payload };
    case 'SET_HAS_CUSTOM_CONFIG':
      return { ...state, hasCustomConfig: action.payload };
    case 'SET_CONVERSATION_HISTORY':
      return { ...state, conversationHistory: action.payload };
    case 'SET_AI_PROMPT':
      return { ...state, aiPrompt: action.payload };
    case 'SET_IS_AGENT_THINKING':
      return { ...state, isAgentThinking: action.payload };
    case 'SET_IS_GENERATING_SAMPLE':
      return { ...state, isGeneratingSample: action.payload };
    case 'UPDATE_TAB_CONTENT': {
      const updatedTabs = state.openTabs.map(tab =>
        tab.id === action.payload.tabId
          ? { ...tab, content: action.payload.content, isDirty: action.payload.content !== tab.savedContent }
          : tab
      );
      return { ...state, openTabs: updatedTabs };
    }
    case 'CLOSE_TAB': {
      const newTabs = state.openTabs.filter(tab => tab.id !== action.payload);
      const newActiveId = state.activeTabId === action.payload
        ? newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
        : state.activeTabId;
      return { ...state, openTabs: newTabs, activeTabId: newActiveId };
    }
    case 'ADD_TAB':
      return { ...state, openTabs: [...state.openTabs, action.payload] };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

interface PipelineContextValue {
  state: PipelineEditorState;
  dispatch: React.Dispatch<PipelineAction>;
  // Refs
  generatedContentsRef: React.MutableRefObject<Record<string, { content: string; language: string }>>;
  // Computed values
  filteredTableResults: TableResult[];
  activeTab: EditorTab | undefined;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface PipelineProviderProps {
  children: ReactNode;
}

export function PipelineProvider({ children }: PipelineProviderProps) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);
  
  // Refs for mutable data
  const generatedContentsRef = useRef<Record<string, { content: string; language: string }>>({});
  
  // Computed: filtered and sorted table results
  const filteredTableResults = useMemo(() => {
    let results = [...state.tableResults];
    
    // Apply search filter
    if (state.tableSearchFilter) {
      const search = state.tableSearchFilter.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(search));
    }
    
    // Apply status filter
    if (state.tableStatusFilter !== 'all') {
      results = results.filter(r => r.status === state.tableStatusFilter);
    }
    
    // Apply type filter
    if (state.tableTypeFilter !== 'all') {
      results = results.filter(r => r.type === state.tableTypeFilter);
    }
    
    // Apply sorting
    results.sort((a, b) => {
      const { column, direction } = state.tableSortConfig;
      let comparison = 0;
      
      switch (column) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'duration': {
          const parseDuration = (d: string) => {
            const match = d.match(/(\d+)m?\s*(\d*)s?/);
            if (!match) return 0;
            const mins = d.includes('m') ? parseInt(match[1]) : 0;
            const secs = match[2] ? parseInt(match[2]) : parseInt(match[1]);
            return mins * 60 + secs;
          };
          comparison = parseDuration(a.duration) - parseDuration(b.duration);
          break;
        }
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
  }, [state.tableResults, state.tableSearchFilter, state.tableStatusFilter, state.tableTypeFilter, state.tableSortConfig]);
  
  // Computed: active tab
  const activeTab = useMemo(() => {
    return state.openTabs.find(tab => tab.id === state.activeTabId);
  }, [state.openTabs, state.activeTabId]);
  
  const value: PipelineContextValue = {
    state,
    dispatch,
    generatedContentsRef,
    filteredTableResults,
    activeTab,
  };
  
  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}

