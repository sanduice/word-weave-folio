import { useState, useRef, useCallback } from "react";
import { useTodos, useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { useAppStore } from "@/stores/app-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckSquare, GripVertical } from "lucide-react";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { TodoDetail } from "./TodoDetail";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { Todo } from "@/hooks/use-todos";

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  const handleDrop = useCallback(
    (dropIdx: number) => {
      if (dragIdx === null || dragIdx === dropIdx || !todos) return;
      const reordered = [...todos];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);
      // Persist new sort_order for all affected items
      reordered.forEach((todo, i) => {
        if (todo.sort_order !== i) {
          updateTodo.mutate({ id: todo.id, sort_order: i });
        }
      });
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx, todos, updateTodo]
  );

  return (
    <div className="flex-1 flex min-w-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={selectedTodoId ? 70 : 100} minSize={40}>
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-12">
              <h1 className="text-3xl font-bold text-foreground mb-1">Todo List</h1>
              <p className="text-muted-foreground text-sm mb-8">Stay organized with tasks, your way.</p>

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

              <div className="divide-y divide-border">
                {!todos?.length && !isAddingTask ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {todoFilter === "done" ? "No completed tasks" : "No tasks yet — click New to add one"}
                  </div>
                ) : (
                  todos?.map((todo, idx) => {
                    const isDone = todo.status === "done";
                    return (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIdx(idx);
                        }}
                        onDragLeave={() => setDragOverIdx(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(idx);
                        }}
                        onDragEnd={() => {
                          setDragIdx(null);
                          setDragOverIdx(null);
                        }}
                        onClick={() => setSelectedTodoId(todo.id)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group hover:bg-accent/50 ${
                          selectedTodoId === todo.id ? "bg-accent" : ""
                        } ${dragOverIdx === idx ? "border-t-2 border-primary" : ""}`}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => handleToggle(todo.id, isDone)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0 rounded"
                        />
                        <span
                          className={`flex-1 text-sm font-semibold truncate ${
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
                    <div className="h-4 w-4 shrink-0" />
                    <Checkbox disabled className="h-3.5 w-3.5 shrink-0 rounded" />
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
                      className="flex-1 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleStartAdd}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-muted-foreground hover:bg-accent/50 transition-colors rounded-md"
                  >
                    <div className="h-4 w-4 shrink-0" />
                    <Plus className="h-4 w-4" />
                    <span>New task</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>

        {selectedTodoId && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <TodoDetail />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
