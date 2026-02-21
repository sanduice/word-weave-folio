import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
}

export function CommentInput({
  onSubmit,
  onCancel,
  placeholder = "Write a comment…",
  autoFocus = true,
  submitLabel = "Comment",
}: CommentInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={2000}
        className="min-h-[60px] text-sm resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={!value.trim()} className="h-7 text-xs">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
