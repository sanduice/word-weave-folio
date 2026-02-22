
# Three-Pane Resizable Layout with Independent Scrolling

## Overview

Replace the current flex-based layout with `react-resizable-panels` (already installed) to create a proper three-pane layout: Left Sidebar, Main Content, and Comment Panel. Each pane scrolls independently, and the sidebar and comment panel are resizable via drag handles.

## Current Architecture

```text
SidebarProvider
  div.flex
    AppSidebar (Shadcn Sidebar component)
    div.flex-col
      TopBar
      PageEditor
        StickyToolbar
        div.flex
          div.overflow-auto (editor content)
          CommentPanel (conditionally rendered, no resize)
```

## New Architecture

```text
SidebarProvider
  div.flex
    AppSidebar (unchanged -- Shadcn Sidebar handles its own collapse/resize)
    div.flex-col.flex-1
      TopBar
      PageEditor
        StickyToolbar
        ResizablePanelGroup (horizontal)
          ResizablePanel (main editor -- no min, flex=1)
            div.overflow-y-auto.h-full (editor content)
          ResizableHandle (when comment panel open)
          ResizablePanel (comment panel -- min/max constrained)
            CommentPanel (overflow-y-auto.h-full)
```

**Why not wrap the sidebar too?** The left sidebar uses Shadcn's `Sidebar` component which already has its own collapse/expand behavior. Wrapping it in `ResizablePanelGroup` would conflict with Shadcn's internal width management. Instead, we make the sidebar resizable via CSS `resize` or a custom drag handle, keeping the Shadcn component intact.

## Changes

### 1. `src/components/PageEditor.tsx` -- Wrap editor + comment panel in ResizablePanelGroup

- Import `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` from `@/components/ui/resizable`
- Replace the current `div.flex` wrapper (line 374) with a `ResizablePanelGroup direction="horizontal"`
- Main editor content goes in the first `ResizablePanel` with `minSize={40}` (percentage)
- Comment panel goes in a second `ResizablePanel` with pixel-based constraints converted to percentages:
  - `minSize={15}` (~280px), `maxSize={30}` (~480px), `defaultSize={20}` (~360px)
- Add a `ResizableHandle` between them (only when comment panel is open)
- Both panels get `overflow-y-auto h-full` for independent scrolling
- Save/restore panel sizes to localStorage

### 2. `src/components/comments/CommentPanel.tsx` -- Scroll isolation

- Remove the hardcoded width (currently uses CSS class `comment-panel`)
- Ensure the component fills its parent panel: `h-full flex flex-col`
- The comments list div already has `overflow-y-auto` -- verify the header stays sticky with `shrink-0`

### 3. `src/components/AppSidebar.tsx` -- Sidebar resize via CSS

- Add `style={{ minWidth: 220, maxWidth: 480 }}` constraints
- The Shadcn Sidebar already supports collapse -- no structural changes needed
- The sidebar content already scrolls independently via `SidebarContent` which has built-in overflow

### 4. `src/index.css` -- Resize handle styling

- Add subtle styling for the resize handle: hover highlight, `col-resize` cursor
- Style the comment panel to fill available height

### 5. `src/stores/app-store.ts` -- Persist comment panel width (optional)

- Add `commentPanelSize` state to store the last used panel size percentage
- Save to localStorage on resize, restore on mount

## Technical Details

### ResizablePanelGroup Setup

```tsx
<ResizablePanelGroup direction="horizontal" className="flex-1">
  <ResizablePanel defaultSize={80} minSize={40}>
    <div className="h-full overflow-y-auto relative" ref={containerRef}>
      {/* editor content */}
    </div>
  </ResizablePanel>
  
  {commentPanelOpen && selectedPageId && user && (
    <>
      <ResizableHandle className="w-px bg-border hover:bg-primary/20 transition-colors" />
      <ResizablePanel 
        defaultSize={20} 
        minSize={15} 
        maxSize={30}
        onResize={(size) => localStorage.setItem('commentPanelSize', String(size))}
      >
        <CommentPanel ... />
      </ResizablePanel>
    </>
  )}
</ResizablePanelGroup>
```

### Scroll Isolation

Each pane achieves independent scrolling by:
- Having a fixed height derived from the viewport (`h-full` flowing from `flex-1 overflow-hidden` parent)
- Using `overflow-y: auto` on its own content area
- The sticky toolbar sits above the `ResizablePanelGroup`, outside any scroll container

### Width Persistence

```typescript
// On resize callback
const handlePanelResize = (size: number) => {
  localStorage.setItem('comment-panel-size', String(size));
};

// On mount
const savedSize = Number(localStorage.getItem('comment-panel-size')) || 20;
```

### Edge Cases Handled

- **Comment panel toggle**: When panel closes, `ResizablePanel` unmounts; when it reopens, it restores the saved size
- **Window resize**: `react-resizable-panels` handles this natively with percentage-based sizing
- **Min content width**: The main editor panel has `minSize={40}` preventing it from being squeezed too small
- **No editor re-render during resize**: The editor content doesn't re-render on panel resize since only the container width changes (CSS reflow only)

## Files Modified

| File | Change |
|---|---|
| `src/components/PageEditor.tsx` | Wrap editor + comment panel in ResizablePanelGroup with resize handles |
| `src/components/comments/CommentPanel.tsx` | Remove hardcoded width, ensure h-full flex layout |
| `src/index.css` | Add resize handle hover styles |
