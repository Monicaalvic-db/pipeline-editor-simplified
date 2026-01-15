/**
 * Pipeline Editor Helper Functions
 * 
 * Utility functions for parsing, generating, and formatting data
 * used throughout the Pipeline Editor.
 */

import type {
  ParsedTable,
  TableResult,
  PipelineGraph,
  GraphNode,
  GraphEdge,
  RunHistoryEntry,
  TablePreviewData,
  TableColumnSchema,
} from '../types';

// ═══════════════════════════════════════════════════════════════════
// CODE PARSING
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse table definitions from code content
 * Extracts @dp.table and @dlt.table decorated functions
 */
export const parseTablesFromCode = (
  openTabs: { id: string; content: string; name: string }[],
  generatedContents: Record<string, { content: string; language: string }>,
  sampleContents: Record<string, { content: string; language: string }>
): ParsedTable[] => {
  const tables: ParsedTable[] = [];
  
  // Combine all code sources
  const allCode: { fileId: string; content: string }[] = [];
  
  // Add open tabs
  openTabs.forEach(tab => {
    if (tab.content && tab.name.endsWith('.py')) {
      allCode.push({ fileId: tab.id, content: tab.content });
    }
  });
  
  // Add generated contents
  Object.entries(generatedContents).forEach(([id, data]) => {
    if (data.language === 'python' && !allCode.find(c => c.fileId === id)) {
      allCode.push({ fileId: id, content: data.content });
    }
  });
  
  // Add sample contents if no other code
  if (allCode.length === 0) {
    Object.entries(sampleContents).forEach(([id, data]) => {
      if (data.language === 'python') {
        allCode.push({ fileId: id, content: data.content });
      }
    });
  }
  
  // Parse each file for table definitions
  allCode.forEach(({ fileId, content }) => {
    // Match @dp.table or @dlt.table decorated functions
    const tableRegex = /@(?:dp|dlt)\.table[^]*?def\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      
      // Find dependencies (spark.read.table or spark.readStream.table)
      const dependencies: string[] = [];
      const depRegex = /spark\.read(?:Stream)?\.table\(["']([^"']+)["']\)/g;
      let depMatch;
      
      while ((depMatch = depRegex.exec(content)) !== null) {
        const dep = depMatch[1];
        // Only track internal dependencies (not external catalog tables)
        if (!dep.includes('.')) {
          dependencies.push(dep);
        }
      }
      
      tables.push({
        name: tableName,
        fileId,
        dependencies,
      });
    }
  });
  
  return tables;
};

// ═══════════════════════════════════════════════════════════════════
// TABLE RESULTS GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate table results from parsed code
 */
export const generateTableResultsFromCode = (parsedTables: ParsedTable[]): TableResult[] => {
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
  
  return parsedTables.map((table, index) => {
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
      expectations: index === parsedTables.length - 1 ? '3 met' : 'Not defined',
      dropped: Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0,
      warnings: 0,
      failed: 0,
      fileId: table.fileId,
    };
  });
};

// ═══════════════════════════════════════════════════════════════════
// GRAPH GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate graph from parsed code with proper dependencies
 */
export const generateGraphFromCode = (
  parsedTables: ParsedTable[],
  tableResults: TableResult[]
): PipelineGraph => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  if (parsedTables.length === 0) {
    return { nodes, edges };
  }
  
  // Build dependency map to determine levels
  const tableNames = new Set(parsedTables.map(t => t.name));
  const levels: Record<string, number> = {};
  
  // Calculate level for each table (0 = no dependencies, higher = more downstream)
  const calculateLevel = (tableName: string, visited: Set<string> = new Set()): number => {
    if (levels[tableName] !== undefined) return levels[tableName];
    if (visited.has(tableName)) return 0; // Circular dependency protection
    
    visited.add(tableName);
    const table = parsedTables.find(t => t.name === tableName);
    if (!table) return 0;
    
    // Only count dependencies that are in our table list
    const internalDeps = table.dependencies.filter(d => tableNames.has(d));
    if (internalDeps.length === 0) {
      levels[tableName] = 0;
      return 0;
    }
    
    const maxDepLevel = Math.max(...internalDeps.map(d => calculateLevel(d, visited)));
    levels[tableName] = maxDepLevel + 1;
    return levels[tableName];
  };
  
  parsedTables.forEach(t => calculateLevel(t.name));
  
  // Group tables by level
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
      const result = tableResults.find(r => r.name === table.name);
      
      const isStreaming = table.name.toLowerCase().includes('stream') || 
                         table.name.toLowerCase().includes('raw') ||
                         table.name.toLowerCase().includes('cleaned');
      
      nodes.push({
        id: `table-${table.name}`,
        type: isStreaming ? 'streaming' : 'materialized',
        name: table.name,
        status: result?.status || 'success',
        duration: result?.duration || '10s',
        outputRecords: result?.written || '10K',
        droppedRecords: result?.dropped && result.dropped > 0 ? result.dropped : undefined,
        position: { x: startX + levelNum * levelWidth, y: startY + 100 + yOffset },
        fileId: table.fileId,
      });
    });
  });
  
  // Create edges based on dependencies
  parsedTables.forEach(table => {
    table.dependencies.forEach(dep => {
      // Only create edge if dependency is in our table list
      if (tableNames.has(dep)) {
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

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate mock run history for histogram
 */
export const generateMockRunHistory = (): RunHistoryEntry[] => [
  { id: 'run-1', status: 'success', duration: 145, timestamp: new Date(Date.now() - 7200000) },
  { id: 'run-2', status: 'success', duration: 132, timestamp: new Date(Date.now() - 5400000) },
  { id: 'run-3', status: 'failed', duration: 89, timestamp: new Date(Date.now() - 3600000) },
  { id: 'run-4', status: 'success', duration: 156, timestamp: new Date(Date.now() - 1800000) },
  { id: 'run-5', status: 'success', duration: 148, timestamp: new Date(Date.now() - 900000) },
  { id: 'run-6', status: 'success', duration: 156, timestamp: new Date() },
];

/**
 * Generate mock table preview data
 */
export const generateMockTablePreview = (tableName: string): TablePreviewData => {
  const isCustomerTable = tableName.toLowerCase().includes('customer');
  const isOrderTable = tableName.toLowerCase().includes('order');
  const isJoinedTable = tableName.toLowerCase().includes('joined') || 
                        (tableName.toLowerCase().includes('customer') && tableName.toLowerCase().includes('order'));
  
  let columns: TableColumnSchema[];
  let rows: Record<string, unknown>[];
  
  if (isJoinedTable) {
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
      { id: 'REC-004', name: 'Sample Record 4', type: 'type_c', description: 'Fourth record with extended information', created_at: '2024-12-04T09:45:00', value: null, tags: ['demo', 'test', 'extended'] },
      { id: 'REC-005', name: 'Sample Record 5', type: 'type_b', description: 'Fifth sample record', created_at: '2024-12-05T16:00:00', value: 320.00, tags: ['sample'] },
    ];
  }

  return {
    columns,
    rows,
    totalRows: Math.floor(Math.random() * 50000) + 1000,
    queryTime: Math.random() * 2 + 0.5,
    lastRefreshed: new Date(Date.now() - Math.random() * 21600000),
  };
};

// ═══════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Format duration from milliseconds to human readable string
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

/**
 * Format relative time for "refreshed X ago"
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
};

/**
 * Parse duration string to seconds
 */
export const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/(\d+)m?\s*(\d*)s?/);
  if (!match) return 0;
  const mins = duration.includes('m') ? parseInt(match[1]) : 0;
  const secs = match[2] ? parseInt(match[2]) : parseInt(match[1]);
  return mins * 60 + secs;
};

// ═══════════════════════════════════════════════════════════════════
// CODE GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate code template for dependent dataset
 */
export const generateDependentCode = (
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
};

