
# Sticky Writing Toolbar & Advanced Table Controls — Implementation Plan

## What Already Exists (Do Not Re-build)

| Feature | Status | Location |
|---|---|---|
| Bubble menu (Bold, Italic, Underline, Strikethrough, Code, Link, Text color, Highlight, Text style dropdown, List dropdown, Clear formatting) | Done | `BubbleMenuToolbar.tsx` |
| Table floating toolbar (Add/Delete row/column, Merge/Split cells, Toggle header, Delete table) | Done | `TableToolbar.tsx` |
| Slash command menu (/, with all block types including Table insert) | Done | `SlashCommandMenu.tsx` |
| TopBar with sticky `position: sticky top-0` | Done | `TopBar.tsx` (h-12, sticky top-0 z-30) |
| Undo/Redo (Ctrl+Z/Shift+Z via browser default in TipTap) | Done | TipTap StarterKit |
| Keyboard shortcut Cmd+K for link dialog | Done | `PageEditor.tsx` |
| Keyboard shortcut Cmd+` for inline code | Done | `PageEditor.tsx` |

## What Needs to Be Built (Gap Analysis)

### New: Sticky Editor Toolbar (always-visible formatting bar)

The PRD calls for a sticky toolbar that is always visible when editing a page — not a floating bubble that only appears on selection. The current setup has:
- `TopBar` at `sticky top-0 z-30` with breadcrumb + search + new page
- No persistent formatting toolbar below it

The sticky toolbar will live **below the TopBar** and above the editor content, staying pinned as the user scrolls. It will be rendered inside `PageEditor` and will be visible whenever a page is open (not when the "Select a page" placeholder is showing).

### New: Table Cell Background Color (in TableToolbar)

The current `TableToolbar` does not have cell background color control. This needs a color picker button group added.

### New: Table full-width toggle (per-table)

A toggle to make the table stretch edge-to-edge within the content area.

### Out of Scope for Now (per PRD §10)

- Image upload (URL prompt already exists via slash command)
- Emoji picker (requires third-party library not yet installed)
- Mention system
- Focus mode / side panel toggle
- Comment threads

---

## Files to Create

| File | Purpose |
|---|---|
| `src/components/editor/StickyToolbar.tsx` | New always-visible sticky formatting toolbar |

## Files to Modify

| File | What Changes |
|---|---|
| `src/components/PageEditor.tsx` | Mount `StickyToolbar` between TopBar and editor content; lift `linkDialog` state into shared prop |
| `src/components/editor/TableToolbar.tsx` | Add cell background color picker button group |
| `src/index.css` | Add `.sticky-toolbar` and related CSS styles |

---

## Detailed Design

### 1. `StickyToolbar.tsx` — New Component

The toolbar is sticky within the editor scroll area. It renders as a `div` with `position: sticky; top: 0; z-index: 40` so it pins just below the main `TopBar` (which is `z-30`).

**Toolbar groups (left to right):**

```
[Undo] [Redo]  |  [Text Style ▾]  |  [B] [I] [U] [S] [Code]  |  [Color] [Highlight]  |  [• List ▾]  |  [Link] [—] [Table]
```

**Group A — History:**
- Undo: `editor.chain().focus().undo().run()` — disabled when `!editor.can().undo()`
- Redo: `editor.chain().focus().redo().run()` — disabled when `!editor.can().redo()`

**Group B — Text Style (Dropdown):**
- Reuses the same `TextStyleDropdown` logic from `BubbleMenuToolbar` — extracts it into a shared sub-component (or duplicates it in `StickyToolbar` for isolation)
- Options: Normal Text, H1, H2, H3, Quote, Code Block

**Group C — Inline Formatting (Toggle buttons):**
- Bold (Cmd+B), Italic (Cmd+I), Underline (Cmd+U), Strikethrough, Inline Code (Cmd+`)
- Each shows `active` state highlight when cursor is in that mark

**Group D — Color & Highlight (Popovers):**
- Text color with palette (same colors as BubbleMenuToolbar)
- Highlight color with palette (same colors)
- Active color shown as a colored underline beneath the icon

**Group E — Lists:**
- Bullet list, Ordered list, Checklist (as individual buttons, not dropdown, for visibility)

**Group F — Insert:**
- Link button (opens the existing link dialog via `onLinkClick` prop)
- Divider / HR button
- Table insert (3×3 with header)

**Active state logic:**
All toggle buttons call `editor.isActive(...)` on every `editor.on("transaction")` event to update their active styling. The component subscribes to the editor's transaction event and forces a re-render using `useState` + `useEffect`.

**Disabled when no page open:**
The toolbar is only rendered when `selectedPageId` is set and the editor is mounted.

**Visual design:**
- Height: 40px
- Background: `hsl(var(--background))` with `border-b border-border`
- Sticky below the `TopBar` using `sticky top-[48px]` (TopBar is 48px/h-12)
- Buttons: 28×28px, rounded, same style as existing toolbar buttons
- Dividers: 1px vertical separators between groups
- On scroll: stays pinned, content slides beneath it

**Responsive behavior:**
- On narrow screens (mobile), show only the most critical buttons: Bold, Italic, Link, and a "More" dropdown containing the rest
- Detect via `window.innerWidth < 768` with a `resize` listener

---

### 2. `TableToolbar.tsx` — Add Cell Background Color

Add a new group at the end of the `groups` array:

```
| [Cell BG Color picker] [Clear Cell] |
```

**Cell Background Color:**
- A color palette popover (same palette pattern as BubbleMenuToolbar)
- Uses a custom TipTap command: set the `style` attribute of the selected `tableCell`
- TipTap's `TableCell` extension supports passing `HTMLAttributes` via `extend()` to allow inline `style`

**Implementation:**
Extend `TableCell` in `PageEditor.tsx` to allow inline `backgroundColor` attribute:

```typescript
// In PageEditor.tsx
import { TableCell } from "@tiptap/extension-table";

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
        renderHTML: attrs => {
          if (!attrs.backgroundColor) return {};
          return { style: `background-color: ${attrs.backgroundColor}` };
        },
      },
    };
  },
});
```

Then the toolbar calls:
```typescript
editor.chain().focus().setCellAttribute('backgroundColor', color).run()
```

**Clear cell content button:**
```typescript
editor.chain().focus().clearContent().run()
```
(Clears content inside the focused cell)

---

### 3. CSS in `index.css`

```css
/* Sticky Editor Toolbar */
.sticky-toolbar {
  position: sticky;
  top: 48px;   /* height of TopBar */
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px 8px;
  height: 44px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  overflow-x: auto;
  scrollbar-width: none;
}

.sticky-toolbar-btn { /* same pattern as bubble-toolbar-btn, slightly larger */ }
.sticky-toolbar-divider { /* same as bubble-toolbar-divider */ }
```

---

### 4. `PageEditor.tsx` Changes

- Mount `<StickyToolbar>` above `<EditorContent>` but inside the scroll wrapper
- Pass `editor`, `onLinkClick` callback to it
- Keep `containerRef` on the outer `flex-1 overflow-auto` div as today
- The sticky toolbar goes **inside** the scroll container so it scrolls with the container's sticky context, not the full page

```tsx
return (
  <div className="flex-1 flex flex-col overflow-auto" ref={containerRef}>
    {/* Sticky toolbar — pins at top of the scroll area */}
    {editor && (
      <StickyToolbar
        editor={editor}
        onLinkClick={(url) => { setLinkUrl(url); setLinkDialogOpen(true); }}
      />
    )}
    <div className="max-w-3xl mx-auto px-6 py-8 relative flex-1">
      ...rest of content...
    </div>
  </div>
);
```

---

## Implementation Sequence

1. Add CSS classes for sticky toolbar to `index.css`
2. Create `StickyToolbar.tsx` with all button groups
3. Extend `TableCell` in `PageEditor.tsx` for `backgroundColor` attribute
4. Add cell background color group to `TableToolbar.tsx`
5. Update `PageEditor.tsx` to mount `StickyToolbar` and use `CustomTableCell`

## What Is NOT Changing

- `BubbleMenuToolbar.tsx` — kept as-is (selection-based floating toolbar remains, complements the sticky toolbar)
- `SlashCommandMenu.tsx` — untouched
- `TopBar.tsx` — untouched (breadcrumb + search stays)
- Sidebar, auth, spaces, pages hooks — untouched
- Folder system just implemented — untouched

## Edge Cases

| Case | Solution |
|---|---|
| Editor not focused when toolbar button clicked | All buttons use `editor.chain().focus()` to re-focus before executing |
| Undo/Redo disabled state | Check `editor.can().undo()` / `editor.can().redo()` on each transaction |
| Sticky toolbar overlaps table toolbar | Table toolbar is `z-60`, sticky toolbar is `z-40` — table toolbar wins and floats above |
| Sticky toolbar overlaps bubble menu | Bubble menu is `z-70` — it floats above both, no conflict |
| No page selected | `StickyToolbar` only renders when editor instance exists |
| Cell background on multi-cell selection | TipTap's `setCellAttribute` applies to all selected cells |
| Toolbar overflow on small screens | `overflow-x: auto; scrollbar-width: none` — horizontally scrollable without visible scrollbar |
