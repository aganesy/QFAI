---
id: 2026-08-09-chg-007-implementation-standing-brief
status: active
kind: decision
created: 2026-08-09
updated: 2026-08-09
scope: CHG-007
blocking: false
promote-to: null
links:
  - spec-0006
  - spec-0017
  - spec-0015
  - spec-0008
  - TDD-0032
---

# Standing brief for the remaining CHG-007 implementation rows

`TDD-0032` took **nine rework rounds** with **zero production behaviour change in all nine**. Every round
was oracle strength or record accuracy. This entry is what that cost bought, written down so the ~94 rows
still queued across spec-0017, spec-0015 and spec-0008 do not re-learn it. Each item below is a measured
incident, not a preference.

## 1. The dominant defect class: unqualified reach claims

Every defect that cost that row a round was a **claim of absolute reach, derived rather than measured** —
`NO omissions`, `never raise a lone red`, `the pin is the closure`, `byte-identical to HEAD`,
`both sides cannot differ at all`. Four consecutive rounds shipped a fix **containing the class it was
fixing**.

Two clauses, both earned:

1. **No reach claim ships unqualified.** It carries its scope and its witness, or it is not written.
2. **A new claim is checked against its own neighbours, not only against a measurement.** The sharpest
   defect of the row was an impossibility claim whose refutation sat **twelve lines below it in the same
   docblock**, and it survived three independent reviews, a synthesis, and the orchestrator's own reading —
   because every round checked its new text against the world and never against the text beside it.

**The streak ended only when the rule was applied to the work order rather than to the artifact.** Two
instructions in the final round would each have created a fifth instance; one of them was measurably false
about a shared code path and would have declared an existing DRY refusal pointless. The generator was
upstream of the implementer.

## 2. Mutations are recorded by text, with a base

Record each as **literal needle → replacement text, plus the mutant blob AND its base blob**.
`git cat-file` resolves **only the base** — every mutant hash in this slice is `git hash-object` output that
was never written to the object database, so a mutant is joinable **only** as base + needle. `-w` is not the
fix: those objects are unreachable and `gc`-pruned.

Twelve mutations recorded by _intent_ in that row are permanently unrecoverable. Against that, rebuilding a
driver from _recorded needle text_ reproduced three mutant blobs byte-for-byte, and later reviewers
reproduced nine and eleven respectively. The rule pays for itself both ways.

Both harness checks are required and catch **disjoint** modes: needle-uniqueness
(`split(needle).length === 2`) catches multi-site replacement; blob-differs catches the no-op. And the
mutation loop **reverts in a `try/finally` that prints its verification** — two drivers crashed mid-run and
left a mutant in the tree, and the printed line is what caught both. Nothing else would have.

**For a MULTI-EDIT mutation the printed verification is not evidence, and this cost a leaked mutant.** An
implementer's two-edit run printed "matches base" for **both** edits and still left edit 1's mutation in the
tree: edit 2's captured "before" already contained edit 1's mutation, so a forward-order restore reinstated
it. `git status` caught it; the print did not. **Restore in reverse order, and anchor the printed check on
the HEAD blob rather than on the per-edit "before".** The failure is silent in exactly the way the
`tail`-pipe one is.

Whitespace is part of a mutation's identity: a needle including versus excluding its trailing newline gives
different blobs, and a literal tab versus a `\t` escape gives different blobs. State which.

## 3. Never route a regex or needle through a shell

A bash heredoc silently collapsed `\\` → `\` **three separate times** in this slice. Once it produced a
probe that reported a clean string as _firing_ — wrong for two runs before the class bytes were printed.
Another time a backtick inside a needle triggered command substitution. Author with the Write tool or
`String.raw`, and byte-verify.

## 4. `pnpm ci:lint` has eleven members

`format:check`, `lint`, **`lint:md`**, `check-bidi`, `check-instructions-size`,
`check-review-profile-consistency`, `check-prompt-scanner-pair`, **`check-workflow-hygiene`**,
`lint:shipping`, `lint:workflow-shape`, `check-pack-locations`. The slice reported "four gates 0" for five
rounds; two of the six never-run members were **red on the branch** from prose the orchestrator authored,
so `ci:lint` was failing the whole time and no test could see it.

> **Ten until 2026-08-20**, when spec-0017's change 3 added `check-workflow-hygiene`. The count is
> maintained HERE and nowhere else. Roughly sixteen other statements of it exist in
> `.qfai/evidence/**`, and every one is a revision-stamped record of a measurement that was true when it
> was taken — those are not corrected, because rewriting a dated observation destroys the audit trail
> rather than fixing it. If you are comparing an old evidence line against a fresh run, the difference is
> this member and not a regression.
>
> The lesson generalises, and this slice has paid for it twice: **a count is maintained at one site or it
> is not maintained.** The member inventory in `workflowsIntegrity.ts` had its numeral deleted for exactly
> this reason. Here the numeral survives because the list is the rule — but then it lives in one place.

**And do not pipe it.** `pnpm ci:lint 2>&1 | tail -30; echo $?` reports **`tail`'s** exit status, not the
lane's — a lane whose exit code is silently discarded by a pipe is indistinguishable from one that passed.
Redirect to a file and check `$?` directly. Found by an implementer who made the mistake, caught it and
re-ran; it belongs beside the `npx` incidents because the failure is silent in the same way.

Run the lane. Before running any _other_ verification step, **name the already-passing gate that covers it**
and skip it if one does — both `npx` incidents were steps redundant with a gate that had already passed.

## 5. `.qfai/steering/**` is inside both whole-tree lint gates; `.qfai/evidence/**` is outside both

`.markdownlint-cli2.jsonc` ignores `.qfai/assistant/steering/**` — note the `assistant/` segment — but not
`.qfai/steering/**`, and `.prettierignore` does not exclude it either. `.qfai/evidence/**` is excluded from
both. After writing any steering file, run `pnpm exec prettier -w` **and** `pnpm lint:md` before `git add`.
Fixing one whole-tree gate over a directory is not evidence about the other; that mistake cost two separate
incidents.

**The sequence is write, then `prettier -w`, then `lint:md`, and only then `git add`.** Stated as a
sequence because the earlier wording ("run both formatters after writing") was followed by three more
breakages: a ledger cell padded one space short of its column, then a new CR failing MD040 and prettier in
turn. Five whole-tree gate failures now trace to `.qfai/` prose, and every one was written **and
committed** in one motion with the gate run afterwards. Note also that `&&` short-circuits, so a
`format:check` failure means members 2-10 **never ran** and their status is unknown, not green.

Also: **an insertion edits two sentences.** A superseding block inserted mid-sentence left one sentence
without a terminator and its tail orphaned 25 lines lower, and no gate saw it.

## 6. Nothing type-checks a test file

`packages/qfai/tests/**` is outside every tsconfig `include` (`tsc -b --listFiles` names **zero** files
there and 286 under `src`), and the root `eslint.config.js` applies `disableTypeChecked` to
`**/tests/**/*.ts`. So a test-side type annotation is editor feedback only, and **any comment claiming the
compiler catches something there is false.** One such claim shipped and was caught by measurement.

## 7. Environment hazards

- **Never `npx tsx`**, or any `npx <package absent from the lockfile>` — the fetch wiped root
  `node_modules/.bin` twice. `npx vitest` from `packages/qfai` is safe (lockfile dep, local `.bin`) but
  `./node_modules/.bin/vitest` cannot fetch from any cwd and is preferred. The prohibition is **scoped to
  packages not in the lockfile**; stated as a blanket "never npx" it over-fires on compliant work, which it
  did twice, once after being copied into a reviewer's brief.
- **Never `rm -rf` through a link that escapes the tree being deleted.** Three triggers have destroyed the
  real store: `rm -rf`, `npx`, and — the surprising one — **`git worktree remove --force`**, the sanctioned
  teardown command, which deleted the real root `node_modules/.bin` outright. Protocol: enumerate reparse
  points, keep only those resolving **outside** the tree, delete those non-recursively via
  `[System.IO.Directory]::Delete($p, $false)` after asserting `LinkType -eq "Junction"`, re-enumerate, then
  delete. Do **not** refuse on links generally — this repo tracks ~83 legitimate skill symlinks that resolve
  _inside_ a worktree and are safe. Repair needs `pnpm install --force`; `--frozen-lockfile` does not restore
  a missing `.bin`.
- **Never `rm -rf packages/qfai/dist`.** `composite: true` is incompatible with `noEmit`, so
  `pnpm check-types` (= `tsc -b`) emits there **by design**, and deleting it removes tsup's
  `dist/cli/index.mjs` barrel that checkpoint step 4 invokes.
- Worktrees running tests need **both** `node_modules` and `packages/qfai/node_modules` junctioned —
  `vitest` is a package-level dep, so Node's upward walk misses it even from a nested worktree.

## 8. Comment volume

**Ruling, after this was got wrong twice: the sibling band is a TARGET, not a cap, and a measurement that
replaces a derivation is not padding.** The one hard cap in this slice is the absolute count on
`repairText.test.ts` (361), which exists because that file reached 75% and needed two rounds to pay down.
Elsewhere, ~60% is where to aim. When a round replaces derived statements with their measurements — which is
what §1 demands — the line count goes **up**, and enforcing a ratio against that trades accuracy for a
number. Record both figures and say which way each moved; do not delete a measurement to hit a share.

I got the comparison itself wrong twice: once citing a file's **own** pre-change ratio as a sibling's, and
once citing "59.7 and 62" when the file under discussion was already at 59.9 and had no slack at all.

`TDD-0032` reached **75%** comment share against siblings at **60-62%**, and paying it down cost two extra
rounds. Match the siblings. Keep the **rule**, move the **derivation** to the evidence file — with one
exception that earned protection twice: **keep a measurement whose witness is invisible to CI.** The POSIX
leg of one anchor is `ubuntu`-only in effect, and a maintainer who reads the rule without the measurement has
no reason to believe a character window is different in kind.

Cap definition, single-basis: **absolute comment-line count is the binding constraint**, with the share over
**non-blank content lines** recorded alongside as the honest signal. Content lines = split on `\n`, dropping
the final empty element. An absolute cap alone is satisfiable by deleting _code_ faster than prose.

## 9. Record hygiene

- **A false statement is edited where it lives**, with an inline note of what it used to say and what
  measurement changed it. Appending a correction elsewhere leaves the false sentence standing, and a reader
  who stops at the first one is misled exactly as much.
- **A currency claim advances with the round.** Fields naming "the current revision" went stale _inside the
  commit that advanced the row_, twice. Name the **landing** revision by rule, and grep the row's section for
  any other revision hash before committing.
- **A "supersedes every earlier table" clause voids later figures too.** One such clause left the record with
  no current closure measurement anywhere. Scope superseding clauses to the rows and rounds they cover.
- **A closure is recorded as a literal command, never as a count of selectors.** "19 selectors" was carried
  forward nine times in one evidence file with no literal command behind it; three reviewers reconstructing it
  produced three different lists, one containing a bare `drift` token that matches nine extra files. Write the
  command, use full paths, and never a bare stem.
- **A line citation is a currency claim.** Anchoring it to a revision is not enough — an edit above it in the
  same commit invalidates it. Cite the **symbol** and keep the number with its anchor beside it.
- **`vitest -t` is a regex.** An unescaped `(TDD-NNNN)` silently **skips and exits 0**, satisfying a
  literal reading of "GREEN = exit 0" with zero tests executed. Admissible only when `failed >= 1` (RED) or
  `passed >= 1` (GREEN); record the selector line, not only the count. ~89 hazard-shaped selectors remain
  open across the queued ledgers.

## 10. Review routing

`completion-reviewer`'s PASS went **six rounds stale** unnoticed — it owns spec alignment and
drift-protocol compliance, and re-running it produced the most consequential review of the row. **Re-route
it whenever the artifact moves materially**, not once per row.

A review is requested from **`refactor`**, never from `review-fix`: a `REVISE` must land on the one status
with an outbound `review-fix` edge.

And on obligations: the contract is the ceiling. An assertion stricter than the contract encodes a
**reviewer-originated obligation as a hard assertion**, which `drift-protocol.md` forbids in exactly those
terms and which `oracle-strength.md` restates with **no keep-and-relabel branch**. Route the widening
upstream; do not assert it downstream.
