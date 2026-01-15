"use client";

/**
 * AssistantPanel Component
 * 
 * AI Assistant chat panel for code generation and help.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Copy, Check } from "lucide-react";
import type { ConversationMessage } from "../../types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface AssistantPanelProps {
  /** Conversation history */
  messages: ConversationMessage[];
  /** Whether AI is thinking */
  isThinking: boolean;
  /** Callback to send a message */
  onSendMessage: (message: string) => void;
  /** Callback to apply code from assistant */
  onApplyCode?: (code: string, fileName?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface MessageProps {
  message: ConversationMessage;
  onApplyCode?: (code: string, fileName?: string) => void;
}

function Message({ message, onApplyCode }: MessageProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className={`flex gap-3 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Code blocks */}
        {message.codeBlocks && message.codeBlocks.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.codeBlocks.map((block, index) => (
              <div key={index} className="rounded border bg-background">
                <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50">
                  <span className="text-xs text-muted-foreground">
                    {block.fileName || block.language}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => copyCode(block.code, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    {onApplyCode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onApplyCode(block.code, block.fileName)}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="p-3 overflow-x-auto text-xs">
                  <code>{block.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {message.isTyping && (
          <div className="flex gap-1 mt-2">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AssistantPanel({
  messages,
  isThinking,
  onSendMessage,
  onApplyCode,
}: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isThinking) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-2">AI Assistant</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask questions about your pipeline or get help writing transformations.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              onApplyCode={onApplyCode}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isThinking}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isThinking}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AssistantPanel;

