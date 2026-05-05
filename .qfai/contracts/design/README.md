# contracts/design (DESIGN.md-driven Prototyping Inputs)

## Purpose

Provide the SDD-frozen design SSOT for UI-bearing capabilities. Branding is decided once at the project level via the root `DESIGN.md`; this directory holds the SDD-managed lock file plus the post-loop artifacts produced by `/qfai-prototyping`.

`/qfai-discussion` drafts the root `DESIGN.md`. `/qfai-sdd` then validates and freezes it into `DESIGN.md.lock.yaml`. `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`, `/qfai-verify`, and `qfai validate` read these contracts plus the root `DESIGN.md` rather than discussion artifacts.

## Status After Init

After `qfai init`, this directory contains only this README and the schema files. This is the normal initial state. `/qfai-sdd` populates `DESIGN.md.lock.yaml` once a UI-bearing capability is normalized; `/qfai-prototyping` adds the post-loop artifacts on convergence.

The absence of design files is not a defect for non-UI capabilities. For UI-bearing capabilities, missing required files should be resolved in `/qfai-sdd` (lock) or `/qfai-prototyping` (post-loop artifacts).

## Required Files (UI-bearing capabilities)

The new SSOT layout is project-wide (one DESIGN.md per project, not per spec):

- `<project-root>/DESIGN.md` — single source of truth for brand identity (front-matter tokens + `# Brand Philosophy` body). Lives at the consuming-project root, not under `.qfai/`.
- `.qfai/contracts/design/DESIGN.md.lock.yaml` — SDD-frozen record (path, sha256, freeze timestamp, schema token list). Produced by `/qfai-sdd` Phase 0.
- `.qfai/contracts/design/design-system.yaml` — post-loop deterministic mirror of DESIGN.md tokens (no extraction from final HTML; pure mirror to prevent drift).
- `.qfai/contracts/design/prototype-handoff.yaml` — final iteration pointer + handoff metadata produced by `/qfai-prototyping`.

`/qfai-prototyping` records the DESIGN.md sha256 in `prototyping.json` at cycle 0 and exits with code 2 on subsequent cycles if the hash drifts. The `validate` profile enforces presence and lock integrity via `QFAI-DCON-030` (DESIGN.md presence), `QFAI-DCON-031` (lock parse), and `QFAI-DCON-032` (sha match).

## Legacy Artifacts (obsolete)

The pre-DESIGN.md exploration-first artifacts (`exploration-brief.yaml`, `reference-pool.yaml`, `brand-design.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `absorption-policy.yaml`, `selected-direction.yaml`) are no longer produced or read. Projects that still carry them on disk may delete them manually; they are orphan files with no current consumer.

## What This Directory Is NOT

- **Not** a replacement for specs or UI contracts (`.qfai/contracts/ui/*.yaml`)
- **Not** an excuse for downstream skills to read discussion-side artifacts directly
- **Not** the authoring location for brand identity — that is the root `DESIGN.md`
- **Not** a place to store iteration evidence; that belongs under `.qfai/evidence/prototyping/`
