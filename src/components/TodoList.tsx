import { useState, useRef, useEffect } from "react";
import { useTodoLists, useCreateTodoList, useUpdateTodoList, useDeleteTodoList } from "@/hooks/use-todo-lists";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ListTodo, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TodoList() {
  const { selectedSpaceId, selectedTodoListId, setSelectedTodoListId, goHome } = useAppStore();
  const { data: todoLists } = useTodoLists(selectedSpaceId ?? undefined);
  const createTodoList = useCreateTodoList();
  const updateTodoList = useUpdateTodoList();
  const deleteTodoList = useDeleteTodoList();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  function handleAdd() {
    if (!selectedSpaceId) return;
    createTodoList.mutate({ space_id: selectedSpaceId }, {
      onSuccess: (list) => setSelectedTodoListId(list.id),
    });
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      updateTodoList.mutate({ id: renamingId, name: renameValue.trim() });
    }
    setRenamingId(null);
  }

  function cancelRename() {
    setRenamingId(null);
  }

  function confirmDelete() {
    if (!deleteId) return;
    if (selectedTodoListId === deleteId) goHome();
    deleteTodoList.mutate(deleteId);
    setDeleteId(null);
  }

  const deleteTarget = todoLists?.find((l) => l.id === deleteId);

  return (
    <>
      <SidebarGroup>
        <div className="flex items-center justify-between px-2 pr-1">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-0">
            <ListTodo className="h-3 w-3 mr-1" />
            Todo Lists
          </SidebarGroupLabel>
          <Button variant="ghost" size="icon" onClick={handleAdd} title="New todo list" className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
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
                  {renamingId === list.id ? (
                    <div className="px-2 py-0.5">
                      <Input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="w-full text-sm md:text-sm h-7"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center w-full group">
                      <SidebarMenuButton
                        isActive={selectedTodoListId === list.id}
                        onClick={() => setSelectedTodoListId(list.id)}
                        className="text-sm flex-1"
                      >
                        <span className="shrink-0">{list.icon}</span>
                        <span className="truncate">{list.name}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => startRename(list.id, list.name)} className="gap-2">
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(list.id)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this todo list and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
