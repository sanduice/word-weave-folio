

# Inline Comments System (Notion-style)

## Overview

Add a full commenting system where users can select text, add comments, view them inline with highlights, and manage all comments from a right-side panel. Comments persist across sessions with text anchoring and support threading, resolution, and orphan detection.

## Database Changes

### Table: `comments`

| Column | Type | Default | Purpose |
|---|---|---|---|
| id | uuid | gen_random_uuid() | Primary key |
| page_id | uuid | NOT NULL | FK to pages |
| user_id | uuid | NOT NULL | Comment author |
| content | text | NOT NULL | Comment body |
| selected_text | text | NULL | Snapshot of highlighted text |
| block_id | text | NULL | TipTap node ID for anchoring |
| start_offset | integer | NULL | Character start offset |
| end_offset | integer | NULL | Character end offset |
| status | text | 'open' | 'open' or 'resolved' |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Table: `comment_replies`

| Column | Type | Default | Purpose |
|---|---|---|---|
| id | uuid | gen_random_uuid() | Primary key |
| comment_id | uuid | NOT NULL | FK to comments |
| user_id | uuid | NOT NULL | Reply author |
| content | text | NOT NULL | Reply body |
| created_at | timestamptz | now() | |

### RLS Policies

- SELECT: user can see comments on pages they own (`pages.user_id = auth.uid()`)
- INSERT: user can comment on pages they own
- UPDATE: comment author can update their own comments
- DELETE: comment author or page owner can delete
- Same pattern for `comment_replies`

### Updated `at` trigger

- Attach `update_updated_at_column` trigger to `comments` table

## TipTap Integration: Comment Mark

A custom TipTap **Mark** extension called `commentHighlight` will be created. It stores a `commentId` attribute on the marked text, rendering it with a background highlight color:

- **Open comment**: yellow background (`#fef9c3`)
- **Resolved comment**: light grey background (`#f3f4f6`)
- Clicking highlighted text opens the comment thread

The mark is applied when creating a comment and removed when deleting. On page load, marks are already in the saved HTML content, so highlights persist automatically.

## Architecture

```text
+------------------------------------------------------------------+
| TopBar  [...] [Comment icon + badge count]                       |
+------------------------------------------------------------------+
| StickyToolbar                                                    |
+----------------------------------------------+-------------------+
|  Page Content (scrollable)                   | Comment Panel     |
|                                              | (right sidebar)   |
|  Cover + Icon                                |                   |
|  Title                                       | Filter: All/Open  |
|  Editor with highlighted text                | /Resolved         |
|    [yellow highlight] = open comment         |                   |
|    [grey highlight] = resolved               | Comment Card 1    |
|                                              |   - Author, time  |
|  Bubble menu includes "Comment" button       |   - Selected text  |
|                                              |   - Comment body   |
|                                              |   - Reply thread   |
|                                              |   - Resolve btn    |
|                                              |                   |
|                                              | Comment Card 2    |
|                                              |   ...             |
+----------------------------------------------+-------------------+
```

## New Files

### 1. `src/hooks/use-comments.ts`

React Query hooks:
- `useComments(pageId)` -- fetch all comments for a page (with author profile)
- `useCreateComment()` -- insert comment + apply mark to editor
- `useReplyToComment()` -- insert reply
- `useUpdateCommentStatus()` -- resolve/reopen
- `useDeleteComment()` -- delete comment + remove mark from editor
- `useDeleteReply()` -- delete a reply

### 2. `src/components/editor/comment-mark.ts`

Custom TipTap Mark extension:
- Name: `commentHighlight`
- Attributes: `commentId` (string), `status` (string: 'open' | 'resolved')
- Rendered as `<span>` with data attributes and background color based on status
- Click handler dispatches a custom event to open the comment thread

### 3. `src/components/comments/CommentPanel.tsx`

Right-side panel (collapsible):
- Header: "All discussions" with filter tabs (All / Open / Resolved)
- List of comment cards, each showing:
  - Author name and avatar (from profiles)
  - Timestamp (relative, using date-fns)
  - Selected text preview (quoted block)
  - Comment content
  - Reply thread (nested)
  - Reply input
  - Resolve / Reopen / Delete actions
- Clicking a comment scrolls the editor to the highlighted text

### 4. `src/components/comments/CommentInput.tsx`

Reusable comment input component:
- Multi-line textarea
- Submit (Cmd+Enter) and Cancel buttons
- Used in both the inline popover and reply threads

### 5. `src/components/comments/InlineCommentPopover.tsx`

Popover that appears when clicking "Comment" in the bubble menu:
- Positioned near the selected text
- Contains the comment input
- On submit: creates comment, applies highlight mark, closes popover

## Changes to Existing Files

### `src/components/editor/BubbleMenuToolbar.tsx`

- Add a "Comment" button (MessageSquare icon) after the existing toolbar buttons
- On click: triggers the inline comment popover with the current selection info

### `src/components/PageEditor.tsx`

- Register the `commentHighlight` mark extension in the editor
- Render `CommentPanel` as a sibling to the editor content area (flex layout)
- Render `InlineCommentPopover` when comment mode is active
- Add comment panel toggle state
- Handle click events on comment marks to scroll/highlight in panel

### `src/components/TopBar.tsx`

- Add a comment icon button (MessageSquare) with unresolved count badge
- Clicking toggles the comment panel open/closed

### `src/stores/app-store.ts`

- Add `commentPanelOpen: boolean` and `setCommentPanelOpen` to the store
- Add `activeCommentId: string | null` and `setActiveCommentId` for highlighting active comment

### `src/pages/Index.tsx`

- No structural changes needed (comment panel is inside PageEditor)

### `src/index.css`

- Add styles for comment highlight marks (yellow for open, grey for resolved)
- Add hover styles for highlighted text
- Add comment panel styles

## Comment Creation Flow

1. User selects text in the editor
2. Bubble menu appears with "Comment" button
3. User clicks "Comment"
4. Inline popover opens with text input
5. User types comment, presses Submit or Cmd+Enter
6. System:
   a. Captures selection range (from/to positions) and selected text snapshot
   b. Inserts comment record in database
   c. Applies `commentHighlight` mark with the comment ID to the selected text
   d. Editor content (with mark) is auto-saved via existing debounce
   e. Comment panel updates to show new comment
7. Popover closes

## Text Anchoring Strategy

Comments are anchored via TipTap marks embedded in the HTML content:
- When a comment is created, a `<span data-comment-id="..." data-comment-status="open">` mark wraps the selected text
- This mark persists in the saved HTML, so on reload, highlights are automatic
- If the user edits the highlighted text, the mark stretches/shrinks with it naturally (TipTap mark behavior)
- If all highlighted text is deleted, the mark is removed from the DOM -- the comment becomes "orphaned"
- Orphan detection: when loading comments, check if the editor HTML still contains the comment ID mark; if not, flag as orphaned

## Comment Resolution

- Resolve: updates `status` to 'resolved', updates the mark's `data-comment-status` attribute in the editor (changes highlight from yellow to grey), saves content
- Reopen: reverse of resolve

## Edge Cases

| Case | Handling |
|---|---|
| Highlighted text deleted | Comment becomes orphaned, shown with warning in panel |
| Page content edited around highlight | TipTap marks naturally adjust with edits |
| Comment on empty selection | Button disabled when selection is empty |
| Very long selected text | Show truncated preview (first 100 chars) in panel |
| Max comment length | 2000 character limit on textarea |
| Delete comment | Remove mark from editor content, delete from DB |
| Multiple comments on overlapping text | Each gets its own mark with unique ID; highlights stack |

## Implementation Sequence

1. Database migration: create `comments` and `comment_replies` tables with RLS
2. `comment-mark.ts`: TipTap custom mark extension
3. `use-comments.ts`: React Query hooks for CRUD
4. `CommentInput.tsx`: reusable input component
5. `InlineCommentPopover.tsx`: popover for creating comments
6. `CommentPanel.tsx`: right-side panel with threads
7. Update `app-store.ts`: add comment panel state
8. Update `BubbleMenuToolbar.tsx`: add Comment button
9. Update `TopBar.tsx`: add comment panel toggle with badge
10. Update `PageEditor.tsx`: integrate mark extension, panel, and popover
11. Update `src/index.css`: comment highlight and panel styles

## Files Summary

| File | Action |
|---|---|
| `comments` table (migration) | New |
| `comment_replies` table (migration) | New |
| `src/components/editor/comment-mark.ts` | New |
| `src/hooks/use-comments.ts` | New |
| `src/components/comments/CommentInput.tsx` | New |
| `src/components/comments/InlineCommentPopover.tsx` | New |
| `src/components/comments/CommentPanel.tsx` | New |
| `src/stores/app-store.ts` | Modify -- add comment panel state |
| `src/components/editor/BubbleMenuToolbar.tsx` | Modify -- add Comment button |
| `src/components/TopBar.tsx` | Modify -- add panel toggle + badge |
| `src/components/PageEditor.tsx` | Modify -- integrate mark, panel, popover |
| `src/index.css` | Modify -- add comment highlight styles |

