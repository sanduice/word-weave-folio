

# Fix Table Width Overflow and Contain Add Controls Within Scroll Container

## Problem

From the screenshot, two issues are visible:

1. **Table grows wider than the page** -- when columns are added, the table expands beyond the editor container, pushing the entire page layout wider (the red arrow shows this overflow)
2. **"Add Column" button is positioned outside the scroll container** -- it's rendered as an absolute overlay in the editor container, not inside the `.tableWrapper` scroll container, so it appears at the table's visual right edge even when that's off-screen

## Root Cause

- The `TableControls` component positions its "+" buttons relative to the outer `containerRef` (the editor scroll panel), using `getBoundingClientRect()` of the actual `<table>` element. When the table overflows its `.tableWrapper`, the button gets placed beyond the visible area.
- The `.tableWrapper` has `overflow-x: auto` but the table inside uses `min-width: 100%` which allows it to grow infinitely. The wrapper correctly clips with a scrollbar, but the overlay controls are positioned outside the wrapper, causing visual misalignment.
- The "Add Column" button width (24px) is placed at `tableRect.right`, which can be far outside the visible `.tableWrapper` bounds.

## Solution

### 1. Constrain "Add Column" Button Position

**File: `src/components/editor/TableControls.tsx`**

Change position calculation to use the `.tableWrapper` element's visible bounds (not the raw table bounds) for clamping the "Add Column" button position:

- Find the `.tableWrapper` parent of the `<table>` element
- Use `Math.min(wrapperRect.right, tableRect.right)` for the column button's left position
- This ensures the button stays within the visible scroll container area
- The "Add Row" button width should also be clamped to the wrapper width

### 2. Fix Table Width CSS

**File: `src/index.css`**

- Keep `min-width: 100%` on the table so small tables fill the container
- Ensure `.tableWrapper` has `max-width: 100%` so the wrapper itself never exceeds its parent
- Add `box-sizing: border-box` to the wrapper

### 3. Clamp Between-Column Insertion Indicators

**File: `src/components/editor/TableControls.tsx`**

The column gap insertion indicators also need clamping to the wrapper's visible bounds so they don't appear outside the scrollable area.

## Technical Changes

### `src/components/editor/TableControls.tsx`

In the position update function:
- After finding `tableEl`, also find its parent `.tableWrapper` via `tableEl.closest('.tableWrapper')`
- Get `wrapperRect` from the wrapper element
- Clamp `addCol.left` to `Math.min(tableRect.right, wrapperRect.right) - containerRect.left + scrollLeft + 2`
- Clamp `addRow.width` to `Math.min(tableRect.width, wrapperRect.width)`
- For column gaps: skip any gap whose `left` position falls outside the wrapper's visible area

### `src/index.css`

```css
.tiptap .tableWrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
  max-width: 100%;        /* ADD: prevent wrapper from exceeding parent */
  margin: 1rem 0;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  position: relative;
  box-sizing: border-box;  /* ADD */
}
```

## Files Summary

| File | Change |
|---|---|
| `src/components/editor/TableControls.tsx` | Clamp button/indicator positions to `.tableWrapper` visible bounds |
| `src/index.css` | Add `max-width: 100%` and `box-sizing: border-box` to `.tableWrapper` |

