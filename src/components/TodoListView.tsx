import { useState, useRef } from "react";
import { useTodos, useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { useAppStore } from "@/stores/app-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckSquare } from "lucide-react";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { TodoDetail } from "./TodoDetail";

function formatDueDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d, yyyy");
}

export function TodoListView() {
  const { selectedSpaceId, selectedTodoId, setSelectedTodoId, todoFilter, setTodoFilter } = useAppStore();
  const { data: todos } = useTodos(selectedSpaceId ?? undefined, todoFilter);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleStartAdd() {
    setIsAddingTask(true);
    setNewTaskTitle("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCommit() {
    const title = newTaskTitle.trim();
    setIsAddingTask(false);
    setNewTaskTitle("");
    if (!title || !selectedSpaceId) return;
    createTodo.mutate({ space_id: selectedSpaceId, title });
  }

  function handleCancel() {
    setIsAddingTask(false);
    setNewTaskTitle("");
  }

  function handleToggle(id: string, isDone: boolean) {
    updateTodo.mutate({
      id,
      status: isDone ? "todo" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    });
  }

  return (
    <div className="flex-1 flex min-w-0">
      {/* Main list area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Header */}
          <h1 className="text-3xl font-bold text-foreground mb-1">Todo List</h1>
          <p className="text-muted-foreground text-sm mb-8">Stay organized with tasks, your way.</p>

          {/* Tabs + New button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTodoFilter("todo")}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  todoFilter === "todo"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <ListTodo className="h-4 w-4" />
                To Do
              </button>
              <button
                onClick={() => setTodoFilter("done")}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
                  todoFilter === "done"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                Done
              </button>
            </div>
            <Button size="sm" onClick={handleStartAdd} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {/* Task list */}
          <div className="border border-border rounded-lg divide-y divide-border">
            {!todos?.length && !isAddingTask ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {todoFilter === "done" ? "No completed tasks" : "No tasks yet — click New to add one"}
              </div>
            ) : (
              todos?.map((todo) => {
                const isDone = todo.status === "done";
                return (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedTodoId(todo.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedTodoId === todo.id ? "bg-accent" : ""
                    }`}
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => handleToggle(todo.id, isDone)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 shrink-0 rounded"
                    />
                    <span
                      className={`flex-1 text-sm truncate ${
                        isDone ? "line-through text-muted-foreground/60" : ""
                      } ${!todo.title?.trim() ? "italic text-muted-foreground/50" : ""}`}
                    >
                      {todo.title?.trim() || "Untitled"}
                    </span>
                    {todo.due_date && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDueDate(todo.due_date)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            {isAddingTask ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Checkbox disabled className="h-4 w-4 shrink-0 rounded" />
                <input
                  ref={inputRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommit();
                    if (e.key === "Escape") handleCancel();
                  }}
                  onBlur={handleCommit}
                  placeholder="Task name"
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            ) : (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-muted-foreground hover:bg-accent/50 transition-colors rounded-md"
              >
                <Plus className="h-4 w-4" />
                <span>New task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <TodoDetail />
    </div>
  );
}
