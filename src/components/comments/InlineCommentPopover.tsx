import { useEffect, useRef } from "react";
import { CommentInput } from "./CommentInput";

interface InlineCommentPopoverProps {
  position: { top: number } | null;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function InlineCommentPopover({ position, onSubmit, onCancel }: InlineCommentPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    // Delay listener to avoid the same mousedown that opened the popover
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          onCancel();
        }
      };
      document.addEventListener("mousedown", handler);
      // Store cleanup
      (ref as any)._cleanup = () => document.removeEventListener("mousedown", handler);
    }, 100);

    return () => {
      clearTimeout(timer);
      (ref as any)._cleanup?.();
    };
  }, [position, onCancel]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="absolute z-[80] w-72 bg-popover border border-border rounded-lg shadow-lg p-3"
      style={{ top: position.top, right: 16 }}
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium">Add a comment</p>
      <CommentInput onSubmit={onSubmit} onCancel={onCancel} submitLabel="Comment" />
    </div>
  );
}
