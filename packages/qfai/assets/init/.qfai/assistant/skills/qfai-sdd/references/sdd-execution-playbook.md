# SDD Execution Playbook

Use this file for the detailed sequencing rules behind `/qfai-sdd`.

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

1. Identify the pack this run reads, if there is one: the preflight result's
   `selectedInputPath`. That is the newest pack by default and an older one once
   `npx qfai discussion use <id>` has pinned it, so recomputing the newest here
   would source requirements from one pack and advice from another.
2. Note which of its files are missing, and any blocking OQ, as reference-quality
   facts — they are recorded, not blocking. A pack is non-normative reference
   material (`.qfai/assistant/constitution/drift-protocol.md#core-rule`), so do NOT repair or
   re-run it to make this gate pass; a correction it implies belongs in the
   SDD-owned artifact, with the discrepancy noted in delta/evidence.
3. Read the review findings for the pack step 1 selected, from its latest
   COMPLETED review — the directory whose `summary.json#target.path` names that
   pack, with the newest stamp among those. The path matched is the selected
   one, not the newest pack on disk.

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
   | A git rev                     | `git diff --name-only <rev> HEAD -- <pack path>`        |
   | `working-tree+<content hash>` | Nothing: the prior contents are not recoverable from it |

   Where the diff is empty the verdicts describe the pack as it stands. Where it
   is not, and where the revision is a working-tree hash, they may describe an
   earlier state: disposition what still applies, and record the ones an edit
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
5. **Report — do not stop —** when `prototyping.yaml` is present in the latest UI-bearing pack
   and does not parse against the schema in
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
