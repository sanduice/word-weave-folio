

# Fix: Comment Highlights Not Updating on Resolve/Delete

## Problem

When a comment is resolved or deleted via the CommentPanel, only the database is updated. The TipTap editor marks (`commentHighlight`) are never modified, so the yellow highlight persists in the editor HTML. On page reload, the stale marks remain in the saved content.

## Root Cause

`CommentPanel` calls `statusMutation.mutate()` and `deleteMutation.mutate()` which update the database but have no access to the TipTap editor instance. The editor marks (which control the highlight color) are never updated or removed.

## Solution

Pass two callback functions from `PageEditor` (which owns the editor instance) to `CommentPanel`:

1. **onResolveComment(commentId, newStatus)** -- finds the mark in the editor and updates its `status` attribute (open -> resolved changes yellow to grey, resolved -> open changes grey to yellow), then triggers a save.
2. **onDeleteComment(commentId)** -- finds and removes the mark entirely from the editor, then triggers a save.

## Changes

### 1. `src/components/PageEditor.tsx`

Add two handler functions that manipulate TipTap marks:

- `handleResolveComment(commentId, status)`: Traverse the editor document, find all text nodes with the `commentHighlight` mark matching the commentId, remove the old mark and re-apply it with the updated `status` attribute. Then trigger `scheduleSave`.
- `handleDeleteComment(commentId)`: Traverse the editor document, find all text nodes with the matching mark, and remove (unset) the mark from those ranges. Then trigger `scheduleSave`.

Pass these as new props `onResolveComment` and `onDeleteComment` to `CommentPanel`.

### 2. `src/components/comments/CommentPanel.tsx`

- Accept two new props: `onResolveComment(commentId: string, status: string)` and `onDeleteComment(commentId: string)`.
- In the Resolve/Reopen button handler: call `onResolveComment` in addition to the existing `statusMutation.mutate()`.
- In the Delete button handler: call `onDeleteComment` in addition to `deleteMutation.mutate()`.

### 3. `src/components/editor/comment-mark.ts`

No changes needed -- the mark already supports `status` as an attribute.

## Technical Detail: Mark Update Logic

TipTap doesn't have a direct "update mark attributes" API for existing marks. The approach is:

```typescript
// Find all positions with this commentId mark
editor.state.doc.descendants((node, pos) => {
  const mark = node.marks.find(
    m => m.type.name === 'commentHighlight' && m.attrs.commentId === commentId
  );
  if (mark) {
    // For resolve: remove old mark, apply new one with updated status
    const from = pos;
    const to = pos + node.nodeSize;
    editor.chain()
      .setTextSelection({ from, to })
      .unsetMark('commentHighlight')
      .setMark('commentHighlight', { commentId, status: newStatus })
      .run();
  }
});
// For delete: just unsetMark without re-applying
```

After updating marks, call `scheduleSave(title, editor.getHTML())` to persist the change.

## Files Modified

| File | Change |
|---|---|
| `src/components/PageEditor.tsx` | Add mark update/remove handlers, pass as props to CommentPanel |
| `src/components/comments/CommentPanel.tsx` | Accept and call new props on resolve/delete actions |

