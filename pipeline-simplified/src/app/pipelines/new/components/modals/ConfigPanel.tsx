"use client";

/**
 * ConfigPanel Component
 * 
 * Sidebar panel for configuring catalog and schema settings.
 * Slides in from the right side of the screen.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, X, ChevronDown, Search } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ConfigPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Current catalog value */
  catalog: string;
  /** Current schema value */
  schema: string;
  /** Available catalog options */
  catalogOptions: string[];
  /** Available schema options */
  schemaOptions: string[];
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback when config is saved */
  onSave: (catalog: string, schema: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ConfigPanel({
  isOpen,
  catalog,
  schema,
  catalogOptions,
  schemaOptions,
  onClose,
  onSave,
}: ConfigPanelProps) {
  const [tempCatalog, setTempCatalog] = useState(catalog);
  const [tempSchema, setTempSchema] = useState(schema);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [schemaSearch, setSchemaSearch] = useState("");

  // Reset temp values when panel opens
  useEffect(() => {
    if (isOpen) {
      setTempCatalog(catalog);
      setTempSchema(schema);
      setCatalogSearch("");
      setSchemaSearch("");
    }
  }, [isOpen, catalog, schema]);

  const filteredCatalogs = catalogOptions.filter(c =>
    c.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const filteredSchemas = schemaOptions.filter(s =>
    s.toLowerCase().includes(schemaSearch.toLowerCase())
  );

  const handleSave = () => {
    onSave(tempCatalog, tempSchema);
    onClose();
  };

  const hasChanges = tempCatalog !== catalog || tempSchema !== schema;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[400px] bg-background border-l shadow-lg z-50 flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">Default location for data assets</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 py-6">
          <p className="text-sm text-muted-foreground mb-6">
            Pipeline tables will be created in this destination
          </p>

          {/* Catalog field */}
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium">
              Default catalog<span className="text-red-500">*</span>
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-10"
                >
                  {tempCatalog || "Select catalog"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[352px]">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search catalogs..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>
                {filteredCatalogs.map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => setTempCatalog(c)}
                    className={tempCatalog === c ? "bg-accent" : ""}
                  >
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Schema field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Default schema<span className="text-red-500">*</span>
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-10"
                >
                  {tempSchema || "Select schema"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[352px]">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search schemas..."
                      value={schemaSearch}
                      onChange={(e) => setSchemaSearch(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>
                {filteredSchemas.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setTempSchema(s)}
                    className={tempSchema === s ? "bg-accent" : ""}
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tempCatalog || !tempSchema || !hasChanges}
          >
            Save
          </Button>
        </div>
      </div>
    </>
  );
}

export default ConfigPanel;

