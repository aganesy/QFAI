# R01 — implementation-reviewer, round 6

- Verdict: **REVISE**
- Reviewed revision: `1ba7aecd` at start and at finish; HEAD did not move
- `git status --porcelain`: empty at start and at end
- Mutations applied: none

> **Filed by the orchestrator, not by the reviewer.** This agent deliberately wrote no file inside
> the repository — creating one would have made `git status --porcelain` non-empty for the two
> reviewers still running, which the round-6 request told all three to treat as a finding. It
> returned the report inline and formatted for verbatim filing. That is stricter than the
> instruction it was given, and it was right: the round-5 request said "no mutations" and then the
> orchestrator itself edited five files mid-run.
>
> The text below is the reviewer's, transcribed. Its oracles ran in an out-of-repo scratch directory
> against read-only copies obtained with `git show` / `cp`, never against the working tree.

## Suites run read-only at HEAD

`tests/scripts/vitestWorkspaceKnobs.test.ts` + `tests/assets/layerCiLaneMapping.test.ts` — 12 tests.
`tests/scripts/workflowHygiene.test.ts` + `tests/scripts/ownWorkflowTopology.test.ts` — 57 tests. All
green. `prettier -c` and `eslint --max-warnings 0` clean on all five changed code files.

**Scope note from the reviewer:** `TC-0017-0014`'s new claims came from `5ce34ff5` and
`TC-0017-0073`'s pin from `05778274`, both before `90a33ee5` — round 4's rework, not round 5's.
Reviewed anyway because the request named them.

## Findings

Four blocking. Two are the same defect class rounds 4 and 5 found — a repair whose new claim still
cannot fail — so the streak is four for four, and one of them is in the very claim rewritten
*because* it was a tautology.

### F-1 (High) — the loader-resolution check is green under the mutation it exists to catch

`packages/qfai/tests/assets/layerCiLaneMapping.test.ts:167`

```ts
const resolutions = [...loader.matchAll(/path\.join\(([^)]*)\)/g)].map((m) => m[1]);
```

`[^)]*` stops at the first `)`, so a resolution containing a nested call is captured as its own
prefix and its filename never enters `resolutions`. Measured over mutated copies of
`packages/qfai/src/core/layerPolicy.ts`:

| mutation                                                                     | expected | actual                                        |
| ---------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| `path.join(path.dirname(skillsDir), "catalog", "test-layers-ci-lanes.md")`   | RED      | **GREEN** — capture is `path.dirname(skillsDir` |
| `path.resolve(assistantRoot, "catalog", "test-layers-ci-lanes.md")`          | RED      | **GREEN** — site not matched at all            |
| `path.join(assistantRoot, "catalog", "test-layers-ci-lanes.md")` (flat)      | RED      | RED                                            |
| canonical renamed to `test-layers-v2.md`, legacy untouched                   | RED      | **GREEN** — the legacy site satisfies "at least one" |
| filename extracted to `const CATALOG_FILE = "test-layers.md"`               | GREEN    | **RED** — false positive on a behaviour-preserving refactor |

**Failure scenario:** someone adds per-level routing and writes
`const mappingPath = path.join(path.dirname(skillsDir), "catalog", MAPPING);`. The mapping document
becomes visible to the policy reader — the one thing `TC-0017-0079` CLAIM 2 exists to forbid — and
the row stays green.

**On strength:** "at least one resolution names the catalog" is under-strength precisely because the
loader has two sites. `layerPolicy.ts:79` is the canonical one the shipped layout uses; `:80` is a
legacy fallback. Requiring ≥1 lets the canonical one be renamed silently.

**Suggested replacement — stop reading text.** The file already imports from `../../src/core/`, and
`loadLayerPolicy` is exported. Call it against a temp `assistantRoot` holding both
`catalog/test-layers.md` and `catalog/test-layers-ci-lanes.md`, where the mapping declares a bogus
`layer-quantum` token, and assert `source === "policy-file"`, `tags` excludes the bogus token, and
`issues` carries no `QFAI-SPACK-091` drift. That is the invisibility property itself, immune to
`path.join` vs `path.resolve` vs a constant, and it removes the false positive above.

### F-2 (Medium) — the replacement for the L1 tautology is also unfalsifiable

`packages/qfai/tests/scripts/workflowHygiene.test.ts:258-275`, helpers at `:150-157`.

`hasReachablePermissions` is `"permissions" in job || "permissions" in workflow`;
`hasDeclaredPermissions` is its first disjunct. So `declared ⊆ reachable` holds by construction of
the two bodies and `declared <= reachable` can never fail. The
`.toEqual({ declared, reachable: Math.max(declared, reachable) })` form computes the expectation from
the actual, which is what hides it.

Measured over `.github/workflows/**`: `jobs = 12`, `declared = 4`, `reachable = 12`. Because
`reachable === jobs.length`, the new comparison is numerically identical to the
`declared <= jobs.length` tautology it replaced. Both mutations the comment at `:254-257` names come
out green on claim 2:

- `hasDeclaredPermissions` → `true` unconditionally: `declared = 12 <= reachable = 12` → GREEN
- `hasReachablePermissions` → workflow-only: `reachable = 12` still → GREEN

Claim 3 (`reachable - declared > 0`) catches the first. Claim 2 catches nothing.

**Claim 3 is a requirement on the tree no rule states.** With all 12 jobs declaring their own block,
`reachable - declared === 0` → RED. That is a security hardening, and the failure text invites
deleting a job-level block or editing the test.

**It is already implemented correctly next door.** `TC-0017-0015` at `:484-511` pins the
discrimination as a four-corner truth table over two synthetic fixtures, importing the lane's
exported predicates — which is what `EX-0017-0014` asks for. `TC-0017-0014`'s own expected result at
`06_Test-Cases.md:79` is only "the count of jobs with no reachable permission block is 0".

**Suggested:** drop both added claims, keep the ID-list claim.

### F-3 (Medium) — `editDeclaration` still strips the declaration's top-level `$comment`

`workflowHygiene.test.ts:707` and `:717`. Measured over the real
`.github/required-status-contexts.json`:

```text
artifact top-level keys   ["$comment", "contexts"]   ->  planted ["contexts"]
context keys              survive intact (F8's fix works at that level)
2692 bytes -> 1533; the 11-line $comment block is gone from every planted tree
```

The commit is titled "keep a planted declaration whole" and `:694-695` sets the standard — "a fixture
that quietly differs from the artifact it copies is still the wrong fixture". The repair meets it one
level down and not at the root.

### F-4 (Medium) — `isContext` asserts more than it verifies

`workflowHygiene.test.ts:672-679`. The predicate admits `undefined` and non-string members under a
type that promises `string[]`. `tsconfig.json` includes `src/**` only, so `tsc` never sees it, and
eslint does not flag it.

Measured: `declaration()` accepts `{"contexts":[{"workflow":"ci.yml","job":"build"}]}`, and
`declared.verificationSet[0]` then raises `TypeError: Cannot read properties of undefined`. So
`TC-0017-0059` would crash with a stack trace instead of failing its claim — and a declaration
omitting `verificationSet` is exactly the case `:777` says the lane reports.

### F-5 (Low-Medium) — the retry scan's workflow half is an indentation heuristic

`vitestWorkspaceKnobs.test.ts:344-348`; docblock claim at `:330-333` ("Prose cannot reach either").

Measured over the real `ci.yml` (542 lines): the filter selects 325 lines. Run-block lines missed:
**0** — the continuation-line worry does not materialise. But **69** selected lines are not run
content: `with:` / `env:` keys and values, and comment lines.

Measured false positives, injected into a scratch copy:

```text
          # never add --retry here; BR-0017-0052 forbids it      -> REDDENS
          retries: 3        (as a `with:` input)                 -> REDDENS
```

`ci.yml` is the most likely place to DOCUMENT the retry prohibition, and documenting it there turns
the lane red — the backwards incentive `:312-315` says this claim was rewritten to remove.

**What the repair got right, measured:** all three real command sites redden for both spellings —
`packages/qfai/package.json` `scripts.test`, root `package.json` `scripts.ci:gate`, and `ci.yml:332`.
Baseline hits `[]`. Scanning the root manifest is correct and load-bearing.

### F-6 (Low) — the scan omits `release.yml`, which runs the suite

`.github/workflows/release.yml:155` is `run: pnpm ci:gate`, and `ci:gate` contains
`pnpm -C packages/qfai test`. A `--retry 2` added there is unseen. Glob `.github/workflows/*.y?ml`.

### F-7 (Low) — the classifier repair is correct and completely unguarded

Measured by extracting the heredoc from both `90a33ee5` and `1ba7aecd` and running both programs over
20 path classes: **verdict changes 0**, reason-only, and only for executables. Ordering confirmed
right.

But all three surviving reason assertions pass under the pre-repair program: `/executable/i` matches
the old string too, and nothing asserts `"source path"`. Reverting the repair reddens nothing.

### F-8 (Low) — two manifests report under one label

`vitestWorkspaceKnobs.test.ts:351-352` pass `rel = "package.json"` for both roots, so a hit in the
root manifest prints indistinguishably from the package one.

### F-9 … F-12 (Nits)

- `workflowHygiene.test.ts:683-686` still says "Narrowed and REBUILT", eight lines above ":690
  VALIDATED in place, not rebuilt", and claims `verificationSet` is verified — which F-4 disproves.
- `ownWorkflowTopology.test.ts:655-664` `buildJobSteps` re-parses `ci.yml` for one job's steps; that
  is `stepsOf(BUILD_JOB)`. F6 removed `stepsOfJob` on exactly this reasoning.
- `workflowHygiene.test.ts:679/:680` — missing blank line between declarations.
- `workflowHygiene.test.ts:25-26` states "the baseline the spec records for this is 2 of 12 declare,
  4 of 12 reach". Measured at HEAD: **4 declare, 12 reach**.

## Where the reviewer found nothing

- `TC-0017-0073`'s pin to the declaration: sound and falsifiable in both directions.
- `declaration()`'s loop-then-`filter`: `filter` cannot silently drop a malformed context — same
  predicate, loop throws first. Only nit: evaluated twice per entry.
- F6's helper removal: `stepsOf` behaviourally byte-equivalent to the deleted `stepsOfJob`;
  `isRecord` equivalent to the deleted `isPlainRecord`. 57 tests green.
- The retry scan's continuation lines: zero run-block lines escape the filter.
- The classifier's ordering and verdicts: 0 verdict changes over 20 path classes.
- The `Blocked-By` migration: diffed cell by cell across both revisions. 82 rows before and after,
  one new column, **13** shared-cell changes total — `Status` and `DR-ID` for exactly
  `TDD-0016/0030/0032/0033/0034/0035`, plus `TDD-0012`'s Evidence rewrite. No other cell moved.
- `TDD-0069`/`TDD-0070` staying `todo`: reasoning holds, with one correction — `blocked` with an
  invented `Blocked-By` string would PASS validate, so the argument is about vocabulary, not about a
  validator error. Stated that way it is airtight.

## Can any row reach `done`?

Not from this reviewer's domain. `TDD-0079` held by F-1; `TDD-0014` by F-2; `TDD-0057`/`0058`/`0059`
by F-3 and F-4. All four repairable by the implementer without a decision.
