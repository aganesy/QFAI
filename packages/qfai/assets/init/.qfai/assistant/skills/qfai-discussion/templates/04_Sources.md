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
- evaluation_connection: [Which TRD-XX axis evaluates this color signal; leave blank to trigger UIX-VAL-T01]
- local_implication: [What color choices should change locally]

### typography

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What typographic trend or signal was observed]
- decision_connection: [How the typography signal translates into this project]
- evaluation_connection: [Which TRD-XX axis evaluates this typography signal; leave blank to trigger UIX-VAL-T01]
- local_implication: [What typeface or scale choices should change locally]

### Visual

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What visual motif trend or signal was observed]
- decision_connection: [How the visual motif translates into this project]
- evaluation_connection: [Which TRD-XX axis evaluates this visual motif; leave blank to trigger UIX-VAL-T01]
- local_implication: [What visual motif choices should change locally]

### spacing

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What spacing convention or density trend was observed]
- decision_connection: [How the spacing signal translates into this project]
- evaluation_connection: [Which TRD-XX axis evaluates this spacing signal; leave blank to trigger UIX-VAL-T01]
- local_implication: [What spacing or density choices should change locally]

### shape

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What shape language trend was observed (border-radius, geometric vs organic, etc.)]
- decision_connection: [How the shape language translates into this project]
- evaluation_connection: [Which TRD-XX axis evaluates this shape signal; leave blank to trigger UIX-VAL-T01]
- local_implication: [What shape-language choices should change locally]

### imagery

#### Entry 1

- source_id: [SRC-ID from Source Registry]
- reference: [Source name or URL]
- observation: [What imagery or illustration style trend was observed]
- decision_connection: [How the imagery signal translates into this project]
- evaluation_connection: [Which TRD-XX axis evaluates this imagery signal; leave blank to trigger UIX-VAL-T01]
- local_implication: [What imagery or illustration choices should change locally]

## Competitive Reference Registry

### Reference: [Product/Service Name]

- reference: [Product/Service Name or URL]
- adopted_points: [What was adopted from this reference and why]
- rejected_points: [What was not adopted and why]
- local_translation: [How adopted points were adapted for this project]

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
