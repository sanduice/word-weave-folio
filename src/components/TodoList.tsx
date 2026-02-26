import { useTodoLists, useCreateTodoList } from "@/hooks/use-todo-lists";
import { useAppStore } from "@/stores/app-store";
import { Plus, ListTodo } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function TodoList() {
  const { selectedSpaceId, selectedTodoListId, setSelectedTodoListId } = useAppStore();
  const { data: todoLists } = useTodoLists(selectedSpaceId ?? undefined);
  const createTodoList = useCreateTodoList();

  function handleAdd() {
    if (!selectedSpaceId) return;
    createTodoList.mutate({ space_id: selectedSpaceId }, {
      onSuccess: (list) => setSelectedTodoListId(list.id),
    });
  }

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2 pr-1">
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-0">
          <ListTodo className="h-3 w-3 mr-1" />
          Todo Lists
        </SidebarGroupLabel>
        <button
          onClick={handleAdd}
          title="New todo list"
          className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <SidebarGroupContent>
        {!todoLists?.length ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            No todo lists yet
          </p>
        ) : (
          <SidebarMenu>
            {todoLists.map((list) => (
              <SidebarMenuItem key={list.id}>
                <SidebarMenuButton
                  isActive={selectedTodoListId === list.id}
                  onClick={() => setSelectedTodoListId(list.id)}
                  className="text-sm"
                >
                  <span className="shrink-0">{list.icon}</span>
                  <span className="truncate">{list.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
