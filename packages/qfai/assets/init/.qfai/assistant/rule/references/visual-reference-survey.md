# Visual Reference Survey

Read when one of these holds:

- the request is a whole-site redesign;
- the request is a new product that carries UI and has no adopted theme yet;
- the user asks for a survey of reference sites.

Any other UI change, a new screen or a restyle of one included, takes its
references from the design DNA intake alone and runs no survey.

The survey extends `.qfai/assistant/rule/research-first-protocol.md`. Every
site, and every listing that grades a site's acclaim, is one of its `sources`,
and every rule of that protocol still applies. A site's `published` is the
date of its acclaim evidence, such as the award or listing date. A site with no
dated evidence records the date it was observed, and the freshness warning
names it as undated.

## Contents

- Sample
- Acclaim
- Dedupe before counting
- What to record per site
- Findings
- Where findings land
- Storage

## Sample

Size the sample to the request. A whole-site redesign covers every stratum
below with at least three sites each. A larger sample is taken only when the
user asks for one.

| Stratum           | Holds                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `same-domain`     | Products that do the same job for the same users                   |
| `adjacent-domain` | Products in a neighbouring domain that solve a similar task        |
| `target-market`   | Sites in the target market's language and culture                  |
| `aspect-award`    | Sites recognised for one aspect, such as navigation, forms or type |

An `aspect-award` site is chosen for its named aspect, and only that aspect is
recorded from it. Overall spectacle is not a stratum.

Each site also has the role the design DNA intake gives a reference: a
`competitor` is consulted to differ from, and a `catalogue` to adopt from. A
`same-domain` site is a `competitor`.

## Acclaim

Each site records the strongest evidence of its acclaim. The listing or case
study is its own source, and the site cites its id.

| Level         | Evidence                                 |
| ------------- | ---------------------------------------- |
| `award`       | An award or jury listing                 |
| `gallery`     | A curated gallery that selected the site |
| `case-study`  | The maker's own case study               |
| `unconfirmed` | None found                               |

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
      role: competitor | catalogue
      acclaim: award | gallery | case-study | unconfirmed
      acclaim_source_id: string # the listing's sources[].id; none when unconfirmed
      copy_risk: low | medium | high
      template_policy: none | reference-only | implementation-seed
      home_sections: [string] # the home page's sections, in order
      components: [string] # the components the screens use
      colour: string # the colour system: palette, contrast, accent use
      typography: string # families, scale, line length
      motion: string # what moves, when and how long
      accessibility: [string] # findings, such as focus order or contrast
      avoid: [string] # what this site does that the product must not
```

## Findings

The survey ends in findings, not prose. Each finding states one decision about
one field, cites the sites it rests on, and says what was checked.

```yaml
visual_survey:
  findings:
    - id: string # VS-XXXX format
      kind: section-pattern | component | colour | typography | motion | accessibility
      statement: string # the decision, in the analyst's own words
      source_ids: [string] # the sites it rests on
      action: adopt | reject | defer
      reason: string # what was checked against the repository
      lands_in: design-md | ui-contract
```

- A finding rests on at least two sites, at least one of them at `award` or
  `gallery` level. A pattern only one site shows stays on that site's row.
- A `colour` or `typography` finding never rests on `competitor` sites alone:
  the brand departs from competitors, it does not copy them.
- A finding is applied only after it is checked, as the protocol's rule for an
  external source says. Its `reason` names what was read: the adopted theme,
  the current `DESIGN.md`, the current screens or UI contracts. A finding
  nothing was checked against is `defer`. Something a site does that the
  product must not do is a `reject` of the matching kind.

## Where findings land

| `kind`                           | `lands_in`    | Lands as                                                                                                         |
| -------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `colour`, `typography`, `motion` | `design-md`   | A point of the **Do** (adopt) or **Don't** (reject) subsection of `# Brand Philosophy`, never a `visual.*` value |
| `section-pattern`                | `ui-contract` | A screen's `structure` group, which serves one of its `primary_tasks`                                            |
| `component`, `accessibility`     | `ui-contract` | An element or action of the screen that uses it                                                                  |

Root `DESIGN.md` takes its `visual.*` values from the adopted theme, so a
survey changes no token. A section pattern that serves no task on the screen
does not belong on it.

The findings are put to the user as one question in the interview: adopt,
reject or revise each. The answer is one Interview row of the deliberation
record, with each adopted finding as an adopted point and each rejected one as
a rejected point, as the design DNA intake records any reference. That row
carries the findings to the stages that write `DESIGN.md` and the UI
contracts, so no later stage re-reads the survey.

## Storage

The `visual_survey` goes into the invoking stage's report beside the
`research_summary`, as that protocol stores it. What outlives the run is what
the findings landed in.
