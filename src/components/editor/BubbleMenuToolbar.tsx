import { BubbleMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Code,
  Link2,
  Strikethrough,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  CheckSquare,
  MoreHorizontal,
  Highlighter,
  Type,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Color palette ─────────────────────────────────────────────────────────────

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

// ─── Color swatch grid ─────────────────────────────────────────────────────────

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
          className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform flex items-center justify-center"
          style={{
            background: c.value ?? "transparent",
            border: c.value ? "1px solid hsl(var(--border))" : "1px dashed hsl(var(--muted-foreground))",
          }}
        >
          {!c.value && <span className="text-muted-foreground text-xs">∅</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Toolbar divider ───────────────────────────────────────────────────────────

function Divider() {
  return <div className="bubble-toolbar-divider" />;
}

// ─── Single toolbar button ─────────────────────────────────────────────────────

function ToolBtn({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`bubble-toolbar-btn${active ? " bubble-toolbar-btn-active" : ""}`}
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
    return "Text";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onMouseDown={(e) => e.preventDefault()}
          className="bubble-dropdown-trigger"
          aria-label="Text style"
        >
          <span className="bubble-dropdown-label">{getLabel()}</span>
          <ChevronsUpDown className="h-2.5 w-2.5 opacity-50 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6}>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setParagraph().run()}
          className="gap-2"
        >
          <AlignLeft className="h-3.5 w-3.5" />
          <span>Text</span>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── List dropdown ─────────────────────────────────────────────────────────────

function ListDropdown({ editor }: { editor: Editor }) {
  const getLabel = () => {
    if (editor.isActive("bulletList")) return "•";
    if (editor.isActive("orderedList")) return "1.";
    if (editor.isActive("taskList")) return "☑";
    return "List";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onMouseDown={(e) => e.preventDefault()}
          className="bubble-dropdown-trigger"
          aria-label="List type"
        >
          <span className="bubble-dropdown-label">{getLabel()}</span>
          <ChevronsUpDown className="h-2.5 w-2.5 opacity-50 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6}>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleBulletList().run()}
          className="gap-2"
        >
          <List className="h-3.5 w-3.5" />
          <span>Bullet List</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleOrderedList().run()}
          className="gap-2"
        >
          <ListOrdered className="h-3.5 w-3.5" />
          <span>Numbered List</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleTaskList().run()}
          className="gap-2"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Checklist</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── More menu ─────────────────────────────────────────────────────────────────

function MoreMenu({ editor }: { editor: Editor }) {
  const copyPlainText = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    navigator.clipboard.writeText(text).catch(console.error);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onMouseDown={(e) => e.preventDefault()}
          className="bubble-toolbar-btn"
          aria-label="More options"
          title="More options"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuItem
          onSelect={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          Clear formatting
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyPlainText}>
          Copy as plain text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface BubbleMenuToolbarProps {
  editor: Editor;
  onLinkClick: (existingUrl: string) => void;
}

export function BubbleMenuToolbar({ editor, onLinkClick }: BubbleMenuToolbarProps) {
  const currentColor = editor.getAttributes("textStyle")?.color as string | undefined;
  const currentHighlight = editor.getAttributes("highlight")?.color as string | undefined;

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      shouldShow={({ state }) => {
        const { selection } = state;
        if (selection.empty) return false;
        const { $from } = selection;
        if ($from.parent.type.name === "codeBlock") return false;
        return true;
      }}
    >
      <div className="bubble-toolbar">
        {/* Text style dropdown */}
        <TextStyleDropdown editor={editor} />

        {/* List dropdown */}
        <ListDropdown editor={editor} />

        <Divider />

        {/* Bold */}
        <ToolBtn
          title="Bold (⌘B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Italic */}
        <ToolBtn
          title="Italic (⌘I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Inline code */}
        <ToolBtn
          title="Inline code (⌘`)"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Link */}
        <ToolBtn
          title="Link (⌘K)"
          active={editor.isActive("link")}
          onClick={() => {
            const existingUrl = editor.getAttributes("link").href || "";
            onLinkClick(existingUrl);
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Strikethrough */}
        <ToolBtn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Underline */}
        <ToolBtn
          title="Underline (⌘U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolBtn>

        <Divider />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onMouseDown={(e) => e.preventDefault()}
              className="bubble-toolbar-btn"
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

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onMouseDown={(e) => e.preventDefault()}
              className="bubble-toolbar-btn"
              title="Highlight"
              aria-label="Highlight color"
            >
              <span className="flex flex-col items-center justify-center gap-[2px]">
                <Highlighter className="h-3 w-3" />
                <span
                  className="w-3 h-[2.5px] rounded-full"
                  style={{
                    background: currentHighlight ?? "hsl(var(--muted-foreground))",
                  }}
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

        {/* More menu */}
        <MoreMenu editor={editor} />
      </div>
    </BubbleMenu>
  );
}
