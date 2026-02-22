import { useState } from "react";
import { X, MessageSquare, CheckCircle, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentInput } from "./CommentInput";
import {
  Comment,
  useComments,
  useReplyToComment,
  useUpdateCommentStatus,
  useDeleteComment,
  useDeleteReply,
} from "@/hooks/use-comments";
import { useAppStore } from "@/stores/app-store";
import { formatDistanceToNow } from "date-fns";

interface CommentPanelProps {
  pageId: string;
  userId: string;
  editorHtml: string;
  onCommentClick: (commentId: string) => void;
  onResolveComment: (commentId: string, status: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
}

type FilterType = "all" | "open" | "resolved";

export function CommentPanel({ pageId, userId, editorHtml, onCommentClick, onResolveComment, onDeleteComment, onClose }: CommentPanelProps) {
  const { data: comments = [] } = useComments(pageId);
  const replyMutation = useReplyToComment();
  const statusMutation = useUpdateCommentStatus();
  const deleteMutation = useDeleteComment();
  const deleteReplyMutation = useDeleteReply();
  const { activeCommentId, setActiveCommentId } = useAppStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const enriched = comments.map((c) => ({
    ...c,
    isOrphaned: !editorHtml.includes(`data-comment-id="${c.id}"`),
  }));

  const filtered = enriched.filter((c) => {
    if (filter === "open") return c.status === "open";
    if (filter === "resolved") return c.status === "resolved";
    return true;
  });

  const openCount = enriched.filter((c) => c.status === "open").length;

  const initials = (c: Comment) => {
    const name = c.profile?.full_name || c.profile?.email || "?";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="h-full border-l border-border bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comments</span>
          {openCount > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none font-medium">
              {openCount}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b border-border shrink-0">
        {(["all", "open", "resolved"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
              filter === f
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">No comments yet</div>
        )}
        {filtered.map((comment) => (
          <div
            key={comment.id}
            className={`border-b border-border p-4 cursor-pointer transition-colors ${
              activeCommentId === comment.id ? "bg-accent/30" : "hover:bg-accent/20"
            }`}
            onClick={() => {
              setActiveCommentId(comment.id);
              onCommentClick(comment.id);
            }}
          >
            {/* Author row */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={comment.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">{initials(comment)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">
                {comment.profile?.full_name || comment.profile?.email || "Unknown"}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Orphaned warning */}
            {comment.isOrphaned && (
              <div className="flex items-center gap-1 text-[10px] text-orange-600 mb-1.5">
                <AlertTriangle className="h-3 w-3" />
                Original text removed
              </div>
            )}

            {/* Selected text preview */}
            {comment.selected_text && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 mb-2 border-l-2 border-muted-foreground/20 line-clamp-2 italic">
                "{comment.selected_text.slice(0, 100)}{comment.selected_text.length > 100 ? "…" : ""}"
              </div>
            )}

            {/* Comment body */}
            <p className="text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {comment.status === "open" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => {
                    statusMutation.mutate({ id: comment.id, status: "resolved", page_id: pageId });
                    onResolveComment(comment.id, "resolved");
                  }}
                >
                  <CheckCircle className="h-3 w-3" /> Resolve
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => {
                    statusMutation.mutate({ id: comment.id, status: "open", page_id: pageId });
                    onResolveComment(comment.id, "open");
                  }}
                >
                  <RotateCcw className="h-3 w-3" /> Reopen
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 text-muted-foreground"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                Reply
              </Button>
              {comment.user_id === userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 text-destructive/70 hover:text-destructive ml-auto"
                  onClick={() => {
                    deleteMutation.mutate({ id: comment.id, page_id: pageId });
                    onDeleteComment(comment.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 ml-4 space-y-2 border-l border-border pl-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="text-xs">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium">{reply.profile?.full_name || reply.profile?.email || "Unknown"}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                      {reply.user_id === userId && (
                        <button
                          className="ml-auto text-destructive/50 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReplyMutation.mutate({ id: reply.id, page_id: pageId });
                          }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-foreground/80">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="mt-2 ml-4" onClick={(e) => e.stopPropagation()}>
                <CommentInput
                  placeholder="Reply…"
                  submitLabel="Reply"
                  onSubmit={(content) => {
                    replyMutation.mutate({ comment_id: comment.id, content, user_id: userId, page_id: pageId });
                    setReplyingTo(null);
                  }}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
