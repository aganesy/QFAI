# US-0001-0125: CSS token reference resolution

## User Story

As a designer, I want `scanFonts`, `scanRadius` and `scanShadow` to resolve `var(--token)` references against `:root` before judging safety, so that token-driven CSS does not produce false-positive `designMdViolations[]`.
