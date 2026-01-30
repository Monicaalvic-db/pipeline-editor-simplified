"use client";

/**
 * PipelineHeader Component
 * 
 * Displays the pipeline name, catalog/schema tags, and action buttons.
 * Handles pipeline execution controls (Run, Dry Run, Stop).
 */

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Pencil,
  Database,
  Settings,
  Calendar,
  Share2,
  Square,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { PipelineState } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface PipelineHeaderProps {
  /** Current pipeline name */
  pipelineName: string;
  /** Whether the name is being edited */
  isEditingName: boolean;
  /** Selected catalog */
  selectedCatalog: string;
  /** Selected schema */
  selectedSchema: string;
  /** Current pipeline execution state */
  pipelineState: PipelineState;
  /** Whether the pipeline can be run */
  canRunPipeline: boolean;
  /** Callback when pipeline name changes */
  onNameChange: (name: string) => void;
  /** Callback to toggle name editing mode */
  onEditingNameChange: (isEditing: boolean) => void;
  /** Callback to open config panel */
  onOpenConfigPanel: () => void;
  /** Callback to run pipeline */
  onRunPipeline: (type: 'run' | 'dryRun') => void;
  /** Callback to stop pipeline */
  onStopPipeline: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function PipelineHeader({
  pipelineName,
  isEditingName,
  selectedCatalog,
  selectedSchema,
  pipelineState,
  canRunPipeline,
  onNameChange,
  onEditingNameChange,
  onOpenConfigPanel,
  onRunPipeline,
  onStopPipeline,
}: PipelineHeaderProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle name input key events
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      onEditingNameChange(false);
    }
  };

  const isRunning = pipelineState.status === 'running';
  const isStopping = pipelineState.status === 'stopping';
  const isDisabled = isRunning || isStopping;
  const isRunningRun = isRunning && pipelineState.type === 'run';
  const isRunningDryRun = isRunning && pipelineState.type === 'dryRun';

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b bg-card gap-4 flex-shrink-0">
      {/* Left side - Pipeline name and catalog/schema */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink overflow-hidden">
        {/* Pipeline icon */}
        <div 
          className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0" 
          style={{ backgroundColor: 'var(--color-grey-50)' }}
        >
          <Zap className="h-4 w-4" style={{ color: 'var(--color-grey-500)' }} />
        </div>
        
        {/* Pipeline name (editable) */}
        {isEditingName ? (
          <Input
            ref={nameInputRef}
            value={pipelineName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => onEditingNameChange(false)}
            onKeyDown={handleNameKeyDown}
            className="h-7 text-sm font-medium w-64 px-2"
          />
        ) : (
          <button
            onClick={() => onEditingNameChange(true)}
            className="flex items-center gap-1.5 hover:bg-accent px-2 py-1 rounded text-sm font-medium truncate group"
          >
            <span className="truncate">{pipelineName}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </button>
        )}

        {/* Catalog and Schema tags */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
          <button
            onClick={onOpenConfigPanel}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            title="Configure catalog and schema"
          >
            <Database className="h-3 w-3" />
            <span>{selectedCatalog}</span>
          </button>
          <span>·</span>
          <button
            onClick={onOpenConfigPanel}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            title="Configure catalog and schema"
          >
            <Database className="h-3 w-3" />
            <span>{selectedSchema}</span>
          </button>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Secondary actions */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 gap-1.5"
          disabled={isDisabled}
        >
          <Settings className="h-3.5 w-3.5 lg:hidden" />
          <span className="hidden lg:inline">Settings</span>
        </Button>
        
        {/* Overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 w-7 p-0"
              disabled={isDisabled}
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
              disabled={isDisabled}
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pipeline compute</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Dry Run / Stop (for dry run) */}
        {isRunningDryRun ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 gap-1.5"
            onClick={onStopPipeline}
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7"
            onClick={() => onRunPipeline('dryRun')}
            disabled={!canRunPipeline || isRunningRun}
            title={!canRunPipeline ? "Add code to a file to run the pipeline" : undefined}
          >
            Dry run
          </Button>
        )}
        
        {/* Run Pipeline / Stop (for run) */}
        {isRunningRun ? (
          <Button 
            size="sm" 
            className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            onClick={onStopPipeline}
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="h-7 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onRunPipeline('run')}
            disabled={!canRunPipeline || isRunningDryRun}
            title={!canRunPipeline ? "Add code to a file to run the pipeline" : undefined}
          >
            Run pipeline
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default PipelineHeader;

