

# Table with Own Scrollbar and Full-Width Breakout

## Problem

Currently the `.tableWrapper` uses `overflow-x: visible` which means the table visually breaks out but has no scrollbar of its own. The user wants:

1. A horizontal scrollbar directly beneath the table (not at the page level)
2. The table to expand to the left as well as the right, using the full editor panel width (like Notion)

## Solution

### 1. CSS: Make `.tableWrapper` break out of `max-w-3xl` symmetrically and add its own scrollbar

**File: `src/index.css`**

The `.tableWrapper` needs to:
- Break out of the `max-w-3xl` (768px) container to span the full editor panel width
- Have `overflow-x: auto` so it gets its own horizontal scrollbar when the table is wider than the panel
- Use negative margins to escape the content column equally on both sides

Since the editor is inside a panel (not full viewport), we cannot use `100vw`. Instead we use a CSS approach where the wrapper calculates how much to break out relative to its parent:

```css
.tiptap .tableWrapper {
  overflow-x: auto;       /* scrollbar on the table itself */
  overflow-y: visible;
  max-height: none;
  max-width: none;
  width: calc(100vw - var(--sidebar-width, 0px));  /* won't work reliably */
  ...
}
```

A more robust approach: use JavaScript to measure the `containerRef` width and set a CSS custom property, then use that for the wrapper width. But the simplest pure-CSS approach is:

- On the `max-w-3xl` content div, set a CSS variable `--content-padding` equal to the `px-6` (24px)
- On `.tableWrapper`, use negative margins to break out to the edges of the scroll container:
  ```css
  margin-left: calc(-1 * (50cqw - 50%));   /* requires container query -- not ideal */
  ```

**Simplest robust approach**: Remove `max-w-3xl` constraint from `.tableWrapper` by making it position itself relative to the scroll container (`containerRef`) rather than the content div. This is done by:

- Moving the `.tableWrapper` width to `calc(100% + 2 * var(--editor-pad, 24px))` with matching negative margins
- Reverting `.tableWrapper` to `overflow-x: auto` for its own scrollbar
- Removing `overflow-x: auto` from the outer container (no page-level scrollbar needed)

```css
.tiptap .tableWrapper {
  overflow-x: auto;
  overflow-y: visible;
  max-height: none;
  max-width: none;
  /* Break out of px-6 (24px) padding on both sides */
  margin-left: -24px;
  margin-right: -24px;
  width: calc(100% + 48px);
  min-width: calc(100% + 48px);
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  position: relative;
  box-sizing: border-box;
}
```

This makes the table wrapper stretch to the full width of the `max-w-3xl` container plus its padding, effectively reaching the edges of the content column. But we want it to go even further -- to the edges of the entire editor panel.

**Best approach**: Use a JS-driven CSS variable set on `containerRef` that tells the wrapper how wide the scroll container is, then the wrapper can size itself to that width.

### Final approach (JS + CSS hybrid)

1. In `PageEditor.tsx`, measure `containerRef` width and set a CSS variable `--editor-width` on it using a ResizeObserver
2. In CSS, the `.tableWrapper` uses this variable to calculate its full breakout width with negative margins
3. The wrapper gets `overflow-x: auto` for its own scrollbar

### 2. PageEditor.tsx changes

- Add a `ResizeObserver` on `containerRef` that sets `--editor-width` CSS variable on the container element
- Revert the outer container to `overflow-x: hidden` (no page-level scrollbar)
- Keep `overflow-x: visible` on the `max-w-3xl` div so the wrapper can visually escape

### 3. CSS changes

```css
.tiptap .tableWrapper {
  overflow-x: auto;
  overflow-y: visible;
  max-height: none;
  max-width: none;
  /* Full-width breakout using CSS variable from JS */
  width: var(--editor-width, 100%);
  margin-left: calc(-0.5 * (var(--editor-width, 100%) - 100%));
  margin-right: calc(-0.5 * (var(--editor-width, 100%) - 100%));
  min-width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  position: relative;
  box-sizing: border-box;
}
```

### 4. TableControls clamping

Update clamping to use the `.tableWrapper` rect again (since it now has `overflow-x: auto` and acts as the scroll container).

## Files Summary

| File | Change |
|---|---|
| `src/index.css` | Revert `.tableWrapper` to `overflow-x: auto`, add full-width breakout using CSS variable |
| `src/components/PageEditor.tsx` | Add ResizeObserver to set `--editor-width` CSS variable, revert outer container to `overflow-x: hidden` |
| `src/components/editor/TableControls.tsx` | Update clamping to use wrapper bounds for scrollbar-contained table |

