# Research-First Protocol

QFAI's initial research protocol for `discovery-analyst`. Select the role by
its card ID and the resolved routing entry, as
`.qfai/assistant/rule/agent-selection.md` requires.

## Trigger

`/qfai-discussion` triggers this protocol. The resolved routing entry makes
`discovery-analyst` mandatory in its framing phase. Run it whether or not the
work includes UI.

## Output Schema

```yaml
research_summary:
  sources:
    - id: string # SRC-XXXX format (required)
      title: string # Source title (required)
      type: primary | secondary | external # defaults to external
      # when type: external
      url: string # URL
      published: string # YYYY-MM-DD
      # when type: primary / secondary
      locator: string # how to reach the source
      observed: string # YYYY-MM-DD, observation date
  best_practices:
    - id: string # BP-XXXX format
      category: string
      title: string
      description: string
      source_id: string # reference to sources[].id
  anti_patterns:
    - id: string # AP-XXXX format
      category: string
      title: string
      description: string
      source_id: string
  reflection:
    - source_id: string
      finding: string
      action: apply | reject | defer
      reason: string
```

## Freshness Rule

- For sources of `type: external`, at least 80% must be dated within the last 2
  years.
- Below 80%, issue a freshness warning.
- When an older source is included, state the reason, such as its historical
  importance.

Primary evidence has no publication date, so it is neither recent nor old. If the
observation date were counted as a publication date, such entries would always
count as recent and the ratio would measure nothing. The ratio therefore uses
only `external` sources as its denominator.

## Source Citation Rule

Every entry records two facts: **where the source is** and **when it is from**.
The `type` decides which field each goes in.

| `type`                  | Where it is | When it is from |
| ----------------------- | ----------- | --------------- |
| `external` (default)    | `url`       | `published`     |
| `primary` / `secondary` | `locator`   | `observed`      |

- Every entry records `id`, `title` and the two fields its `type` points to. A
  missing field in even one entry is a validation error.
- A missing `type`, or one whose value is not in the vocabulary, is treated as
  `external`. A `type` that cannot be read never loosens the obligation.
- Screenshots of a customer's current system, files supplied by the customer and
  conversation logs are `primary`. Aggregates computed from them are
  `secondary`. `url` and `published` are fields for published material and
  must not be filled in for anything that has not been published.

## Conflict Protocol

- When a new research result contradicts an existing BP/AP rule:
  - `reflection[].action: reject` — reject the new finding
  - `reflection[].action: defer` — postpone the decision
  - **No automatic overwrite**: never rewrite an existing rule automatically
- At least one `reflection[].action: apply` is required

## Storage

- `research_summary` goes to the invoking stage's own evidence when it is
  produced, and is carried into the artifact that consumes it when that artifact
  is authored. For `/qfai-discussion` that artifact is the pack's
  `04_Sources.md`, under its `## Research Summary` section.
- The evidence first, because a stage may hold authoring until something
  authorizes it. Writing the summary straight into the artifact creates the
  artifact, and a run cancelled before that authorization leaves it behind as
  the newest of its kind — which is what every later reader then picks up.
- Not persisted globally. The evidence belongs to the run that produced it.
