# Surface Framing

## Purpose

Surface framing lets non-web products receive visual review through browser-captured prototypes.
The prototype still runs as HTML, but it should look like the intended surface.

## Surface Profiles

### web

- Use normal browser page layout.
- Include responsive desktop and mobile states when the UI is web-responsive.
- Avoid fake browser chrome unless it changes the product decision.

### mobile

- Present the UI inside a phone frame when the product is a mobile app.
- Include status bar, safe-area spacing, bottom navigation, tab bars, sheets, and touch-sized controls when relevant.
- Use a narrow viewport around 390px wide unless the UI contract says otherwise.
- Do not carry the phone frame into production unless the product itself renders a device preview.

### desktop

- Present the UI inside a desktop app window when the product is a desktop app.
- Include title bar, window controls, sidebar, toolbar, menu-like affordances, keyboard-friendly density, and resizable content behavior when relevant.
- Make repeated work surfaces compact and scannable.
- Do not carry OS chrome into production unless the product itself renders a window mockup.

### mixed

- Assign a surface profile per screen.
- Keep shared navigation concepts consistent, but do not force the same layout across unlike surfaces.

## Review Focus

Reviewers judge visual quality, IA, transitions, and state coverage inside the framed surface.
They must distinguish product UI from prototype-only chrome.
