"use client";

/**
 * usePipelineExecution Hook
 * 
 * Handles pipeline run/stop logic and progress simulation.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { PipelineState, TableResult, RunHistoryEntry, PipelineGraph } from "../types";
import { PIPELINE_STAGES } from "../utils/constants";
import {
  parseTablesFromCode,
  generateTableResultsFromCode,
  generateGraphFromCode,
  generateMockRunHistory,
} from "../utils/helpers";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface UsePipelineExecutionOptions {
  /** Open tabs for parsing code */
  openTabs: Array<{ id: string; content: string; name: string }>;
  /** Generated contents ref */
  generatedContentsRef: React.MutableRefObject<Record<string, { content: string; language: string }>>;
  /** Sample contents for fallback */
  sampleContents: Record<string, { content: string; language: string }>;
  /** Callback when run completes */
  onRunComplete?: (results: TableResult[], graph: PipelineGraph) => void;
  /** Callback to open bottom panel */
  onOpenBottomPanel?: () => void;
}

interface UsePipelineExecutionReturn {
  /** Current pipeline state */
  pipelineState: PipelineState;
  /** Whether pipeline has been run at least once */
  hasRunPipeline: boolean;
  /** Last run timestamp */
  lastRunTimestamp: Date | null;
  /** Last run status */
  lastRunStatus: 'complete' | 'failed' | 'canceled' | null;
  /** Execution duration in seconds */
  executionDuration: number;
  /** Table results from last run */
  tableResults: TableResult[];
  /** Run history */
  runHistory: RunHistoryEntry[];
  /** Graph data */
  graphData: PipelineGraph;
  /** Whether pipeline can run (has code) */
  canRunPipeline: () => boolean;
  /** Start pipeline run */
  runPipeline: (type: 'run' | 'dryRun') => void;
  /** Stop pipeline */
  stopPipeline: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function usePipelineExecution({
  openTabs,
  generatedContentsRef,
  sampleContents,
  onRunComplete,
  onOpenBottomPanel,
}: UsePipelineExecutionOptions): UsePipelineExecutionReturn {
  const [pipelineState, setPipelineState] = useState<PipelineState>({ status: 'idle' });
  const [hasRunPipeline, setHasRunPipeline] = useState(false);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<Date | null>(null);
  const [lastRunStatus, setLastRunStatus] = useState<'complete' | 'failed' | 'canceled' | null>(null);
  const [executionDuration, setExecutionDuration] = useState(0);
  const [tableResults, setTableResults] = useState<TableResult[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [graphData, setGraphData] = useState<PipelineGraph>({ nodes: [], edges: [] });

  const abortControllerRef = useRef<AbortController | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if pipeline can run (has any code)
  const canRunPipeline = useCallback(() => {
    const hasTabContent = openTabs.some(tab => tab.content && tab.content.trim().length > 0);
    const hasGeneratedContent = Object.values(generatedContentsRef.current).some(
      c => c.content && c.content.trim().length > 0
    );
    return hasTabContent || hasGeneratedContent;
  }, [openTabs, generatedContentsRef]);

  // Run pipeline
  const runPipeline = useCallback(async (type: 'run' | 'dryRun') => {
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const startTime = new Date();
    setExecutionDuration(0);

    // Start duration counter
    durationIntervalRef.current = setInterval(() => {
      setExecutionDuration(prev => prev + 1);
    }, 1000);

    // Open bottom panel
    onOpenBottomPanel?.();

    setPipelineState({
      status: 'running',
      type,
      startTime,
      progress: 0,
      currentStage: PIPELINE_STAGES[0].status,
    });

    try {
      // Simulate pipeline stages
      let currentProgress = 0;

      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        if (signal.aborted) break;

        const stage = PIPELINE_STAGES[i];
        const targetProgress = stage.targetProgress;

        setPipelineState(prev => 
          prev.status === 'running' 
            ? { ...prev, currentStage: stage.status, progress: currentProgress }
            : prev
        );

        // Animate progress
        const progressSteps = 10;
        const progressIncrement = (targetProgress - currentProgress) / progressSteps;
        const stepDuration = stage.duration / progressSteps;

        for (let j = 0; j < progressSteps; j++) {
          if (signal.aborted) break;
          await new Promise(resolve => setTimeout(resolve, stepDuration));
          currentProgress += progressIncrement;
          
          setPipelineState(prev =>
            prev.status === 'running'
              ? { ...prev, progress: Math.min(currentProgress, targetProgress) }
              : prev
          );
        }

        currentProgress = targetProgress;
      }

      if (!signal.aborted) {
        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        // Parse code and generate results
        const parsedTables = parseTablesFromCode(
          openTabs,
          generatedContentsRef.current,
          sampleContents
        );
        const results = generateTableResultsFromCode(parsedTables);
        const graph = generateGraphFromCode(parsedTables, results);

        setTableResults(results);
        setGraphData(graph);
        setRunHistory(generateMockRunHistory());
        setHasRunPipeline(true);
        setLastRunTimestamp(endTime);
        setLastRunStatus('complete');

        setPipelineState({
          status: 'completed',
          duration,
          type,
        });

        onRunComplete?.(results, graph);
      }
    } catch (error) {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      if (!signal.aborted) {
        setPipelineState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setLastRunStatus('failed');
      }
    }
  }, [openTabs, generatedContentsRef, sampleContents, onRunComplete, onOpenBottomPanel]);

  // Stop pipeline
  const stopPipeline = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setPipelineState(prev => {
      if (prev.status === 'running') {
        setLastRunStatus('canceled');
        setLastRunTimestamp(new Date());
        return { status: 'stopped', duration: executionDuration };
      }
      return prev;
    });
  }, [executionDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    pipelineState,
    hasRunPipeline,
    lastRunTimestamp,
    lastRunStatus,
    executionDuration,
    tableResults,
    runHistory,
    graphData,
    canRunPipeline,
    runPipeline,
    stopPipeline,
  };
}

export default usePipelineExecution;

