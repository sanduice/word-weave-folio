import { useState, useRef, useEffect } from "react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ChevronRight, Folder, FolderOpen, GripVertical, MoreHorizontal, FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { Folder as FolderType } from "@/hooks/use-folders";
import { useUpdateFolder, useDeleteFolder, useCreateFolder, isFolderAncestor } from "@/hooks/use-folders";
import { useCreatePage } from "@/hooks/use-pages";
import type { Page } from "@/hooks/use-pages";

// Drag state shared across the whole tree (passed as refs)
export interface DragState {
  draggedId: React.MutableRefObject<string | null>;
  draggedType: React.MutableRefObject<"folder" | "page" | null>;
}

interface FolderItemProps {
  folder: FolderType;
  folders: FolderType[];
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  depth: number;
  dragState: DragState;
  onReorder: (
    draggedId: string,
    draggedType: "folder" | "page",
    targetId: string,
    targetType: "folder" | "page",
    position: "before" | "after" | "into"
  ) => void;
  spaceId: string;
  // Children renderer — injected to avoid circular imports
  renderChildren: (
    parentFolderId: string | null,
    depth: number,
    dragState: DragState,
    onReorder: FolderItemProps["onReorder"]
  ) => React.ReactNode;
}

export function FolderItem({
  folder,
  folders,
  pages,
  selectedPageId,
  onSelectPage,
  depth,
  dragState,
  onReorder,
  spaceId,
  renderChildren,
}: FolderItemProps) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`folder-open-${folder.id}`) !== "false";
    } catch {
      return true;
    }
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [dropState, setDropState] = useState<"before" | "after" | "into" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createFolder = useCreateFolder();
  const createPage = useCreatePage();

  // Persist collapsed state
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    try { localStorage.setItem(`folder-open-${folder.id}`, String(val)); } catch {}
  };

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => renameInputRef.current?.select(), 50);
    }
  }, [isRenaming]);

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      updateFolder.mutate({ id: folder.id, name: trimmed });
    } else {
      setRenameValue(folder.name);
    }
    setIsRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleRenameSubmit(); }
    if (e.key === "Escape") { setRenameValue(folder.name); setIsRenaming(false); }
  }

  function getDropZone(e: React.DragEvent, el: HTMLElement): "before" | "after" | "into" {
    const rect = el.getBoundingClientRect();
    const pct = (e.clientY - rect.top) / rect.height;
    if (pct < 0.25) return "before";
    if (pct > 0.75) return "after";
    return "into";
  }

  function handleDragStart(e: React.DragEvent) {
    dragState.draggedId.current = folder.id;
    dragState.draggedType.current = "folder";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("id", folder.id);
    e.dataTransfer.setData("type", "folder");
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!itemRef.current) return;
    const srcId = dragState.draggedId.current;
    const srcType = dragState.draggedType.current;
    if (srcId === folder.id) return;
    // Prevent dropping a parent folder into its own child
    if (srcType === "folder" && srcId && isFolderAncestor(folders, folder.id, srcId)) return;
    if (srcType === "folder" && srcId === folder.id) return;
    setDropState(getDropZone(e, itemRef.current));
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!itemRef.current?.contains(e.relatedTarget as Node)) {
      setDropState(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const srcId = dragState.draggedId.current;
    const srcType = dragState.draggedType.current;
    const zone = dropState;
    setDropState(null);
    if (!srcId || !srcType || !zone || !itemRef.current) return;
    if (srcId === folder.id) return;
    if (srcType === "folder" && isFolderAncestor(folders, folder.id, srcId)) return;
    onReorder(srcId, srcType, folder.id, "folder", zone);
    dragState.draggedId.current = null;
    dragState.draggedType.current = null;
  }

  function handleDragEnd() {
    setDropState(null);
  }

  function handleAddPage() {
    createPage.mutate({ space_id: spaceId, folder_id: folder.id, title: "" }, {
      onSuccess: (page) => {
        handleOpenChange(true);
        onSelectPage(page.id);
      },
    });
  }

  function handleAddFolder() {
    createFolder.mutate({ space_id: spaceId, parent_folder_id: folder.id }, {
      onSuccess: () => handleOpenChange(true),
    });
  }

  function handleDelete() {
    deleteFolder.mutate(folder.id);
  }

  const dropBorderClass =
    dropState === "before" ? "border-t-2 border-primary" :
    dropState === "after" ? "border-b-2 border-primary" :
    dropState === "into" ? "bg-primary/10 rounded" : "";

  const hasChildren =
    folders.some((f) => f.parent_folder_id === folder.id) ||
    pages.some((p) => p.folder_id === folder.id && !p.parent_id);

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{folder.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all sub-folders inside. Pages inside will be moved to the space root and won't be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <SidebarMenuItem>
          <div
            ref={itemRef}
            className={`flex items-center w-full group rounded transition-colors ${dropBorderClass}`}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            style={{ paddingLeft: depth > 0 ? `${depth * 8}px` : undefined }}
          >
            {/* Grip */}
            <span className="p-1 opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
              <GripVertical className="h-3 w-3" />
            </span>

            {/* Expand chevron */}
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-sidebar-accent rounded shrink-0">
                <ChevronRight
                  className={`h-3 w-3 transition-transform text-muted-foreground ${open && hasChildren ? "rotate-90" : ""}`}
                />
              </button>
            </CollapsibleTrigger>

            {/* Folder name / rename input */}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0.5 px-1 text-foreground"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <SidebarMenuButton
                className="text-sm flex-1 gap-1.5"
                onClick={() => {}}
              >
                {open && hasChildren
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                }
                <span className="truncate" title={folder.name}>{folder.name}</span>
              </SidebarMenuButton>
            )}

            {/* Actions menu */}
            {!isRenaming && (
              <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-sidebar-accent shrink-0 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-44">
                  <DropdownMenuItem onClick={handleAddPage} className="gap-2 text-xs">
                    <FilePlus className="h-3.5 w-3.5" /> Add page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddFolder} className="gap-2 text-xs">
                    <FolderPlus className="h-3.5 w-3.5" /> Add folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setIsRenaming(true); setRenameValue(folder.name); }}
                    className="gap-2 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SidebarMenuItem>

        <CollapsibleContent>
          <div className="ml-4 border-l border-sidebar-border pl-1">
            <SidebarMenu>
              {renderChildren(folder.id, depth + 1, dragState, onReorder)}
            </SidebarMenu>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
