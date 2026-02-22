

# Notion-Style Table Interactions and Scrolling

## Overview

Enhance the existing TipTap table with Notion-like UX: click-to-add rows/columns via hover controls, independent table scrolling (vertical and horizontal), column resizing, and improved styling. This is scoped to what TipTap's table extension supports natively plus targeted CSS/React enhancements.

## What's Already in Place

- TipTap Table extension with `resizable: false`
- TableToolbar component (floating toolbar with row/column/cell operations)
- Table CSS styles with fixed layout, cell borders, header styling
- Slash command to insert 3x3 tables

## Phased Approach

Given the scope, this is split into two phases. Phase 1 covers the high-impact items; Phase 2 covers drag interactions (future).

---

## Phase 1 (This Implementation)

### 1. Enable Column Resizing

**File: `src/components/PageEditor.tsx`**

- Change `Table.configure({ resizable: false })` to `Table.configure({ resizable: true })`
- The TipTap table extension already has built-in column resize handles (the `.column-resize-handle` CSS is already in `index.css`)
- Min column width enforced via TipTap's `cellMinWidth` option (default 25px, set to 120px)

### 2. Table Scroll Container

**File: `src/index.css`**

Wrap tables in a scroll container so wide tables scroll horizontally without breaking page layout, and tall tables scroll vertically with sticky headers.

- Add `overflow-x: auto` to the table wrapper (TipTap wraps tables in a `div.tableWrapper`)
- Add `max-height` with `overflow-y: auto` for vertical scrolling on large tables
- Make `thead` sticky within the scroll container
- Remove `table-layout: fixed` (let columns size naturally with resize)

```css
/* Table scroll container */
.tiptap .tableWrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
  margin: 1rem 0;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
}

.tiptap .tableWrapper table {
  margin: 0; /* remove outer margin, container handles it */
  border: none; /* container has border */
}

/* Sticky header row */
.tiptap .tableWrapper thead th {
  position: sticky;
  top: 0;
  z-index: 2;
}
```

### 3. "Add Row" Button Below Table

**File: `src/components/editor/TableControls.tsx` (new file)**

A React component that renders a "+" button below the table when the cursor is inside it. Clicking it adds a row at the bottom.

- Positioned below the table DOM element (similar to how `TableToolbar` positions itself)
- Shows on hover near the table bottom edge
- Full-width subtle bar with "+" icon
- On click: `editor.chain().focus().addRowAfter().run()` (after moving cursor to last row)

### 4. "Add Column" Button on Table Right Edge

Same component renders a "+" button on the right edge of the table for adding columns.

- Vertical bar along right edge, visible on hover
- On click: `editor.chain().focus().addColumnAfter().run()` (after moving cursor to last column)

### 5. Row/Column Hover Indicators

**File: `src/index.css`**

- On row hover: subtle left-border highlight
- On column header hover: subtle bottom highlight
- These are CSS-only enhancements using `:hover` pseudo-classes

### 6. Update Table Toolbar

**File: `src/components/editor/TableToolbar.tsx`**

- No structural changes needed -- the existing toolbar already handles add/delete row/column
- The new "+" controls complement (not replace) the toolbar

## Changes Summary

| File | Change |
|---|---|
| `src/components/PageEditor.tsx` | Enable `resizable: true`, set `cellMinWidth: 120` |
| `src/components/editor/TableControls.tsx` | New component: "+" buttons for adding rows/columns on hover |
| `src/index.css` | Table scroll container, sticky headers, hover highlights, remove fixed layout |

## Technical Details

### Table Scroll Container

TipTap's table extension wraps every `<table>` in a `<div class="tableWrapper">`. We style this div to be the scroll container:

- `overflow-x: auto` -- horizontal scroll when columns exceed container width
- `overflow-y: auto` with `max-height: 70vh` -- vertical scroll for very tall tables
- `thead th { position: sticky; top: 0 }` -- header stays visible during vertical scroll
- Table width changes to `min-width: 100%` instead of `width: 100%` so it can grow wider than the container

### TableControls Component

```text
[Table Content]
[─────────── + ───────────]  <-- Add Row button (full width, below table)
                          |
                          +  <-- Add Column button (vertical, right edge)
```

The component:
- Uses the same position-tracking pattern as `TableToolbar` (finds the table DOM element relative to the container)
- Renders two buttons: one below the table, one to the right
- Only visible when cursor is inside the table
- Uses `onMouseDown` + `preventDefault` to avoid stealing editor focus

### Column Resize

Enabling `resizable: true` on the Table extension activates TipTap's built-in column resize. The `.column-resize-handle` CSS is already defined in `index.css`. Setting `cellMinWidth: 120` ensures columns don't get too narrow.

### Scroll Isolation Rules

- Table horizontal scroll is contained within `.tableWrapper` -- page never scrolls horizontally
- Table vertical scroll is contained within `.tableWrapper` when `max-height` is exceeded
- Main editor content scrolls independently (already handled by the resizable panel layout)
- Scrolling inside a table does not propagate to the page (CSS `overflow: auto` on the wrapper handles this)

## Phase 2 (Future -- Not in This Implementation)

These require custom ProseMirror plugins and are significantly more complex:

- Drag to reorder rows/columns (requires custom drag-and-drop handling in ProseMirror)
- Drag to remove rows/columns (drag outside boundary)
- Row/column insertion between existing rows via hover indicator
- Row virtualization for 200+ row tables
- Cell copy-paste support
- Keyboard navigation between cells (Tab/Shift+Tab/Arrow keys)

