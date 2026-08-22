# CLI Contract: `qfai init`

- Contract scope: public CLI surface for project initialization and assistant-tree upgrade
- Owning spec: `spec-0003`
- Used-by: `spec-0003`, `spec-0004` (path SSOT consumer), `spec-0011`, `spec-0014`
- SSOT modules:
  - `packages/qfai/src/cli/commands/init.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/core/assistantAssets.ts` (asset mirror copier)

## Public sub-commands

### `qfai init [--upgrade-assistant-tree]`

Initializes or upgrades the QFAI surface inside a consuming project.

#### Default (no flag)

Seeds a fresh consuming-project `.qfai/` tree from the embedded asset mirror.

Required outputs (created if absent; merged or refreshed if present per the existing init policy):

- `.qfai/assistant/constitution/**` — global invariants and protocols (drift-protocol, constitution, quality, distributed-surface, workflow, agent-selection, change-classification, requirements-decomposition, communication, thinking, shared-skill-{delegation,operating}-baseline)
- `.qfai/assistant/manifest/**` — machine-loaded routing/policy YAML configs (`agent-catalog.yml`, `agent-routing.yml`, `review-profiles.yml`)
- `.qfai/assistant/catalog/**` — reference materials, rule lists, and registry artifacts that humans read (`test-layers.md`, `review-gate.rules.yml`, `spec_required_files.json`, `manifest.md` template, `product.md`, `structure.md`, `tech.md`, `cli-ux-guidelines.md`, `ui-definition-protocol.md`)
- `.qfai/assistant/process/**` — workflow, methodology, `migrations/`
- `.qfai/assistant/agents/**`, `.qfai/assistant/skills/**` — unchanged from prior layouts
- `.qfai/steering/` (project-root work-log surface, NOT under `assistant/`) seeded with:
  - `README.md` (generic content, no internal IDs / version markers)
  - `.gitkeep`
  - `_templates/entry.md` (work-log entry template with frontmatter)

Reinit behavior (existing `.qfai/` present):

- `README.md` and `_templates/entry.md` are refreshed to the latest seeded version with a notice listing diffs.
- User-authored work-log entries (`.qfai/steering/*.md` that match the entry frontmatter schema with `id` matching filename stem) MUST NOT be overwritten.
- Collisions where the user-edited file lives at an old (pre-recut) path surface a `W-USER-EDIT-PRESERVED` finding via the validate gate (REQ-0013).

Exit codes:

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2    | CLI-arg error (unknown flag, malformed value)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 64   | I/O error (cannot read/write target tree)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 65   | Conflict — old-layout files present and `--upgrade-assistant-tree` not supplied while running on a layout the validator would reject. **Reserved — not emitted.** A fresh `qfai init` seeds the 4-layer tree alongside the legacy one, reports `D-DEPRECATED-PATH` (warning inside the window, error from the sunset — see below), and expects the user to opt in to `--upgrade-assistant-tree`. Exit 65 stays unimplemented deliberately: `--upgrade-assistant-tree` copies and never deletes, so exit 65 would name a remediation command that cannot clear it. Legacy presence is failed by `qfai validate`, which the deprecation contract charges with enforcement. |

#### `--upgrade-assistant-tree` (one-shot migration helper)

Relocates files from the pre-recut layout (`.qfai/assistant/instructions/*`, `.qfai/assistant/steering/*`, `.qfai/assistant/manifest/*`) to the post-recut layout (`constitution/`, `manifest/`, `catalog/`, `process/`) per the canonical relocation table.

Behavior:

- For each file in the relocation table, move the existing user-edited content to the new path.
- If a destination already exists with user edits, preserve the user-edited content and surface `W-USER-EDIT-PRESERVED` (REQ-0013).
- After the move, run `qfai init` default flow to refresh seeded README / template.
- Old paths are not deleted within the deprecation window (NFR-0002); they remain readable but emit `D-DEPRECATED-PATH` warnings during validate.

Required preconditions:

- `packages/qfai/package.json#version` is greater than the version that introduced the recut (referenced in `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md`).
- Working tree is clean OR `--allow-dirty` is supplied (recommended: clean working tree to allow simple rollback). **`--allow-dirty` NOT YET IMPLEMENTED in v1.9.0** — scheduled for v1.10.0+. Currently the helper proceeds without checking the working tree; users should ensure a clean state before invocation.

Exit codes (additional):

| Code | Meaning                                                                                                                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | All files relocated; user edits preserved with `W-USER-EDIT-PRESERVED` warnings as needed                                                                                                                                                                  |
| 64   | I/O error during relocation; pre-relocation state preserved                                                                                                                                                                                                |
| 65   | Cannot resolve relocation — old-layout file path not in the canonical relocation table. **NOT YET IMPLEMENTED in v1.9.0** — `classifyLegacySteeringEntry` currently has a `catalog` fallback for unknown files (does not exit 65). Scheduled for v1.10.0+. |

## Path SSOT enforcement

Both `init` and `validate` MUST read assistant-tree paths from `packages/qfai/src/core/paths/assistantPaths.ts` only. Hard-coded path string literals matching `assistant/(steering|manifest|instructions|catalog|constitution|process)/` outside the SSOT module are rejected by the lint lane (NFR-0001).

## Deprecation window

Old-layout file paths (under `.qfai/assistant/instructions/`, `.qfai/assistant/steering/`, `.qfai/assistant/manifest/`) remain readable for **exactly one minor release** after the recut ships (NFR-0002). The migration memo at `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` names both the introducing version and the sunset version.

The sunset is `SUNSETS.legacyAssistantSteering` in `packages/qfai/src/core/sunset.ts`, and every surface that reports the layout computes its severity from it: `qfai validate` escalates `D-DEPRECATED-PATH` to error, `qfai init` reports the same finding on stderr at the same severity, and `W-SKILL-DOC-BROKEN-REF` escalates alongside them. The readers keep accepting the old paths — per `qfai-validate.md`, the old-layout reader is removed in the minor _after_ the sunset, not at it — so `--upgrade-assistant-tree` still works and `init` still exits 0.

## Distributed-surface obligations

The seeded `.qfai/steering/README.md` and `_templates/entry.md` MUST pass `packages/qfai/scripts/check-no-internal-version-leakage.sh` (no `spec-NNNN` for N ≥ 10, no `vN.M[.P]`, no `CAP-0010+`, no `DEC-NNNN-NNNN`, no `DR-NNNN`, no `OQ-NNNN-NNNN`, no `QFAI-PROT2-NNN`, no `schemaVersion`). The work-log surface itself (`.qfai/steering/`) is NOT shipped in `packages/qfai/package.json#files`.

Neither seeded body is a static asset. `buildProjectSteeringReadmeBody` and `buildProjectSteeringEntryTemplate` in `packages/qfai/src/cli/commands/init.ts` build them in TypeScript, taking the `kind` enum from `WORKLOG_ENTRY_KINDS`, the `status` enum from `WORKLOG_ENTRY_STATUSES` and the mandatory handoff headings from `HANDOFF_REQUIRED_SECTIONS` (`packages/qfai/src/core/paths/assistantPaths.ts`), so those three lists cannot drift from the validator; the remaining frontmatter prose is illustrative and is not derived. They therefore ship as string literals inside `dist/` rather than as files under `assets/`. Two consequences when auditing the obligation above:

- The leakage guard reaches the two bodies only through `dist/`, so they are covered on the post-build guard run. The lint-only run skips `dist/` by design and says so (`WARN: ... skipped ... that are not on disk yet`), so a green lint-only run is not evidence that the seed was scanned.
- `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts` runs `qfai init` into a temp directory and scans the emitted tree with the same forbidden-class set, regardless of build state. It belongs to the `integration` vitest project (`packages/qfai/vitest.workspace.ts`), so it covers the seeded bodies only when that project — or the full suite — runs; a green `test:assets` or `e2e` slice alone does not scan the seed.
