

# Untitled UI Design System Implementation

Apply the Untitled UI design language across the entire app: updated color tokens with #9e77ed as brand/primary, Open Sans font, and smaller button sizing.

## Changes

### 1. Add Open Sans font (index.html)
Add Google Fonts `<link>` for Open Sans (weights 400, 500, 600, 700).

### 2. Update CSS variables to Untitled UI palette (src/index.css)
- **Primary** (brand): `259 70% 70%` (derived from #9e77ed) with white foreground
- **Ring**: match primary purple
- **Sidebar primary/ring**: match brand purple
- Slightly warmer grays aligned with Untitled UI's neutral palette (gray-100 through gray-900)
- Update body `font-family` from Inter to `"Open Sans"`

### 3. Smaller button system (src/components/ui/button.tsx)
Reduce all sizes by one step:
| Size | Current | New |
|------|---------|-----|
| default | h-10 px-4 py-2 | h-8 px-3 py-1.5 |
| sm | h-9 px-3 | h-7 px-2.5 |
| lg | h-11 px-8 | h-9 px-5 |
| icon | h-10 w-10 | h-8 w-8 |

Also reduce base `text-sm` to `text-xs` for sm, keep `text-sm` for default/lg. Reduce SVG icon size from `size-4` to `size-3.5`.

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Add Open Sans Google Font link |
| `src/index.css` | Update CSS custom properties for Untitled UI colors + Open Sans font-family |
| `src/components/ui/button.tsx` | Reduce button heights, padding, and icon sizes |

## Technical Details

**#9e77ed to HSL**: RGB(158, 119, 237) converts to approximately HSL(260, 77%, 70%). The CSS variable will be `260 77% 70%`.

**Untitled UI neutral palette**: Uses slightly warm grays. The existing gray variables will shift to use `240 5%` base hue/saturation instead of `220 10%`, giving a cleaner, more neutral feel matching Untitled UI's aesthetic.

**Font loading**: Open Sans loaded via Google Fonts CDN with `display=swap` for performance. Weights 400 (normal), 500 (medium), 600 (semibold), 700 (bold).

