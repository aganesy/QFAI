# 04 Sources

## Source Registry

Repository facts follow `.qfai/assistant/skill/qfai-discussion/SKILL.md#reviewer-gate-must`.
Each fact names where it was read, beside the fact itself or by the `SRC-ID` of
the row that holds it. A row nobody cites leaves the reader to work out which
fact it backs, which is the check this registry exists for.

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | TBD   | primary | <link>     | YYYY-MM-DD | -     |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Research Summary

Storage slot for the `research_summary` output of
`.qfai/assistant/rule/research-first-protocol.md`. Replace every placeholder with the actual
protocol run; `npx qfai validate --profile discussion` reports `QFAI-RESEARCH-*` while they remain.
Never delete this heading to silence the gate: the current pack's `04_Sources.md` is required to
carry it, and its absence is reported as `QFAI-RESEARCH-016`.

Research-First Protocol output. Schema: `.qfai/assistant/rule/research-first-protocol.md`.
Replace every `[...]` placeholder with real research: validation rejects
bracketed `title` / `url` / `reason` values and requires `published` to be a
real `YYYY-MM-DD` date, so an unfilled block below reports errors rather than
passing.

```yaml
research_summary:
  sources:
    - id: SRC-0001
      title: [Reference title]
      url: [https://example.com/reference]
      published: YYYY-MM-DD
  best_practices:
    - id: BP-0001
      category: [Category this practice belongs to]
      title: [Best practice title]
      description: [What to do and when it applies]
      source_id: SRC-0001
  anti_patterns:
    - id: AP-0001
      category: [Category this anti-pattern belongs to]
      title: [Anti-pattern title]
      description: [What to avoid and why]
      source_id: SRC-0001
  reflection:
    - source_id: SRC-0001
      finding: [What the source implies for this project]
      action: apply
      reason: [Why apply / reject / defer was chosen]
```

## Exploration Direction Inputs

Record product intent and must-keep interactions for every UI-bearing pack.
For a visual-prototyping surface, also record brand signals and differentiation
targets. Use the user's interview decision or a `SRC-ID` from the Source
Registry as the source for each recorded statement. A reference observation
alone does not establish a user-owned brand decision.

An empty Statement means the input is missing. Leave Source or decision empty
until evidence exists, keep Status as `missing`, and open a matching row in
`11_OQ-Register.md`; a missing input cannot count as a completed pack. For a
cli-only or non-UI pack, mark an inapplicable row `not applicable` and cite
`01_Context.md#UI-bearing Classification` with the reason. Do not invent a
source, a brand trait, or a design choice to fill the table.

| Input                   | Statement | Source or decision | Status  |
| ----------------------- | --------- | ------------------ | ------- |
| Product intent          |           |                    | missing |
| Must-keep interactions  |           |                    | missing |
| Brand signals           |           |                    | missing |
| Differentiation targets |           |                    | missing |

## Design Anti-Goals

Record each rejected direction with its reason and a concrete cue that would
show it recurring in a prototype. Cite the decision or source that supports
the rejection. Add rows as needed. If the session has not established an
anti-goal, leave the fields empty, keep Status as `missing`, and register the
open question. Use `not applicable` only with a reason and the surface
classification or an explicit user decision.

| Rejected direction | Rejection reason | Recurrence cue | Source or decision | Status  |
| ------------------ | ---------------- | -------------- | ------------------ | ------- |
|                    |                  |                |                    | missing |

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

## Component Catalogue Registry

A competitor is consulted to differ from. A component catalogue is consulted
to adopt from, and the catalogues a screen's structure came from go here.
Each `reference` is a resolvable URL, repository path, or `SRC-ID`. State both
what was adopted and what was rejected, then explain the local translation.

Registered entries take the same three fields and are counted separately, so
a competitor cannot satisfy this registry or the reverse. The count is not
gated unless the project sets `uiux.catalogue_refs_min`; an entry that is
registered is held to all three fields either way.

### Reference: [Catalogue or block name]

- reference: [Catalogue URL, repository path, or SRC-ID]
- adopted_points: [What was taken from it — a page, a block, a component]
- rejected_points: [What was not taken and why]
- local_translation: [How it was re-bound to this project's tokens]

## Competitive Reference Registry

UI-bearing packs must register at least `uiux.competitive_refs_min` complete
references (default: 3). Three blocks are pre-seeded below; copy another
`### Reference:` block for each reference beyond that, and delete any block you
do not use only if the remaining count still meets the minimum.

Each `reference` is a resolvable URL, repository path, or `SRC-ID`. Use a
competitor to identify what this product should differ from. State adopted and
rejected signals separately and explain how any adopted point changes locally;
do not copy a competitor's surface as a template.

Every bracketed value below is a placeholder and counts as unpopulated — replace
all of them. `TBD`, `TODO`, `N/A`, and `-` are rejected the same way.

### Reference: [Product/Service Name 1]

- reference: [Product URL, repository path, or SRC-ID]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

### Reference: [Product/Service Name 2]

- reference: [Product URL, repository path, or SRC-ID]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

### Reference: [Product/Service Name 3]

- reference: [Product URL, repository path, or SRC-ID]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
