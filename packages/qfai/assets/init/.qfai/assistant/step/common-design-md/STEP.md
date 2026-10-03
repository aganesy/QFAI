---
name: common-design-md
owner: common
purpose: "Author the root DESIGN.md from the recorded design direction when it is missing, validate it, and check it again before anything is built from it."
requires: []
roles: [product-experience-architect, product-surface-reviewer]
routing-profile: ui-bearing
---

# common-design-md

Root `DESIGN.md` at `<consuming-project-root>/DESIGN.md` is the brand SSOT.
Everything downstream treats its tokens as exact: the prototyping loop records
its sha256 at cycle 0 and refuses a later change, and `certify` re-scans every
captured literal against them.

## When it applies

Only to a flow on a visual prototyping surface: its classified surface set —
`primary_surface` and every `secondary_surfaces` entry — names `web`, `mobile`,
`desktop` or `mixed`. A cli-only target has no root `DESIGN.md`; skip this step
for it.

## Reads

- The design direction the discussion recorded, as
  `.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#where-the-answers-come-from`
  lists it: `01_Context.md#Design Direction`, the reference registries in
  `04_Sources.md`, and the `uiux/` sidecars. For an imported tree, the surface
  recorded in the import-lite evidence.
- The schema and validation rules:
  `.qfai/assistant/skill/qfai-prototyping/references/design-md-spec.md`.
- The archetype catalog:
  `.qfai/assistant/skill/qfai-sdd/references/design-md-brand-catalog.md`.
- The starting sample:
  `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample`.

## Author and validate

1. **Stop on an unchosen brand.** A pack that records no design direction
   leaves the brand unchosen. Brand intent is `hard-required`: ask for it, and
   under `--auto` stop and name it. Never adopt the sample design.
2. **Write only when the file is missing.** `npx qfai init` seeds the sample and
   never overwrites it, and a project may have written its own. An existing file
   is validated as it stands; an unreplaced sample is refused.
3. **Author from the direction**, following
   `.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#output-mapping`:
   the intent fields first, then the archetype, then `brand.theme`, then the
   `visual.*` tokens taken from the named theme's published values
   (`.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#taking-the-values-from-the-theme`).
   Do not compose token values by taste.
4. **Parse and validate.** `parseDesignMd(text)` must succeed; pass its `data`
   to `validateDesignMd` and halt on any issue. Both are exported from the
   `qfai` package entry.

The retired per-aspect brand contracts are not regenerated; their content lives
in `DESIGN.md`
(`.qfai/assistant/skill/qfai-sdd/references/ui-design-contract-normalization.md#removed-yaml-contracts-permanent`).

## Check before building

Before anything is generated from `DESIGN.md`:

1. Run `npx qfai prototyping preflight --target-url <url>`, the alias of
   `npx qfai doctor --profile prototyping`. It reports whether root `DESIGN.md`
   exists, is not the unreplaced sample, and parses, and refuses while a UI
   contract screen has no primary task.
2. `npx qfai validate` reports the same file: `QFAI-DCON-030` when it is
   missing, `QFAI-DCON-033` when it does not parse, and `QFAI-DCON-034` while it
   is still the unreplaced sample.
3. On any of these, stop and fix `DESIGN.md` through § Author and validate.

Once a prototyping loop has started, `DESIGN.md` stays as cycle 0 recorded it.
To change it, edit it and start the loop again from cycle 0.

## Passes when

Read first: the flow's classified surface set and root `DESIGN.md`. The step
passes when the flow is not on a visual prototyping surface, or when root
`DESIGN.md` exists, is not the unreplaced sample, and parses and validates with
no issue. The pass names the surface set and the validation result.

## Writes

- Root `DESIGN.md`, only when it was missing.
- In the stage evidence: the source of each brand field and the validation
  result.

## Gate

`DESIGN.md` parses and validates with no issue, and no value was written that
the recorded direction or the named theme does not supply.
