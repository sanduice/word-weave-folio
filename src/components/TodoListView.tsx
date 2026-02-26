import { useState, useRef, useCallback } from "react";
import { useTodos, useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { useTodoLists, useUpdateTodoList, useDeleteTodoList } from "@/hooks/use-todo-lists";
import { useAppStore } from "@/stores/app-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
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
  const { selectedSpaceId, selectedTodoId, setSelectedTodoId, selectedTodoListId, todoFilter, setTodoFilter } = useAppStore();
  const { data: todoLists } = useTodoLists(selectedSpaceId ?? undefined);
  const currentList = todoLists?.find((l) => l.id === selectedTodoListId);
  const { data: todos } = useTodos(selectedTodoListId ?? undefined, todoFilter);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const updateList = useUpdateTodoList();
  const deleteList = useDeleteTodoList();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  function handleStartAdd() {
    setIsAddingTask(true);
    setNewTaskTitle("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCommit(keepOpen = false) {
    const title = newTaskTitle.trim();
    setNewTaskTitle("");
    if (!keepOpen) {
      setIsAddingTask(false);
    }
    if (!title || !selectedSpaceId || !selectedTodoListId) return;
    createTodo.mutate({ space_id: selectedSpaceId, todo_list_id: selectedTodoListId, title }, {
      onSuccess: () => {
        if (keepOpen) {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      },
    });
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

  function handleStartRename() {
    if (!currentList) return;
    setRenameValue(currentList.name);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 0);
  }

  function handleCommitRename() {
    setIsRenaming(false);
    const name = renameValue.trim();
    if (!name || !currentList || name === currentList.name) return;
    updateList.mutate({ id: currentList.id, name });
  }

  function handleDeleteList() {
    if (!currentList) return;
    deleteList.mutate(currentList.id, {
      onSuccess: () => {
        useAppStore.getState().setSelectedTodoListId(null);
      },
    });
  }

  const handleDrop = useCallback(
    (dropIdx: number) => {
      if (dragIdx === null || dragIdx === dropIdx || !todos) return;
      const reordered = [...todos];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);
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

  if (!selectedTodoListId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select a todo list from the sidebar, or create a new one.
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-w-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={selectedTodoId ? 70 : 100} minSize={40}>
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-12">
              {/* List header */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{currentList?.icon ?? "📋"}</span>
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleCommitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitRename();
                      if (e.key === "Escape") setIsRenaming(false);
                    }}
                    className="text-3xl font-bold bg-transparent outline-none border-b border-primary w-full"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-foreground">{currentList?.name ?? "Todo List"}</h1>
                )}
                <button onClick={handleStartRename} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Rename list">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={handleDeleteList} className="p-1 rounded hover:bg-accent text-destructive hover:text-destructive" title="Delete list">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
                        {editingTodoId === todo.id ? (
                          <input
                            ref={editInputRef}
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => {
                              if (editingTitle.trim() && editingTitle !== todo.title) {
                                updateTodo.mutate({ id: todo.id, title: editingTitle.trim() });
                              }
                              setEditingTodoId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingTitle.trim() && editingTitle !== todo.title) {
                                  updateTodo.mutate({ id: todo.id, title: editingTitle.trim() });
                                }
                                setEditingTodoId(null);
                              }
                              if (e.key === "Escape") setEditingTodoId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-sm font-semibold bg-transparent outline-none border-b border-primary min-w-0"
                          />
                        ) : (
                          <span
                            className={`flex-1 text-sm font-semibold truncate ${
                              isDone ? "line-through text-muted-foreground/60" : ""
                            } ${!todo.title?.trim() ? "italic text-muted-foreground/50" : ""}`}
                          >
                            {todo.title?.trim() || "Untitled"}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTodoId(todo.id);
                            setEditingTitle(todo.title ?? "");
                            setTimeout(() => editInputRef.current?.focus(), 0);
                          }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Edit title"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
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
                        if (e.key === "Enter") { e.preventDefault(); handleCommit(true); }
                        if (e.key === "Escape") handleCancel();
                      }}
                      onBlur={() => handleCommit(false)}
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
