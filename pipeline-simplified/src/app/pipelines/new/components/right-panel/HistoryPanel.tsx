"use client";

/**
 * HistoryPanel Component
 * 
 * Panel for viewing version history and comparing changes.
 */

import { Button } from "@/components/ui/button";
import { History, GitBranch, RotateCcw, Eye } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface VersionEntry {
  id: string;
  version: string;
  author: string;
  message: string;
  timestamp: Date;
  isCurrent?: boolean;
}

interface HistoryPanelProps {
  /** Current file name */
  currentFile?: string;
  /** Version history entries */
  versions?: VersionEntry[];
  /** Callback to view a version */
  onViewVersion?: (versionId: string) => void;
  /** Callback to restore a version */
  onRestoreVersion?: (versionId: string) => void;
  /** Callback to compare versions */
  onCompareVersions?: (versionId1: string, versionId2: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function HistoryPanel({
  currentFile,
  versions = [],
  onViewVersion,
  onRestoreVersion,
}: HistoryPanelProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Today " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Mock data if no versions provided
  const displayVersions = versions.length > 0 ? versions : [
    {
      id: "v3",
      version: "v3",
      author: "You",
      message: "Added data validation",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isCurrent: true,
    },
    {
      id: "v2",
      version: "v2",
      author: "You",
      message: "Initial transformation logic",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: "v1",
      version: "v1",
      author: "You",
      message: "Created file",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Version History</h3>
        {currentFile && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {currentFile}
          </p>
        )}
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-auto">
        {displayVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No version history
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Save changes to create versions
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {displayVersions.map((version, index) => (
              <div
                key={version.id}
                className={`p-4 hover:bg-muted/50 ${
                  version.isCurrent ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        version.isCurrent ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    {index < displayVersions.length - 1 && (
                      <div className="w-px h-full bg-border mt-1" />
                    )}
                  </div>

                  {/* Version info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {version.version}
                      </span>
                      {version.isCurrent && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {version.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{version.author}</span>
                      <span>•</span>
                      <span>{formatDate(version.timestamp)}</span>
                    </div>

                    {/* Actions */}
                    {!version.isCurrent && (
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onViewVersion?.(version.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onRestoreVersion?.(version.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <GitBranch className="h-4 w-4" />
          Compare versions
        </Button>
      </div>
    </div>
  );
}

export default HistoryPanel;

