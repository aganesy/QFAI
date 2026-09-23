# CLI Contract: `qfai validate`

- Contract scope: public CLI surface for spec / contract / assistant-tree validation
- Owning spec: `spec-0004`
- Used-by: `spec-0003` (post-init self-check), all skill specs (gate evidence)
- SSOT modules:
  - `packages/qfai/src/cli/commands/validate.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/core/validators/reviewerGate.ts` (Reviewer-Gate inputs)
  - `packages/qfai/src/core/validators/reviewerJustification.ts`
    (Reviewer-Gate `R-*` justification outputs)

## Existing public surface

This contract documents only the **delta** from the assistant-layer recut. The rest of `qfai validate`'s existing flags, profiles (`sdd`, `prototyping`, `verify`, `discussion`), `--fail-on`, `--format`, `--report`, etc., are unchanged.

## New finding codes (this delta)

| Code                         | Severity                                               | Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Source REQ                                                                              |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `R-REJECTED-READOPT`         | error (advisory-failing)                               | Reviewer Gate finding: output adopts an option marked `Status: rejected` in the active spec's `07_Decisions.md`. Requires non-empty `justification:` field.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | spec-0004 REQ-0036 (impl); reviewer-input-bundle obligation: spec-0015 09_delta CHG-003 |
| `D-DEPRECATED-PATH`          | warning (during window) / error (after sunset version) | An old-layout assistant-tree file path is referenced or present. Warning text MUST name the sunset version per spec-0003 REQ-0023.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | spec-0004 REQ-0040, spec-0003 REQ-0023                                                  |
| `W-SKILL-DOC-BROKEN-REF`     | warning (during window) / error (after sunset)         | A `qfai-*` SKILL.md references an assistant path that does not resolve in the current layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | spec-0004 REQ-0043                                                                      |
| `W-USER-EDIT-PRESERVED`      | warning                                                | `qfai init --upgrade-assistant-tree` encountered a collision and preserved the user-edited file at the old path; consumer MUST manually reconcile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | spec-0004 REQ-0044                                                                      |
| `W-ASSISTANT-LAYOUT`         | warning                                                | A directory under `.qfai/assistant/` is not in the canonical 4-layer enum (constitution / manifest / catalog / process) and not in the documented pre-recut allowlist (agents / skills / skills.local).                                                                                                                                                                                                                                                                                                                                                                                                            | spec-0004 REQ-0034 (4-layer enforcement)                                                |
| `W-SKILL-PROJECT-MEMORY`     | warning                                                | A `qfai-*` SKILL.md is missing the trailing `project_memory:` YAML block. Severity intentionally kept at warning (no sunset escalation in v1.9.0) to allow gradual consumer adoption; v1.10.0+ may revisit.                                                                                                                                                                                                                                                                                                                                                                                                        | spec-0004 REQ-0041                                                                      |
| `I-ASSISTANT-LAYER-UNSEEDED` | info                                                   | A canonical 4-layer directory (`constitution/` / `manifest/` / `catalog/` / `process/`) has not been seeded yet. Informational only; `qfai init` seeds them.                                                                                                                                                                                                                                                                                                                                                                                                                                                       | spec-0004 REQ-0034                                                                      |
| `QFAI-SPACK-102`             | error                                                  | An open-question register declares `unadjudicated` for an entry: a decision a grilling session put to the user, which nobody answered. Read from the register's `## Open Questions` section, in the table, subsection and bullet notations alike. Unlike the `open` count it does not soften outside a release candidate — completing there records the agent's preference as the project's decision.                                                                                                                                                                                                              | The grilling rule; no spec row                                                          |
| `QFAI-SPACK-103`             | error                                                  | An open-question register is present and could not be read — a directory, a device or a pipe at the name, a link resolving to one, or a file past 4 MiB. The decisions in it were not checked, and an unreadable register is not a register with no questions in it.                                                                                                                                                                                                                                                                                                                                               | The grilling rule; no spec row                                                          |
| `QFAI-ATDD-134`              | error                                                  | The ATDD scan did not read every test its globs select: the glob matcher refuses a pattern in `validation.traceability.testFileGlobs`, a NUL byte being the known case; a directory a pattern reaches cannot be read, and the other patterns are still read; or the selection passes the file limit. A reference missing from what was read is not evidence that the tests hold none. Reported by `--profile atdd` and `--profile tdd`, which both run the scan. `QFAI-TRACE-124` reports a refused pattern under `tdd` and `full` as well.                                                                        | The ATDD stage gate; no spec row                                                        |
| `QFAI-CONTRACT-042`          | error                                                  | A `screens[]` entry in a UI contract no screen is read from: not a mapping, no `id` or `route`, an `id` an earlier entry of its contract has, or an `id` another contract states differently; or a `screens` that is not a list. Readers keep the first entry per `id` and skip the rest. Names the file and position, and for a repeated `id` the entry read instead.                                                                                                                                                                                                                                             | The UI contract reader; no spec row                                                     |
| `QFAI-ATDD-135`              | error                                                  | A directory the ATDD scan reaches cannot be read by the account running `qfai validate`: one under `paths.testsDir`, or under a package test directory a `validation.traceability.testFileGlobs` pattern selects. Reported by the `atdd`, `tdd` and `full` profiles, naming the directory. The scan reads past it, so the run finishes with its other results and the rest of each pattern is still read, but no test inside is counted: a coverage finding may name an obligation one of them carries. A failure that names no directory is `QFAI-ATDD-134` instead.                                              | The ATDD stage gate; no spec row                                                        |
| `QFAI-SKILLS-015`            | error                                                  | A skill's entry point carries no usable `name:` or `description:`, so a host does not register it and the user cannot invoke it by name. A name is usable when it is lowercase letters, digits and single hyphens, at most 64 characters, and the skill's own directory; a description is usable when it carries text, is at most 1024 characters, and has no `<` or `>`. A dot-prefixed directory directly under the skills root registers no skill, since the host lists none, and a document inside it is read only where a registered skill names it. Reported per entry point, in text and JSON output alike. | The host's own registration contract; no spec row                                       |

A code belongs in this table only once a validator emits it, and
`packages/qfai/tests/integration/contractDeferralNotes.test.ts` enforces exactly that. It reads the **TypeScript AST** rather than searching the sources for the string, because a comment, a dead constant or a `code:` field on something that is not a finding all satisfy a text search. Each code must reach an emission in one of three shapes, in a module that is actually wired up: (1) it is the first argument of a discovered `Issue` factory — the shared `issue(…)` plus every local function taking the code as its first parameter — or the `code` of an object literal that also carries a `severity`, which is what makes it a finding rather than metadata; (2) it is a member of a gate the module _asks_ (`NAME.has(x)` / `NAME.includes(x)`) and that module hands a variable to a factory, which is how `reviewerJustification.ts` raises the codes it reads off a review report; (3) it is carried by a string a `cli/commands/*` module passes to a printer. The module must additionally be one `core/validate.ts` invokes or `cli/main.ts` imports.

## Reviewer-Gate input bundle

Reviewer subagents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) MUST be invoked with a structured input bundle containing:

1. The Decisions table from the affected spec's `07_Decisions.md`
2. The fresh implementation output under review

A Reviewer finding requires a justification when its code is `R-REJECTED-READOPT`, another code this contract declares with a required `justification:`, or a code the justification catalog registers. Such a finding MUST carry a `justification:` field with non-empty content naming:

- (a) the Decisions row ID that triggered the finding, and
- (b) the specific contradiction or re-adoption observed.

`qfai validate` rejects Reviewer reports in which such a finding lacks `justification:` content. A finding in any other code raises no justification error, and neither does a code whose catalog registration `shipped-workflows.md` defers. This is the machine-checkable acceptance criterion that makes drift-checks advisory-failing rather than mute.

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

In addition to `R-REJECTED-READOPT` above, the
prototyping defect-remediation pack introduces two CI-lane
Reviewer-Gate finding codes per REQ-0102 / REQ-0113 / REQ-0125. Both
are severity **error (advisory-failing)** per OQ-0109 resolution
(DR-0001-0006) and mirror the `R-REJECTED-READOPT` pattern (DR-0258).

| Code                        | Severity                 | Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Source REQ         |
| --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `R-PROMPT-SCANNER-DRIFT`    | error (advisory-failing) | Reviewer Gate finding: a PR changes `findDesignMdViolations.ts` without a matching change to `generator-prompt.md` (or vice versa). The SSOT-sync invariant pair must change together. The prompt half is scoped to its `## Hard constraints (enforced by the compliance gate)` section, which is the part of that file stating the contract; an edit elsewhere in it pairs with nothing, and a missing heading counts as a change because the contract is then out of the guard's sight. Requires non-empty `justification:` text naming (a) the file modified, (b) the counterpart file that lacks a corresponding modification, (c) the specific Tailwind contract clause whose match cannot be confirmed. | REQ-0102, REQ-0125 |
| `R-CERTIFY-VERIFY-CIRCULAR` | error (advisory-failing) | Reviewer Gate finding: a PR reintroduces the certify ↔ verify cycle ("certify requires full verify PASS AND full verify requires ATDD/implement artifacts that cannot exist at the prototyping phase"). The check is structural: it asserts that (a) `certify` reads no validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, OR (b) the scoped-verify path (`verify.json#scope: "prototyping"` per DR-0001-0004) is used.                                                                                                                                                                                                                                                     | REQ-0113           |

`qfai validate` rejects Reviewer reports whose `R-PROMPT-SCANNER-DRIFT`
or `R-CERTIFY-VERIFY-CIRCULAR` findings lack a non-empty
`justification:`, mirroring the Reviewer-Gate justification contract above.
