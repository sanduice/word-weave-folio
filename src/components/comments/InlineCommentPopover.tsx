import { useEffect, useRef } from "react";
import { CommentInput } from "./CommentInput";

interface InlineCommentPopoverProps {
  position: { top: number; left: number } | null;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function InlineCommentPopover({ position, onSubmit, onCancel }: InlineCommentPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="absolute z-[80] w-72 bg-popover border border-border rounded-lg shadow-lg p-3"
      style={{ top: position.top, left: position.left }}
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium">Add a comment</p>
      <CommentInput onSubmit={onSubmit} onCancel={onCancel} submitLabel="Comment" />
    </div>
  );
}
