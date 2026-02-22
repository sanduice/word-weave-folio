import { useTodos, useCreateTodo } from "@/hooks/use-todos";
import { useAppStore } from "@/stores/app-store";
import { TodoItem } from "./TodoItem";
import { Plus, ListTodo } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

export function TodoList() {
  const { selectedSpaceId, selectedTodoId, setSelectedTodoId, todoFilter, setTodoFilter } = useAppStore();
  const { data: todos } = useTodos(selectedSpaceId ?? undefined, todoFilter);
  const createTodo = useCreateTodo();

  function handleAdd() {
    if (!selectedSpaceId) return;
    createTodo.mutate({ space_id: selectedSpaceId }, {
      onSuccess: (todo) => setSelectedTodoId(todo.id),
    });
  }

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2 pr-1">
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-0">
          <ListTodo className="h-3 w-3 mr-1" />
          Todos
        </SidebarGroupLabel>
        <button
          onClick={handleAdd}
          title="New todo"
          className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-2 mb-1">
        <button
          onClick={() => setTodoFilter("todo")}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            todoFilter === "todo"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          To Do
        </button>
        <button
          onClick={() => setTodoFilter("done")}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            todoFilter === "done"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Done
        </button>
      </div>

      <SidebarGroupContent>
        {!todos?.length ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            {todoFilter === "done" ? "No completed tasks" : "No tasks yet"}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 px-1">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                isActive={selectedTodoId === todo.id}
                onSelect={setSelectedTodoId}
              />
            ))}
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
