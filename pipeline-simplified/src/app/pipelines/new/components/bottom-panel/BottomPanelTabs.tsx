"use client";

/**
 * BottomPanelTabs Component
 * 
 * Tab bar for the bottom panel with Tables, Performance, and Graph tabs.
 */

import { Button } from "@/components/ui/button";
import {
  Table,
  Activity,
  GitFork,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import type { BottomPanelTab } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface BottomPanelTabsProps {
  /** Currently active tab */
  activeTab: BottomPanelTab;
  /** Available tabs */
  tabs: string[];
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Badge counts */
  badges?: { errors: number; warnings: number; info: number };
  /** Callback when tab changes */
  onTabChange: (tab: BottomPanelTab) => void;
  /** Callback to toggle expand */
  onToggleExpand: () => void;
  /** Callback to close panel */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function BottomPanelTabs({
  activeTab,
  tabs,
  isExpanded,
  badges,
  onTabChange,
  onToggleExpand,
  onClose,
}: BottomPanelTabsProps) {
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'tables':
        return <Table className="h-4 w-4" />;
      case 'performance':
        return <Activity className="h-4 w-4" />;
      case 'graph':
        return <GitFork className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'tables':
        return 'Tables';
      case 'performance':
        return 'Performance';
      case 'graph':
        return 'Pipeline Graph';
      default:
        return tab;
    }
  };

  return (
    <div className="flex items-center justify-between border-b px-2 h-9 flex-shrink-0">
      {/* Tab buttons */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab as BottomPanelTab)}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-t ${
              activeTab === tab
                ? "bg-background border-t border-l border-r -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {getTabIcon(tab)}
            {getTabLabel(tab)}
            
            {/* Badge for tables tab */}
            {tab === 'tables' && badges && badges.errors > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {badges.errors}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleExpand}
          title={isExpanded ? "Minimize" : "Maximize"}
        >
          {isExpanded ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default BottomPanelTabs;

