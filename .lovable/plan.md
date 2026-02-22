

# Fix Comment Panel Independent Scrolling

## Problem

The comment panel scrolls together with the editor content instead of having its own independent scroll. This happens because the `ResizablePanel` containing the `CommentPanel` doesn't constrain its overflow, so the panel grows with content and scrolls as part of the page layout.

## Solution

Add `overflow-hidden` to the comment panel's `ResizablePanel` so the `CommentPanel`'s internal `overflow-y-auto` (on its comments list) handles scrolling independently.

## Changes

### `src/components/PageEditor.tsx`

Add `className="overflow-hidden"` to the comment panel's `ResizablePanel`:

```tsx
<ResizablePanel
  defaultSize={20}
  minSize={15}
  maxSize={30}
  className="overflow-hidden"
  onResize={(size) => localStorage.setItem('comment-panel-size', String(size))}
>
```

This single change ensures the panel has a bounded height, allowing the `CommentPanel`'s `flex-1 overflow-y-auto` on its comments list to scroll independently from the editor content.

