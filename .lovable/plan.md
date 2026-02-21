

# Comment Box Layout and Selection Highlight Fixes

## Problem Summary

Three issues need to be addressed:
1. **Selection highlight**: When selecting text in the editor, the selected text should show a yellow highlight (custom selection color) instead of the default browser blue selection.
2. **Comment box positioning**: The comment input box currently appears as an absolute-positioned popover inside the editor. It should instead appear to the **right side** of the content area, aligned vertically with the top of the selected text (like Notion's approach shown in the screenshots).
3. **Comment input scrolling**: The textarea in the comment box should show approximately 14-15 lines of text before adding a scrollbar, instead of growing infinitely.

## Changes

### 1. `src/index.css` -- Custom Selection Color

Add a CSS rule targeting `.tiptap ::selection` to change the browser's default blue selection to a yellow highlight color, matching the Notion-style appearance.

### 2. `src/components/PageEditor.tsx` -- Reposition Comment Popover

Move the `InlineCommentPopover` out of the `max-w-3xl` content column and render it as a sibling positioned to the right of the editor content. The comment box will:
- Float in the right margin area (outside the main content column)
- Align its top edge with the top of the selected text
- Use the full available right-side space (similar to how the comment panel works, but as a lightweight input)

The `handleCommentClick` function will be updated to calculate the `top` position relative to the scrollable container, so the popover aligns with the selected text vertically. The `left` positioning will be removed -- instead the popover will be placed using CSS to sit in the right margin.

### 3. `src/components/comments/InlineCommentPopover.tsx` -- Layout and Scroll

Update the popover component:
- Change from `absolute` inside editor to a right-margin positioned element
- Accept only a `top` value (no `left` needed since it always sits to the right)
- Set the width to approximately 280-300px

### 4. `src/components/comments/CommentInput.tsx` -- Max Height with Scroll

Update the textarea to have a maximum height that accommodates roughly 14-15 lines of text (~280px at 14px line-height), after which a vertical scrollbar appears. Change from `resize-none` with no max-height to:
- `max-h-[280px]` (approximately 14-15 lines)
- `overflow-y: auto` for scrolling when content exceeds the limit

## Technical Details

### Selection Highlight CSS
```css
.tiptap ::selection {
  background-color: hsl(48 96% 89% / 0.8);
}
```

### Comment Popover Positioning Strategy

The current layout is:
```
[flex-1 overflow-auto (containerRef)]
  [max-w-3xl mx-auto content]
    [InlineCommentPopover (absolute, inside content)]
```

New layout:
```
[flex-1 overflow-auto (containerRef)] -- position: relative
  [max-w-3xl mx-auto content]
  [InlineCommentPopover (absolute, right side, top aligned to selection)]
```

The popover will be positioned with:
- `position: absolute`
- `top`: calculated from the selection coordinates relative to the scrollable container
- `right: 16px` (or a small offset from the right edge)
- This places it in the right margin, outside the `max-w-3xl` content area

### PageEditor handleCommentClick Update

Only compute `top` (no `left`):
```typescript
const coords = editor.view.coordsAtPos(from);
const container = containerRef.current;
if (container) {
  const containerRect = container.getBoundingClientRect();
  setCommentPopoverPos({
    top: coords.top - containerRect.top + container.scrollTop,
  });
}
```

### CommentInput Textarea Max Height
```tsx
<Textarea
  className="min-h-[60px] max-h-[280px] text-sm resize-none overflow-y-auto"
/>
```

## Files Modified

| File | Change |
|---|---|
| `src/index.css` | Add yellow selection highlight for `.tiptap` |
| `src/components/PageEditor.tsx` | Move popover outside content column, simplify positioning to top-only |
| `src/components/comments/InlineCommentPopover.tsx` | Update to right-margin layout, accept top-only position |
| `src/components/comments/CommentInput.tsx` | Add max-height with scroll on textarea |

