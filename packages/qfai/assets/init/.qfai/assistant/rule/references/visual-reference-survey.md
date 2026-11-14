# Visual Reference Survey

Read when the request is a redesign or a new product that carries UI, and its
direction rests on sites the user or the agent chooses as references. A change
to part of a screen does not run a survey; the research-first protocol already
scales to it.

The survey extends `.qfai/assistant/rule/research-first-protocol.md`. Every
site is one of its `sources`, and every rule of that protocol still applies.
A live site has no publication date, so its `published` holds the date it was
observed.

## Sample

Size the sample to the request. A whole-site redesign covers every stratum
below with at least three sites each; a larger sample is taken only when the
user asks for one.

| Stratum           | Holds                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `same-domain`     | Products that do the same job for the same users                   |
| `adjacent-domain` | Products in a neighbouring domain that solve a similar task        |
| `target-market`   | Sites in the target market's language and culture                  |
| `aspect-award`    | Sites recognised for one aspect, such as navigation, forms or type |

An `aspect-award` site is chosen for its named aspect, and only that aspect is
recorded from it. Overall spectacle is not a stratum.

## Acclaim

Each site records the strongest evidence of its acclaim.

| Level         | Evidence                                                     |
| ------------- | ------------------------------------------------------------ |
| `award`       | An award or jury listing, cited with its URL                 |
| `gallery`     | A curated gallery that selected the site, cited with its URL |
| `case-study`  | The maker's own case study                                   |
| `unconfirmed` | None found                                                   |

A `case-study` or `unconfirmed` site may add to a finding, but no finding rests
on it alone.

## Dedupe before counting

Remove duplicates before the sample is counted. Two entries are one site when
they share a registrable domain, when one redirects to the other, or when they
are the same product under another name in a second listing. Keep the entry
with the stronger acclaim evidence. The sample size is the count after this.

## What to record per site

Record the same fields for every site, so sites can be compared field by
field. A field the site does not show is recorded as `none`, not left out.

```yaml
visual_survey:
  sites:
    - source_id: string # its research_summary.sources[].id
      stratum: same-domain | adjacent-domain | target-market | aspect-award
      aspect: string # aspect-award only: the aspect it was chosen for
      acclaim: award | gallery | case-study | unconfirmed
      acclaim_url: string # the listing or case study; none when unconfirmed
      home_sections: [string] # the home page's sections, in order
      components: [string] # the components the screens use
      colour: string # the colour system: palette, contrast, accent use
      type: string # the type system: families, scale, line length
      motion: string # what moves, when and how long
      accessibility: [string] # findings, such as focus order or contrast
      avoid: [string] # what this site does that the product must not
```

## Abstraction

The survey ends in findings, not prose. Each finding states one decision,
cites the sites it rests on, and names where it lands.

```yaml
visual_survey:
  findings:
    - id: string # VS-XXXX format
      kind: section-pattern | component | colour | type | motion | avoid
      statement: string # the decision, in the analyst's own words
      source_ids: [string] # the sites it rests on
      action: adopt | reject
      lands_in: design-md | ui-contract | procurement
```

- A finding rests on at least two sites, at least one of them at `award` or
  `gallery` level. A pattern only one site shows is recorded on that site, not
  as a finding.
- `colour`, `type` and `motion` findings land in root `DESIGN.md`. A
  `section-pattern` finding lands in the UI contract's screen structure. A
  `component` finding lands in the procurement record of the region it
  realises (`.qfai/assistant/rule/ui-procurement.md`). An `avoid` finding is
  a `reject` that lands wherever the adopted rule it guards against lands.
- Each finding becomes an adopted or rejected point of its references in the
  deliberation record, as
  `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md`
  records any reference. That record carries it to the stages that write
  `DESIGN.md`, the UI contracts and the procurement record, so no later stage
  re-reads the survey.

## Storage

The `visual_survey` goes into the invoking stage's report beside the
`research_summary`, as that protocol stores it. What outlives the run is what
the findings landed in.
