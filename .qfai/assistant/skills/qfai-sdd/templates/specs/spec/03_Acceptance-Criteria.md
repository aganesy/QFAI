# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001
Scenario: <scenario title>
  Given <precondition>
  When <action>
  Then <expected outcome>
```

## AC Catalog (optional)

| AC-ID   | Title   | Source      | Notes   | Priority |
| ------- | ------- | ----------- | ------- | -------- |
| AC-0001 | <title> | DAC-001-01  | <notes> | P1       |

> `Source` holds the originating discussion criterion ID (`DAC-NNN-NN`) verbatim, or `-` when
> the AC has no discussion ancestor. It is the only machine-checkable trace from the spec layer
> back to the discussion pack — do not paraphrase it into prose.
