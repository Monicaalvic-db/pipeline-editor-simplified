"use client";

/**
 * TableFilters Component
 * 
 * Search and filter controls for the tables results view.
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, X } from "lucide-react";
import type { TableStatusFilter, TableTypeFilter } from "../../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface TableFiltersProps {
  /** Search filter value */
  searchFilter: string;
  /** Status filter value */
  statusFilter: TableStatusFilter;
  /** Type filter value */
  typeFilter: TableTypeFilter;
  /** Callback when search changes */
  onSearchChange: (value: string) => void;
  /** Callback when status filter changes */
  onStatusFilterChange: (value: TableStatusFilter) => void;
  /** Callback when type filter changes */
  onTypeFilterChange: (value: TableTypeFilter) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TableFilters({
  searchFilter,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
}: TableFiltersProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      {/* Search input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search table"
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {searchFilter && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            Status
            {statusFilter !== 'all' && (
              <span className="ml-1 text-xs bg-primary/10 px-1.5 rounded">
                {statusFilter}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onStatusFilterChange('all')}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusFilterChange('success')}>
            Success
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusFilterChange('warning')}>
            Warning
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusFilterChange('failed')}>
            Failed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            Type
            {typeFilter !== 'all' && (
              <span className="ml-1 text-xs bg-primary/10 px-1.5 rounded">
                {typeFilter}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onTypeFilterChange('all')}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTypeFilterChange('Materialized view')}>
            Materialized view
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTypeFilterChange('Streaming table')}>
            Streaming table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTypeFilterChange('Persisted view')}>
            Persisted view
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTypeFilterChange('Sink')}>
            Sink
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default TableFilters;

