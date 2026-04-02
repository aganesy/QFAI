# 04 Sources

## Source Registry

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | TBD   | primary | <link>     | YYYY-MM-DD | -     |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Trend Scan

<!-- Required for UI-bearing packs. Each trend entry must have all fields populated. -->

### Trend: [Trend Name]

- trend_id: TREND-001
- source: [URL or reference to the trend source]
- freshness_date: YYYY-MM-DD
- confidence: [high|medium|low]
- source_translation: [How this trend applies to the current project context]
- disposition: [adopt|reject|watch]
- notes_for_reviewer: [Any additional context for the reviewer]

## Competitive Reference Registry

<!-- Required for UI-bearing packs. Each entry must have all 3 fields populated. (QFAI-DDP-022) -->

### Reference: [Product/Service Name]

- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
