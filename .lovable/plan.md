

# Page Icon and Cover Image System (Notion-style)

## Overview

Add the ability for users to personalize pages with emoji icons and cover images, matching the Notion-style UX shown in the reference screenshots. When hovering near the page title, "Add icon" and "Add cover" buttons appear. Icons display as large emoji next to the title, covers display as full-width banners above the page content.

## Database Changes

Add 5 new columns to the `pages` table:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `icon_type` | text | null | "emoji" or "upload" |
| `icon_value` | text | null | Emoji character or storage URL |
| `cover_type` | text | null | "gallery", "upload", or "link" |
| `cover_url` | text | null | Image URL for the cover |
| `cover_position_y` | real | 0.5 | Vertical focal point (0-1) for repositioning |

Also create a `page-assets` storage bucket (public) for uploaded icons and covers, with RLS policies allowing authenticated users to upload/read/delete their own files.

## New Components

### 1. `src/components/editor/PageIconCoverControls.tsx`

Renders above the title input in PageEditor:
- On hover/focus near the title area, shows "+ Add icon" and "+ Add cover" ghost buttons (like Notion screenshot 1)
- If icon exists: shows the large emoji (or uploaded image) to the left of the title; clicking it reopens the picker
- If cover exists: shows full-width cover banner (240px height) above the title area with "Change | Reposition | Remove" controls on hover

### 2. `src/components/editor/EmojiPicker.tsx`

A popover with:
- **Emoji tab** (default): searchable grid of emojis organized by category (People, Nature, Food, Activities, Travel, Objects, Symbols, Flags). Uses a static emoji dataset bundled in the component
- **Remove tab**: button to clear the icon (only shown when icon exists)
- Clicking an emoji instantly saves it and closes the picker
- Search/filter input at the top

### 3. `src/components/editor/CoverPicker.tsx`

A popover/panel with tabs:
- **Gallery tab**: grid of ~12 pre-curated gradient/abstract cover images (CSS gradients stored as data, no external dependencies)
- **Upload tab**: file input for JPG/PNG/WebP up to 5MB, uploads to `page-assets` bucket
- **Link tab**: paste an image URL, preview before applying
- **Remove**: clears the cover

### 4. `src/components/editor/CoverReposition.tsx`

When user clicks "Reposition" on the cover:
- Cover enters drag mode (cursor changes to grab)
- User drags vertically to adjust the focal point
- On mouse release, saves the `cover_position_y` value
- "Save position" button confirms

## Changes to Existing Files

### `src/hooks/use-pages.ts`

- Update `useUpdatePage` mutation to accept `icon_type`, `icon_value`, `cover_type`, `cover_url`, `cover_position_y` fields
- Update `useDuplicatePage` to copy icon and cover fields

### `src/components/PageEditor.tsx`

- Import and render `PageIconCoverControls` above the title input
- Pass page data and update handlers
- Cover banner renders above the `max-w-3xl` content container (full width)
- Icon renders inline with the title

### Layout structure when both icon and cover are present:

```text
+--------------------------------------------------+
|  [Cover image, full-width, 240px, object-position]|
|                      [Change] [Reposition] [Remove]|
+--------------------------------------------------+
|     max-w-3xl container                           |
|                                                   |
|  [Icon emoji, ~64px]                              |
|  [Page Title input .........................]     |
|  [Editor content .............................]   |
+--------------------------------------------------+
```

When only icon (no cover): icon sits above the title, overlapping nothing.
When only cover (no icon): cover at top, title below.
When neither: just the title as today, with hover triggers.

## Emoji Data

Bundle a static array of ~500 common emojis organized by category. No external API or npm package needed. Example structure:

```typescript
const EMOJI_DATA = {
  "People": ["😀", "😃", "😄", ...],
  "Nature": ["🌸", "🌺", "🌻", ...],
  // ...
};
```

## Gallery Covers

Use CSS gradients as pre-curated gallery options (no external images needed):

```typescript
const GALLERY_COVERS = [
  { id: "gradient-1", label: "Sunset", css: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { id: "gradient-2", label: "Ocean", css: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  // ~12 options
];
```

For gallery covers, `cover_type = "gallery"` and `cover_url` stores the gradient CSS string. For uploads, `cover_url` stores the storage public URL.

## Storage Bucket Setup (SQL migration)

```sql
-- Create page-assets bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('page-assets', 'page-assets', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload page assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view page assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'page-assets');

CREATE POLICY "Users can delete own page assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Upload path pattern: `{user_id}/icons/{page_id}.{ext}` or `{user_id}/covers/{page_id}.{ext}`

## Implementation Sequence

1. **Database migration**: Add 5 columns to `pages` table + create storage bucket with RLS
2. **Emoji data file**: `src/components/editor/emoji-data.ts` -- static emoji dataset
3. **EmojiPicker component**: searchable emoji grid popover
4. **CoverPicker component**: gallery/upload/link tabs popover
5. **CoverReposition component**: drag-to-reposition interaction
6. **PageIconCoverControls component**: orchestrates icon + cover display and triggers
7. **Update PageEditor.tsx**: integrate the controls into the page layout
8. **Update use-pages.ts**: extend update/duplicate hooks for new fields

## Edge Cases

| Case | Handling |
|---|---|
| Broken cover URL (link tab) | Show fallback placeholder with "Replace" option |
| Upload fails | Show toast error, don't save |
| Page duplication | Copy icon/cover metadata; for uploaded files, reference same URL (no re-upload) |
| Delete page with uploaded assets | Assets remain in storage (cleanup is a future enhancement) |
| Cover + icon together | Icon overlaps bottom of cover by ~32px (negative margin), similar to Notion |
| Very long title with icon | Icon stays fixed size (64px), title wraps normally |
| Mobile/small viewport | Cover height reduces to 160px, icon to 48px |

## Files Summary

| File | Action |
|---|---|
| `pages` table (migration) | Add 5 columns |
| `storage.buckets` (migration) | Create `page-assets` bucket + RLS |
| `src/components/editor/emoji-data.ts` | New -- static emoji dataset |
| `src/components/editor/EmojiPicker.tsx` | New -- emoji picker popover |
| `src/components/editor/CoverPicker.tsx` | New -- cover picker with gallery/upload/link |
| `src/components/editor/CoverReposition.tsx` | New -- drag repositioning |
| `src/components/editor/PageIconCoverControls.tsx` | New -- orchestrator component |
| `src/components/PageEditor.tsx` | Modify -- integrate icon/cover UI |
| `src/hooks/use-pages.ts` | Modify -- extend update/duplicate for new fields |

## Explicit Non-Goals (v1)

- No animated or video covers
- No Unsplash integration
- No icon display in sidebar (future enhancement)
- No custom icon upload (emoji only for v1 -- upload tab shown but phase 2)
- No cover image in print/export

