# Migrating to QFAI v1.8.4

## What changed (TL;DR)

v1.8.4 is a structural refactor of the prototyping skill triggered by
the v1.8.3 retrospective (`RR §8`). Most changes are internal, but
three categories may require user action:

1. **New ID-linkage validators may surface dangling refs in your
   existing `prototyping.json`.** They ship at **warning** severity in
   v1.8.4 (so `--fail-on error` still passes) and will become **error**
   in v1.9.0 after a one-release transition window.
2. **The prototyping skill no longer assumes `spec-0012` exists in
   your repo.** Set `qfai.config.yaml: prototyping.primarySpecId`
   explicitly OR add a marker (`surface_type: ui-bearing`) to your
   spec's frontmatter. Otherwise `qfai prototyping show-spec` returns
   "not found" and `round-start` exits 2.
3. **Six legacy custom-Issue exports were removed (BREAKING).** Only
   affects external code that imported them directly. In-repo callers
   were already migrated.

## Required actions

### 1. Set primary spec ID

If you previously relied on the implicit `spec-0012` assumption, choose
ONE of:

**Option A (explicit, recommended)** — add to `qfai.config.yaml`:

```yaml
prototyping:
  primarySpecId: "0012" # adjust to match your spec ID
```

**Option B (auto-detect)** — add to your spec's `01_Spec.md` frontmatter:

```markdown
---
surface_type: ui-bearing
---

# spec-0012
```

The marker scan picks the smallest matching spec ID. Verify with:

```bash
qfai prototyping show-spec
```

### 2. Clean up dangling refs (recommended before v1.9.0)

Run validate and review warnings:

```bash
qfai validate --profile prototyping --fail-on warning
```

You may see (warnings, not errors in v1.8.4):

- `QFAI-PROT-LINK-001`: `prototyping.json.specs[].specId` references
  a spec that no longer exists under `.qfai/specs/`. Common cause:
  spec absorption or rename history accumulated across runs.
- `QFAI-PROT-LINK-002`: `review-bundle.json.spec` references a
  missing spec.
- `QFAI-PROT-LINK-003`: candidate artifact directory is missing for
  a candidateId declared in `prototyping.json.rounds[]`.
- `QFAI-PROT-LINK-004`: polish cycle iteration directory is missing.
- `QFAI-PROT-REF-001`: an `xxxRef` string in `prototyping.json` /
  `review-bundle.json` / `breakthrough.json` points to a file that
  does not exist on disk.

### Cleanup options

- **Quick reset**: delete `.qfai/evidence/prototyping.json` and re-run
  the prototyping skill from a clean state. Loses run history.
- **Surgical edit**: open `prototyping.json` and remove `specs[]`
  entries with absorbed/deleted IDs; remove orphan `xxxRef` strings.
- **Wait until v1.9.0**: do nothing. v1.8.4 ships these as warnings,
  so CI passes. Plan to clean up before upgrading to v1.9.0 when
  these escalate to error.

### 3. External consumers of legacy exports (BREAKING)

If your code imports any of the following from `qfai`, switch to the
`*Issues` adapter that returns standard `Issue[]`:

| Removed                                                        | Replacement                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `validateExecutionPlan` / `ExecutionPlanIssue`                 | `validateExecutionPlanIssues(prototypingJson, prototypingJsonPath): Issue[]`                             |
| `validateDelegationMap` / `DelegationViolationIssue`           | `validateDelegationMapIssues(delegationMap, prototypingJsonPath): Issue[]`                               |
| `validateScreenshotDir` / `ScreenshotDirIssue`                 | `validateScreenshotDirIssues(scoringTrace, mode, prototypingJsonPath): Issue[]`                          |
| `validateLighthouseGate` / `LighthouseGateIssue`               | `validateLighthouseGateIssues(prototypingJson, prototypingJsonPath): Issue[]`                            |
| `validateIterationGate` / `IterationGateIssue`                 | `validateIterationGateIssues(iterations, prototypingJsonPath): Issue[]`                                  |
| `validateDesignSystemThreshold` / `DesignSystemThresholdIssue` | `validateDesignSystemThresholdIssues(packDir, prototypingRecord, prototypingJsonPath): Promise<Issue[]>` |

The adapters' messages, error codes (`QFAI-PROT-310/311/331/332/333/334`)
and rule names are now part of the public contract; the legacy custom
shapes are not.

## New CLI commands

- `qfai prototyping show-spec` — print the resolved primary spec ID
  and its `01_Spec.md` path. Useful when authoring SKILL.md /
  references.
- `qfai prototyping certify` — generate
  `.qfai/evidence/prototyping/completion-certificate.json` after
  every gate passes (validate.json error count = 0,
  verify.json status = PASS, reviewerGate.result = PASS,
  fullHarness.runId present).
- `qfai prototyping certify --check` — recompute evidence digests
  and verify them against the stored certificate. Non-zero exit on
  drift (evidence modified since certify).

The certificate is the single deterministic completion artifact in
v1.8.4. AI consumers should call `certify --check` before claiming
"DONE" — `validate PASS` alone is no longer sufficient.

## Deferred to v1.9.0

These items were planned but deferred to keep v1.8.4's PR scope
manageable:

- Full removal of the V1 lifecycle (`prototyping.json.iterations[]`,
  `cycle*` path helpers, V1 `buildReviewBundle` / `writeReviewBundles`).
  V1 schemas remain accepted by the validator but are not actively
  developed.
- Removal of the `prototyping.json.completionCertificate` block (the
  standalone `completion-certificate.json` artifact is now the SoT;
  the inline block is read but not written).
- Severity escalation of `QFAI-PROT-LINK-001..004` and
  `QFAI-PROT-REF-001` from warning to error.
- Phase 7 audit Medium gaps: spec frontmatter ref validation,
  `targetUrl` format validation, selected-direction / breakthrough
  ref design-contract cross-checks.

## Where to ask questions

If something on this page didn't cover your migration scenario,
file an issue at <https://github.com/aganesy/QFAI/issues> with:

- The exact error code(s) you're seeing
- A redacted slice of `prototyping.json` showing the offending entry
- Your `qfai validate` invocation
