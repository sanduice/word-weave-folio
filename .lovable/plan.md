
# Floating Text Selection Toolbar (Bubble Menu)

## Overview

A context-sensitive formatting toolbar that appears above any text selection in the editor. It delivers all the formatting actions from the specification using TipTap's built-in `BubbleMenu` extension (which ships with `@tiptap/react`) for positioning, extended with dropdowns and a color/highlight picker.

---

## New Packages Required

| Package | Purpose |
|---|---|
| `@tiptap/extension-underline` | Underline mark |
| `@tiptap/extension-color` | Text color (requires TextStyle) |
| `@tiptap/extension-text-style` | Required peer for Color |
| `@tiptap/extension-highlight` | Background highlight |

All are official TipTap v3 extensions. No third-party packages needed.

---

## Architecture

```text
PageEditor.tsx
 └─ BubbleMenuToolbar (new component)
      ├─ TextStyleDropdown   (Text / H1 / H2 / H3)
      ├─ ListDropdown        (Bullet / Numbered / Checklist)
      ├─ [divider]
      ├─ BoldButton          (toggle, Cmd+B)
      ├─ ItalicButton        (toggle, Cmd+I)
      ├─ InlineCodeButton    (toggle, Cmd+`)
      ├─ LinkButton          (opens existing LinkDialog in PageEditor)
      ├─ StrikeButton        (toggle)
      ├─ UnderlineButton     (toggle)
      ├─ [divider]
      ├─ ColorPickerButton   (text color popover)
      ├─ HighlightButton     (background color popover)
      ├─ [divider]
      └─ MoreMenu            (clear formatting / copy plain text)
```

---

## Files Changed

| File | Action |
|---|---|
| `package.json` | Add 4 new TipTap extensions |
| `src/components/PageEditor.tsx` | Register new extensions; mount `<BubbleMenuToolbar>`, wire link dialog open |
| `src/components/editor/BubbleMenuToolbar.tsx` | New — the full bubble menu component |
| `src/index.css` | Styles for `.bubble-toolbar`, dropdowns, color swatches |

---

## Detailed Implementation

### 1. `package.json`
Add:
```
@tiptap/extension-underline
@tiptap/extension-color
@tiptap/extension-text-style
@tiptap/extension-highlight
```

### 2. `src/components/PageEditor.tsx` changes

**Extensions array** — add after `LinkExtension`:
```ts
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
...
Underline,
TextStyle,
Color,
Highlight.configure({ multicolor: true }),
```

**Render** — add `<BubbleMenuToolbar>` just before `<TableToolbar>`:
```tsx
{editor && (
  <BubbleMenuToolbar
    editor={editor}
    onLinkClick={(existingUrl) => {
      setLinkUrl(existingUrl);
      setLinkDialogOpen(true);
    }}
  />
)}
```

The existing link dialog in `PageEditor` is reused — the bubble menu's Link button just calls `onLinkClick` which opens the already-wired dialog. This avoids duplicating the link UI.

### 3. `src/components/editor/BubbleMenuToolbar.tsx` (new file)

Uses TipTap's built-in `BubbleMenu` component from `@tiptap/react` for positioning (handles viewport clamping, scroll, appears/disappears automatically on selection change).

**Visibility guard** — passed to `BubbleMenu` as `shouldShow`:
```ts
shouldShow: ({ editor, state }) => {
  const { selection } = state;
  // Hide if empty selection
  if (selection.empty) return false;
  // Hide if inside code block
  const { $from } = selection;
  if ($from.parent.type.name === "codeBlock") return false;
  // Hide if selection is inside inline code only (all marks are "code")
  // This is a best-effort check — if the only mark is code, hide toolbar
  return true;
}
```

**Text Style Dropdown** — uses a Radix `DropdownMenu`:
- "Text" → `editor.chain().focus().setParagraph().run()`
- "Heading 1" → `setHeading({ level: 1 })`
- "Heading 2" → `setHeading({ level: 2 })`
- "Heading 3" → `setHeading({ level: 3 })`

The label shown in the button reflects the current block type (auto-detected from `editor.isActive`).

**List Dropdown** — uses a Radix `DropdownMenu`:
- "Bullet List" → `toggleBulletList()`
- "Numbered List" → `toggleOrderedList()`
- "Checklist" → `toggleTaskList()`

**Inline buttons** (toggle behavior, active state highlighted):

| Button | Command | Active check |
|---|---|---|
| **B** Bold | `toggleBold()` | `editor.isActive("bold")` |
| `</>` Code | `toggleCode()` | `editor.isActive("code")` |
| *I* Italic | `toggleItalic()` | `editor.isActive("italic")` |
| 🔗 Link | calls `onLinkClick(existingHref)` | `editor.isActive("link")` |
| ~~S~~ Strike | `toggleStrike()` | `editor.isActive("strike")` |
| <u>U</u> Underline | `toggleUnderline()` | `editor.isActive("underline")` |

**Color Picker** — small popover with a 3×3 color grid:

Colors: Default, Red, Orange, Yellow, Green, Teal, Blue, Purple, Grey

- Text color button (A with colored underline): `editor.chain().focus().setColor(hex).run()` / `unsetColor()` for Default
- Highlight button (marker icon): `editor.chain().focus().setHighlight({ color: hex }).run()` / `unsetHighlight()` for Default

Both pickers share the same `ColorSwatch` sub-component, just passing a different `onSelect` callback. They open as Radix `Popover` panels inside the bubble toolbar (staying inside the toolbar prevents focus loss from the editor).

**More Menu (⋯)** — Radix `DropdownMenu`:
- "Clear formatting" → `editor.chain().focus().clearNodes().unsetAllMarks().run()`
- "Copy as plain text" → reads `editor.state.selection` text via `editor.state.doc.textBetween(from, to, ' ')` and copies to clipboard
- "Convert to plain text" → same as clear formatting

**onMouseDown prevention**: Every interactive element in the toolbar uses `onMouseDown={(e) => e.preventDefault()}` (same pattern as `TableToolbar`) to keep editor focus and preserve the selection while the toolbar is open. Without this, clicking a button would collapse the selection before the command fires.

### 4. `src/index.css` additions

```css
/* Bubble menu toolbar */
.bubble-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  box-shadow: 0 4px 20px -4px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08);
  padding: 3px 4px;
  height: 36px;
  z-index: 70;   /* above table toolbar (60) and slash menu (50) */
}

.bubble-toolbar-btn { /* same pattern as .table-toolbar-btn */ }
.bubble-toolbar-btn-active { background: hsl(var(--accent)); }
.bubble-toolbar-divider { /* 1px vertical separator */ }
.bubble-dropdown-label { /* Text Style / List dropdown trigger text */ }
```

---

## Corner Cases Handled

| Case | Handling |
|---|---|
| Selection inside `codeBlock` | `shouldShow` returns false — toolbar hidden |
| Selection inside inline `code` mark | Toolbar shown but Bold/Italic/etc. appear dim (code overrides) — acceptable MVP |
| Clicking toolbar button clears selection | `onMouseDown` prevents blur; selection is preserved |
| Link button when no selection | Toolbar already hidden (empty selection check) |
| Existing link in selection | `onLinkClick` passes `editor.getAttributes("link").href` to pre-fill the dialog |
| Color picker opening collapses popover | Color picker opens as a child `Popover` inside the toolbar container using `portal={false}` or a custom wrapper to stay inside the BubbleMenu mount |
| Viewport edge clipping | TipTap's BubbleMenu handles this natively via floating-ui / Tippy.js underneath |
| Selection spans table cells | `shouldShow` returns true — formatting applies to selected text within cells |
| Undo | Every TipTap command pushes one ProseMirror history step; undo restores previous state |
| Cmd+K shortcut conflict | Existing handler in PageEditor already opens link dialog when editor is focused; bubble menu Link button reuses same `onLinkClick` callback — no double-dialog |
| Escape key | TipTap's BubbleMenu hides on editor blur; Esc in the editor removes selection, hiding toolbar |
| "More" dropdown z-index | Radix portal renders at body level with high z-index; no clipping issues |

---

## What is Excluded (per spec)

- AI features
- Font family / font size selectors
- Comment annotations (Phase 2)
- Animations-heavy effects
