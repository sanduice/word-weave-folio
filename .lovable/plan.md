

## Plan: Auto-create default space on new user signup

When a new user signs up, automatically create a default space named after the username portion of their email (capitalized). E.g., `chattrn@gmail.com` → space "Chattrn".

### Approach

Extend the existing `handle_new_user()` database trigger function to also insert a row into `spaces` after creating the profile.

### Changes

#### 1. Update `handle_new_user()` trigger function (migration)

Add logic after the profile upsert to insert a default space:

```sql
INSERT INTO public.spaces (user_id, name, icon)
VALUES (
  NEW.id,
  initcap(split_part(NEW.email, '@', 1)),
  '📘'
)
ON CONFLICT DO NOTHING;
```

- `split_part(email, '@', 1)` extracts the username
- `initcap()` capitalizes the first letter (e.g., "chattrn" → "Chattrn")
- `ON CONFLICT DO NOTHING` prevents errors if the trigger fires multiple times

#### 2. Auto-select the default space on first load

In `src/pages/Index.tsx` (or wherever spaces are loaded and `selectedSpaceId` is initialized), if no space is selected and spaces exist, auto-select the first one. This likely already happens — will verify and ensure it does.

### No other changes needed
- Users can already rename spaces via the existing `SpaceSelector` / `useUpdateSpace`
- The space is a normal space row, fully editable/deletable

