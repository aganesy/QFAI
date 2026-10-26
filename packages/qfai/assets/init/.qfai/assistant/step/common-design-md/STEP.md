---
name: common-design-md
owner: common
purpose: "Author a missing root DESIGN.md or repair its authorized part from the recorded design direction, validate it, and check it again before anything is built from it."
requires: []
---

# common-design-md

Root `DESIGN.md` at `<consuming-project-root>/DESIGN.md` is the brand SSOT.
Everything downstream treats its tokens as exact: the prototyping reviewer
checks every literal of every iteration against them.

## When it applies

Only to a flow on a visual prototyping surface: its classified surface set —
`primary_surface` and every `secondary_surfaces` entry — names `web`, `mobile`,
`desktop` or `mixed`. A cli-only target writes no root `DESIGN.md` and leaves
any existing file unchanged; skip this step for it.

## Reads

- The design direction the discussion recorded, as
  `.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#where-the-answers-come-from`
  lists it: `01_Context.md#Design Direction`, the reference registries in
  `04_Sources.md`, and the `uiux/` sidecars. For an imported tree, the surface
  the import source names, or the user's answer.
- The questions behind those answers:
  `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md`.
- The schema and validation rules:
  `.qfai/assistant/skill/qfai-prototyping/references/design-md-spec.md`.
- The archetype catalog:
  `.qfai/assistant/skill/qfai-sdd/references/design-md-brand-catalog.md`.
- The starting sample:
  `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample`.
- The patterns that mark a design as generated, and their displacement table:
  `.qfai/assistant/skill/qfai-sdd/references/design-anti-patterns.md`. Read it
  for § Author and validate step 5.

## Author and validate

1. **Stop on an unchosen brand.** For initial authoring
   of a missing file, a pack that records no design direction leaves the brand
   unchosen. Brand intent is `hard-required`: ask for it, and under `--auto`
   stop and name it. Never adopt the sample design. For an existing valid file,
   validation and authorized repairs that preserve its brand and tokens
   require no new brand selection. A brand or token change needs the
   authorization and source values in step 2.
2. **Bound an existing-file repair.** Write a missing file from the recorded
   direction. For an existing file, SDD triage must name its exact path and the
   requested change, and a new WIP change request must authorize both. Apply
   only the authorized change; preserve existing brand and tokens unless their
   change is authorized and supported by recorded direction or named theme
   values. Stop without writing unsupported values. Without that authorization,
   validate the existing file without an overwrite; an inherited DONE row
   authorizes no new change. An unreplaced sample is refused.
3. **Author a missing file or the authorized fields of an existing file**,
   following
   `.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#output-mapping`:
   the intent fields first, then the archetype, then `brand.theme`, then the
   `visual.*` tokens taken from the named theme's published values
   (`.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#taking-the-values-from-the-theme`).
   Do not compose token values by taste. For a repair, record the source of each
   changed value and leave unrelated content unchanged. Validation without an
   authorized change writes nothing and does not repeat brand selection.
4. **Parse and validate.** `parseDesignMd(text)` must succeed; pass its `data`
   to `validateDesignMd` and halt on any issue. Both are exported from the
   `qfai` package entry.
5. **Check the finished file against the pattern list.** Review root
   `DESIGN.md` against every aspect of
   `.qfai/assistant/skill/qfai-sdd/references/design-anti-patterns.md` and its
   Displacement section. A token that prescribes a listed pattern fails unless
   `01_Context.md#Design Direction` asks for it. Name the pattern in the
   finding. For an existing-file repair, stop unless the authorized change
   includes its replacement. Replace the value and check the file again.

## Check before building

Before anything is generated from `DESIGN.md`:

1. Run `npx qfai doctor --profile prototyping --target-url <url>`. It reports
   whether root `DESIGN.md`
   exists, is not the unreplaced sample, and parses, and refuses while a UI
   contract screen has no primary task.
2. `npx qfai validate` reports the same file: `QFAI-DCON-030` when it is
   missing, `QFAI-DCON-033` when it does not parse, and `QFAI-DCON-034` while it
   is still the unreplaced sample.
3. On any of these, stop and fix `DESIGN.md` through § Author and validate.

Once a prototyping loop has started, `DESIGN.md` is read-only for it. To change
it, return to SDD for a triaged and authorized repair; the next iteration is
built from the validated result.

## Passes when

Read first: the flow's classified surface set and root `DESIGN.md`. The step
passes when the flow is not on a visual prototyping surface, or when root
`DESIGN.md` exists, is not the unreplaced sample, and parses and validates with
no issue and shows no listed pattern that the recorded direction does not ask
for. The pass names the surface set and the validation result.

## Writes

- Root `DESIGN.md`, when missing or only within an authorized existing-file
  change.
- In the stage report: the source of each brand field and the validation
  result; for a repair, the authorization and source of each changed value.

## Gate

`DESIGN.md` parses and validates with no issue, no value was written that
the recorded direction or the named theme does not supply, and no token
prescribes a pattern from `design-anti-patterns.md` that the recorded direction
does not ask for. An existing-file repair changes only its authorized part
and preserves unrelated content. A reviewer fails the gate by naming the pattern.
An unauthorized change also fails the gate.
