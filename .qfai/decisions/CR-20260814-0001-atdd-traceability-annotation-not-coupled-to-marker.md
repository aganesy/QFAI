# Change Request

- ID: `CR-20260814-0001`
- Title: `QFAI-ATDD-112 reads a hand-maintained annotation file that nothing couples to the test markers it stands for, so it certifies coverage in both false directions`
- Raised by: `/qfai-implement, spec-0006 TDD-0040 (group G6) — found by measuring the scanner's own scan record while repairing a blocking finding`
- Raised at: `2026-08-14T10:45:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (aganesy)` — via the /qfai-implement G6 stage gate: AskUserQuestion
- Approved at: `2026-08-17T00:00:00Z`
- Approved option: `A`
- Applied at: `-` — measurement taken 2026-08-23 (see below); the glob change is sequenced behind two prerequisites
- Superseded by: `-`
- Blocked set: `(none — no in-flight row depends on this; TDD-0031 / TDD-0040's own annotation debt is already repaired)`

## The measurement

`QFAI-ATDD-112` ("宣言 Level が指すディレクトリで参照されていない TC があります") resolves its scan
globs against the **repository root**. Read from the scanner's own output,
`.qfai/report/atdd-traceability/summary.json#scan`:

```json
{
  "matchedFileCount": 2,
  "truncated": false,
  "limit": 20000,
  "globs": [
    "tests/e2e/**/*.{feature,markdown,md,ts}",
    "tests/api/**/*.{feature,markdown,md,ts}",
    "tests/integration/**/*.{feature,markdown,md,ts}"
  ]
}
```

Two files match, and neither is a test:

```text
tests/e2e/qfai-traceability.md
tests/integration/qfai-traceability.md
```

Every executable test in this repository lives under `packages/qfai/tests/**`, which those globs cannot
reach. `tests/api/` does not exist at all. So the check's entire input is two hand-maintained markdown
lists of `QFAI:SPEC-NNNN:TC-NNNN-NNNN` / `US-NNNN-NNNN` ids.

Note the divergence from the _other_ traceability surface, which is configured correctly:
`qfai.config.yaml#validation.traceability.testFileGlobs` includes `packages/*/tests/**/*.test.ts`. Only
the ATDD scanner is root-scoped.

## Why it is a defect and not a configuration preference

Nothing couples an annotation line to the `// QFAI:SPEC-NNNN:TC-NNNN-NNNN` marker in the test that
actually discharges the TC. The check is therefore unsound in **both** directions:

- **False negative (observed, not hypothesised).** `SPEC-0006:TC-0006-0029` was discharged by a real,
  passing test that carries the marker — `packages/qfai/tests/integration/spec0006WorkflowsIntegrity.exitCode.test.ts:73`
  — and `TDD-0031` still landed at `c111555f` reporting GREEN while `QFAI-ATDD-112` went on naming that
  TC as unreferenced. It took a completion-reviewer's blocking finding two rows later to notice.
- **False positive (structural, by the same mechanism).** Adding a line to the annotation file clears the
  finding whether or not any test exists. The repair applied for `TC-0006-0029` was legitimate, and it is
  worth stating plainly that the gate could not have told the difference: `QFAI-ATDD-112`'s named-TC
  count moved `94 → 93` on a **one-line markdown edit**, with `counts` byte-identical either side
  (`info=4 warning=353 error=2`, exit 1).

A gate whose verdict a markdown edit can flip, independently of the tests, does not measure coverage. It
measures bookkeeping — while being reported and consumed as coverage.

## What does NOT already cover it, checked rather than assumed

- **`CR-20260807-0001`** (open) is about the _checkpoint criterion_ tolerating pre-existing cross-spec
  `error`s. It accepts the `error=2` baseline as a measurement boundary; it says nothing about whether
  the underlying check reads the right files, and would not be resolved by fixing this.
- **`validation.traceability.testFileGlobs`** does include `packages/*/tests/**`, but it feeds the
  `scMustHaveTest` gate, a different rule. `QFAI-ATDD-112`'s globs are separate and root-scoped.
- **`QFAI-TEST-001`** (forbidden `it.todo` stubs) reads `testFileGlobs`, so it is unaffected either way.

## The measurement option A required, taken 2026-08-23

Option A's own text says the backlog "MUST be measured before the option is chosen, not after ...
before any gate severity is committed to". The option was approved 2026-08-17 and the measurement was
never taken, which is why this record sat at `Applied at: -` for six days. Here it is.

**Method.** `paths.testsDir` was pointed at `packages/qfai/tests` in a scratch edit, `qfai validate
--profile full --fail-on error --root .` was run, and the config was restored. The scan follows
`testsDir`, so this is the widened read without touching `atddTraceability.ts`. Restoration verified by
`git diff --stat -- qfai.config.yaml` reporting nothing and the full profile returning to `exit 0`.

### The delta

|                           | today (root-scoped)    | widened to the real tree |
| ------------------------- | ---------------------- | ------------------------ |
| `--profile full`          | `error=0`              | **`error=19`**           |
| files the ATDD scan reads | **2** markdown ledgers | **129+** real test files |

### What the 19 are

Not one class. Counted by code:

| code                                       | count  | what it is                                                               |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| `QFAI-ATDD-102`                            | 13     | a `TC` annotation naming an id no spec declares                          |
| `QFAI-ATDD-101`                            | 2      | the same for `US`                                                        |
| `QFAI-ATDD-111` / `-112` / `-103` / `-104` | 1 each | coverage and placement, measured against real markers for the first time |

And by cause, which is the part that decides the sequencing:

- **12 findings are real.** `packages/qfai/tests/e2e/phraseGuardrails.test.ts:130` carries a genuine
  `// QFAI:SPEC-0006:US-0006-0014` naming a user story that does not exist. The current root-scoped
  scan cannot see it and never could. These sit across `spec-0001`, `-0004`, `-0006`, `-0011`, `-0012`
  and the `web-research` family — each owned by its spec, none by `spec-0017`.
- **5 findings are an artifact the option did not anticipate.** `atddScaffoldReachesTheGate.test.ts`
  and `atddScaffoldSkeleton.test.ts` are tests ABOUT the annotation scanner, so their fixtures contain
  annotation-shaped strings by construction — `{ "tests/integration/spec-0001/TC-0001.test.ts": "//
QFAI:SPEC-0001:TC-0001\n" }`. A scanner reading the real tree reads those as annotations.

### The marker population, classified

Because "19 errors" says nothing about how big the change is. Every `QFAI:` marker under
`packages/qfai/tests/{e2e,api,integration}`:

| position                      | markers | files | reading                                                |
| ----------------------------- | ------- | ----- | ------------------------------------------------------ |
| comment (`// QFAI:...`)       | **537** | 129   | real annotations, invisible to the scan today          |
| test title (`it("QFAI:...")`) | **80**  | 13    | also real — a deliberate convention in this repository |
| other string literal          | **19**  | **4** | the false-positive surface, and all of it              |

The false-positive surface is four files:
`atddScaffoldReachesTheGate.test.ts` (10), `atddScaffoldSkeleton.test.ts` (7),
`atddScaffoldEscalation.test.ts` (1), `shippedWorkflowShapeGate.test.ts` (1).

### What this changes about the recommendation

Option A is still right, and it is more tractable than the option text feared — the false-positive
class is four files, not a diffuse hazard. But it cannot land as a single edit: it takes
`--profile full` from `error=0` to `error=19` across six specs, and the fixture class needs a way for a
test about annotations to hold an annotation-shaped string without being read as one.

**Sequencing, so the next agent does not have to re-derive it:**

1. Give the scanner a way to skip a marker that is not an annotation — an ignore comment, an exclude
   list for the four files, or a rule that a marker inside a quoted string is not a marker. This is the
   only part that is a code change to `atddTraceability.ts`, and it must land first or step 3 reports
   five findings nobody can fix.
2. Clear the 12 real findings, spec by spec, in each spec's own stage. They are annotation debt: an id
   that does not exist is either a typo or a case that was renamed.
3. Only then widen the scan and commit to the gate severity.

**Not landed here.** Steps 1 and 2 are other specs' work, and landing step 3 alone would replace a
green pipeline with nineteen findings — the outcome option A's own "measure first" clause exists to
prevent. The measurement is the part that was owed and is now paid.

## Options (at least 3) and recommendation

### Option A — point the ATDD scanner at the real test tree (recommended)

Extend the scan globs to include `packages/*/tests/{e2e,api,integration}/**`, so the markers in the
executable tests are what the check reads. **Cost, stated because it is the reason this is a decision and
not a fix**: it will surface a large latent backlog in both directions at once — TCs currently "covered"
only by an annotation line lose that cover, while TCs currently reported as unreferenced but genuinely
markered are discharged. The net direction is not predictable from here and MUST be measured before the
option is chosen, not after. Recommend measuring it as part of the approval, e.g. by running the scanner
with the widened globs and reporting the delta, before any gate severity is committed to.

### Option B — keep the annotation files but couple them to the markers

Add a check asserting that every id listed in `tests/{e2e,api,integration}/qfai-traceability.md` is
carried by at least one marker under the configured `testFileGlobs`, and vice versa. Keeps the current
ATDD-112 semantics and closes both false directions with a new rule instead of a glob change. Cost: a
third traceability rule to maintain, and the annotation files stay as an intermediate surface that has no
purpose other than feeding a check.

### Option C — accept it and document the annotation files as a manual ledger

Rename the surface in the docs to say what it is — a hand-maintained assertion, not evidence — and stop
treating `QFAI-ATDD-112` as a coverage gate. Cost: the repository keeps a check that reads as coverage in
CI output and in every `qfai validate` run, and the next omission is found the same way this one was, by
a reviewer rather than by the gate.

**Recommendation: A, with the backlog delta measured before the option is applied.** It is the only
option under which the check's input is the artifact whose existence it claims to verify. B is a
defensible second if the annotation files must stay for reasons outside this slice.

## Blocked downstream items

**None.** `TDD-0031` / `TDD-0040`'s own annotation debt is already repaired, and the residual
`QFAI-ATDD-112` error is the pre-existing Stage 0 baseline that `CR-20260807-0001` governs.

| Item | Kind | Why it depends on the artifact |
| ---- | ---- | ------------------------------ |
| —    | —    | —                              |

- Not blocked by this CR: every row of the spec-0006 CHG-007 slice, and the spec-0008 / spec-0015 /
  spec-0017 queues.
- Overlapping open CRs: `CR-20260807-0001` (checkpoint criterion) and `CR-20260807-0002` (ledger
  carve-out). All three are independent — no option set changes another's artifact, and no row sits in
  two blocked sets in a way that makes the union stricter than any one alone.

## Impact scope

- Production: `packages/qfai/src/core/atddTraceability.ts` under Option A or B. Repository rule applies —
  all source changes carry test coverage, so `packages/qfai/tests/**` gains cases for whichever option is
  chosen.
- Config: `qfai.config.yaml` if the globs become configurable rather than hard-coded.
- Specs: none edited. Ledger rows: none reset. Contracts: none. Schema: none.
- Adopter-visible: yes under A or B — `qfai validate` findings change for every consuming repository
  whose tests do not sit at the repository root, which is the common layout. That makes the option choice
  a shipped-behaviour decision, not an internal cleanup.

## Decision needed from user

Choose A, B or C. Nothing in flight is blocked either way. The question is whether `QFAI-ATDD-112` should
read the tests it claims to be verifying, and if so, whether the resulting backlog is surfaced now
(A) or fenced behind a second rule (B).

## Approved actions (owner skill rerun plan)

Mode: **`confirm-only`** for the decision itself; the implementation is a normal `/qfai-sdd` +
`/qfai-implement` cycle because it changes production behaviour.

Under Option A:

1. Measure the delta first: run the scanner with the widened globs and record, per spec, which TCs gain
   and which lose coverage. Report before changing any severity.
2. Widen the globs in `packages/qfai/src/core/atddTraceability.ts`.
3. Add coverage under `packages/qfai/tests/**` for the widened resolution, including a case that a
   marker-bearing test under `packages/*/tests/**` is now seen.
4. Decide the disposition of the two root annotation files (retire, or keep as an additional input).
5. Fill this CR's `Status`, `Approved option`, `Approved by/at`, `Applied at` and `## Resolution`.

Under Option B, steps 2-3 target the new coupling rule instead. Under Option C, no artifact changes and
this CR closes with the chosen option and the documentation edit recorded.

## Resolution

**Option A approved 2026-08-17; not yet applied.** The approval decides the direction only. Its own
`## Approved actions` sets the mode to `confirm-only` for the decision and routes the implementation
through a normal `/qfai-sdd` + `/qfai-implement` cycle, because it changes production behaviour that
adopters observe. The user's stated priority at the same gate was to finish the in-flight spec-0006 rows
first, so the implementation is sequenced after them rather than folded into this slice — which also
keeps the `QFAI-ATDD-112` baseline stable while rows are still being measured against it. Step 1 of the
plan, measuring the per-spec delta of the widened globs, is the next action and is read-only.

**Scope question, flagged rather than decided here.** This CR was raised from a spec-0006 row, but its
subject is a repo-wide validator, its `Blocked set` is empty, and its effect spans every spec. Whether it
counts as "in scope for spec-0006" for that spec's completion gate — where an `approved` CR with an empty
`Applied at` reads as unresolved — is a `completion-reviewer` call, not the executing stage's, and it is
recorded here so the question is not settled by the stage that benefits from the answer.
