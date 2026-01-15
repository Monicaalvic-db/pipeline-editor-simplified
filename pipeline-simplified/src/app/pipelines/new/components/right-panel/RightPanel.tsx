"use client";

/**
 * RightPanel Component
 * 
 * Container for the right sidebar panel.
 * Displays Assistant, Comments, or History based on active panel.
 */

import { Button } from "@/components/ui/button";
import { X, ChevronLeft } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { CommentsPanel } from "./CommentsPanel";
import { HistoryPanel } from "./HistoryPanel";
import type { RightPanelType, ConversationMessage } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface RightPanelProps {
  /** Currently active panel */
  activePanel: RightPanelType;
  /** Width of the panel */
  width: number;
  /** Current file name for context */
  currentFile?: string;
  /** Conversation messages for assistant */
  conversationMessages: ConversationMessage[];
  /** Whether assistant is thinking */
  isAssistantThinking: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback to send message to assistant */
  onSendMessage: (message: string) => void;
  /** Callback to apply code from assistant */
  onApplyCode?: (code: string, fileName?: string) => void;
  /** Callback to move panel to bottom */
  onMoveToBottom?: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function RightPanel({
  activePanel,
  width,
  currentFile,
  conversationMessages,
  isAssistantThinking,
  onClose,
  onSendMessage,
  onApplyCode,
  onMoveToBottom,
}: RightPanelProps) {
  if (!activePanel) return null;

  const getPanelTitle = () => {
    switch (activePanel) {
      case "assistant":
        return "Assistant";
      case "comments":
        return "Comments";
      case "history":
        return "Version History";
      case "graph":
        return "Pipeline Graph";
      case "tables":
        return "Tables";
      case "performance":
        return "Performance";
      case "terminal":
        return "Terminal";
      default:
        return activePanel;
    }
  };

  const renderContent = () => {
    switch (activePanel) {
      case "assistant":
        return (
          <AssistantPanel
            messages={conversationMessages}
            isThinking={isAssistantThinking}
            onSendMessage={onSendMessage}
            onApplyCode={onApplyCode}
          />
        );
      case "comments":
        return <CommentsPanel currentFile={currentFile} />;
      case "history":
        return <HistoryPanel currentFile={currentFile} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {getPanelTitle()} content
          </div>
        );
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-card border-l"
      style={{ width, minWidth: Math.min(width, 100) }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h3 className="font-medium text-sm">{getPanelTitle()}</h3>
        <div className="flex items-center gap-1">
          {onMoveToBottom && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveToBottom}
              title="Move to bottom panel"
            >
              <ChevronLeft className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default RightPanel;

