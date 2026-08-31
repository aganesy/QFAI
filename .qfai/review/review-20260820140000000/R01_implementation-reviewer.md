# R01 — Implementation review

- **Verdict: REVISE**
- Reviewer: implementation-reviewer
- Round: 5
- Measured at: `90a33ee5` (HEAD when I finished). Started at `bc36f08c`; HEAD moved mid-review and
  `git diff bc36f08c..90a33ee5` is one added file, `review_request.md` itself. No artifact under
  review changed content, so every measurement below holds at either revision.
- `git status --porcelain` was empty at start and at finish. No mutations applied. Scratch work was
  done outside the repository (session scratchpad).
- Scope: `git diff 0cd866e9..bc36f08c`, focused on the classifier, the hygiene lane and the five
  test files named in the request.

## Gates I ran (read-only)

| gate                                                                                              | result             |
| ------------------------------------------------------------------------------------------------- | ------------------ |
| `node scripts/check-workflow-hygiene.mjs`                                                         | PASS, exit 0       |
| `vitest run --project scripts` on `ownWorkflowTopology`, `workflowHygiene`, `vitestWorkspaceKnobs` | 62 passed, 3 files |
| `vitest run tests/assets/actionPinBumpOwner.test.ts tests/assets/layerCiLaneMapping.test.ts`      | 15 passed, 2 files |
| the `detect` heredoc, extracted and executed over 21 synthetic path lists                         | see F2 and F3      |

Everything under review is green. Both MAJOR findings are things that are green and should not be.

---

## [MAJOR] F1 — the package.json scan added for L10 cannot detect the shape its own docblock names

- **Where:** `packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts:86-91` (the added member) and
  `:323-331` (the pattern that consumes it).
- **Traces to:** `defect:code-quality` — a claim added to close a review finding, which cannot fail
  for the cause it names. Same class as the `--no-renames` vacuity this round existed to fix.

**Issue.** The docblock justifies adding `package.json` to `RUNNER_FILES` with one concrete hazard:

> `vitest run --retry 2` added to a `test:*` script appears in no configuration file, so the scan
> returned zero results while the runner retried on every invocation of that slice.

The pattern the new member is fed to is `/\bretr(?:y|ies)\s*[:=]/i`, which requires a colon or an
equals sign immediately after the word. `--retry 2` has neither.

**How I established it** — the regex, run against the literal strings, not inferred:

```text
MISSED   "test:core": "vitest run --project core --retry 2"
CAUGHT   "test:core": "vitest run --project core --retry=2"
MISSED   "test:core": "vitest run --project core --retry  2"
MISSED   "test:e2e": "vitest run --project e2e --retry 3 --bail 1"
CAUGHT     retry: 2,
CAUGHT     // retry: 2,
```

**Why.** The space-separated form is the documented vitest CLI form and the one a person types. So
the member was added, the file is now read, and the one shape the docblock calls "the likeliest site
of all" still returns zero hits. `BR-0017-0052` is phrased as a search returning zero results; this
search returns zero results for a tree that retries.

The surface is also narrower than the argument. `RUNNER_FILES` is joined to `PACKAGE_ROOT`, so only
`packages/qfai/package.json` is scanned. Two other command lines exist and are unscanned:

- root `package.json:21,28` — `ci:coverage` and `test:assets`, which delegate into the package; a
  trailing `-- --retry 2` here is invisible.
- `.github/workflows/ci.yml:329` — `run: pnpm -C packages/qfai test:${{ matrix.slice }}`, the
  invocation CI actually executes. Appending `--retry 2` here is invisible.

If "the command line IS part of the runner configuration" is the principle, these are part of it.

**Suggestion.** Two alternations rather than one, because config syntax and CLI syntax differ, while
keeping the prose exclusion the existing comment earned:

```ts
const RETRY_SETTING = /\bretr(?:y|ies)\s*[:=]|--retr(?:y|ies)\b/i;
```

The `--retr` branch cannot match the configuration comment about retries (which is why the `[:=]`
form exists), and it catches all three spacings. Then add the root manifest and the CI workflow to
the scanned set, or state in the docblock that they are out of scope and why.

---

## [MAJOR] F2 — CR-20260820-0004's re-measured census narrows the residual to "prose", and the tree contradicts it

- **Where:** `.qfai/decisions/CR-20260820-0004-mirrors-are-documentation-only-but-two-tests-guard-them.md:95`
  ("executable files under `.claude/`, `.codex/`, `.instruction/` 0") and `:124-128` ("The remaining
  question is only about **prose**: a pull request that edits nothing but Markdown under ...").
- **Traces to:** `defect:correctness` — a factual claim in an artifact this round wrote, contradicted
  by the tree it describes.

**Issue.** The mirror trees hold 20 files that are neither Markdown nor executables, and they are
test-guarded. Counting tracked files under the four trees by extension:

```text
  68 md
  20 toml      <- 19 x .codex/agents/*.toml, plus .codex/config.toml
   2 ps1
```

`packages/qfai/tests/codex/agents.test.ts:9-13` resolves `REPO_ROOT/.codex` and asserts, over exactly
those TOML files: TOML parseability, file-count equality against
`.qfai/assistant/manifest/agent-catalog.yml`, and per-agent `name` / `description` equality against
the canonical frontmatter under `.qfai/assistant/agents/`.
`packages/qfai/tests/assets/reviewerVerdictVocabulary.test.ts:57` reads
`.codex/agents/completion-reviewer.toml` directly.

**How I established it.** I extracted the `detect` heredoc from `ci.yml` and executed it — the same
mechanism `runClassifier` uses — over the real paths:

```text
.codex/agents/completion-reviewer.toml   => full=false | reason=documentation-only: 1 path(s)
.codex/config.toml                       => full=false | reason=documentation-only: 1 path(s)
```

**Why.** Concrete scenario: a pull request edits one `description` in `.codex/agents/<id>.toml` and
nothing else. It diverges that file from the canonical frontmatter — the exact divergence
`agents.test.ts` exists to catch. It classifies documentation-only, so `test` is skipped, so
`agents.test.ts` never runs, and `ci-pass` reads `skipped` as passing. The divergence merges green.
That is the failure mode the CR asks the user to decide about, and the census the user will read says
the open half is "only prose", which puts these 20 files outside the decision.

The M4 code change itself is fine as far as it goes — the suffix list is correct for today's tree,
and only the two intended `.ps1` files are affected. The defect is the disclosure: the criterion
shipped is *suffix*, the criterion the CR measured by is *is it read by a test*, and the difference
is 20 files.

**Suggestion.** Correct the two sentences: the open half is "non-executable files under the mirror
trees", not "Markdown", and name the TOML population and `agents.test.ts` in the option A/B/C framing
so the user decides about the real set. No code change is needed for this finding — option A (move
the guard into the lint lane) already covers TOML once the census names it.

---

## [MINOR] F3 — the classifier reports the wrong reason for the ordinary source change

- **Where:** `.github/workflows/ci.yml:174-176`.
- **Traces to:** `BR-0017-0008` / `BR-0017-0009` (the classifier must name the reason) and Least
  Astonishment in `.github/instructions/principles.instructions.md`.

**Issue.** The executable test is placed before the documentation test, so it fires for *every*
recognized path with one of the nine suffixes — including paths nowhere near a documentation
directory. Measured, by executing the extracted program:

```text
packages/qfai/src/core/layerPolicy.ts   => full=true | reason=executable, not documentation whatever directory it sits in: packages/qfai/src/core/layerPolicy.ts
packages/qfai/tests/scripts/x.test.ts   => full=true | reason=executable, not documentation whatever directory it sits in: packages/qfai/tests/scripts/x.test.ts
eslint.config.js                        => full=true | reason=executable, not documentation whatever directory it sits in: eslint.config.js
packages/qfai/src/assets/foo.json       => full=true | reason=source path: packages/qfai/src/assets/foo.json
```

The decision is unchanged — `full=true` either way — which is why nothing reddened. The `reason`
output is now wrong for the dominant change class in this repository: it tells the operator the file
"sits in" a documentation directory. `reason` is a declared job output, and `TC-0017-0010` treats the
reason as the thing that makes an exclusion enforced rather than incidental, so degrading it is not
cosmetic.

**Why the ordering is nonetheless necessary.** The check must precede the documentation test, because
the documentation branch returns for non-documentation paths and falls through for documentation
ones; placed after, the executable branch would be dead for exactly the paths it exists for. The fix
is placement inside the documentation decision, not after it.

**Suggestion.**

```js
const isDocumentation = under(DOCUMENTATION_DIRS, file) || DOCUMENTATION_FILES.includes(file);
if (!isDocumentation) {
  return { full: true, reason: "source path: " + file };
}
if (executable(file)) {
  return { full: true, reason: "executable, not documentation whatever directory it sits in: " + file };
}
```

Same verdict for every path; the `.ps1` case keeps the `executable` reason `TC-0017-0010` asserts,
and source paths get their reason back.

---

## [MINOR] F4 — TC-0017-0079's new guard clause is vacuous in the same way H1 was

- **Where:** `packages/qfai/tests/assets/layerCiLaneMapping.test.ts:158-161`.
- **Traces to:** `defect:code-quality` (unfalsifiable assertion, the class L2 was raised about).

**Issue.** The replacement for the tautological `expect.soft(MAPPING).not.toBe(CATALOG)` is a pair.
The second half is sound. The first half is the guard that makes the second half meaningful:

```ts
expect.soft(loader, "the loader must resolve the catalog, or this claim is about the wrong file")
  .toContain(CATALOG);   // CATALOG === "test-layers.md"
```

It searches the whole of `layerPolicy.ts` for the literal, and the literal occurs five times outside
the resolution:

```text
packages/qfai/src/core/layerPolicy.ts
   4:  * `catalog/test-layers.md` describes itself as ...          <- JSDoc comment
  68:  "`catalog/test-layers.md` の `## Layer definitions` ..."    <- message string
  79:  const canonicalPath = path.join(assistantRoot, "catalog", "test-layers.md");   <- THE resolution
  80:  const legacyPath    = path.join(assistantRoot, "steering", "test-layers.md");
 104:  "`catalog/test-layers.md` の ... を確認してください。"       <- message string
 124:  "`npx qfai init` を再実行して `catalog/test-layers.md` ..."  <- message string
```

**How I established it.** By grep, then by reasoning the mutation through: change line 79 to
`path.join(assistantRoot, "catalog", "layers.md")` and the loader stops resolving the catalog
entirely. Claim 1 stays green on line 4 alone, and claim 2 stays green because the loader still does
not mention `test-layers-ci-lanes.md`. The guard whose whole job is to notice that the test is
pointed at the wrong resolution does not notice.

This is precisely the shape the comment three lines above says it is fixing — "asserted against the
LOADER rather than against another constant in this file". It is asserted against the loader's
*text*, which includes its prose.

**Suggestion.** Pin the resolution rather than the file contents, e.g.
`.toMatch(/path\.join\([^)]*"catalog",\s*"test-layers\.md"\)/)`, or export the resolved basename from
`layerPolicy.ts` and import it.

---

## [MINOR] F5 — TC-0017-0014's two replacement claims: one is not independently falsifiable, the other reddens on a hardening change, and TC-0017-0015 already does the work

- **Where:** `packages/qfai/tests/scripts/workflowHygiene.test.ts:258-275`; the row that subsumes
  both is `:484-517`.
- **Traces to:** `defect:code-quality` (L1's replacement is stronger than what it replaced but still
  not falsifiable in this tree), plus a false-red risk.

**Claim A** — `expect.soft({declared, reachable}).toEqual({declared, reachable: Math.max(declared, reachable)})` —
is `reachable >= declared` written obliquely: the `declared` field is compared to itself, so only the
`Math.max` field can ever differ. It is a strict improvement on `declared <= jobs.length`, which was
falsifiable by nothing. But `hasDeclaredPermissions` is `isRecord(entry.job) && "permissions" in entry.job`
and `hasReachablePermissions` is `"permissions" in job || "permissions" in workflow`
(`scripts/check-workflow-hygiene.mjs:153-155,168`), so declared is a subset of reachable by
construction. The single mutation that could break it — narrowing `hasReachablePermissions` to the
workflow level — does not redden it in this tree, because `ci.yml:14` and `release.yml:55` both carry
a top-level `permissions:` block, so every job stays reachable through its workflow regardless. I
checked every own workflow for this.

**Claim B** — `expect.soft(reachable - declared).toBeGreaterThan(0)` — asserts a property of the
*live tree*: at least one job must inherit rather than declare. Giving every job its own explicit
`permissions:` block is a least-privilege hardening, and it would turn this row red with the message
"this row proves nothing about reachability". A strictly more compliant tree fails.

**And both are already covered.** `TC-0017-0015` (`:484-517`) imports both predicates from the lane
and pins the full two-by-two truth table on synthetic fixtures — `inheriting`, `declaring`,
`ungoverned` — including the exact boundary claim B reaches for: `reach(inheriting) === true` and
`decl(inheriting) === false`. Any single-point mutation of either predicate reddens there, on a
fixture, without constraining the live tree.

**Suggestion.** Replace claim A with the one-liner it means —
`expect.soft(reachable, "...").toBeGreaterThanOrEqual(declared)` — and delete claim B, citing
`TC-0017-0015` in the comment instead. That keeps the invariant readable and removes a false red on a
security improvement.

---

## [MINOR] F6 — DRY: this rework introduced three duplicates, two of them of things already in the same file

- **Traces to:** DRY in `.github/instructions/principles.instructions.md`; `CLAUDE.md` ("Follow
  existing code conventions and patterns").

1. `packages/qfai/tests/scripts/workflowHygiene.test.ts:667-669` adds `isPlainRecord`, whose body is
   **byte-identical** to `isRecord` at `:96-98` in the same file — same signature, same
   `typeof value === "object" && value !== null && !Array.isArray(value)`. Its JSDoc ("A non-array
   object, narrowed without an assertion") describes `isRecord` exactly. **Suggestion:** delete it and
   call `isRecord`.
2. `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts:655-662` adds `stepsOfJob`, identical to
   `stepsOf` at `:1467-1474` except for backticks in the error message; `buildJobSteps` at `:665-675`
   is a third variant of the same operation. The new docblock ("Used where the claim is about a job
   other than `test` or `build`") is not a distinction — `stepsOf` is already generic in `jobId`, and
   function declarations hoist, so it was available at the call site. **Suggestion:** call `stepsOf`.
3. `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts:816-832` (the new `TC-0017-0073` pin) is a
   verbatim 14-line copy of `TC-0017-0036` CLAIM 4 at `:1562-1579`: same `JSON.parse`, same `contexts`
   narrowing, same `.find`, same `expect(forBuild).not.toBeUndefined()`, same `toEqual([...LIST])`.
   The triangulation argument in the comment ("a shared constant would let one row's edit satisfy the
   other by construction") justifies keeping the **six literals** in three places; it does not justify
   copying the code that *reads* the declaration. **Suggestion:** extract
   `declaredVerificationSet(): unknown` and let each row supply its own expected literal list — the
   triangulation is preserved exactly. `TC-0017-0073` also hardcodes `"build"` where `TC-0017-0036`
   uses `REQUIRED_CONTEXT_NAME`.

---

## [NIT] F7 — the TDD-0008 claim strips `#` comments only, so a `//` line could produce a false red

`packages/qfai/tests/scripts/ownWorkflowTopology.test.ts:1109-1113`. The filter is
`!line.startsWith("#")`, applied to the whole `run` string — which contains the quoted NODE heredoc,
whose comments start with `//`. Today the claim is correct: the only other `git` mention in the step
is the JS string "git produced no output and no error text" (`ci.yml:196`), which does not contain
`git diff`. But adding a JS comment or string containing `git diff` inside the heredoc would make
that line a `diffCommand` lacking `--no-renames`, i.e. a red build caused by a comment. The fix for
the original vacuity was correct; this residual is its mirror image.

**Suggestion.** Cut the scan at the heredoc opener so only the shell portion is searched, or strip
lines beginning `//` as well as `#`.

---

## [NIT] F8 — the rebuild in declaration() silently drops fields the shipped declaration carries

`packages/qfai/tests/scripts/workflowHygiene.test.ts:670-697`, consumed by `editDeclaration` at
`:700-707`. The file `.github/required-status-contexts.json` carries a top-level `$comment` and, per
context, `why` and `verificationSetNote`. The rebuilt object holds only
`contexts[].{workflow, job, verificationSet}`, and `editDeclaration` serialises the rebuilt object
back to disk — so any planted tree that touches the declaration gets a stripped copy, where the
previous `parsed as Declaration` round-tripped the file.

No assertion changes today: `checkRequiredContexts` (`scripts/check-workflow-hygiene.mjs:489-496`)
reads exactly those three fields and nothing else, and I confirmed the affected rows green. So this is
behaviour-changed-but-harmless rather than a defect. Two reasons to tidy it anyway: the fixture no
longer resembles the file it stands for, and the narrowing is asymmetric on fail-fast — `workflow` and
`job` throw when malformed, while a malformed `verificationSet` silently becomes `[]`, which is the
one value M1 now treats as a violation.

**Suggestion.** Spreading the parsed object (`return { ...parsed, contexts };`) preserves unknown
fields with no loss of narrowing, and a non-array `verificationSet` should throw rather than be
substituted with `[]`.

---

## [NIT] F9 — the newly implemented row is missing from the annotation header of its file, and is appended out of order in the traceability list

`packages/qfai/tests/assets/actionPinBumpOwner.test.ts:47-53` lists seven `QFAI:SPEC-0017:TC-*`
annotations, but the file now holds eight `describe("TC-...")` blocks — the new `TC-0017-0065` at
`:350` has no header line. Every sibling file in this change set keeps the header one-to-one with its
describes (`layerCiLaneMapping.test.ts` lists exactly its seven).

No gate fails: `QFAI-ATDD-112` scans the configured `tests/integration/**` at the repository root,
`packages/qfai/tests/assets/**` is outside the scanned roots, and
`tests/integration/qfai-traceability.md:612` does register `TC-0017-0065`. But that registration is
appended after `TC-0017-0082`, breaking the ascending order the rest of the list keeps, and the
in-file header is the only map from the file to the ledger.

---

## Checked and fine — briefly, so the absence of a finding is not silence

- **The catch-clause narrowing** (`ownWorkflowTopology.test.ts:200-215`) is behaviour-preserving. The
  risk I looked for was `stdout` / `stderr` arriving as Buffers, which the old template literal would
  have stringified and `typeof x === "string" ? x : ""` would silently blank. `encoding: "utf-8"` is
  set on the `execFileSync` call at `:195`, so they are strings. A `status` of `null` (signal death)
  still maps to `-1` on both versions. The catch path is exercised green by `TC-0017-0002`,
  `TC-0017-0003` and `TC-0017-0005`, all of which assert on `output`.
- **The other narrowings** (`runOf`, `nodeWith`, the third lookup in `triggersOf`, `shipped`,
  `manifestScript`, `listHas`) are runtime-equivalent to what they replaced. The only other behaviour
  delta is that a non-string member of `package.json#files` is now filtered instead of throwing
  (`workflowHygiene.test.ts:395`), which is immaterial. The rebuild in `declaration()` is the one real
  delta — F8.
- **M1, M2 and M3 break no legitimate tree here.** `node scripts/check-workflow-hygiene.mjs` exits 0.
  For M3 specifically: `build` has no `needs:`, and the only two steps in it that carry `if:` are "Run
  qfai report (optional)" and "Upload qfai artifacts" — both deliberately outside `verificationSet`,
  as the `verificationSetNote` in the declaration says. M1 has no legitimate empty case:
  `readDeclaration` already rejects an empty `contexts`, and the anticipated move of the context to
  `ci-pass` fails property 2 on its unconditional-by-design `always()` regardless.
- **The parsing in TDD-0065 is not brittle in the direction that matters.** Every regex that can miss
  is guarded by a hard `expect(...).not.toBeNull()`, so a reshaped artifact reddens rather than
  passes. Both `adopted:` and `test files:` have exactly one match in the file, and the earlier "122
  test files" in the census block does not match the `test files:` pattern. `DECLARED_START = 10`
  occurs **once** in `packages/qfai/vitest.knobs.ts:53` with no comment copy, so CLAIM 3 is not
  vacuous — mutating the constant reddens both this row and `TC-0017-0067`. The recorded 122 files
  matches the current count under `tests/core` exactly.
- **The suffix list is correct for today's tree.** Across the four documentation trees, exactly two
  tracked files carry any of the nine suffixes, and both are the intended PowerShell scripts. No
  documentation file is misclassified by suffix. The gap is the non-executable members named in F2,
  not the list.
- **The other added claims are falsifiable.** CLAIM 3b of `TDD-0036`, the gutted-tree row of
  `TDD-0046`, the hollow-set row of `TDD-0057`, the conditional-step row of `TDD-0059`, the equality
  pin of `TDD-0073` and the executable claim of `TDD-0010` each name a production branch that exists,
  and each plant is protected from silently no-opping by the staleness guards in `editWorkflow`
  (`:474-482`) and `editDeclaration` (`:700-707`). A stale needle throws rather than passing.

## Residual risks

1. **The tolerance in CLAIM 6 of TDD-0065 is not calibrated to the conclusion it protects.** The row
   admits a plus-or-minus 20 percent swing in the file count under `tests/core` — 24 files — while the
   adopted value rests on a 0.85 percent margin (1.13s of 132.94s). The arithmetic in CLAIM 5 is over
   numbers frozen in the artifact, so it can only fail if someone edits the artifact; nothing forces a
   re-measurement as the tree grows. The row is honest about being a same-project check, but a reader
   can take CLAIM 5 as live. Consider 10 percent, matching the margin in the rule, or a recorded
   re-measure trigger. Advisory: `EX-0017-0049` requires the artifact and the ten-percent relation,
   not a tolerance, so this is not a defect against upstream.
2. **M3 versus a matrix required context.** If the required status context ever moves to a matrix job
   — which the `why` block in the declaration anticipates as possible — every step in the `needs`
   closure guarded by a matrix condition would be rejected as conditional, and that is the normal
   idiom for a matrix job (`ci.yml:317-318` already uses it). No impact today; `build` is not a matrix
   job.
3. **M2 with `--root` pointed at a tree without the shipped assets directory** now fails. Not
   reachable in practice: the lane resolves `yaml` through `packages/qfai/node_modules` by relative
   path, so it only runs inside this repository or a full copy of it.

## Advisory / Change Request proposals

None new. F2 is a correction to an existing Change Request (`CR-20260820-0004`), not a new obligation:
the underlying rule question is already open there, and what I ask for is that its census describe the
tree accurately before a user decides between its options.
