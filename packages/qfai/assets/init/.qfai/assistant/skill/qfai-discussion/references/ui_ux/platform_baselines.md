# UI/UX Platform Baselines

Use this file only when the current discussion needs platform-specific detail.

## Cross-Platform Baseline

- Keep the same conceptual model across surfaces.
- Do not force the same layout across mobile, desktop, and CLI.
- Document intentional platform deviations.
- Shared design tokens are preferred, but interaction patterns should stay platform-native.

## Web

### Use when

- Browser-based product with responsive layouts, forms, or complex navigation.

### Baseline expectations

- Keyboard navigation works end to end.
- Focus indicators remain visible.
- Contrast meets WCAG expectations.
- Navigation changes across breakpoints intentionally.
- Hover-only interaction is never the only path.

### Practical floor

- Minimum target size: 24x24 CSS px at WCAG 2.2 AA floor; prefer 44x44 CSS px.
- Common layout bands:
  - compact: 0-599 px
  - medium: 600-839 px
  - expanded: 840-1199 px
  - large: 1200 px+

## Mobile

### Shared mobile rules

- Primary actions should sit in reachable zones.
- Avoid surprise horizontal scroll.
- Respect safe areas and system gestures.
- Every gesture-only action needs a visible alternative when feasible.

### iOS

- Prefer standard navigation bar, tab bar, modal, and back behavior.
- Minimum touch target: 44x44 pt.
- Support Dynamic Type where the surface expects it.
- Respect swipe-back and safe area behavior.

### Android

- Prefer Material-aligned navigation patterns and system back behavior.
- Minimum touch target: 48x48 dp.
- Use bottom navigation only for 3-5 primary destinations.
- Do not import iOS-only interaction idioms without strong reason.

## Desktop

### Shared desktop rules

- Keyboard efficiency matters more than on mobile.
- Dense information layouts are acceptable if hierarchy stays clear.
- Windowing, focus, and menu behavior should feel native.

### Windows

- Respect system theme and high-contrast support.
- Do not break expected title-bar or window-management behavior.
- Pointer-friendly controls may be smaller than touch controls, but touch mode should still be usable.

### macOS

- Preserve standard menu, shortcut, and window expectations.
- Avoid modal-heavy flows where non-modal inspection is more natural.
- Do not break standard copy/paste/undo/find conventions.

## CLI

- Optimize for scanability and command confidence.
- Keep output structured and predictable.
- Use concise labels, clear status, and recoverable error messages.
- Color must not be the only meaning carrier.
- Important actions should remain discoverable without memorizing hidden flags.

## States

Every key surface should account for:

- default
- loading
- empty
- error
- success or completion confirmation when relevant

## Dark Mode

- Treat dark mode as a separate design pass, not an inversion.
- Re-check contrast, semantic colors, overlays, and images.
- Avoid pure black unless the product explicitly needs it.

## Motion

- Typical UI transitions should stay short and purposeful.
- Prefer roughly 100-300 ms for common transitions.
- Respect reduced-motion preferences.
- Motion should explain change, not delay access.
