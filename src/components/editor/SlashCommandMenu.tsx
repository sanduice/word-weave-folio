import { useState, useEffect, useCallback, useRef } from "react";
import { DecorationSet } from "@tiptap/pm/view";
import { Editor } from "@tiptap/react";
import { slashCommandPluginKey, type SlashCommandState } from "./slash-command";
import {
  Type, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Code, Quote, Minus, List, ListOrdered, CheckSquare, Image, Table2,
} from "lucide-react";

interface CommandItem {
  title: string;
  description: string;
  searchTerms: string[];
  category: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
}

const COMMANDS: CommandItem[] = [
  { title: "Text", description: "Plain paragraph", searchTerms: ["text", "paragraph", "p"], category: "Basic",
    icon: <Type className="h-4 w-4" />, command: (e) => e.chain().focus().setParagraph().run() },
  { title: "Heading 1", description: "Large heading", searchTerms: ["h1", "heading", "title"], category: "Basic",
    icon: <Heading1 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { title: "Heading 2", description: "Section heading", searchTerms: ["h2", "heading", "subtitle"], category: "Basic",
    icon: <Heading2 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { title: "Heading 3", description: "Sub-section", searchTerms: ["h3", "heading", "sub"], category: "Basic",
    icon: <Heading3 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { title: "Heading 4", description: "Small heading", searchTerms: ["h4", "heading"], category: "Basic",
    icon: <Heading4 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
  { title: "Heading 5", description: "Smaller heading", searchTerms: ["h5", "heading"], category: "Basic",
    icon: <Heading5 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 5 }).run() },
  { title: "Heading 6", description: "Smallest heading", searchTerms: ["h6", "heading"], category: "Basic",
    icon: <Heading6 className="h-4 w-4" />, command: (e) => e.chain().focus().setHeading({ level: 6 }).run() },
  { title: "Code Block", description: "Syntax highlighted code", searchTerms: ["code", "codeblock", "pre"], category: "Formatting",
    icon: <Code className="h-4 w-4" />, command: (e) => e.chain().focus().setCodeBlock().run() },
  { title: "Quote", description: "Block quote", searchTerms: ["quote", "blockquote", "q"], category: "Formatting",
    icon: <Quote className="h-4 w-4" />, command: (e) => e.chain().focus().setBlockquote().run() },
  { title: "Divider", description: "Horizontal rule", searchTerms: ["divider", "hr", "rule", "line"], category: "Formatting",
    icon: <Minus className="h-4 w-4" />, command: (e) => e.chain().focus().setHorizontalRule().run() },
  { title: "Bullet List", description: "Unordered list", searchTerms: ["bullet", "list", "ul", "unordered"], category: "Lists",
    icon: <List className="h-4 w-4" />, command: (e) => e.chain().focus().toggleBulletList().run() },
  { title: "Numbered List", description: "Ordered list", searchTerms: ["numbered", "list", "ol", "ordered"], category: "Lists",
    icon: <ListOrdered className="h-4 w-4" />, command: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: "Checklist", description: "Task list", searchTerms: ["checklist", "task", "todo", "checkbox"], category: "Lists",
    icon: <CheckSquare className="h-4 w-4" />, command: (e) => e.chain().focus().toggleTaskList().run() },
  { title: "Image", description: "Insert image URL", searchTerms: ["image", "img", "photo", "picture"], category: "Media",
    icon: <Image className="h-4 w-4" />, command: (e) => {
      const url = window.prompt("Enter image URL:");
      if (url) e.chain().focus().insertContent(`<img src="${url}" alt="image" />`).run();
    }},
  { title: "Table", description: "Insert a table", searchTerms: ["table", "grid", "rows", "columns"], category: "Media",
    icon: <Table2 className="h-4 w-4" />, command: (e) => {
      e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }},
];

function filterCommands(query: string): CommandItem[] {
  if (!query) return COMMANDS;
  const q = query.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.searchTerms.some((t) => t.includes(q))
  );
}

interface Props {
  editor: Editor;
}

export function SlashCommandMenu({ editor }: Props) {
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  // Track whether menu was already active so we only reset selection on first open
  const wasActiveRef = useRef(false);

  const filtered = filterCommands(query);

  const executeCommand = useCallback(
    (item: CommandItem) => {
      const state = slashCommandPluginKey.getState(editor.state) as SlashCommandState;
      if (state?.range) {
        editor.chain().focus().deleteRange(state.range).run();
      }
      item.command(editor);
      // Deactivate
      editor.view.dispatch(
        editor.state.tr.setMeta(slashCommandPluginKey, {
          active: false, query: "", range: null,
          decorationSet: DecorationSet.empty,
        })
      );
    },
    [editor]
  );

  // Listen for plugin state changes
  useEffect(() => {
    const update = () => {
      const state = slashCommandPluginKey.getState(editor.state) as SlashCommandState | undefined;
      if (!state) return;

      const justOpened = state.active && !wasActiveRef.current;
      wasActiveRef.current = state.active;

      setActive(state.active);
      setQuery(state.query);

      if (state.active) {
        // Only reset selection index when the menu first opens, not on every keystroke
        if (justOpened) {
          setSelectedIndex(0);
        }

        // Fix #1: Position relative to the `relative` wrapper inside the editor area,
        // not the outer scroll container. The menu's CSS parent is the `max-w-3xl` div.
        const coords = editor.view.coordsAtPos(editor.state.selection.from);
        // Walk up to find the nearest `position: relative` container that wraps the menu
        const relativeParent =
          (editor.view.dom.closest(".relative") as HTMLElement) ??
          (editor.view.dom.offsetParent as HTMLElement) ??
          editor.view.dom;
        const parentRect = relativeParent.getBoundingClientRect();
        const scrollParent = relativeParent.closest(".overflow-auto") as HTMLElement | null;
        const scrollTop = scrollParent?.scrollTop ?? 0;
        setPosition({
          top: coords.bottom - parentRect.top + scrollTop + 4,
          left: coords.left - parentRect.left,
        });
      }
    };
    editor.on("transaction", update);
    return () => { editor.off("transaction", update); };
  }, [editor]);

  // Keyboard navigation via custom events
  useEffect(() => {
    if (!active) return;
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail.key;
      if (key === "ArrowDown") setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      else if (key === "ArrowUp") setSelectedIndex((i) => Math.max(i - 1, 0));
      else if (key === "Enter" && filtered[selectedIndex]) executeCommand(filtered[selectedIndex]);
    };
    window.addEventListener("slash-command-key", handler);
    return () => window.removeEventListener("slash-command-key", handler);
  }, [active, filtered, selectedIndex, executeCommand]);

  // Scroll selected into view
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!active || filtered.length === 0) return null;

  // Group by category
  const groups: Record<string, CommandItem[]> = {};
  filtered.forEach((cmd) => {
    if (!groups[cmd.category]) groups[cmd.category] = [];
    groups[cmd.category].push(cmd);
  });

  let globalIdx = 0;

  return (
    <div
      ref={menuRef}
      className="slash-command-menu"
      style={{ top: position.top, left: position.left }}
    >
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <div className="slash-command-category">{category}</div>
          {items.map((item) => {
            const idx = globalIdx++;
            return (
              <button
                key={item.title}
                data-index={idx}
                className={`slash-command-item ${idx === selectedIndex ? "slash-command-item-selected" : ""}`}
                // Fix #3: Use onMouseDown + preventDefault to prevent the editor from
                // losing focus (which would trigger a transaction and reset the selection)
                // before the click fires. The command runs on mousedown instead of click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand(item);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="slash-command-icon">{item.icon}</span>
                <div className="slash-command-text">
                  <span className="slash-command-title">{item.title}</span>
                  <span className="slash-command-desc">{item.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
