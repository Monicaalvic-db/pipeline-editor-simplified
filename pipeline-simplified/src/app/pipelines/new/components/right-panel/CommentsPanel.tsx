"use client";

/**
 * CommentsPanel Component
 * 
 * Panel for viewing and adding code comments.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, User } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  lineNumber?: number;
  fileName?: string;
}

interface CommentsPanelProps {
  /** Current file name */
  currentFile?: string;
  /** Comments for the current file */
  comments?: Comment[];
  /** Callback to add a comment */
  onAddComment?: (content: string, lineNumber?: number) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function CommentsPanel({
  currentFile,
  comments = [],
  onAddComment,
}: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Comments</h3>
        {currentFile && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {currentFile}
          </p>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No comments yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a comment to start a discussion
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{comment.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(comment.timestamp)}
                  </span>
                </div>
                {comment.lineNumber && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Line {comment.lineNumber}
                  </p>
                )}
                <p className="text-sm">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CommentsPanel;

