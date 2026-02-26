import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExtension from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { usePage, useUpdatePage, useTrackPageOpen, useBacklinks } from "@/hooks/use-pages";
import { PageIconCoverControls } from "./editor/PageIconCoverControls";
import { useAppStore } from "@/stores/app-store";
import { FileText, Link2 } from "lucide-react";
import { SlashCommandExtension } from "./editor/slash-command";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { SlashCommandMenu } from "./editor/SlashCommandMenu";
import { TableToolbar } from "./editor/TableToolbar";
import { TableControls } from "./editor/TableControls";
import { TableDragControls } from "./editor/TableDragControls";
import { BubbleMenuToolbar } from "./editor/BubbleMenuToolbar";
import { StickyToolbar } from "./editor/StickyToolbar";
import { CommentHighlight } from "./editor/comment-mark";
import { CommentPanel } from "./comments/CommentPanel";
import { InlineCommentPopover } from "./comments/InlineCommentPopover";
import { useCreateComment } from "@/hooks/use-comments";
import { useSession } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PageEditor() {
  const { selectedPageId, setSelectedPageId, selectedSpaceId, commentPanelOpen, setCommentPanelOpen, setActiveCommentId } = useAppStore();
  const { data: page, isLoading } = usePage(selectedPageId ?? undefined);
  const { data: backlinks } = useBacklinks(selectedPageId ?? undefined);
  const updatePage = useUpdatePage();
  const trackOpen = useTrackPageOpen();
  const createComment = useCreateComment();
  const { user } = useSession();
  const [title, setTitle] = useState("");
  const titleRef = useRef(title);
  titleRef.current = title;
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const lastSavedContent = useRef<string>("");
  const lastSavedTitle = useRef<string>("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [commentPopoverPos, setCommentPopoverPos] = useState<{ top: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ from: number; to: number; text: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
      }),
      Placeholder.configure({ placeholder: "Start writing... (use / for commands)" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      LinkExtension.configure({ openOnClick: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      SlashCommandExtension,
      CommentHighlight,
      Table.configure({ resizable: true, cellMinWidth: 120 }),
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
        class: "prose prose-sm max-w-none focus:outline-none min-h-[60vh] px-0 py-2",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "`") {
          event.preventDefault();
          editor?.chain().focus().toggleCode().run();
          return true;
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const commentSpan = target.closest("[data-comment-id]");
        if (commentSpan) {
          const commentId = commentSpan.getAttribute("data-comment-id");
          if (commentId) {
            setActiveCommentId(commentId);
            setCommentPanelOpen(true);
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave(titleRef.current, editor.getHTML());
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
      titleRef.current = page.title;
      lastSavedTitle.current = page.title;
      const content = page.content || "";
      lastSavedContent.current = content;
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content || "");
      }
      setSaveStatus("saved");
    }
  }, [page?.id, page?.content, page?.title]);

  // Cancel pending save when switching pages
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
    };
  }, [selectedPageId]);

  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedPageId) return;
      const targetPageId = selectedPageId;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(async () => {
        if (useAppStore.getState().selectedPageId !== targetPageId) return;
        const safeTitle = (newTitle === "" && lastSavedTitle.current !== "") ? lastSavedTitle.current : newTitle;
        const updates: any = {};
        if (safeTitle !== lastSavedTitle.current) updates.title = safeTitle;
        if (newContent !== lastSavedContent.current) updates.content = newContent;
        if (Object.keys(updates).length === 0) {
          setSaveStatus("saved");
          return;
        }
        await updatePage.mutateAsync({ id: targetPageId, ...updates });
        if (useAppStore.getState().selectedPageId === targetPageId) {
          lastSavedTitle.current = safeTitle;
          lastSavedContent.current = newContent;
          setSaveStatus("saved");
        }
      }, 1500);
    },
    [selectedPageId, updatePage],
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleSave(newTitle, editor?.getHTML() || "");
  };

  // Keyboard shortcut for search + link dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (editor?.isFocused) {
          const existingUrl = editor.getAttributes("link").href || "";
          setLinkUrl(existingUrl);
          setLinkDialogOpen(true);
        } else {
          useAppStore.getState().setSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

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

  const handleCommentClick = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    setPendingSelection({ from, to, text });

    // Position popover near selection
    const coords = editor.view.coordsAtPos(from);
    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setCommentPopoverPos({
        top: coords.top - containerRect.top + container.scrollTop,
      });
    }
  };

  const handleCommentSubmit = async (content: string) => {
    if (!editor || !pendingSelection || !selectedPageId || !user) return;
    const { from, to, text } = pendingSelection;

    const result = await createComment.mutateAsync({
      page_id: selectedPageId,
      content,
      selected_text: text,
      user_id: user.id,
    });

    // Apply mark
    editor.chain().focus().setTextSelection({ from, to }).setMark("commentHighlight", {
      commentId: result.id,
      status: "open",
    }).run();

    // Trigger save
    scheduleSave(titleRef.current, editor.getHTML());

    setCommentPopoverPos(null);
    setPendingSelection(null);
    setCommentPanelOpen(true);
  };

  const handleResolveComment = useCallback((commentId: string, newStatus: string) => {
    if (!editor) return;
    const { tr } = editor.state;
    const markType = editor.schema.marks.commentHighlight;
    const ranges: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      const mark = node.marks.find(
        (m) => m.type.name === "commentHighlight" && m.attrs.commentId === commentId
      );
      if (mark) {
        ranges.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    // Apply in reverse to keep positions stable
    for (let i = ranges.length - 1; i >= 0; i--) {
      const { from, to } = ranges[i];
      tr.removeMark(from, to, markType);
      tr.addMark(from, to, markType.create({ commentId, status: newStatus }));
    }
    if (ranges.length > 0) {
      editor.view.dispatch(tr);
      scheduleSave(titleRef.current, editor.getHTML());
    }
  }, [editor, scheduleSave]);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!editor) return;
    const { tr } = editor.state;
    const markType = editor.schema.marks.commentHighlight;
    const ranges: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      const mark = node.marks.find(
        (m) => m.type.name === "commentHighlight" && m.attrs.commentId === commentId
      );
      if (mark) {
        ranges.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    for (let i = ranges.length - 1; i >= 0; i--) {
      const { from, to } = ranges[i];
      tr.removeMark(from, to, markType);
    }
    if (ranges.length > 0) {
      editor.view.dispatch(tr);
      scheduleSave(titleRef.current, editor.getHTML());
    }
  }, [editor, scheduleSave]);

  const handleCommentPanelClick = (commentId: string) => {
    if (!editor) return;
    // Find the mark in editor and scroll to it
    const { doc } = editor.state;
    let found = false;
    doc.descendants((node, pos) => {
      if (found) return false;
      const marks = node.marks.filter((m) => m.type.name === "commentHighlight" && m.attrs.commentId === commentId);
      if (marks.length > 0) {
        editor.chain().focus().setTextSelection(pos).run();
        // Scroll to the element
        const dom = editor.view.domAtPos(pos);
        if (dom.node instanceof HTMLElement) {
          dom.node.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (dom.node.parentElement) {
          dom.node.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        found = true;
        return false;
      }
    });
  };

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

  const handleUpdateIcon = (iconType: string | null, iconValue: string | null) => {
    if (!selectedPageId) return;
    updatePage.mutate({ id: selectedPageId, icon_type: iconType, icon_value: iconValue } as any);
  };

  const handleUpdateCover = (coverType: string | null, coverUrl: string | null, coverPositionY?: number) => {
    if (!selectedPageId) return;
    const updates: any = { id: selectedPageId, cover_type: coverType, cover_url: coverUrl };
    if (coverPositionY !== undefined) updates.cover_position_y = coverPositionY;
    updatePage.mutate(updates);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Fixed formatting toolbar */}
      {editor && (
        <StickyToolbar
          editor={editor}
          onLinkClick={(existingUrl) => {
            setLinkUrl(existingUrl);
            setLinkDialogOpen(true);
          }}
        />
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1 !overflow-hidden">
        <ResizablePanel defaultSize={commentPanelOpen ? 80 : 100} minSize={40}>
          {/* Main editor area */}
          <div className="h-full overflow-y-auto overflow-x-hidden relative" ref={containerRef}>
            {/* Page icon & cover controls */}
            {page && (
              <PageIconCoverControls
                pageId={page.id}
                iconType={(page as any).icon_type ?? null}
                iconValue={(page as any).icon_value ?? null}
                coverType={(page as any).cover_type ?? null}
                coverUrl={(page as any).cover_url ?? null}
                coverPositionY={(page as any).cover_position_y ?? 0.5}
                onUpdateIcon={handleUpdateIcon}
                onUpdateCover={handleUpdateCover}
              />
            )}

            <div className="max-w-3xl mx-auto px-6 py-8 relative w-full" style={{ overflowX: 'visible' }}>
              {/* Save status */}
              <div className="flex justify-end mb-2">
                <span className="text-[11px] text-muted-foreground/60">
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
                </span>
              </div>

              {/* Title */}
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-3xl font-bold bg-transparent border-none shadow-none focus-visible:ring-0 h-auto p-0 placeholder:text-muted-foreground/30 mb-4"
                placeholder="New page"
              />

              {/* Editor */}
              <EditorContent editor={editor} />

              {/* Bubble menu toolbar */}
              {editor && (
                <BubbleMenuToolbar
                  editor={editor}
                  onLinkClick={(existingUrl) => {
                    setLinkUrl(existingUrl);
                    setLinkDialogOpen(true);
                  }}
                  onCommentClick={handleCommentClick}
                />
              )}

              {/* Table toolbar */}
              {editor && <TableToolbar editor={editor} containerRef={containerRef as React.RefObject<HTMLDivElement>} />}

              {/* Table hover controls (add row/column) */}
              {editor && <TableControls editor={editor} containerRef={containerRef as React.RefObject<HTMLDivElement>} />}

              {/* Table drag controls (reorder/remove rows & columns) */}
              {editor && <TableDragControls editor={editor} containerRef={containerRef as React.RefObject<HTMLDivElement>} />}

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
                        <Button
                          key={link.from_page_id}
                          variant="link"
                          onClick={() => {
                            if (fromPage?.space_id) useAppStore.getState().setSelectedSpaceId(fromPage.space_id);
                            setSelectedPageId(link.from_page_id);
                          }}
                          className="flex items-center gap-2 text-sm h-auto p-0"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {fromPage?.title || "New page"}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Inline comment popover - positioned in right margin */}
            <InlineCommentPopover
              position={commentPopoverPos}
              onSubmit={handleCommentSubmit}
              onCancel={() => {
                setCommentPopoverPos(null);
                setPendingSelection(null);
              }}
            />
          </div>
        </ResizablePanel>

        {/* Comment panel */}
        {commentPanelOpen && selectedPageId && user && (
          <>
            <ResizableHandle className="resize-handle" />
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={30}
              className="overflow-hidden"
              onResize={(size) => localStorage.setItem('comment-panel-size', String(size))}
            >
              <CommentPanel
                pageId={selectedPageId}
                userId={user.id}
                editorHtml={editor?.getHTML() || ""}
                onCommentClick={handleCommentPanelClick}
                onResolveComment={handleResolveComment}
                onDeleteComment={handleDeleteComment}
                onClose={() => setCommentPanelOpen(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
