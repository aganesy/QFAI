# QFAI Design Principles

This document is internal to package development; it is **NOT** shipped via
`qfai init`. It captures the structural principles established by the
prototyping refactor (RR §root-cause analysis), and that future contributions
must respect.

## P1. Mechanism over documentation

Every assertion in shipped templates (SKILL.md, references/\*.md) MUST be
backed by a runtime mechanism (validator, lint, gate). If something is not
enforced, it does not exist.

When SKILL.md says "Step 0: record execution-plan.json", a corresponding
validator MUST raise an issue when execution-plan.json is missing.

## P2. Single SoT per data category

For every data category, exactly one canonical source. All readers/writers
go through the same accessor. Writing data to a curated index file when the
authoritative source is the filesystem is forbidden — readers MUST scan the
filesystem (or call a helper that does).

Example: `report.md` aggregates round artifacts from
`.qfai/evidence/prototyping/rounds/<rN>/*.json` directly, not from
`prototyping.json.rounds[]`. The index is allowed to exist as a cache, but
it is not authoritative.

## P3. Package self-containment

QFAI is a package that gets installed into user repositories. Shipped
templates MUST NOT hardcode user-side specific spec / AC / TC / REQ IDs or
paths. The user's repo may have spec-0001, spec-0099, or no spec at all —
shipped templates must work for any state.

Enforcement: `npm run lint:shipping` (added in Phase 6) blocks
`\bspec-\d{4}\b`, `\.qfai/specs/spec-\d{4}/`,
`\b(?:AC|TC|REQ)-\d{4}-\d{4}\b` from `assets/init/**` and `src/**`
(excluding tests and the seed dir itself).

JSDoc traceability comments (`// spec-NNNN TC-NNNN-NNNN`) in `src/` are
allowed because they don't ship to user repos.

## P4. Wiring is part of the contract

When a new validator is added, it MUST be:

1. re-exported from `validators/index.ts`,
2. wired into the appropriate `runXxxValidators` function in `validate.ts`,
3. registered in the error-codes expected-message table in `cli/commands/validate.ts`.

Enforcement: `tests/unit/validators-are-wired.test.ts` (added in Phase 2)
fails CI if any validator export under `src/core/validators/` is not invoked
from the `validate.ts` symbol graph, which `tests/helpers/validatorGraph.ts`
walks on the TypeScript AST. "Exported" covers all three forms —
`export function validateX`, `export const validateX =` and
`export { local as validateX }`. Wiring means an identifier in value position:
a barrel re-export in `validators/index.ts`, an `import` declaration, a mention
in a comment or inside a string, and a call sitting in a sibling export that
nothing imports all fail to count — only a call or a registry reference does.
An aliased import (`import { validateX as runX }`) is credited to `validateX`,
so renaming at the import site is still wiring. The same test checks
obligation 1 across the whole tree. This is the primary defence against
the Phase 1.8.3 "executionPlan / delegationMap dead-code" failure mode.
Validators that were already dead, or already missing their barrel re-export,
when the guard was widened are grandfathered on the dated `PENDING_WIRING` /
`BARREL_EXPORT_EXEMPT` lists in that file; both lists may only shrink.

## P5. "Completion" is an artifact

The only way to claim that a prototyping run is complete is the existence
of a valid `.qfai/evidence/prototyping/completion-certificate.json` (Phase 4).
The certificate carries SHA-256 digests of every evidence file and is
generated only when validate / verify / reviewer signoff all pass.

`qfai validate --profile prototyping --fail-on error` PASS does NOT mean
"complete" — it means "validation gate cleared", which is one prerequisite.

## P6. Detect at six points of silence

The Phase 1.8.3 retrospective showed six layers all being silent at once
(build-lint, unit, pipeline-integration, E2E, runtime, audit). The refactor
ensures each layer has at least one preventive mechanism:

| Layer      | Mechanism (Phase)                                                                |
| ---------- | -------------------------------------------------------------------------------- |
| build-lint | `lint:shipping` (P6)                                                             |
| unit       | `validators-are-wired.test.ts` (P2)                                              |
| pipeline   | wired validators in `runPrototypingValidators` (P2)                              |
| E2E        | `prototypingE2E.test.ts`                                                         |
| runtime    | `validateDelegationMapIssues` / drift validators / `validatePrototypingEvidence` |
| audit      | `completion-certificate.json` digest verification (P4)                           |

When adding new code, the contributor must ask: "if this code is silently
broken, which layer detects it?" — and at least one layer MUST answer.

## P7. A new finding code ships behind a promotion window

A new rule is correct the day it ships and still lands on data written before
it existed. `TDDLIST_EVIDENCE_EMPTY` shipped straight at `error` and took a
consuming repository from 3 errors to 27 in one `qfai init` — 20 of them on
rows already at `done`, a status with no transition left that could re-observe
anything, so the upgrade latched that repository's gate for every row that had
not finished yet.

A new code therefore ships at `warning` and is pinned to a promotion release at
least one minor ahead of the release that introduces it:

1. declare the promotion in `core/sunset.ts#RULE_PROMOTIONS` — the mirror image
   of `SUNSETS`, which gives an old shape a window before it fails — recording
   both `introducedIn` and `promoteAt`, because the contract is the distance
   between them and the first is unrecoverable once the tool ships past the pin;
2. emit the finding through `newRuleSeverity(await resolveToolVersion(), …)`,
   never a literal `"error"` beside the `issue(...)` call;
3. name the ending release in the finding text, so `--fail-on error` keeps
   working while the operator can read the debt they are about to owe;
4. when the code can fire on rows that are already terminal, document how a
   terminal row satisfies it — otherwise the only remedy left is an
   out-of-lifecycle edit, which the Drift Protocol treats as drift.

Enforcement: `tests/core/sunsetLedger.test.ts` fails on either half-landed
state — a `RULE_PROMOTIONS` key with no consumer outside `sunset.ts` (declared,
never wired), and a finding code emitted by `src/` that is neither in the frozen
`tests/core/findingCodeBaseline.ts` nor named by a promotion entry (wired, never
declared). The emitting side is read through the constant a call site names, not
only through a bare literal, so the house `const FINDING_CODE = "…"` style
cannot walk past the ratchet. A third assertion checks the pin itself: a
promotion that is not a GA release would leave the finding a warning forever
under the conservative fallback, and one less than a minor past `introducedIn`
would be a window nobody can migrate inside of.
