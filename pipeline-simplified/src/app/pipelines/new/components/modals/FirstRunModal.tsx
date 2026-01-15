"use client";

/**
 * FirstRunModal Component
 * 
 * Modal that appears on first pipeline run to configure catalog and schema.
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
import { X, ChevronDown, Search } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface FirstRunModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current catalog value */
  catalog: string;
  /** Current schema value */
  schema: string;
  /** Available catalog options */
  catalogOptions: string[];
  /** Available schema options */
  schemaOptions: string[];
  /** Callback when modal is closed (cancels run) */
  onClose: () => void;
  /** Callback when run is confirmed */
  onRun: (catalog: string, schema: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function FirstRunModal({
  isOpen,
  catalog,
  schema,
  catalogOptions,
  schemaOptions,
  onClose,
  onRun,
}: FirstRunModalProps) {
  const [selectedCatalog, setSelectedCatalog] = useState(catalog);
  const [selectedSchema, setSelectedSchema] = useState(schema);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [schemaSearch, setSchemaSearch] = useState("");

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCatalog(catalog);
      setSelectedSchema(schema);
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

  const handleRun = () => {
    onRun(selectedCatalog, selectedSchema);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - doesn't close on click */}
      <div className="fixed inset-0 bg-black/50 z-50" />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[90vw] bg-background rounded-lg shadow-lg z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-xl font-semibold">Default location for data assets</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-muted-foreground mb-6">
            Pipeline tables will be created in this destination
          </p>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Catalog field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Catalog</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                  >
                    {selectedCatalog || "Select catalog"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[260px]">
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
                      onClick={() => setSelectedCatalog(c)}
                      className={selectedCatalog === c ? "bg-accent" : ""}
                    >
                      {c}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Schema field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Schema</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                  >
                    {selectedSchema || "Select schema"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[260px]">
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
                      onClick={() => setSelectedSchema(s)}
                      className={selectedSchema === s ? "bg-accent" : ""}
                    >
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!selectedCatalog || !selectedSchema}
          >
            Run pipeline
          </Button>
        </div>
      </div>
    </>
  );
}

export default FirstRunModal;

