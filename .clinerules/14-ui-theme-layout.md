<!--
Rule: R-014
Title: UI, Theme, and App Layout (App Router + shadcn/ui)
Status: enabled
-->

# R-014 — UI, Theme, and App Layout (App Router + shadcn/ui)

Purpose & Scope

- Standardize theming, layout providers, and UI composition for a consistent UX across tenant-scoped pages.
- Ensure proper usage of OKLCH color system, dark/light themes, and shadcn/ui with Radix primitives.

Do

- Use the root `app/layout.tsx` to wire global providers in this order:
  - `ThemeProvider` → `AuthProvider` → `<main>{children}</main>` → `Toaster`
- Use OKLCH color system via `app/globals.css`; respect CSS variables for dark/light themes.
- Prefer shadcn/ui components with Radix primitives for accessibility and consistency.
- Keep UI responsive; leverage container queries/responsive utilities for charts and layouts.
- Use `next-themes` with system preference detection and persistent theme storage.
- Keep UI configuration and color tokens centralized; avoid inline hardcoded styles that fight the theme.

Don’t

- Render pages without `ThemeProvider` and `AuthProvider` in the layout.
- Hardcode colors that break OKLCH palettes or dark mode.
- Mix arbitrary third-party UI components that conflict with shadcn/ui without review.
- Introduce blocking synchronous work in layout; keep it lightweight and server-friendly.

Required Patterns

1. Root layout with providers and Toaster

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <main>{children}</main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

2. Theme usage in components

```tsx
import { useTheme } from "next-themes";

export function ThemedSurface({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <div className="bg-background text-foreground">{children}</div>;
}
```

3. shadcn/ui + Radix primitives

```tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function ActionDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>{/* content */}</DialogContent>
    </Dialog>
  );
}
```

4. Responsive/Accessible charts and layout

```tsx
// Respect container width/height; avoid fixed px for charts
<div className="w-full h-full">
  {/* ResponsiveContainer from Recharts, wrapped by a sized parent */}
</div>
```

5. Global styles and tokens

```css
/* app/globals.css: maintain OKLCH variables and dark/light tokens */
:root {
  /* color tokens */
}
.dark {
  /* dark tokens */
}
```

PR Checklist

- [ ] Root layout includes `ThemeProvider`, `AuthProvider`, and `Toaster` in that order.
- [ ] Components/styles use OKLCH tokens and `bg-background`/`text-foreground` classes.
- [ ] shadcn/ui + Radix patterns are followed for accessibility and consistency.
- [ ] Responsive behaviors verified, especially for charts and container-resized areas.
- [ ] No hardcoded colors that break dark mode or OKLCH consistency.

References

- App Router: `app/CLAUDE.md` — Layout Hierarchy (Root Layout with providers), Styling & Theming (OKLCH, next-themes).
- Components: `components/CLAUDE.md` — UI Foundation (theme-provider, ui/), Theme Integration patterns.
- Styles: `app/globals.css`, `styles/globals.css` (tokens and utilities).
