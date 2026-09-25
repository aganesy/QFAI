# SDD Execution Playbook

Use this file for the detailed sequencing rules behind `/qfai-sdd`.

## Contents

- Stage order
- Stage 0: Preflight
- Stage 1: Triage
- Shared-before-Slice Rule
- Plan gate in a no-argument batch
- Stop Conditions

## Stage order

1. **Stage 0 - Preflight** (source inventory; see Stage 0 below)
2. **Stage 1 - Triage** (operation classification, see `sdd-triage.md`)
3. **Phase 0 - Contracts-first**
4. **Phase 1 - Outline**
5. **Phase 2 - Slice** (per spec)
6. **Phase 2b - Seed `tdd/test-list.md`** (per spec)
7. **Phase 2c - Obligation reconciliation** (per spec)
8. **Phase 3 - Plan finalize** (per spec)
9. **Phase 4 - Delta update** (per spec)

## Stage 0: Preflight

1. Identify the input this run reads, if there is one: the preflight result's
   `selectedInputPath`, which is the newest pack by default and an older one once
   `npx qfai discussion use <id>` has pinned it — so recomputing the newest here
   would source requirements from one pack and advice from another.

   **Read `source` beside it.** An import-lite run reports `import-lite` and
   points that path at an `.qfai/evidence/import-lite-*.md` file, not a pack
   directory. Steps 2, 3 and the `prototyping.yaml` step below are about a pack;
   on an import-lite input they have nothing to inventory and no review to match,
   and running them anyway searches for discussion reviews of an evidence file.

2. Note which of its files are missing, and any blocking OQ, as reference-quality
   facts — they are recorded, not blocking. A pack is non-normative reference
   material (`.qfai/assistant/constitution/drift-protocol.md#core-rule`), so do NOT repair or
   re-run it to make this gate pass; a correction it implies belongs in the
   SDD-owned artifact, with the discrepancy noted in delta/evidence.
3. Read the review findings for the pack step 1 selected, from its COMPLETED
   reviews — the directories whose `summary.json#target.path` names that pack.
   The path matched is the selected one, not the newest pack on disk, and the
   reviews read are all of them rather than the newest alone; what that means for
   each is below.

   **Compare the two as resolved paths.** The preflight reports an absolute
   `selectedInputPath` while a summary records its target relative to the
   project root, so a direct string comparison matches nothing: resolve the
   summary's path against the root before comparing, or every review of the
   pack reads as a review of another one.

   Three things bound that lookup.

   | Bound                        | Why                                                                         |
   | ---------------------------- | --------------------------------------------------------------------------- |
   | Completed only               | A directory with no `summary.json` is a cycle that was interrupted          |
   | Archived directories too     | An older pack's review is moved out of the top level after its time to live |
   | The revision the review read | Verdicts describe the state the pack was in, not the state it is in         |

   A directory with no `summary.json` is skipped whatever its stamp. Reviewers
   are dispatched before the summary is written, so such a directory can hold
   `Rxx_*.md` responses — unsealed, unreconciled, and possibly superseded by the
   completed cycle beside them. Taking the newest directory rather than the
   newest completed one hides advice that still applies, and taking its
   responses carries advice nobody signed.

   **Read every completed review of the pack, newest first, not only the newest
   one.** A blocking finding starts a fix-and-rerun cycle, so the next completed
   review is evidence it was answered. Non-normative advice starts no cycle and a
   later review is not required to repeat it, so an item the newest review does
   not mention is not thereby closed. Carry forward each one no later review
   answers, and take the newest review's wording where two describe the same
   thing.

   Look in `.qfai/review/_archive/review-*/` as well as `.qfai/review/review-*/`.
   `npx qfai doctor --clean` moves an eligible review there once it is older than
   the configured time to live, so a pack selected by `npx qfai discussion use <id>`
   is exactly the case whose review has most likely been archived, and a lookup
   over the top level alone reports it as a pack nobody reviewed.

   Ask whether the pack changed after the review, and read the verdicts against
   the answer. `summary.json#revision` addresses a whole tree — a git rev, or
   `working-tree+<content hash>` for an uncommitted one — never the pack alone,
   so it is the input to that question and not the answer to it.

   | The review's `revision`       | Ask                                                     |
   | ----------------------------- | ------------------------------------------------------- |
   | A git rev, pack tracked       | `git diff --name-only <rev> -- <pack path>`             |
   | A git rev, pack ignored       | Nothing: git holds no earlier content to compare        |
   | `working-tree+<content hash>` | Nothing: the prior contents are not recoverable from it |

   **The middle row is the ordinary case.** `npx qfai init` writes
   `.qfai/discussion/*` into the managed ignore block, so a pack is usually
   untracked and `git diff` — which compares tracked content — reports nothing
   about it whatever revision it is given. Check with `git check-ignore` or
   `git ls-files` before reading an empty diff as an unchanged pack.

   One revision, not two. `git diff <rev> HEAD` compares two commits and reports
   nothing about a pack edited but not committed, which is the ordinary state of
   a pack a review just ran against; the one-revision form compares that revision
   with the working tree.

   **Only the first row's diff is evidence.** Where the pack is tracked and that
   diff is empty, the verdicts describe the pack as it stands. The other two rows
   run no comparison at all, so an empty result there is the absence of an answer
   rather than one. A tracked pack that has gained an untracked file is the same
   case for that file: `git diff` reports tracked content, and an addition shows
   in `git status --untracked-files` instead.

   Where the diff is not empty, and wherever no comparison was possible, the
   verdicts may describe an earlier state: disposition what still applies, and record the ones an edit
   answered as answered rather than carrying them forward as open findings about
   text that no longer exists. Unrelated repository content moving does not make
   a finding stale, which is why the question is asked over the pack's own paths
   and not over the revision value.
   An earlier cycle's advice was answered by the fix that closed it, and reading
   it again re-raises work the pack has already done. Take in the items a
   reviewer marked non-normative under
   `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`.
   A review of another pack, or of an SDD or implementation cycle, is not this
   run's input. They are reference-quality facts like the rest of the pack, and
   each one gets a disposition in an SDD-owned artifact: the row, step or open
   question it became, or a line in this run's evidence saying it was read and
   not adopted, with why. Silence is not a disposition — it cannot be told from
   never having read the item. Nothing goes back into the pack.

4. Stop only when there is no usable source at all: no pack, no import-lite
   input, and no explicit user requirement.
5. **Report — do not stop —** when `prototyping.yaml` is present in the pack step 1 selected —
   the one this run consumes, not the latest UI-bearing pack on disk, or the report names a
   side artifact belonging to a discussion nobody here reads — and does not parse against the
   schema in
   `.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md#prototypingyaml`.
   Record the file and what failed to parse, and continue; `/qfai-prototyping` is where an
   unusable recommendation actually bites, and it re-reads the file.

   A malformed optional artifact is **not** a Stage 0 blocker, and making it one would put this
   skill at odds with the runtime: `runSddPreflight` returns `status: "ready"` with zero blockers
   for a `prototyping.yaml` carrying an invalid mode, a scalar block or a null block, and the
   acceptance criterion it implements says side-artifact state alone does not block SDD. Two
   entry points that disagree means whether SDD can proceed depends on which one you came in
   through, and a project holding an old-format file could not run `/qfai-sdd` at all.

   Absence is legal and must not stop Stage 0: `/qfai-discussion` emits the file only when the
   pack is UI-bearing on a **visual-prototyping** surface — its `01_Context.md` classification
   names `web`, `mobile`, `desktop` or `mixed` as `primary_surface` or in `secondary_surfaces` —
   **and** an explicit prototyping recommendation is useful, so a complete UI-bearing pack may
   legitimately omit it. A cli-only pack (`primary_surface: cli` with no visual
   `secondary_surfaces`) emits none at all: `/qfai-prototyping` rejects `cli` as an execution
   surface. Never author one to clear this gate — a recommendation the discussion did not make is
   a fabricated rationale record.

### Import-lite entrypoint (no discussion-pack at all)

Step 1 assumes a pack exists. When the project has **no** discussion-pack
whatsoever and specs already exist, do not stop — record the input source
instead and continue:

1. Write `.qfai/evidence/import-lite-<ts>.md` from
   `templates/evidence/import-lite.md` before editing any spec, where `<ts>` is
   the 17-digit run stamp. `import-lite.md` without a stamp is also accepted;
   any other suffix is not.
2. Fill `generated_at` with an ISO8601 datetime, plus at least one real
   `Sources` entry or user excerpt. `<...>` placeholders and fillers (`TBD`,
   `none.`, `n/a`) are rejected, and an unclosed excerpt fence with them.
3. Select that file as the input source and report it in
   `.qfai/report/preflight_summary.md` as `source: import-lite`.

A pack that exists under a non-canonical name is not an absent pack: rename it
rather than falling back here. Validator: `QFAI-IMPLITE-001`.

### Import-lite evidence: naming, lifetime and intake

Producer: Stage 0, in every invocation form. When Stage 0 finds specs under `<paths.specsDir>` and no `<paths.discussionDir>/discussion-*/` pack directory at all, create `.qfai/evidence/import-lite-<ts>.md` from `templates/evidence/import-lite.md` and record where the requirements actually came from. That is the documented route for a spec set imported from outside QFAI, and it satisfies
`QFAI-IMPLITE-001` without fabricating a discussion pack. A pack that exists but is incomplete is not this case — the pack is present, so this route never opens for it. Stage 0 handles it the way it handles any non-normative source: record what is missing and carry on. Neither repair the pack nor write import-lite evidence beside it.

The `-<ts>` suffix is what makes one file per import run possible. The check does also accept a copy kept under the template's own name (`import-lite.md`), but that is a single fixed path, so a second import would overwrite the first run's trail. `<ts>` is the canonical 17-digit run stamp (`YYYYMMDDhhmmssSSS`, the same form discussion packs use); a suffix that is not exactly that stamp
is rejected, so a `-<n>` collision counter does not work here. Claim the name with an exclusive create (`wx` / `O_EXCL`) — listing the directory and picking a free name is not a reservation, so two runs inside the same millisecond would both read the same name as free and the later write would erase the earlier run's trail. When the exclusive create fails because the file exists,
re-stamp and retry: one file per import run, never an overwrite of an earlier one.

Create it only once at least one `## Sources` entry or a `## User provided excerpt` is in hand, and delete it if the run then stops for want of an input source: an otherwise empty `import-lite-*` file silences `QFAI-IMPLITE-001` while leaving preflight with nothing to read. This artifact is a pointer for preflight, never requirement/spec SSOT — carry unresolved items into the spec's Open
Questions.

The packaged `runSddPreflight` API takes this route itself, so do not hand-write the summary. When the pack check blocks and the evidence resolves, it returns `source: import-lite` with the evidence file as the selected input, an unknown `Imported REQ count` (a pointer artifact carries no REQ ids) and `/qfai-sdd` as the next command — so the summary names its real input source instead of
a pack that does not exist. It writes both copies under `<paths.outDir>`: the run-scoped `preflight/run-<timestamp>/preflight_summary.md` that evidence cites, and the `preflight_summary.md` pointer each rerun rewrites — the latter is `.qfai/report/preflight_summary.md` only when `qfai.config.yaml` leaves `paths.outDir` at its default; a hand-written copy in the old place would be a
second, unread one. Evidence is an entrypoint, never an override: a misnamed pack still blocks, and an incomplete one is read as the source, its gaps listed under `## Pack Gaps`.

On this route Stage 1 has no pack to read, so it takes its REQ/NFR intake from that evidence file instead: the `## Sources` and `## User provided excerpt` it records stand in for `06_REQ.md` / `07_NFR.md`. See `references/sdd-triage.md`, Inputs — never guess the intake from existing specs. US and AC items this route writes carry the evidence pair `Source: import-lite-<ts>#<REQ-ID>` in
place of the `<pack-id>#<discussion-id>` one; the form is defined in `references/spec-traceability-rules.md`.

`<paths.specsDir>` and `<paths.discussionDir>` are the resolved settings, `.qfai/specs/` and `.qfai/discussion/` by default; the check resolves them before it looks. The evidence path is not one of them — `.qfai/evidence/` is canonical and stays put even under a `paths.discussionDir` override, because every writer (`npx qfai init`, prototyping, audit log) uses it. Writing the evidence
beside a relocated discussion directory puts it where nothing looks, leaving `QFAI-IMPLITE-001` unclearable.

## Stage 1: Triage

1. Enumerate active spec summaries (skip `superseded` / `deprecated` / `removed`).
2. Classify each REQ/NFR **append-first** using `_policies/11_Slice-Policy.md`
   (8 ops). Default to UPDATE on the closest active spec; CREATE only
   when no active spec shares any subject token AND a new `CAP-NNNN` is
   added to `_policies/03_Capabilities.md`.
3. Walk the impact cascade: for every primary classification, scan the
   remaining active specs and emit companion `UPDATE:MODIFY` /
   `UPDATE:REMOVE` rows wherever existing AC/BR reference the changed
   concept. The same `Source` ID may legitimately appear on multiple rows.
4. Obtain AskUserQuestion approval for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE rows.
   Under `--auto` ask nothing and do not self-approve: those rows stay unapproved and
   trip the stop condition below, no `CAP-NNNN` is written to
   `_policies/03_Capabilities.md` on their behalf, and the batch stops whole rather
   than running its approval-free rows ahead of the gate.
5. Persist the Triage table in `<spec>/09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec / policy).
6. Stop entry to Phase 0 until every approval-required row has an
   approver recorded and every CREATE row cites a registered CAP
   (validator `QFAI-TRIAGE-006`).

Detailed procedure: `sdd-triage.md`.

## Shared-before-Slice Rule

- Contracts-first and Outline are shared work.
- Slice, Plan, and Delta are target-spec work.
- In no-argument mode, shared work runs once and per-spec work fans out after shared outputs stabilize.

## Plan gate in a no-argument batch

The Plan gate is `/qfai-sdd`'s own step, not a routed reviewer. Each target's Plan is checked
against `templates/specs/spec/10_Plan.md#implementation-approach` as that Plan is finalized,
before the target is integrated.

Routing places every reviewer in the terminal span, where `review` runs once per invocation after
Phase 4 — so a reviewer cannot hold one target while the batch releases the rest, and a check that
waited for one would report a deficient Plan only after the batch had taken it in. The terminal
review still reads what this step recorded. A usage this Plan cites in a **sibling target of the
same batch** is not settled here. The siblings are delegated in parallel, so the sibling may not
have written that output yet and a verdict taken now would follow worker timing rather than the Plan
— reading the sibling's own worktree moves where the check looks, not when it may look. Record the
citation and carry it to the batch tail, where every target is integrated and the terminal review
reads it. Integration is the barrier, and it is the first point at which such a usage is either
present or missing for good. Every usage inside this target is still settled here, as it is for a
single-spec run.

## Stop Conditions

- Missing or stale `_policies/11_Slice-Policy.md`
- Missing Contract Index alignment
- Unresolvable preflight blockers
- Triage rows requiring approval but lacking `Approved By`
  - Repair: obtain the approval through AskUserQuestion, record the approver in
    `Approved By`, and rerun the stage. Under `--auto` the row leaves `--auto`
    scope and no question may be asked at all
    (`../SKILL.md#--auto-and-approval-required-rows`): keep `Approved By` as
    `-`, write a `consultation-needed` work-log entry naming every unapproved
    row, and hand the run back for a rerun without `--auto` — never synthesize
    an approver.
- Validate errors that point to unresolved source-layer gaps
