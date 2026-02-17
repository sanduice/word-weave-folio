import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExtension from "@tiptap/extension-link";
import { usePage, useUpdatePage, useTrackPageOpen, useBacklinks } from "@/hooks/use-pages";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/input";
import { FileText, Link2 } from "lucide-react";

export function PageEditor() {
  const { selectedPageId, setSelectedPageId, selectedSpaceId } = useAppStore();
  const { data: page, isLoading } = usePage(selectedPageId ?? undefined);
  const { data: backlinks } = useBacklinks(selectedPageId ?? undefined);
  const updatePage = useUpdatePage();
  const trackOpen = useTrackPageOpen();
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedContent = useRef<string>("");
  const lastSavedTitle = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({ placeholder: "Start writing... (use / for commands)" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      LinkExtension.configure({ openOnClick: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[60vh] px-0 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave(title, editor.getHTML());
    },
  });

  // Track page open
  useEffect(() => {
    if (selectedPageId) {
      trackOpen.mutate(selectedPageId);
    }
  }, [selectedPageId]);

  // Load page content
  useEffect(() => {
    if (page && editor) {
      setTitle(page.title);
      lastSavedTitle.current = page.title;
      const content = page.content || "";
      lastSavedContent.current = content;
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content || "");
      }
      setSaveStatus("saved");
    }
  }, [page?.id, page?.content, page?.title]);

  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedPageId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(async () => {
        const updates: any = {};
        if (newTitle !== lastSavedTitle.current) updates.title = newTitle;
        if (newContent !== lastSavedContent.current) updates.content = newContent;
        if (Object.keys(updates).length === 0) {
          setSaveStatus("saved");
          return;
        }
        await updatePage.mutateAsync({ id: selectedPageId, ...updates });
        lastSavedTitle.current = newTitle;
        lastSavedContent.current = newContent;
        setSaveStatus("saved");
      }, 1500);
    },
    [selectedPageId, updatePage],
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleSave(newTitle, editor?.getHTML() || "");
  };

  // Slash commands
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept if we're not focused on the editor
      if (!editor.isFocused) return;
    };

    return () => {};
  }, [editor]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useAppStore.getState().setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!selectedPageId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-lg font-medium">Select a page or create a new one</p>
          <p className="text-sm">Use the sidebar to navigate your pages</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Save status */}
        <div className="flex justify-end mb-2">
          <span className="text-[11px] text-muted-foreground/60">
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
          </span>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 mb-4"
          placeholder="Untitled"
        />

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Backlinks */}
        {backlinks && backlinks.length > 0 && (
          <div className="mt-12 pt-6 border-t border-border">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-3 flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Referenced in
            </h4>
            <div className="space-y-1">
              {backlinks.map((link) => {
                const fromPage = link.pages as any;
                return (
                  <button
                    key={link.from_page_id}
                    onClick={() => {
                      if (fromPage?.space_id) useAppStore.getState().setSelectedSpaceId(fromPage.space_id);
                      setSelectedPageId(link.from_page_id);
                    }}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {fromPage?.title || "Unknown page"}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
