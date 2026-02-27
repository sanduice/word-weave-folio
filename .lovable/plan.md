

## Problem

The `TextStyleDropdown` menu (Text / H1 / H2 / H3) opens at the top-left corner of the viewport instead of anchored to its trigger button.

**Root cause**: The parent `.sticky-toolbar` div has `onMouseDown={(e) => e.preventDefault()}` which intercepts all mousedown events inside the toolbar, including the Radix `DropdownMenuTrigger` click. This interferes with Radix's internal positioning logic, causing it to calculate the trigger position as (0, 0).

## Fix

### File: `src/components/editor/StickyToolbar.tsx`

1. **Remove the blanket `onMouseDown` handler** from the parent toolbar `div` (line 225).
2. The individual `ToolBtn` components already have their own `onMouseDown={(e) => { e.preventDefault(); onClick(); }}`, so editor focus is still preserved for all regular toolbar buttons. The color `Popover` triggers also handle this correctly.
3. On the `TextStyleDropdown` trigger button, it already has `onMouseDown={(e) => e.preventDefault()}` — this is sufficient to prevent editor blur without breaking Radix positioning.

This is a one-line removal (the `onMouseDown` prop on the wrapper div at line 225).

