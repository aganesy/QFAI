---
name: common-design-md
owner: common
purpose: "Author the root DESIGN.md from the recorded design direction when it is missing, validate it and freeze its hash into the lock, and check a DESIGN.md against that lock before anything is built from it."
requires: []
roles: [product-experience-architect, completion-reviewer, product-surface-reviewer]
routing-profile: ui-bearing
---

# common-design-md

Root `DESIGN.md` at `<consuming-project-root>/DESIGN.md` is the brand SSOT. Its
lock, `<paths.contractsDir>/design/DESIGN.md.lock.yaml`, records its sha256.
Everything downstream treats its tokens as exact: the lock hashes them, the
prototyping loop refuses a mismatched hash, and `certify` re-scans every
captured literal against them.

## When it applies

Only to a flow on a visual prototyping surface: its classified surface set —
`primary_surface` and every `secondary_surfaces` entry — names `web`, `mobile`,
`desktop` or `mixed`. A cli-only target has no root `DESIGN.md` and no lock;
skip this step for it.

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
- The lock shape:
  `.qfai/assistant/skill/qfai-sdd/templates/contracts/design-md-lock.sample.yaml`.

## Author and freeze

1. **Stop on an unchosen brand.** A pack that records no design direction
   leaves the brand unchosen. Brand intent is `hard-required`: ask for it, and
   under `--auto` stop and name it. Never freeze the sample design.
2. **Write only when the file is missing.** `npx qfai init` seeds the sample and
   never overwrites it, and a project may have written its own. An existing file
   is validated and frozen as it stands; an unreplaced sample is refused rather
   than frozen.
3. **Author from the direction**, following
   `.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#output-mapping`:
   the intent fields first, then the archetype, then `brand.theme`, then the
   `visual.*` tokens taken from the named theme's published values
   (`.qfai/assistant/skill/qfai-sdd/references/design-md-authoring.md#taking-the-values-from-the-theme`).
   Do not compose token values by taste.
4. **Parse and validate.** `parseDesignMd(text)` must succeed; pass its `data`
   to `validateDesignMd` and halt on any issue. Both, and `hashDesignMd`, are
   exported from the `qfai` package entry.
5. **Freeze.** Compute `hashDesignMd(text)` and write the whole lock file:
   `designMdPath`, `designMdSha256`, `frozenAt`, `schemaTokens`. Every freeze
   rewrites the file.
6. **Index it.** Add the lock YAML to `<paths.contractsDir>/contracts.md` in the
   same change.

The retired per-aspect brand contracts are not regenerated; their content lives
in `DESIGN.md`
(`.qfai/assistant/skill/qfai-sdd/references/ui-design-contract-normalization.md#removed-yaml-contracts-permanent`).

## Check against the lock

Before anything is generated from `DESIGN.md`:

1. Confirm root `DESIGN.md` and the lock both exist.
2. Run `npx qfai prototyping preflight --target-url <url>`, the alias of
   `npx qfai doctor --profile prototyping`. It parses `DESIGN.md`, compares its
   sha256 with the lock, and refuses while a UI contract screen has no primary
   task.
3. On a mismatch, stop. `DESIGN.md` is frozen for the run: to change it, edit
   it, rerun this step's freeze through `/qfai-sdd`, and start the loop again
   from cycle 0.

## Writes

- Root `DESIGN.md`, only when it was missing.
- `<paths.contractsDir>/design/DESIGN.md.lock.yaml` and its `contracts.md` row.
- In the stage evidence: the source of each brand field, the validation result
  and the frozen hash.

## Gate

`DESIGN.md` parses and validates with no issue, the lock's hash equals the
file's, the lock has its index row, and no value was frozen that the recorded
direction or the named theme does not supply.
