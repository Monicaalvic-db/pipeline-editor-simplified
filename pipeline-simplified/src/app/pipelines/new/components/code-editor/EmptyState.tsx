"use client";

/**
 * EmptyState Component
 * 
 * Displays when no code is in the editor.
 * Offers options to generate sample code or add transformations.
 */

import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Code } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  /** Callback to generate sample transformation */
  onGenerateSample: () => void;
  /** Callback to show AI prompt input */
  onShowAIPrompt: () => void;
  /** Callback to add manual code */
  onAddManualCode: () => void;
  /** Whether sample generation is loading */
  isGenerating?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function EmptyState({
  onGenerateSample,
  onShowAIPrompt,
  onAddManualCode,
  isGenerating = false,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Code className="h-8 w-8 text-primary" />
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Get started with your pipeline</h3>
          <p className="text-sm text-muted-foreground">
            Create transformations to define how your data flows through the pipeline.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* AI generation option */}
          <Button
            onClick={onShowAIPrompt}
            className="w-full gap-2"
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>

          {/* Sample code option */}
          <Button
            variant="outline"
            onClick={onGenerateSample}
            className="w-full gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add sample transformation
              </>
            )}
          </Button>

          {/* Manual code option */}
          <Button
            variant="ghost"
            onClick={onAddManualCode}
            className="w-full text-muted-foreground"
            disabled={isGenerating}
          >
            Or start coding manually
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          Tip: Use the file browser on the left to organize your transformations
        </p>
      </div>
    </div>
  );
}

export default EmptyState;

