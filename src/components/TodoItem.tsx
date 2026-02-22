import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTodo } from "@/hooks/use-todos";
import type { Todo } from "@/hooks/use-todos";

interface TodoItemProps {
  todo: Todo;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function TodoItem({ todo, isActive, onSelect }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTodo = useUpdateTodo();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const isDone = todo.status === "done";

  function handleToggle() {
    updateTodo.mutate({
      id: todo.id,
      status: isDone ? "todo" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    });
  }

  function commitRename() {
    setEditing(false);
    if (title !== todo.title) {
      updateTodo.mutate({ id: todo.id, title });
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer group text-sm transition-colors ${
        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
      }`}
      onClick={() => onSelect(todo.id)}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0 rounded"
      />
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setTitle(todo.title); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
        />
      ) : (
        <span
          className={`flex-1 truncate ${isDone ? "line-through text-muted-foreground/60" : ""} ${
            !todo.title?.trim() ? "italic text-muted-foreground/50" : ""
          }`}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {todo.title?.trim() || "Untitled"}
        </span>
      )}
    </div>
  );
}
