## AC-0013-0012: Triage Table Cell Render-Parse Identity

Given a Stage 1 Triage row whose subject / rationale / spec name contains literal `\` (e.g. Windows path `C:\Users\...`, regex `\d+`), `|`, or embedded `\r` / `\n`, when the row is rendered to delta.md by `escapeTableCell` and re-parsed by `splitMarkdownRow`, then the parsed cell value equals the original input for `\` and `|` (literal `\` is persisted as-is; `|` round-trips through `\|` escape) and `\r\n` / `\r` / `\n` collapse deterministically to a single space.

