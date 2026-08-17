---
id: 2026-08-08-chg-007-spec-0006-upstream-handoff
status: active
kind: handoff
created: 2026-08-08
updated: 2026-08-17
scope: spec-0006
blocking: false
promote-to: null
links:
  - spec-0006
  - spec-0003
  - CR-20260807-0001
  - CR-20260807-0002
---

# CHG-007 spec-0006 — the upstream items this slice found and cannot fix

Written because two reviewers made the same demand twice, in the same words: the routed items and their
reasons live only in `.qfai/evidence/implement-spec-0006.md` and in reviewer prose, both of which are
**gitignored**, so "routed upstream" was unverifiable from version control. This entry is the handle.
Every item below is a measurement made during the slice, not a hypothesis, and none of them is
dischargeable by `/qfai-implement`.

## State of the task

spec-0006's CHG-007 slice has **twelve** ledger rows. Two are `done` (`TDD-0031`, `TDD-0040`, group
G6, closed 2026-08-17). Six sit at `refactor` with their micro-cycles complete — `TDD-0029`,
`TDD-0030`, `TDD-0032`, `TDD-0033`, `TDD-0038`, `TDD-0039` — and a 2026-08-17 review closure returned
`REVISE` on all six with **seventeen** findings, every one a record defect and not one a code defect:
reviewers re-measured each row green at HEAD. Four `todo` rows remain (`TDD-0034`..`TDD-0037`).

Three of this entry's items have since been discharged: item 14 (`TC-0006-0030` leg (b)) by
`CR-20260810-0001` Option A, applied 2026-08-17; item 7's two Change Requests are both approved and
applied. Items 1-6 and 8-13 stand.

## Next single action

Rebuild the six parked rows' per-item evidence **at HEAD** and re-review them. The findings are not
seventeen separate defects: they are one defect repeated — rows were reworked without refreshing their
per-item evidence, and the corrections landed under sibling `##` headings outside the anchor each
ledger `Evidence` cell points at. `TDD-0039` is the limit case, with no per-item section at all.

## Constraints to preserve

- **Edit a false statement where it lives.** Appending a correction elsewhere leaves the false sentence
  standing, and a reader who stops at the first one is misled exactly as much.
- **A closure is a literal command, never a count of selectors**, with full paths and no bare stems.
- **`vitest -t` is a regex.** A selector containing `(TDD-NNNN)` selects nothing and exits 0. Use the
  file-scoped form. Tracked as `CR-20260817-0001`.
- **Cap parallel suite execution.** Ten agents running `vitest` concurrently produced a false
  nondeterminism report against sound code; run serially it is deterministic four times out of four.
- **A shipped-prose edit needs the suite, not just the formatters** — `prettier`, `lint:md` and the
  leakage guard read no test.
- Do not read `refactor` as review-closed. `Status` spells both states the same way.

## Open questions

- `AC-0006-0026` and `BR-0006-0022` both state that a declined-only tree emits no finding at all. That
  is **false against the code**: `comparedCount > 0` still registers one check at severity `ok`.
  `TC-0006-0035` already says `ok`, so the TC is right and its AC/BR parents are wrong. Owner is
  `/qfai-sdd`; it blocks nothing today but `TDD-0037` implements against it.
- The literal zero-check case (no `workflows.integrity` check registered at all, on an empty provenance
  record) is asserted by a landed `it` under `TDD-0030` but stated in no TC's Verify. Candidate home:
  one bullet on `TC-0006-0028`.
- Whether `CR-20260814-0001` — repo-wide, raised from a spec-0006 row, `approved` but not applied —
  counts as in scope for this spec's completion gate. Flagged for `completion-reviewer`, deliberately
  not settled by the executing stage.

## References to consult first

- `.qfai/steering/2026-08-09-chg-007-implementation-standing-brief.md` — the operating rules this slice
  paid nine rework rounds to learn. Read it before writing any evidence or mutation.
- `.qfai/steering/2026-08-17-chg-007-spec-0006-review-closure-scope.md` — why the remaining work was
  estimated at four rows and is ten.
- `.qfai/evidence/implement-spec-0006.md` — per-row evidence; note that several rows' corrections sit
  outside their anchors, which is itself the defect under repair.
- `.qfai/contracts/cli/shipped-workflows.md` §3 — the closed state enum (`absent`, `adopter-owned`,
  `modified`, `declined`) that item 14 turned on.

## 1. `qfai-doctor.md` is stale in three ways, in one file

Owner: `/qfai-sdd --contract`. Non-blocking; three items to fix in one pass so `TDD-0037` inherits a
resolved contract instead of adjudicating one from an implementation row.

- **`:10-11` claims `core/doctor.ts` is a "single-file module — there is no `core/doctor/` directory".**
  That directory holds **five** modules: `autoremediate.ts`, `cleanReviewPacks.ts`,
  `skillManifestProbe.ts`, `staleTtl.ts`, `workflowsIntegrity.ts`. The claim predates CHG-007; the
  `workflowsIntegrity.ts` omission dates to TDD-0029.
- **The file's SSOT-module list omits `core/doctor/workflowsIntegrity.ts` and
  `core/doctor/skillManifestProbe.ts`**, even though `workflows.integrity` is the section it documents.
  Re-derive the list against all five modules, not just the two named here.
- **The emission table reads per-name**, so a declined-only tree emitting **one aggregate `ok` with zero
  `installed` names** is reconcilable only under an aggregate reading. Decide which reading is normative.

## 2. BR-0006-0018's newline-normalization clause is unfalsifiable by any test in the repository

Owner: `/qfai-sdd` Phase 2b (row seeding), then `/qfai-atdd`. Non-blocking.

Measured twice, once at row scope and once at closure scope: reducing `normalizeNewlines` to
`return text;` in `src/shared/text.ts` reddens **nothing**, including the full 18-selector closure. The
cause is structural, not an omission — `TC-0006-0028`'s Setup is 「TC-0006-0027 の手編集を戻し」, which
yields **byte-identical** files, and a byte-identical fixture answers identically under a
newline-normalized digest basis and a raw-byte one.

Closing it needs a **new TC with a line-endings-only fixture** (read the installed file,
`.replace(/\r\n/g,"\n").replace(/\n/g,"\r\n")`, write it back, assert no finding). That is additive, so
row-seeding rather than a Change Request. Writing the assertion from the implementation stage would be a
reviewer-originated hard obligation, which the drift protocol forbids — which is why it is here and not
in a test.

## 3. The contracts state a raw-byte digest basis where BR-0006-0018 requires a normalized one

Owner: `/qfai-sdd --contract`. Non-blocking; the code follows the business rule.

`shipped-workflows.md:117-118` keys its state table on `bytes == packaged` / `bytes != packaged`, and
`qfai-doctor.md:108` says "whose **bytes** differ". Neither file contains a `normaliz` / `CRLF` / 改行
token. So the normalized basis is attributable to **BR-0006-0018 alone**, and the contracts state the
opposite — a documented contradiction, not a silence. Recorded in the reader's header at
`src/core/doctor/workflowsIntegrity.ts`.

Related and distinct: `src/shared/provenance.ts` documents a recorded name that is present on disk with
no packaged digest as `modified` ("the conservative direction"), while BR-0006-0018 excludes the `extra`
bucket from drift. The code follows BR-0006-0018 and a named assertion in
`spec0006WorkflowsIntegrity.drift.test.ts` guards that side, so **if this is resolved the other way, that
row's test changes with it** — the difference between a documentation fix and a certified-row reset.

## 4. `TC-0006-0031`'s third Assert clause has no parent AC

Owner: `/qfai-sdd`. Non-blocking; settled as an `equivalent-mutant`, not an open question.

The clause requires the exit code to stay unchanged. `TC-0006-0031`'s `AC-Refs` is `AC-0006-0024` alone,
whose Gherkin has three clauses and **none is about the exit code**. Asserting it in TDD-0033 is a
provable equivalent mutant: the finding is `info`, `shouldFailDoctor` reads `warning + error` only, so
the exit code does not move even under the mutation that removes the provenance gate — and a fresh
`runInit` tree carries unrelated warnings, so `--fail-on warning` exits 1 for reasons the row does not
own. Exit-code invariance runs BR-0006-0019 / BR-0006-0021 → AC-0006-0022 / AC-0006-0025 → TDD-0031 and
TDD-0034 / TDD-0035.

## 5. `AC-0006-0022`'s `qfai validate` silence clause has no TC

Owner: `/qfai-sdd`. Non-blocking; vacuously satisfied.

The clause requires `qfai validate` to emit no finding for this drift. Nothing under
`src/core/validators/**` references `.github/workflows`, so no mutation inside owned code can red it —
the `equivalent-mutant` case. No ledger row was opened for it, deliberately: a row whose oracle cannot
fail is worse than a recorded gap.

## 6. `US-0006-0011` has no `Layer = E2E` row

Owner: `/qfai-sdd` Phase 2b, then `/qfai-atdd`. **This is why spec-0006 cannot close COMPLETE.**

`QFAI-ATDD-111` names it. Creating the row from this stage would mint a new obligation ID with no `TC-*`
parent, and appending the annotation without the test would discharge a hard gate while nothing verifies
the story. Identical in shape and reason to spec-0003's eight `US-0003-0021..0028`.

## 7. Two open Change Requests, both raised by this slice

- **`CR-20260807-0001`** — the checkpoint step-4 pass criterion. `checkpoint-verification.md` makes any
  non-zero exit a FAIL and keeps the item at `refactor`; step 4 exits 1 on two errors no row in this
  slice can discharge. **This is the sole blocker on `done` for TDD-0029, TDD-0030 and TDD-0033**, all
  three of which have every required reviewer reported PASS. The owner correction matters: the reference
  it changes is mirrored from `packages/qfai/assets/init/**`, so Option A is a **package** change, not a
  `/qfai-sdd` rerun.
- **`CR-20260807-0002`** — widen the ledger carve-out from three cells to five, disclosing this slice's
  `Test file` / `Selector` writes, which are compelled by two validators and not authorised by the
  whitelist. Blocks nothing.

## 8. Re-derive G5's tiering before TDD-0038 + TDD-0039 are reviewed as a group

Owner: `delivery-planner`. Non-blocking, but it must happen before that group's review.

By the planner's own criterion — criticality turns on contract and public-JSON surface — TDD-0030
adding a new check to the doctor JSON surface looks like **T2**, the tier its sibling TDD-0029 received
for the same act. No ceremony deficit arose (G2 was a singleton and received T2 ceremony de facto), but
G5 plans TDD-0038 + TDD-0039 as a **grouped T1 pair** and TDD-0039 emits another new severity into the
same surface.

## 9. Carried to TDD-0037's work order

- A declined-only tree currently emits **"installed shipped workflow(s) match the packaged copy"** when
  no installed file exists at all. `TC-0006-0035` requires severity `ok` and does not constrain the
  message, so this is not a defect against a current obligation — but that row must decide whether the
  wording is honest, and it pairs with item 1's third bullet.
- An acceptance criterion for that row's oracle: it must **kill the on-disk-present-count mutant**
  (replace `comparedCount: recordedNames.length` with a count of recorded names present on disk). Today
  that mutant leaves the whole drift file green while emitting **zero** checks on a declined-only tree,
  which `TC-0006-0035` forbids. The window is open from now until G9.
- The `else`-versus-`else if` successor mutant: dropping the **status** test while keeping the count
  leaves the file green. Equivalent today because `skipped_unresolved ⇒ comparedCount = 0`, and
  non-equivalent exactly when a `declined`-derived status breaks that biconditional — which the
  registration site's comment already anticipates. Owned by TDD-0039.

## 10. `node_modules/.bin/tsc` resolves to `typescript-future`, so the `check-types` CI job may not be testing the pinned compiler

Owner: repository toolchain. Non-blocking for CHG-007; found while repairing a `node_modules` incident,
not while reviewing a row.

Root `package.json` declares both `typescript` (`5.9.3`) and `typescript-future`
(`typescript@6.0.1-rc`). **Both packages provide a `tsc` bin**, and the linked
`node_modules/.bin/tsc` currently execs `../typescript-future/bin/tsc`:

```console
$ pnpm exec tsc --version
Version 6.0.1-rc
```

That matters because the two are meant to be distinct gates:

- `check-types` = `tsc -b` — intended to run the **pinned** compiler.
- `check-types:future` = `node ./scripts/check-types-future.mjs`, which deliberately resolves the RC by
  its own explicit path (`node_modules/typescript-future/bin/tsc`) rather than through `.bin`.
- `.github/workflows/ci.yml` runs them as **two separate required jobs** (`:66` / `:86`), both gated in
  the summary job's success condition (`:253`, `:266-267`).

If `.bin/tsc` resolves to the RC in CI as it does locally, the two jobs run the same compiler, the
pinned-compiler check is silently lost, and the redundancy is invisible because both jobs pass.

**What is measured and what is not.** Measured: the local `.bin/tsc` target and its reported version.
**Not** measured: whether CI's own `pnpm install --frozen-lockfile` resolves the bin conflict the same
way, and whether the pinned compiler would still report zero errors. I did not run the pinned compiler
to find out, because `tsc -b` rewrites `.tsbuildinfo` and two reviewers were running `check-types`
concurrently at the time; a green-vs-green comparison was not worth corrupting their measurements for.

**Attribution is genuinely uncertain and is not being guessed at.** This state was observed immediately
after a `pnpm install --force` that I ran to repair a `node_modules` incident. An earlier
`pnpm install --force` in the same run had the same opportunity to set it, and pnpm's bin-conflict
resolution is not alphabetical-first here (`typescript` would have won if it were). So this may predate
the slice entirely. What is certain is the current state and that it contradicts the CI job structure.

**Suggested fix, for the owner to judge**: give the RC a non-colliding bin (or drop its bin linkage) so
`.bin/tsc` unambiguously means the pinned compiler, and have `check-types` assert the version it is
about to run rather than trusting resolution — the same principle this slice applied to vitest
selectors, where a gate that cannot report _which_ thing it measured cannot be trusted to have measured
the right one.

## 11. Requirement 4 of the drift advisory is contract-scoped to the `message`, but the real hazard is any rendered surface

Owner: `/qfai-sdd --contract` against `.qfai/contracts/cli/qfai-doctor.md`. Non-blocking. Fold into item 1's
single pass so `TDD-0036` / `TDD-0037` inherit a resolved contract.

**Both reviewers reached this independently**, which is why it is recorded rather than left as a
preference. The contract heads the clause _"### The message must not name a refresh command"_ and lists
its four items under _"Required message content"_; `TC-0006-0030` clause (a) and `BR-0006-0020` likewise
scope the prohibition to the **finding message body**. So `title` and `details` are outside it.

**But the vector is measured real on those surfaces, not hypothetical.** During round 4:

- `details.nextActions: ["qfai init --force"]` — the exact shape the sibling `skills.integrity` check
  ships — **passed the row and the entire 19-selector closure** before a sweep existed for it.
- A `title` suffix of a space, then `- run qfai doctor --force`, passed too, because the only `toBe` on a
  title in the slice pins the **`ok`** emission's, not the drift one.

So an implementer could satisfy the contract to the letter and still ship the operator an instruction to
run a command that does not exist — which is the harm the clause names.

**Two options for the owner.** Recommended: **widen the clause** to something like _"no rendered surface
of this finding — `message`, `title` or `details` — names a refresh command or CLI verb"_, because that
is what the code already means and what an operator actually reads under `--format json`, where key names
are part of the output. Alternative: leave the contract message-scoped and keep the sweep labelled as a
deliberate defensive over-approximation, which is what round 5 does in the interim.

**One fact that may make the widening unnecessary, and should be checked before doing the work.** Once
`TDD-0036`'s four-key `toEqual` on `details` lands, a `nextActions` key is a **key-set** violation of
`BR-0006-0022` independently of any command-token rule — and both violations still constructible after
round 5 need an **extra key**, so that `toEqual` kills them for free. If the owner judges the key-set
pin sufficient for `details`, the residue is `title` alone, which no row pins today and which
`TDD-0036` is not expected to.

**Why this is here rather than encoded downstream.** `constitution/drift-protocol.md#reviewer-originated-obligations`
puts a reviewer-originated widening on the Change Request path; encoding it as a hard test obligation
would make an implementation row the author of a contract term. Round 5 therefore keeps the assertion —
it catches a measured real defect — but relabels it so it no longer claims to enforce a contract clause
the contract does not carry.

**Superseded 2026-08-08 by round 7 — read this before acting on the paragraphs above.** The interim
disposition described here ("keep the sweep, relabel it") **did not survive review.** `completion-reviewer`
ruled the `title` + `details` sweep a reviewer-originated obligation encoded as a hard assertion, which
`drift-protocol.md:286-289` forbids in those terms, and `references/oracle-strength.md` offers no
"keep and relabel" branch. The sweep is **deleted** in round 7; the routing recorded in this item stands
unchanged and is now the _only_ instrument.

Two measured corrections to what this item says about the residue, both of which change what the owner is
being asked for:

- The tab-escape class is **wider than one `details` vector**. Round 6's whole-set serialization
  JSON-escaped `title`, so a tab inside `title`'s **value** also escapes detection (witness `3d0da844`:
  the round-6 form misses it, the round-5 form reddens on tokens 1 and 8). So there were at least **two**
  constructible violations, not one.
- **`TDD-0036`'s four-key `toEqual` closes only the `details` half.** A key-set pin cannot reach a tab
  inside `title`'s value. The `title` half is therefore **unowned by any row**, and that is the residue the
  owner is actually deciding about — not the `details` one, which `TDD-0036` closes for free.

Also settled by measurement, so the owner does not have to: the **`ok` emission** is owned for `title`,
`details` and `severity` by `drift.test.ts:253` (all exact pins), and **unowned for its message's
"names no command" property** (witness `04b7fdf6` — a `Re-run qfai init to verify.` appended to the `ok`
message passes both suites). Qualified in the deliverable's favour: the contract scopes requirement 4 to
the `modified` message, and the `ok` row of the state table carries no such clause, so this is an unowned
_desirable_ property rather than a coverage gap against the contract.

## 12. `.qfai/steering/**` sits inside both whole-tree lint gates; `.qfai/evidence/**` sits outside both

Owner: repository toolchain, or nobody — this is a note for the next author of a `.qfai/**` artifact.
Non-blocking. Recorded because the slice paid for it **twice in one day**, the second time after
"fixing" it.

Measured coverage, not inferred:

| Path                | `prettier -c .`              | `markdownlint-cli2 "**/*.md"`          |
| ------------------- | ---------------------------- | -------------------------------------- |
| `.qfai/steering/**` | **covered**                  | **covered**                            |
| `.qfai/evidence/**` | excluded (`.prettierignore`) | excluded (`.qfai/evidence/*[0-9]*.md`) |

`.markdownlint-cli2.jsonc` ignores `.qfai/assistant/steering/**` — note the `assistant/` segment — but
**not** `.qfai/steering/**`. The near-identical path is the trap.

What actually happened: two steering files authored as prose broke `format:check` across three pushed
commits, which meant `ci:lint` was red on the branch the whole time. That was fixed — and the fix
addressed **one** whole-tree gate over that directory and left the other, so `pnpm lint:md` was still
red at the next reviewed revision (MD040, a fence with no language; MD038, a code span whose content
begins with a space) and the branch still could not merge. Neither failure was visible to any test; the
row's own suite was green throughout, and both surfaced only because reviewers ran gates the slice had
not.

**Two further corrections of the slice's own habit, both worth carrying forward.**

- **`pnpm ci:lint` has ten members**, and this slice had been reporting "four gates 0" for five rounds:
  `format:check`, `lint`, `lint:md`, `check-bidi`, `check-instructions-size`,
  `check-review-profile-consistency`, `check-prompt-scanner-pair`, `lint:shipping`,
  `lint:workflow-shape`, `check-pack-locations`. Run the lane, not a hand-picked subset. It exits 0 as of
  `202edbcd`, including six members this slice had never once run.
- The general failure is not "forgot to run a formatter". It is that **fixing one gate over a directory
  is not evidence about the others**, and that a `.qfai/**` path being documentation says nothing about
  whether a gate globs it.

## 13. `packages/qfai/tests/**` is type-checked by nothing

Owner: repository toolchain. Non-blocking for CHG-007, but it changes what test-side type annotations are
worth across the whole repository.

Measured: `packages/qfai/tsconfig.json` and `tsconfig.build.json` both declare
`"include": ["src/**/*.ts", "src/**/*.d.ts"]`, so `tsc -b` never visits `tests/**`; and
the **root** `eslint.config.js` applies `tseslint.configs.disableTypeChecked` to `**/tests/**/*.ts`, so the
type-aware lint rules are off there too. Vitest strips types without checking them.

Demonstrated rather than argued: renaming a field access to one that does not exist on the parameter's
declared type (`${finding.title}` → `${finding.titel}` in a helper typed `DoctorCheck`) leaves
`tsc -b` at **0**, `eslint --max-warnings 0` at **0**, and the consuming test at **2 passed**.

**Consequence to state plainly: every type annotation in this slice's test files is decoration.** A test
comment that claims a rename "breaks compilation" is false, and one such claim shipped in round 5 before
review caught it. Anything relying on the compiler to catch a test-side field rename needs a runtime
assertion instead.

Also worth the owner's attention: `tsconfig.json` sets `"composite": true`, which is incompatible with
`noEmit`, so `pnpm check-types` (= `tsc -b`) **cannot run without emitting** into `dist/` — the same
directory `tsup` publishes from and that `package.json#files` ships. The distributed-surface guard
(`check-no-internal-version-leakage.sh`) and `lint:shipping` both pass against the `tsc`-emitted tree, so
there is no leak today; the hazard is that `dist/` after `check-types` is a mixture of two toolchains'
output, and deleting it to "clean up" removes tsup's `dist/cli/index.mjs` barrel that checkpoint step 4
invokes.

## 14. `TC-0006-0030` leg (b) does not identify a shipped-workflows state — see `CR-20260810-0001`

**Reduced to a pointer, 2026-08-10.** This item was first written as a non-blocking steering note claiming
the row was discharged and the discrepancy was a one-versus-one mismatch between the TC Setup and the ledger
`Selector`. A three-lens review of `TDD-0038` overturned both halves, and the finding now lives in
**`.qfai/decisions/CR-20260810-0001-tc0006-0030-leg-b-state-ambiguity.md`** (`Class: defect`, blocked set
`TDD-0038, TDD-0039, TDD-0037`).

Three corrections to what this item said, all measured:

- **It is a four-artifact inconsistency**, not one-versus-one — `06_Test-Cases.md:281`,
  `03_Acceptance-Criteria.md:240`, `shipped-workflows.md:115,122-123` and `qfai-doctor.md:148` — and this
  item cited the weaker source on each side, missing that the row's **own anchor** `AC-0006-0023` is the
  state-agnostic one.
- **The `drift.test.ts` citation was inverted.** This item claimed that file agreed with the `Selector`'s
  `absent` reading. It implements the **other** reading: its second `it` deletes a **recorded** file, which
  is `declined`.
- **"The row is discharged" was wrong.** Leg (b)'s literal Verify clause `drift finding が 0 件` is asserted
  by **nothing** — `TDD-0038` asserts `findings` has length 1 on a tree carrying an edited control, and
  `TDD-0029`'s second `it` also yields a finding. And the joint-discharge attribution carries no
  traceability marker, because `drift.test.ts` holds only `TC-0006-0027`/`0028`.

The decisive fact, which this item never stated: **the two readings have opposite expected payloads.** Under
`declined`, `BR-0006-0022` requires `details.declined` to enumerate the name; under `absent`, `TDD-0038`
asserts the name appears nowhere. No single fixture can satisfy both, which is what makes it a defect rather
than a wording preference.
