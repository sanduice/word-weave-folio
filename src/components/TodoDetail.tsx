import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExtension from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { SlashCommandExtension } from "./editor/slash-command";
import { SlashCommandMenu } from "./editor/SlashCommandMenu";
import { BubbleMenuToolbar } from "./editor/BubbleMenuToolbar";
import { useAppStore } from "@/stores/app-store";
import { useTodos, useUpdateTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Trash2, X, Link2 } from "lucide-react";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const { selectedTodoId, selectedTodoListId, setSelectedTodoId } = useAppStore();
  const { data: todos } = useTodos(selectedTodoListId ?? undefined);
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const todo = todos?.find((t) => t.id === selectedTodoId);

  const [title, setTitle] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedDescription = useRef<string>("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
      }),
      Placeholder.configure({ placeholder: "Add a description... (use / for commands)" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      LinkExtension.configure({ openOnClick: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      SlashCommandExtension,
      Table.configure({ resizable: true, cellMinWidth: 100 }),
      TableRow,
      TableHeader,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: (el) => (el as HTMLElement).style.backgroundColor || null,
              renderHTML: (attrs) => {
                if (!attrs.backgroundColor) return {};
                return { style: `background-color: ${attrs.backgroundColor}` };
              },
            },
          };
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-0 py-2",
      },
    },
    onUpdate: ({ editor: e }) => {
      scheduleDescriptionSave(e.getHTML());
    },
  });

  // Load todo content into editor
  useEffect(() => {
    if (todo && editor) {
      setTitle(todo.title);
      const desc = todo.description ?? "";
      lastSavedDescription.current = desc;
      if (editor.getHTML() !== desc) {
        editor.commands.setContent(desc || "");
      }
    }
  }, [todo?.id, todo?.description, todo?.title]);

  // Cancel pending save when switching todos
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
    };
  }, [selectedTodoId]);

  const scheduleDescriptionSave = useCallback(
    (html: string) => {
      if (!selectedTodoId) return;
      const targetId = selectedTodoId;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (useAppStore.getState().selectedTodoId !== targetId) return;
        if (html !== lastSavedDescription.current) {
          await updateTodo.mutateAsync({ id: targetId, description: html });
          if (useAppStore.getState().selectedTodoId === targetId) {
            lastSavedDescription.current = html;
          }
        }
      }, 1500);
    },
    [selectedTodoId, updateTodo],
  );

  const applyLink = () => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  if (!selectedTodoId) return null;

  if (!todo) {
    return (
      <div className="w-full h-full border-l border-border bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  function commitTitle() {
    if (title !== todo!.title) updateTodo.mutate({ id: todo!.id, title });
  }

  function handleDelete() {
    deleteTodo.mutate(todo!.id, { onSuccess: () => setSelectedTodoId(null) });
  }

  return (
    <div className="w-full h-full border-l border-border bg-background flex flex-col overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Task Details</span>
        <button
          onClick={() => setSelectedTodoId(null)}
          className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-4 flex-1">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && commitTitle()}
          placeholder="Untitled"
          className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-6"
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

        {/* Description - Rich Text Editor */}
        <div className="mb-8 relative">
          <span className="text-xs text-muted-foreground block mb-2">Description</span>
          <div className="border border-border rounded-md p-3 min-h-[120px] focus-within:ring-1 focus-within:ring-ring">
            <EditorContent editor={editor} />
          </div>

          {/* Bubble menu toolbar */}
          {editor && (
            <BubbleMenuToolbar
              editor={editor}
              onLinkClick={(existingUrl) => {
                setLinkUrl(existingUrl);
                setLinkDialogOpen(true);
              }}
            />
          )}

          {/* Slash command menu */}
          {editor && <SlashCommandMenu editor={editor} />}

          {/* Link dialog */}
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Insert Link</DialogTitle>
              </DialogHeader>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
                autoFocus
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={applyLink}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
