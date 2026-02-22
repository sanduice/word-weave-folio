

# Allow Wide Tables to Break Out of Content Column

## Problem

Tables with many columns are constrained to the `max-w-3xl` (768px) content column. The user wants tables to expand wider when columns are added -- like Notion does -- where the table breaks out of the narrow content area and uses more of the available page width. The `.tableWrapper` scrollbar handles overflow beyond the page width.

## Current Layout

```text
|-- Full editor panel (h-full overflow-y-auto) --|
|   |-- max-w-3xl mx-auto (768px) --|            |
|   |   Title                       |            |
|   |   Content                     |            |
|   |   [Table constrained here]    |            |
|   |   More content                |            |
|   |-------------------------------|            |
|--------------------------------------------|
```

## Desired Layout

```text
|-- Full editor panel (h-full overflow-y-auto) --|
|   |-- max-w-3xl mx-auto (768px) --|            |
|   |   Title                       |            |
|   |   Content                     |            |
|   |-------------------------------|            |
|   [Table breaks out, uses full width]          |
|   |-------------------------------|            |
|   |   More content                |            |
|   |-------------------------------|            |
|--------------------------------------------|
```

## Solution

### 1. CSS: Allow `.tableWrapper` to break out of `max-w-3xl`

**File: `src/index.css`**

Add negative margins and full viewport-relative width to `.tableWrapper` so it escapes the `max-w-3xl` container, similar to how Notion handles wide tables:

```css
.tiptap .tableWrapper {
  /* Break out of max-w-3xl container */
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  width: 100vw;      /* Not ideal inside sidebar layout */
  max-width: none;   /* Remove the 100% clamp */
  /* ... keep existing overflow, border, etc. */
}
```

However, since the editor is inside a resizable panel (not full viewport width), using `100vw` won't work correctly. Instead, a better approach:

- Remove `max-width: 100%` from `.tableWrapper`
- On the content wrapper div (`max-w-3xl`), add `overflow-x: visible` so the table can visually overflow
- On the outer scrollable container, keep `overflow-x: hidden` or `auto` to clip at the page boundary
- The `.tableWrapper` keeps its own `overflow-x: auto` for horizontal scrolling when the table exceeds even the full panel width

### Revised approach -- simplest and most robust:

Make the `.tableWrapper` use a wider max-width than its parent, centered, and let the outer scroll container handle the page-level overflow:

**File: `src/index.css`**

- Change `.tableWrapper` `max-width` from `100%` to `none` (allow it to grow with table content)
- The parent `max-w-3xl` container needs `overflow-x: visible` so the wrapper can visually extend beyond it
- The outer `containerRef` div (`h-full overflow-y-auto`) gets `overflow-x: auto` to provide the page-level horizontal scrollbar when the table is very wide

### 2. Update the content container

**File: `src/components/PageEditor.tsx`**

On the `max-w-3xl` div, add `overflow-x: visible` so tables can visually break out:

```tsx
<div className="max-w-3xl mx-auto px-6 py-8 relative w-full overflow-x-visible">
```

On the outer scroll container, ensure it handles horizontal overflow:

```tsx
<div className="h-full overflow-y-auto overflow-x-auto relative" ref={containerRef}>
```

### 3. Update TableControls position clamping

**File: `src/components/editor/TableControls.tsx`**

Since the table can now be wider than the `max-w-3xl` column, the "Add Column" button and column gap indicators should use the `containerRef` (outer scroll panel) bounds for clamping instead of the `.tableWrapper`. Since the wrapper no longer has `max-width: 100%`, the wrapper and table rects will be the same width, and the outer container provides the visible boundary.

- Change clamping to use `containerRect` right edge: `Math.min(tableRect.right, containerRect.right)`
- The "Add Row" button width should be clamped to `Math.min(tableRect.width, containerRect.right - tableRect.left)`

## Files Summary

| File | Change |
|---|---|
| `src/index.css` | Remove `max-width: 100%` from `.tableWrapper`, set `max-width: none` |
| `src/components/PageEditor.tsx` | Add `overflow-x-visible` to content div, `overflow-x-auto` to outer container |
| `src/components/editor/TableControls.tsx` | Update clamping to use container bounds instead of wrapper bounds |

