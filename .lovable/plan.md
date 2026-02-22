

# Table: Left-Aligned Growth with Own Scrollbar

## Behavior

- Table starts aligned with the content body (left edge matches content left edge)
- As columns are added, the table grows to the **right only** -- it does NOT expand to the left
- The `.tableWrapper` has `overflow-x: auto` so a horizontal scrollbar appears at the bottom of the table when it exceeds the editor panel width
- The scrollbar is always visible when the table overflows (using `overflow-x: scroll` or CSS to force visibility)

## Current Problem

The current CSS uses symmetric negative margins (`margin-left: calc(-0.5 * ...)`) which centers the breakout. The `--editor-width` variable makes the wrapper span the full panel. This causes the table to expand equally left and right, which is not what the user wants.

## Plan

### 1. `src/index.css` -- Simplify `.tableWrapper`

Remove the symmetric breakout logic entirely. The table wrapper should:
- Stay left-aligned with the content body by default
- Have no max-width constraint so it can grow with its table content
- Use `overflow-x: auto` (or `overflow-x: scroll` for always-visible scrollbar)
- Width should be `100%` of the content column -- the table inside will push wider via `min-width: fit-content` on the `<table>`

```css
.tiptap .tableWrapper {
  overflow-x: auto;
  overflow-y: visible;
  max-height: none;
  max-width: none;
  width: 100%;
  min-width: 100%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  position: relative;
  box-sizing: border-box;
}
```

Remove the `--editor-width` variable usage and the `margin-left` / `margin-right` calc lines.

### 2. `src/components/PageEditor.tsx` -- Remove ResizeObserver

- Remove the `useEffect` that sets `--editor-width` CSS variable via ResizeObserver (no longer needed)
- Keep `overflow-x: hidden` on the outer container (scrollbar belongs to the table wrapper, not the page)

### 3. `src/components/editor/TableControls.tsx` -- No changes needed

The clamping logic already uses `.tableWrapper` bounds (`wrapperRect`), which is correct since the wrapper is the scroll container.

## Technical Details

| File | Change |
|---|---|
| `src/index.css` | Remove `--editor-width` breakout, set `width: 100%`, keep `overflow-x: auto` |
| `src/components/PageEditor.tsx` | Remove the ResizeObserver `useEffect` for `--editor-width` |
| `src/components/editor/TableControls.tsx` | No changes |

## Result

- Small tables (few columns): fit within content body, no scrollbar
- Wide tables (many columns): table grows rightward, scrollbar appears at the bottom of the table
- Left edge of the table always stays aligned with the content column left edge
