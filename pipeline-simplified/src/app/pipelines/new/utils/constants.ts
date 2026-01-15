/**
 * Pipeline Editor Constants
 * 
 * Centralized configuration values, mock data, and constants used
 * throughout the Pipeline Editor.
 */

import type { PipelineStage, DockablePanel, TreeItem, CatalogItem } from '../types';

// ═══════════════════════════════════════════════════════════════════
// PANEL SIZE CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/** Panel size constraints in pixels */
export const PANEL_SIZES = {
  left: { default: 250, min: 200, max: 350 },
  right: { default: 320, min: 280, max: 500 },
  bottom: { default: 250, min: 150, max: 400 },
  toolbar: 40,
  minEditor: 100,
} as const;

/** Threshold for closing panels when resizing */
export const CLOSE_THRESHOLD = 50;

// ═══════════════════════════════════════════════════════════════════
// LOCALSTORAGE KEYS
// ═══════════════════════════════════════════════════════════════════

/** LocalStorage keys for persisting panel state */
export const STORAGE_KEYS = {
  leftWidth: "pipeline-editor-left-width",
  rightWidth: "pipeline-editor-right-width",
  bottomHeight: "pipeline-editor-bottom-height",
  leftOpen: "pipeline-editor-left-open",
  rightPanel: "pipeline-editor-right-panel",
  bottomOpen: "pipeline-editor-bottom-open",
  dockLayout: "pipeline-dock-layout",
  pipelineConfig: "pipeline-config",
} as const;

// ═══════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════

/** Pipeline execution stages with timing */
export const PIPELINE_STAGES: PipelineStage[] = [
  { status: 'Initializing...', duration: 800, targetProgress: 15 },
  { status: 'Running transformations...', duration: 1500, targetProgress: 50 },
  { status: 'Processing tables...', duration: 1500, targetProgress: 85 },
  { status: 'Finalizing...', duration: 1000, targetProgress: 100 },
];

// ═══════════════════════════════════════════════════════════════════
// DOCKABLE PANELS
// ═══════════════════════════════════════════════════════════════════

/** Available panels that can be docked to different zones */
export const DOCKABLE_PANELS: Record<string, DockablePanel> = {
  tables: { id: 'tables', title: 'Tables', icon: 'Table', closeable: false },
  performance: { id: 'performance', title: 'Performance', icon: 'Activity', closeable: true },
  graph: { id: 'graph', title: 'Pipeline Graph', icon: 'GitFork', closeable: true },
  terminal: { id: 'terminal', title: 'Terminal', icon: 'Terminal', closeable: true },
};

// ═══════════════════════════════════════════════════════════════════
// CATALOG OPTIONS
// ═══════════════════════════════════════════════════════════════════

/** Available catalog options */
export const CATALOG_OPTIONS = ["main", "user_main", "test_1", "system", "abc", "123"];

/** Available schema options */
export const SCHEMA_OPTIONS = ["default", "bronze", "silver", "gold", "public"];

// ═══════════════════════════════════════════════════════════════════
// INITIAL FILE TREE
// ═══════════════════════════════════════════════════════════════════

/** Default file tree structure */
export const INITIAL_FILE_TREE: TreeItem[] = [
  {
    id: "1",
    name: "utilities",
    type: "folder",
    children: [
      { id: "1-1", name: "utils.py", type: "file" },
    ],
  },
  {
    id: "2",
    name: "transformations",
    type: "folder",
    children: [
      { id: "3", name: "first_transformation.py", type: "file" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// SAMPLE CODE TEMPLATES
// ═══════════════════════════════════════════════════════════════════

/** Sample code contents for demo files */
export const SAMPLE_CODE_CONTENTS: Record<string, { content: string; language: string }> = {
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
};

/** Empty file contents storage */
export const FILE_CONTENTS: Record<string, { content: string; language: string }> = {
  "3": {
    content: "",
    language: "python",
  },
};

// ═══════════════════════════════════════════════════════════════════
// CATALOG BROWSER DATA
// ═══════════════════════════════════════════════════════════════════

/** Mock catalog browser data */
export const CATALOG_BROWSER_DATA: CatalogItem[] = [
  {
    id: "cat-main",
    name: "main",
    type: "catalog",
    children: [
      {
        id: "schema-default",
        name: "default",
        type: "schema",
        children: [
          { id: "table-customers", name: "customers", type: "table" },
          { id: "table-orders", name: "orders", type: "table" },
          { id: "table-products", name: "products", type: "table" },
        ],
      },
      {
        id: "schema-bronze",
        name: "bronze",
        type: "schema",
        children: [
          { id: "table-raw_events", name: "raw_events", type: "table" },
          { id: "table-raw_users", name: "raw_users", type: "table" },
        ],
      },
    ],
  },
  {
    id: "cat-samples",
    name: "samples",
    type: "catalog",
    children: [
      {
        id: "schema-wanderbricks",
        name: "wanderbricks",
        type: "schema",
        children: [
          { id: "table-users", name: "users", type: "table" },
          { id: "table-trips", name: "trips", type: "table" },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// TABLE COLUMNS DATA (for data browser)
// ═══════════════════════════════════════════════════════════════════

/** Table column definitions for the data browser */
export const TABLE_COLUMNS: Record<string, Array<{ name: string; type: string }>> = {
  customers: [
    { name: "customer_id", type: "STRING" },
    { name: "email", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP" },
    { name: "status", type: "STRING" },
  ],
  orders: [
    { name: "order_id", type: "STRING" },
    { name: "customer_id", type: "STRING" },
    { name: "order_date", type: "DATE" },
    { name: "total_amount", type: "DECIMAL" },
    { name: "status", type: "STRING" },
  ],
  products: [
    { name: "product_id", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "category", type: "STRING" },
    { name: "price", type: "DECIMAL" },
    { name: "stock", type: "INT" },
  ],
  raw_events: [
    { name: "event_id", type: "STRING" },
    { name: "event_type", type: "STRING" },
    { name: "timestamp", type: "TIMESTAMP" },
    { name: "payload", type: "STRING" },
  ],
  raw_users: [
    { name: "user_id", type: "STRING" },
    { name: "email", type: "STRING" },
    { name: "raw_data", type: "STRING" },
  ],
  users: [
    { name: "user_id", type: "STRING" },
    { name: "email", type: "STRING" },
    { name: "name", type: "STRING" },
    { name: "user_type", type: "STRING" },
  ],
  trips: [
    { name: "trip_id", type: "STRING" },
    { name: "user_id", type: "STRING" },
    { name: "origin", type: "STRING" },
    { name: "destination", type: "STRING" },
    { name: "distance", type: "DOUBLE" },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// AUTOCOMPLETE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════

/** SQL autocomplete suggestions */
export const SQL_SUGGESTIONS = [
  // Table types
  { label: 'MATERIALIZED VIEW', insertText: 'MATERIALIZED VIEW', detail: 'Create a materialized view' },
  { label: 'STREAMING TABLE', insertText: 'STREAMING TABLE', detail: 'Create a streaming table' },
  { label: 'TABLE', insertText: 'TABLE', detail: 'Create a standard table' },
  { label: 'VIEW', insertText: 'VIEW', detail: 'Create a view' },
  
  // SQL keywords
  { label: 'SELECT', insertText: 'SELECT', detail: 'Select columns' },
  { label: 'SELECT DISTINCT', insertText: 'SELECT DISTINCT', detail: 'Select unique values' },
  { label: 'SELECT * FROM', insertText: 'SELECT * FROM ', detail: 'Select all columns from table' },
  { label: 'FROM', insertText: 'FROM', detail: 'Specify source table' },
  { label: 'WHERE', insertText: 'WHERE', detail: 'Filter condition' },
  { label: 'GROUP BY', insertText: 'GROUP BY', detail: 'Group results' },
  { label: 'ORDER BY', insertText: 'ORDER BY', detail: 'Sort results' },
  { label: 'JOIN', insertText: 'JOIN', detail: 'Join tables' },
  { label: 'LEFT JOIN', insertText: 'LEFT JOIN', detail: 'Left outer join' },
  { label: 'INNER JOIN', insertText: 'INNER JOIN', detail: 'Inner join' },
  { label: 'AS', insertText: 'AS', detail: 'Alias' },
];

/** Transform function suggestions */
export const TRANSFORM_SUGGESTIONS = [
  { label: 'transform_normalize', insertText: 'transform_normalize()', detail: 'Normalize data values' },
  { label: 'transform_aggregate', insertText: 'transform_aggregate()', detail: 'Aggregate data' },
  { label: 'transform_filter', insertText: 'transform_filter()', detail: 'Filter data rows' },
  { label: 'transform_dedupe', insertText: 'transform_dedupe()', detail: 'Remove duplicates' },
  { label: 'transform_enrich', insertText: 'transform_enrich()', detail: 'Enrich with additional data' },
];

// ═══════════════════════════════════════════════════════════════════
// DEFAULT STATE VALUES
// ═══════════════════════════════════════════════════════════════════

/** Default pipeline name format */
export const getDefaultPipelineName = (): string => {
  const now = new Date();
  return `New Pipeline ${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
};

