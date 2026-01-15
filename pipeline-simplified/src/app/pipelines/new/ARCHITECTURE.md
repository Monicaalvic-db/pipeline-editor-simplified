# Pipeline Editor Architecture

This document describes the modular architecture for the Pipeline Editor.

## Overview

The Pipeline Editor has been refactored from a single 7000+ line file into a well-organized, modular component structure following React and Next.js best practices.

## Folder Structure

```
src/app/pipelines/new/
├── page.tsx                    # Main orchestrator (~50 lines)
├── ARCHITECTURE.md             # This file
│
├── types/
│   └── index.ts                # All TypeScript type definitions
│
├── utils/
│   ├── index.ts                # Barrel export
│   ├── constants.ts            # Configuration, mock data, constants
│   └── helpers.ts              # Utility functions
│
├── context/
│   ├── index.ts                # Barrel export
│   └── PipelineContext.tsx     # Main state management context
│
├── hooks/
│   ├── index.ts                # Barrel export
│   ├── usePipelineExecution.ts # Pipeline run/stop logic
│   ├── useFileOperations.ts    # File CRUD operations
│   ├── usePanelResize.ts       # Panel resize handlers
│   ├── useDocking.ts           # Drag-and-drop docking
│   └── useEditorTabs.ts        # Tab management
│
└── components/
    ├── index.ts                # Barrel export
    │
    ├── header/
    │   ├── index.ts
    │   └── PipelineHeader.tsx  # Pipeline name, actions, run buttons
    │
    ├── file-browser/
    │   ├── index.ts
    │   ├── FileBrowser.tsx     # Main file browser container
    │   ├── FileTree.tsx        # Recursive file tree
    │   ├── FileNode.tsx        # Individual file/folder node
    │   ├── CatalogBrowser.tsx  # Catalog browser view
    │   └── ContextMenu.tsx     # Right-click context menu
    │
    ├── code-editor/
    │   ├── index.ts
    │   ├── CodeEditor.tsx      # Monaco editor wrapper
    │   ├── EditorTabs.tsx      # Tab bar component
    │   ├── EditorTab.tsx       # Individual tab
    │   ├── EmptyState.tsx      # "Get started" empty state
    │   └── AIAgentChat.tsx     # AI prompt input area
    │
    ├── bottom-panel/
    │   ├── index.ts
    │   ├── BottomPanel.tsx     # Panel container with tabs
    │   │
    │   ├── tables/
    │   │   ├── TablesView.tsx      # Results table view
    │   │   ├── TableRow.tsx        # Individual table row
    │   │   ├── TableFilters.tsx    # Search and filter controls
    │   │   ├── TablePreview.tsx    # Data preview modal/view
    │   │   ├── ColumnsTab.tsx      # Column schema view
    │   │   └── RunSummaryBar.tsx   # Run status footer
    │   │
    │   ├── performance/
    │   │   └── PerformanceView.tsx # Performance metrics
    │   │
    │   └── graph/
    │       ├── PipelineGraph.tsx   # Graph container
    │       ├── GraphNode.tsx       # Custom node component
    │       ├── GraphEdge.tsx       # Custom edge component
    │       ├── NodeActionMenu.tsx  # Floating action menu
    │       ├── GraphControls.tsx   # Zoom/pan controls
    │       └── AddDependentMenu.tsx # Add dataset menu
    │
    ├── right-panel/
    │   ├── index.ts
    │   ├── RightPanel.tsx      # Panel container
    │   ├── AssistantPanel.tsx  # AI Assistant chat
    │   ├── CommentsPanel.tsx   # Code comments
    │   └── HistoryPanel.tsx    # Version history
    │
    ├── modals/
    │   ├── index.ts
    │   ├── ConfigPanel.tsx     # Catalog/schema config sidebar
    │   ├── FirstRunModal.tsx   # First run config modal
    │   ├── NewFolderModal.tsx  # Create folder dialog
    │   └── StopConfirmModal.tsx # Stop pipeline confirmation
    │
    └── shared/
        ├── index.ts
        ├── ResizeHandle.tsx    # Draggable resize handle
        ├── DropZoneOverlay.tsx # Docking drop zone indicator
        ├── ProgressBar.tsx     # Pipeline progress indicator
        └── IconButton.tsx      # Toolbar icon button
```

## Component Responsibilities

### page.tsx (Orchestrator)
- Wraps children in `PipelineProvider`
- Renders main layout structure
- Composes major components
- Should be under 50 lines

### PipelineContext
- Centralized state management using `useReducer`
- Provides state and dispatch to all children
- Handles computed/derived values
- Manages refs for mutable data

### Custom Hooks

| Hook | Responsibility |
|------|---------------|
| `usePipelineExecution` | Run/stop pipeline, progress simulation |
| `useFileOperations` | Create, rename, delete files/folders |
| `usePanelResize` | Resize panel drag handlers |
| `useDocking` | Tab drag-and-drop between zones |
| `useEditorTabs` | Open, close, switch tabs |

### Major Components

| Component | Lines (est.) | Description |
|-----------|--------------|-------------|
| PipelineHeader | ~200 | Name, config tags, run buttons |
| FileBrowser | ~400 | File tree with context menus |
| CodeEditor | ~300 | Monaco integration, tabs |
| BottomPanel | ~600 | Tables, Performance, Graph |
| PipelineGraph | ~500 | DAG visualization |
| RightPanel | ~300 | Assistant, Comments, History |
| ConfigPanel | ~200 | Catalog/schema sidebar |

## State Architecture

### State Categories

1. **Pipeline Metadata**: name, catalog, schema
2. **File System**: tree, selected file, expanded folders
3. **Editor**: tabs, active tab, content
4. **Execution**: status, progress, results
5. **Panels**: open/closed, sizes, active tabs
6. **Docking**: dragged tab, drop zones
7. **UI**: modals, context menus, loading states

### State Flow

```
User Action → dispatch(action) → reducer → new state → re-render
```

### Persistence

- Panel sizes/states: localStorage
- Dock layout: localStorage
- Catalog/schema config: localStorage

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PipelineProvider                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     PipelineContext                        │  │
│  │  state + dispatch + refs + computed values                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│     ┌────────────────────────┼────────────────────────┐         │
│     ▼                        ▼                        ▼         │
│  ┌──────┐             ┌────────────┐             ┌────────┐     │
│  │Header│             │  CodeEditor │             │BottomPanel│ │
│  └──────┘             └────────────┘             └────────┘     │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    ▼                   ▼                        │
│              ┌──────────┐        ┌──────────┐                   │
│              │ EditorTabs│        │ EmptyState│                  │
│              └──────────┘        └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Props Guidelines

1. **Prefer specific props over passing entire state**
   ```tsx
   // Good
   <PipelineHeader pipelineName={name} onNameChange={setName} />
   
   // Avoid
   <PipelineHeader state={state} dispatch={dispatch} />
   ```

2. **Use callbacks for actions**
   ```tsx
   interface Props {
     onRunPipeline: (type: 'run' | 'dryRun') => void;
     onStopPipeline: () => void;
   }
   ```

3. **Keep components focused**
   - Each component should do one thing well
   - Max 300 lines per component file

## Import Patterns

```tsx
// Types
import type { TableResult, GraphNode } from '../types';

// Utils
import { PANEL_SIZES, parseTablesFromCode } from '../utils';

// Context
import { usePipeline } from '../context';

// Components
import { PipelineHeader } from './header';
```

## Testing Strategy

1. **Unit Tests**: Individual component behavior
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Full user flows

Each component should be testable in isolation by:
- Accepting props for all data
- Using callbacks for all actions
- Avoiding direct context usage in leaf components

## Performance Considerations

1. **Code Splitting**: Use `dynamic()` for large components
2. **Memoization**: Use `useMemo` for expensive computations
3. **Callback Stability**: Use `useCallback` for handlers
4. **Virtualization**: Use virtual lists for large data sets

## Migration Guide

### Step 1: Extract Types (✅ Complete)
Move all type definitions to `types/index.ts`

### Step 2: Extract Utils (✅ Complete)
Move constants and helpers to `utils/`

### Step 3: Create Context (✅ Complete)
Set up `PipelineContext` with reducer

### Step 4: Extract Components (✅ Complete)
All major components extracted:
- Header, FileBrowser, CodeEditor
- BottomPanel, RightPanel, Modals

### Step 5: Extract Hooks (✅ Complete)
Custom hooks created:
- usePanelResize, usePipelineExecution, useFileOperations

### Step 6: Update page.tsx (✅ In Progress)
page.tsx now includes imports from modular structure.
Types can be imported from `./types` module.

## How to Use the Modular Structure

### Importing Types
```tsx
import type {
  TreeItem,
  EditorTab,
  PipelineState,
  TableResult,
  GraphNode,
} from "./types";
```

### Importing Utils
```tsx
import { PANEL_SIZES, PIPELINE_STAGES } from "./utils/constants";
import { parseTablesFromCode, formatDuration } from "./utils/helpers";
```

### Importing Components
```tsx
import { PipelineHeader } from "./components/header";
import { FileBrowser } from "./components/file-browser";
import { CodeEditor } from "./components/code-editor";
import { RightPanel } from "./components/right-panel";
```

### Importing Hooks
```tsx
import { usePanelResize, usePipelineExecution } from "./hooks";
```

## Gradual Migration Strategy

The modular structure allows gradual migration:

1. **New features**: Build using the modular components
2. **Bug fixes**: Consider migrating affected sections
3. **Refactoring**: Replace inline code with module imports

All inline types and functions in page.tsx have equivalent
exports in the modules for backwards compatibility.

## Future Improvements

1. **Add unit tests** for all components
2. **Implement error boundaries** for graceful failures
3. **Add Storybook** for component documentation
4. **Consider Zustand/Jotai** for simpler state
5. **Add lazy loading** for large panels

