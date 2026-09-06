# 04 Sources

## Source Registry

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | TBD   | primary | <link>     | YYYY-MM-DD | -     |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Research Summary

Research-First Protocol output. Schema: `constitution/research-first-protocol.md`.
Replace every `[...]` placeholder with real research: validation rejects
bracketed `title` / `url` / `reason` values and requires `published` to be a
real `YYYY-MM-DD` date, so an unfilled block below reports errors rather than
passing.

```yaml
research_summary:
  sources:
    - id: SRC-0001
      title: [Source title]
      url: [https://example.com/reference]
      published: [YYYY-MM-DD]
  best_practices:
    - id: BP-0001
      category: [Category]
      title: [Best practice title]
      description: [What to do and why]
      source_id: SRC-0001
  anti_patterns:
    - id: AP-0001
      category: [Category]
      title: [Anti-pattern title]
      description: [What to avoid and why]
      source_id: SRC-0001
  reflection:
    - source_id: SRC-0001
      finding: [What the source implies for this project]
      action: apply
      reason: [Why this action was chosen]
```

## Trend Scan

### user expectation / market norm

#### Entry 1

- reference: [Source name or URL]
- observation: [What user expectation or market norm signal was observed]
- decision_connection: [How the signal translates into this project]
- evaluation_connection: [How the signal should be evaluated in design review]
- local_implication: [What should change locally]

### product neighbor / comparable flow

#### Entry 1

- reference: [Source name or URL]
- observation: [What comparable product or flow signal was observed]
- decision_connection: [How the signal translates into this project]
- evaluation_connection: [How the signal should be evaluated in design review]
- local_implication: [What should change locally]

### platform convention

#### Entry 1

- reference: [Source name or URL]
- observation: [What platform convention signal was observed]
- decision_connection: [How the signal translates into this project]
- evaluation_connection: [How the signal should be evaluated in design review]
- local_implication: [What should change locally]

### accessibility / compliance relevant signal

#### Entry 1

- reference: [Source name or URL]
- observation: [What accessibility or compliance signal was observed]
- decision_connection: [How the signal translates into this project]
- evaluation_connection: [How the signal should be evaluated in design review]
- local_implication: [What should change locally]

### color

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What color trend or signal was observed]
- decision_connection: [How the color signal translates into this project]
- evaluation_connection: [How the color signal should be evaluated in design review]
- local_implication: [What color choices should change locally]

### typography

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What typographic trend or signal was observed]
- decision_connection: [How the typography signal translates into this project]
- evaluation_connection: [How the typography signal should be evaluated in design review]
- local_implication: [What typeface or scale choices should change locally]

### Visual

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What visual motif trend or signal was observed]
- decision_connection: [How the visual motif translates into this project]
- evaluation_connection: [How the visual motif should be evaluated in design review]
- local_implication: [What visual motif choices should change locally]

### spacing

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What spacing convention or density trend was observed]
- decision_connection: [How the spacing signal translates into this project]
- evaluation_connection: [How the spacing signal should be evaluated in design review]
- local_implication: [What spacing or density choices should change locally]

### shape

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What shape language trend was observed (border-radius, geometric vs organic, etc.)]
- decision_connection: [How the shape language translates into this project]
- evaluation_connection: [How the shape signal should be evaluated in design review]
- local_implication: [What shape-language choices should change locally]

### imagery

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What imagery or illustration style trend was observed]
- decision_connection: [How the imagery signal translates into this project]
- evaluation_connection: [How the imagery signal should be evaluated in design review]
- local_implication: [What imagery or illustration choices should change locally]

### design_guideline_research

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- guideline_name: [Applicable platform or library guideline family]
- rule_refs:
  - [Specific rule or section reference]
- local_translation: [How the guideline changes this project's local design decisions]
- evidence: [Concrete note, screenshot, or doc excerpt reference supporting the translation]

## Competitive Reference Registry

UI-bearing packs must register at least `uiux.competitive_refs_min` complete
references (default: 3). Three blocks are pre-seeded below; copy another
`### Reference:` block for each reference beyond that, and delete any block you
do not use only if the remaining count still meets the minimum.

Every bracketed value below is a placeholder and counts as unpopulated — replace
all of them. `TBD`, `TODO`, `N/A`, and `-` are rejected the same way.

### Reference: [Product/Service Name 1]

- reference: [Product/Service Name or URL]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

### Reference: [Product/Service Name 2]

- reference: [Product/Service Name or URL]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

### Reference: [Product/Service Name 3]

- reference: [Product/Service Name or URL]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
