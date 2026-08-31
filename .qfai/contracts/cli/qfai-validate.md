# CLI Contract: `qfai validate`

- Contract scope: public CLI surface for spec / contract / assistant-tree / work-log validation
- Owning spec: `spec-0004`
- Used-by: `spec-0003` (post-init self-check), all skill specs (gate evidence)
- SSOT modules:
  - `packages/qfai/src/cli/commands/validate.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/core/validators/worklogSurface.ts` (work-log entry
    frontmatter parsing and link-integrity check; both are private helpers of
    this single module — there is no `core/worklog/` directory. A split into
    dedicated `parseEntry` / `validateLinks` modules is an intended future
    decomposition, not a location that exists today)
  - `packages/qfai/src/core/validators/reviewerGate.ts` (Reviewer-Gate inputs)
  - `packages/qfai/src/core/validators/reviewerJustification.ts`
    (Reviewer-Gate `R-*` justification outputs)

## Existing public surface

This contract documents only the **delta** from the assistant-layer recut and the work-log surface introduction. The rest of `qfai validate`'s existing flags, profiles (`sdd`, `prototyping`, `verify`, `discussion`), `--fail-on`, `--format`, `--report`, etc., are unchanged.

## New finding codes (this delta)

| Code                         | Severity                                               | Surface                                                                                                                                                                                                                                  | Source REQ                                                                              |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `W-WORKLOG-SCHEMA`           | warning                                                | `.qfai/steering/*.md` entry frontmatter is malformed (missing required field, invalid enum, broken YAML, etc.). Non-blocking.                                                                                                            | spec-0004 REQ-0035                                                                      |
| `R-WORKLOG-DRIFT`            | error (advisory-failing)                               | Reviewer Gate finding: fresh implementation output contradicts the direction of an open entry with `kind` in `{decision, risk, blocker, scope-down}`. Requires non-empty `justification:` field.                                         | spec-0004 REQ-0036 (impl); reviewer-input-bundle obligation: spec-0015 09_delta CHG-003 |
| `R-REJECTED-READOPT`         | error (advisory-failing)                               | Reviewer Gate finding: output adopts an option marked `Status: rejected` in the active spec's `07_Decisions.md`. Requires non-empty `justification:` field.                                                                              | spec-0004 REQ-0036 (impl); reviewer-input-bundle obligation: spec-0015 09_delta CHG-003 |
| `W-PENDING-PROMOTION`        | warning                                                | A `kind: decision` entry has non-null `promote-to` that is not yet satisfied. Surfaced in a dedicated section of the validate report.                                                                                                    | spec-0004 REQ-0037                                                                      |
| `D-DEPRECATED-PATH`          | warning (during window) / error (after sunset version) | An old-layout assistant-tree file path is referenced or present. Warning text MUST name the sunset version per spec-0003 REQ-0023.                                                                                                       | spec-0004 REQ-0040, spec-0003 REQ-0023                                                  |
| `W-WORKLOG-STALE`            | warning                                                | `.qfai/steering/*.md` entry with `status: active` has `updated` older than 90 days. Surfaced with entry ID + age in days.                                                                                                                | spec-0004 REQ-0038                                                                      |
| `W-WORKLOG-BROKEN-LINK`      | warning                                                | An entry's `links: [...]` element does not resolve to an existing artifact. Each element MUST be a string matching `spec-NNNN`, `discussion-*`, or any registered `<entry-id>` (kebab-case ASCII; no required prefix).                   | spec-0004 REQ-0039                                                                      |
| `R-HANDOFF-INCOMPLETE`       | error (advisory-failing)                               | Reviewer Gate finding: a `kind: handoff` entry body is missing one of the five required sections (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first`). | spec-0004 REQ-0042 (impl); reviewer-input-bundle obligation: spec-0015 09_delta CHG-003 |
| `W-SKILL-DOC-BROKEN-REF`     | warning (during window) / error (after sunset)         | A `qfai-*` SKILL.md references an assistant path that does not resolve in the current layout.                                                                                                                                            | spec-0004 REQ-0043                                                                      |
| `W-USER-EDIT-PRESERVED`      | warning                                                | `qfai init --upgrade-assistant-tree` encountered a collision and preserved the user-edited file at the old path; consumer MUST manually reconcile.                                                                                       | spec-0004 REQ-0044                                                                      |
| `W-ASSISTANT-LAYOUT`         | warning                                                | A directory under `.qfai/assistant/` is not in the canonical 4-layer enum (constitution / manifest / catalog / process) and not in the documented pre-recut allowlist (agents / skills / skills.local).                                  | spec-0004 REQ-0034 (4-layer enforcement)                                                |
| `W-SKILL-PROJECT-MEMORY`     | warning                                                | A `qfai-*` SKILL.md is missing the trailing `project_memory:` YAML block. Severity intentionally kept at warning (no sunset escalation in v1.9.0) to allow gradual consumer adoption; v1.10.0+ may revisit.                              | spec-0004 REQ-0041                                                                      |
| `I-ASSISTANT-LAYER-UNSEEDED` | info                                                   | A canonical 4-layer directory (`constitution/` / `manifest/` / `catalog/` / `process/`) has not been seeded yet. Informational only; `qfai init` seeds them.                                                                             | spec-0004 REQ-0034                                                                      |

A code belongs in this table only once a validator emits it, and
`packages/qfai/tests/integration/contractDeferralNotes.test.ts` enforces exactly that. It reads the **TypeScript AST** rather than searching the sources for the string, because a comment, a dead constant or a `code:` field on something that is not a finding all satisfy a text search. Each code must reach an emission in one of three shapes, in a module that is actually wired up: (1) it is the first argument of a discovered `Issue` factory — the shared `issue(…)` plus every local function taking the code as its first parameter — or the `code` of an object literal that also carries a `severity`, which is what makes it a finding rather than metadata; (2) it is a member of a gate the module _asks_ (`NAME.has(x)` / `NAME.includes(x)`) and that module hands a variable to a factory, which is how `reviewerJustification.ts` raises the codes it reads off a review report; (3) it is carried by a string a `cli/commands/*` module passes to a printer. The module must additionally be one `core/validate.ts` invokes or `cli/main.ts` imports. The work-log secret-scan hard block (secret content in a work-log entry) previously had a row here with no emitter, no wired scan and no owner, so it is not listed; its definition stays in `.qfai/specs/_policies/06_Glossary.md`, and the row returns together with the module that raises it.

## Reviewer-Gate input bundle

Reviewer subagents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) MUST be invoked with a structured input bundle containing:

1. Open work-log entries (`.qfai/steering/*.md` where `status` ∈ `{active, handoff}` and `scope` matches the current task — `global` or `spec-NNNN`)
2. The Decisions table from the affected spec's `07_Decisions.md`
3. The fresh implementation output under review

Each Reviewer finding emitted in the `R-*` family MUST carry a `justification:` field with non-empty content naming:

- (a) the entry ID or Decisions row ID that triggered the finding, and
- (b) the specific contradiction or re-adoption observed.

`qfai validate` rejects Reviewer reports whose `R-*` findings lack `justification:` content. This is the machine-checkable acceptance criterion that makes drift-checks advisory-failing rather than mute.

## Promote-gate surfacing

For each `kind: decision` entry with non-null `promote-to` that is not yet satisfied:

- The validate report includes a dedicated `## Pending Promotion` section listing entry ID, target spec, and one-line summary.
- The same finding is emitted as `W-PENDING-PROMOTION` for `--fail-on warning` consumers.

Promotion is satisfied when all three conditions hold (canonical SSOT shared with `worklogSurface.ts` and spec-0004 BR-0004-0019):

- A row exists in the **declared target** file (`promote-to: spec-NNNN/07_Decisions.md`) whose body cites the entry ID as a whole token, AND
- The entry transitions to `status: archived`, AND
- The entry frontmatter carries a non-empty `promoted-to:` back-ref. The value is the DR-ID (Decision Row identifier, e.g. `DR-3`) of the appended row; format validation of the DR-ID itself is left to spec-side gates so the worklog validator does not need to know per-spec DR numbering schemes.

## Backwards-compatible adapter

During the one-minor-release deprecation window (NFR-0002), `qfai validate` accepts both the pre-recut layout and the post-recut layout. Old-layout files trigger `D-DEPRECATED-PATH` (warning). At the named sunset version, the warning is escalated to an error, and the old-layout reader is removed in the next minor.

## Path SSOT enforcement

`packages/qfai/src/core/paths/assistantPaths.ts` is the sole producer of the assistant-tree path strings consumed by validators. Hard-coded path string literals matching `assistant/(steering|manifest|instructions|catalog|constitution|process)/` outside the SSOT module are rejected by the lint lane (NFR-0001).

## Profile-Suffixed Output (v1.9.1+)

OQ-0111 is resolved by `DR-0001-0008` (option A) in
`.qfai/specs/_policies/08_Decisions.md`. `qfai validate` writes a
profile-suffixed report per profile AND keeps a non-suffixed
`validate.json` pointer that always reflects the most recent run.

### Output paths

```
.qfai/report/validate-<profile>.json   # one per profile; never overwritten by a different profile's run
.qfai/report/validate.json             # always-latest pointer; explicit `profile: "<name>"` top-level field
```

- `qfai validate --profile prototyping` writes
  `.qfai/report/validate-prototyping.json` AND updates
  `.qfai/report/validate.json` with the prototyping run output (and
  `profile: "prototyping"` at top level).
- Subsequent `qfai validate --profile sdd` writes
  `.qfai/report/validate-sdd.json` AND updates
  `.qfai/report/validate.json` with the sdd run (and
  `profile: "sdd"` at top level). The prior `validate-prototyping.json`
  is **not** overwritten.

### Consumer rule

- Skills that scope by profile (e.g. `certify` scoping to
  prototyping) MUST read the profile-suffixed file
  (`validate-<profile>.json`) rather than `validate.json`. This
  guarantees the read returns the consumer's profile output even when
  a different profile was the most recent run.
- Consumers that only need the most-recent-run snapshot MAY read
  `validate.json` and inspect the explicit `profile` field to confirm
  the expected profile.
- `certify` MUST NOT silently re-run `qfai validate` to refresh the
  pointer (option B was rejected by DR-0001-0008; silent re-run hides
  upstream drift and obscures provenance).

### Deprecation window for `.qfai/output/validate.json`

The legacy path `.qfai/output/validate.json` (documented in pre-1.9.1
skill references such as `handoff.md`) is replaced by
`.qfai/report/validate.json`. During the deprecation window:

- Validators emit `D-DEPRECATED-PATH` (severity: warning) when the
  writer writes the legacy path during the deprecation window, OR
  when a post-sunset stale legacy file is observed on disk; the
  warning text names the sunset version per spec-0003 REQ-0023.
  Read-side tracking (warning when a downstream consumer reads the
  legacy path) is NOT implemented — consumers that still point at
  the legacy path see no file and SHOULD migrate.
- The current implementation writes only to `.qfai/report/`; readers
  that still point at `.qfai/output/` see no file and SHOULD migrate.
- **Sunset version**: qfai 1.10.0 (canonical npm `package.json#version`
  pin). At sunset, the warning escalates to error; the legacy reader
  / writer is removed in the following minor.

## Reviewer-Gate finding codes for the prototyping defect-remediation pack

In addition to the work-log Reviewer-Gate codes above, the
prototyping defect-remediation pack introduces two CI-lane
Reviewer-Gate finding codes per REQ-0102 / REQ-0113 / REQ-0125. Both
are severity **error (advisory-failing)** per OQ-0109 resolution
(DR-0001-0006) and mirror the `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT`
pattern (DR-0258).

| Code                        | Severity                 | Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Source REQ         |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `R-PROMPT-SCANNER-DRIFT`    | error (advisory-failing) | Reviewer Gate finding: a PR changes `findDesignMdViolations.ts` without a matching change to `generator-prompt.md` (or vice versa). The SSOT-sync invariant pair must change together. Requires non-empty `justification:` text naming (a) the file modified, (b) the counterpart file that lacks a corresponding modification, (c) the specific Tailwind contract clause whose match cannot be confirmed.                                                | REQ-0102, REQ-0125 |
| `R-CERTIFY-VERIFY-CIRCULAR` | error (advisory-failing) | Reviewer Gate finding: a PR reintroduces the certify ↔ verify cycle ("certify requires full verify PASS AND full verify requires ATDD/implement artifacts that cannot exist at the prototyping phase"). The check is structural: it asserts that (a) `certify` reads no validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, OR (b) the scoped-verify path (`verify.json#scope: "prototyping"` per DR-0001-0004) is used. | REQ-0113           |

`qfai validate` rejects Reviewer reports whose `R-PROMPT-SCANNER-DRIFT`
or `R-CERTIFY-VERIFY-CIRCULAR` findings lack a non-empty
`justification:`, mirroring the work-log Reviewer-Gate justification
contract above.
