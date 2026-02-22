import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTodos, useUpdateTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Todo } from "@/hooks/use-todos";

const priorityColors: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function formatDueDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d, yyyy");
}

export function TodoDetail() {
  const { selectedTodoId, selectedSpaceId, setSelectedTodoId } = useAppStore();
  const { data: todos } = useTodos(selectedSpaceId ?? undefined);
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const todo = todos?.find((t) => t.id === selectedTodoId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description ?? "");
    }
  }, [todo?.id, todo?.title, todo?.description]);

  if (!todo) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a todo to view details
      </div>
    );
  }

  function commitTitle() {
    if (title !== todo!.title) updateTodo.mutate({ id: todo!.id, title });
  }

  function commitDescription() {
    if (description !== (todo!.description ?? "")) updateTodo.mutate({ id: todo!.id, description });
  }

  function handleDelete() {
    deleteTodo.mutate(todo!.id, { onSuccess: () => setSelectedTodoId(null) });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-12">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && commitTitle()}
          placeholder="Untitled"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-6"
        />

        {/* Properties */}
        <div className="space-y-3 mb-8">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">Status</span>
            <Select
              value={todo.status}
              onValueChange={(v) =>
                updateTodo.mutate({
                  id: todo.id,
                  status: v as Todo["status"],
                  completed_at: v === "done" ? new Date().toISOString() : null,
                })
              }
            >
              <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${statusColors.todo}`}>To Do</span>
                </SelectItem>
                <SelectItem value="in_progress">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${statusColors.in_progress}`}>In Progress</span>
                </SelectItem>
                <SelectItem value="done">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${statusColors.done}`}>Done</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">Priority</span>
            <Select
              value={todo.priority}
              onValueChange={(v) => updateTodo.mutate({ id: todo.id, priority: v as Todo["priority"] })}
            >
              <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${priorityColors.none}`}>None</span>
                </SelectItem>
                <SelectItem value="low">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${priorityColors.low}`}>Low</span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${priorityColors.medium}`}>Medium</span>
                </SelectItem>
                <SelectItem value="high">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${priorityColors.high}`}>High</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">Due date</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 text-xs justify-start gap-1.5", !todo.due_date && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-3 w-3" />
                  {todo.due_date ? formatDueDate(todo.due_date) : "Set date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={todo.due_date ? new Date(todo.due_date + "T00:00:00") : undefined}
                  onSelect={(d) =>
                    updateTodo.mutate({
                      id: todo.id,
                      due_date: d ? format(d, "yyyy-MM-dd") : null,
                    })
                  }
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {todo.due_date && (
              <button
                onClick={() => updateTodo.mutate({ id: todo.id, due_date: null })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <span className="text-xs text-muted-foreground block mb-2">Description</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            placeholder="Add a description..."
            className="min-h-[120px] resize-none text-sm"
          />
        </div>

        {/* Delete */}
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete task
        </Button>
      </div>
    </div>
  );
}
