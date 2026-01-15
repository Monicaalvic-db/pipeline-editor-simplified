"use client";

/**
 * RunSummaryBar Component
 * 
 * Displays pipeline run summary with status, duration, and run history.
 * Appears at the bottom of the Tables view after a run completes.
 */

import { ExternalLink } from "lucide-react";
import type { RunHistoryEntry } from "../../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface RunSummaryBarProps {
  /** Total run duration */
  duration: string;
  /** Run type */
  runType: string;
  /** Run status */
  status: 'complete' | 'failed' | 'canceled' | null;
  /** Run timestamp */
  timestamp: Date | null;
  /** Run history for histogram */
  runHistory: RunHistoryEntry[];
  /** Callback for "View all runs" link */
  onViewAllRuns?: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const formatTimestamp = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function RunSummaryBar({
  duration,
  runType,
  status,
  timestamp,
  runHistory,
  onViewAllRuns,
}: RunSummaryBarProps) {
  const maxDuration = Math.max(...runHistory.map(r => r.duration), 1);

  return (
    <div 
      className="border-t bg-background px-4 py-2"
      title={status && timestamp ? `Status: ${status}\nType: ${runType}\nCreation time: ${formatTimestamp(timestamp)}` : undefined}
    >
      <div 
        className="flex items-center justify-between rounded-lg px-3 py-2"
        style={{ backgroundColor: 'var(--color-grey-50)' }}
      >
        {/* Left side: Run history histogram */}
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-6">
            {runHistory.map((run) => (
              <div
                key={run.id}
                className={`w-2 rounded-sm ${
                  run.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  height: `${Math.max(20, (run.duration / maxDuration) * 100)}%`,
                }}
                title={`${run.status} - ${Math.floor(run.duration / 60)}m ${run.duration % 60}s`}
              />
            ))}
          </div>
          
          {/* Run info */}
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{duration}</span>
            <span className="text-muted-foreground">{runType}</span>
          </div>
        </div>

        {/* Right side: View all runs link */}
        <button
          onClick={onViewAllRuns}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all runs
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default RunSummaryBar;

