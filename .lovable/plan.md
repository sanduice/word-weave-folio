

# Fix: Emoji Icon Getting Clipped Behind Cover Image

## Problem

When both an icon and cover are present, the icon is supposed to overlap the bottom of the cover by ~32px (using `-mt-8`). However, the cover's `overflow-hidden` clips the icon, making it partially hidden as shown in the screenshot.

## Root Cause

The icon container is a sibling that follows the cover container. The `-mt-8` pulls it upward visually, but it renders behind the cover because it lacks a `z-index`. The cover's `overflow-hidden` doesn't directly clip it (since the icon is outside that div), but the cover's stacking context sits on top.

## Fix

**File: `src/components/editor/PageIconCoverControls.tsx`**

Two changes:

1. Add `relative z-10` to the icon container (line 103) so the emoji renders above the cover image.
2. Ensure the cover container doesn't create a higher stacking context by keeping it at default z-index.

Specifically, on line 103 change:
```
<div className="max-w-3xl mx-auto w-full px-6">
```
to:
```
<div className="max-w-3xl mx-auto w-full px-6 relative z-10">
```

This ensures the icon (and the "Add icon / Add cover" buttons) always render in front of the cover image, preventing any clipping.

## Summary

| File | Change |
|---|---|
| `src/components/editor/PageIconCoverControls.tsx` | Add `relative z-10` to the icon/controls container div (line 103) |

Single-line fix, no other files affected.

