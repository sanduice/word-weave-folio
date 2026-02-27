import { useEffect, useState } from "react";
import { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Code,
  Link2,
  Strikethrough,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  Type,
  Highlighter,
  ChevronsUpDown,
  Undo2,
  Redo2,
  Minus,
  Table as TableIcon,
  AlignLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Color palettes (same as BubbleMenuToolbar) ────────────────────────────────

const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#9333ea" },
  { label: "Grey", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: null },
  { label: "Red", value: "#fee2e2" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Teal", value: "#ccfbf1" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#f3e8ff" },
  { label: "Grey", value: "#f3f4f6" },
];

// ─── Shared helpers ────────────────────────────────────────────────────────────

function ColorSwatchGrid({
  colors,
  onSelect,
}: {
  colors: { label: string; value: string | null }[];
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="p-2 grid grid-cols-3 gap-1" style={{ width: 116 }}>
      {colors.map((c) => (
        <button
          key={c.label}
          title={c.label}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(c.value);
          }}
          className="w-8 h-8 rounded border hover:scale-110 transition-transform flex items-center justify-center"
          style={{
            background: c.value ?? "transparent",
            border: c.value
              ? "1px solid hsl(var(--border))"
              : "1px dashed hsl(var(--muted-foreground))",
          }}
        >
          {!c.value && <span className="text-muted-foreground text-xs">∅</span>}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="sticky-toolbar-divider" />;
}

function ToolBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`sticky-toolbar-btn${active ? " sticky-toolbar-btn-active" : ""}`}
    >
      {children}
    </button>
  );
}

// ─── Text style dropdown ───────────────────────────────────────────────────────

function TextStyleDropdown({ editor }: { editor: Editor }) {
  const getLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    return "Text";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="sticky-dropdown-trigger"
          aria-label="Text style"
        >
          <span style={{ minWidth: 28, textAlign: "left" }}>{getLabel()}</span>
          <ChevronsUpDown className="h-2.5 w-2.5 opacity-50 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={6}
        portalled={false}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.chain().focus().run();
        }}
      >
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setParagraph().run()}
          className="gap-2"
        >
          <AlignLeft className="h-3.5 w-3.5" />
          <span>Normal Text</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setHeading({ level: 1 }).run()}
          className="gap-2"
        >
          <span className="text-sm font-bold w-3.5 text-center">H1</span>
          <span>Heading 1</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setHeading({ level: 2 }).run()}
          className="gap-2"
        >
          <span className="text-sm font-bold w-3.5 text-center">H2</span>
          <span>Heading 2</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setHeading({ level: 3 }).run()}
          className="gap-2"
        >
          <span className="text-sm font-bold w-3.5 text-center">H3</span>
          <span>Heading 3</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleBlockquote().run()}
          className="gap-2"
        >
          <span className="text-sm opacity-60 w-3.5">"</span>
          <span>Quote</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleCodeBlock().run()}
          className="gap-2"
        >
          <Code className="h-3.5 w-3.5" />
          <span>Code Block</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface StickyToolbarProps {
  editor: Editor;
  onLinkClick: (existingUrl: string) => void;
}

export function StickyToolbar({ editor, onLinkClick }: StickyToolbarProps) {
  // Re-render on editor state changes so active states update
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    editor.on("transaction", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("transaction", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  const currentColor = editor.getAttributes("textStyle")?.color as string | undefined;
  const currentHighlight = editor.getAttributes("highlight")?.color as string | undefined;

  return (
    <div
      className="sticky-toolbar"
    >
      {/* Group A: History */}
      <ToolBtn
        title="Undo (⌘Z)"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Redo (⌘⇧Z)"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Group B: Text style */}
      <TextStyleDropdown editor={editor} />

      <Divider />

      {/* Group C: Inline formatting */}
      <ToolBtn
        title="Bold (⌘B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Italic (⌘I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Underline (⌘U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Inline code (⌘`)"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Group D: Color & Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="sticky-toolbar-btn"
            title="Text color"
            aria-label="Text color"
          >
            <span className="flex flex-col items-center justify-center gap-[2px]">
              <Type className="h-3 w-3" />
              <span
                className="w-3 h-[2.5px] rounded-full"
                style={{ background: currentColor ?? "hsl(var(--foreground))" }}
              />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-auto"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ColorSwatchGrid
            colors={TEXT_COLORS}
            onSelect={(val) => {
              if (val === null) {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(val).run();
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="sticky-toolbar-btn"
            title="Highlight color"
            aria-label="Highlight color"
          >
            <span className="flex flex-col items-center justify-center gap-[2px]">
              <Highlighter className="h-3 w-3" />
              <span
                className="w-3 h-[2.5px] rounded-full"
                style={{ background: currentHighlight ?? "hsl(var(--muted-foreground))" }}
              />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-auto"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ColorSwatchGrid
            colors={HIGHLIGHT_COLORS}
            onSelect={(val) => {
              if (val === null) {
                editor.chain().focus().unsetHighlight().run();
              } else {
                editor.chain().focus().setHighlight({ color: val }).run();
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <Divider />

      {/* Group E: Lists */}
      <ToolBtn
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Group F: Insert */}
      <ToolBtn
        title="Insert link (⌘K)"
        active={editor.isActive("link")}
        onClick={() => {
          const existingUrl = editor.getAttributes("link").href || "";
          onLinkClick(existingUrl);
        }}
      >
        <Link2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Insert divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Insert table (3×3)"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className="h-3.5 w-3.5" />
      </ToolBtn>
    </div>
  );
}
