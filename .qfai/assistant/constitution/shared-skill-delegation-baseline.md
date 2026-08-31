# Shared Skill Delegation Baseline

Use this document to keep SKILL bodies compact.
Skill files should reference this baseline and only add role-, stage-, or gate-specific rules.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- The orchestrator may create work orders, delegate tasks, integrate outputs, and present results.
- The orchestrator must not generate the primary artifact first draft.
- The orchestrator must not self-approve or act as reviewer for convenience.

### Capability Probe (MUST)

1. Attempt the first required delegation at stage start using the platform's native delegation mechanism.
2. Treat that first real delegation attempt as the capability check. Do not gate execution on preflight availability questions or synthetic probe-only checks.
3. If the delegation fails, classify the failure first (see `Delegation Failure Taxonomy`), then apply the response for that class. Never simulate roles and never continue with self-execution, whatever the class.

### Delegation Failure Taxonomy (MUST)

Every delegation failure belongs to exactly one of two classes.

| Class         | Meaning                                                                                                                                                                                                     | Sanctioned response                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `unavailable` | The host has no usable delegation mechanism, the role is unknown, or the failure is a configuration / tooling / quota gap only the user can close — including a limit that waiting cannot clear.            | Hard stop.                                |
| `saturated`   | The host can delegate but is momentarily out of budget — `agent thread limit reached`, concurrency cap, queue full, rate limit, busy pool. The identical call would succeed later with no change by anyone. | Bounded wait-and-retry on the same stage. |

- Classify from the raw failure reason, and classify `saturated` only when the reason states or
  plainly implies that the identical call would succeed later **with no change by anyone**: a queue
  or pool that is currently full, a rate limit with a retry window, a concurrency cap that is
  momentarily reached, an explicit "try again later".
- A limit or quota that only a user can lift is `unavailable`, not `saturated` — a configured
  concurrency cap of 0, a maximum delegation depth, an input-size limit, an exhausted account
  quota or plan. Waiting cannot clear those, so the retry loop would burn 30/60/120 seconds and
  then report "no user action needed" about a condition that needs exactly that.
- When retryability is not explicit, default to `unavailable`. The two classes are not
  symmetric: mis-classifying as `unavailable` costs one unnecessary stop the user can act on,
  while mis-classifying as `saturated` hides an actionable failure behind a pointless wait.
- `saturated` never authorises self-execution of a primary artifact or of a blocking review, and never authorises discarding stage progress.
- When the `saturated` retry budget is exhausted, fall through to the hard stop and report the class as `saturated (retry budget exhausted)`.

### Delegation Failure — `saturated` (Bounded Retry)

- Retry the identical delegation with backoff: 30s, then 60s, then 120s. Attempt cap: 3 retries per work order.
- Do not re-scope, re-plan, or re-route the work order between retries — same role, same task.
- The stage stays open and resumable across the wait; completed work orders keep their `PASS` status.
- Report on entering the retry loop and on its outcome:
  - `Delegation deferred: <raw reason or concise summary>`
  - `Failure class: saturated`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Retry condition: retry after <N> seconds / when a delegation slot frees`
  - `Attempts used: <n>/3`
  - `Stage state: held open and resumable — no stage progress discarded`

### Delegation Failure (Hard Stop)

Applies to `unavailable`, and to `saturated` once the retry budget is exhausted.

- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Why stopped: QFAI requires real sub-agent delegation in this environment.`
  - `User action needed: <settings or tooling changes required — or "none; wait for a delegation slot to free" when the class is saturated>`
  - `Retry condition: rerun after the required delegation succeeds`

### Commit Scoping (MUST)

- A delegated agent stages only the paths it declared as deliverables in its
  work order: `git add <path> …`.
- `git add -A`, `git add .` and `git commit -a` are forbidden for delegated
  agents, in both isolation modes. In degraded / shared-index mode the
  concurrent agents share one index, so a sweeping stage command commits a
  sibling agent's in-flight files and misattributes work in the audit trail.
  Under worktree separation there is no shared index and no sibling file to
  sweep, but the command still stages everything else loose in that agent's own
  worktree, so the commit still stops matching its declared deliverables.
- When the agent's deliverable paths are not known up front, it hands back an
  unstaged diff and the orchestrator commits — under the same rule. The
  orchestrator commits one handed-back diff at a time, stages that agent's
  declared paths only, and is equally forbidden from `git add -A` / `git add .`
  / `git commit -a` while a parallel stage is in flight. Being the committer
  does not exempt it; in degraded mode it is the only committer, so a sweeping
  stage there mixes every sibling's work into one commit.
- Isolation requirements for concurrent stages are defined once in
  `constitution/workflow.md#concurrency-stage-independent-mandatory`.

## Work Orders Summary

Every major artifact in the stage should include this table schema:

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1    | <role>           | <instance id>  | <task>     | <refs>       | <refs>        | PASS/REVISE/PENDING          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.
- `Agent instance` is a run-stable identifier for the sub-agent that actually performed the step
  (platform-supplied id where available, otherwise `<role>#<n>` assigned in order of first use).
  It exists so an author→reviewer collision is detectable after the fact from the evidence alone;
  the same instance appearing in an authoring step and in a review step over the same artifact is
  a reviewer-independence violation.
- `PENDING` records a gate that could not be run — the only honest status for the exhausted-budget
  branch below, which mandates it. It is never a substitute for `PASS`: DONE stays blocked while
  any row is `PENDING`, and the stage stays resumable. A skill that allows only `PASS`/`REVISE`
  would force an agent on that path to either break the schema or mislabel an unrun gate.

## Reviewer Gate Baseline

- Final completion gate must be delegated to an independent reviewer.

### Definition: independent reviewer (NORMATIVE)

An **independent reviewer** is a sub-agent that did **not** author or edit any artifact under
review in this run.

- The protected invariant is independence from authorship, not reviewer instance identity.
  An agent that produced or modified none of the artifacts under review is independent even if
  it filled another role earlier in the run; an agent that drafted or edited one of them is not
  independent, however it is routed.
- Independence is judged per review target, over the whole run — not per phase. Authoring in an
  earlier phase disqualifies the agent from reviewing that artifact in a later one.
- Role name alone never establishes independence. Routing dispatches by role; independence is a
  separate constraint the routed agent must satisfy and attest to.
- A reviewer that discovers it authored or edited a review target MUST stop, declare the
  conflict, and hand the same evidence set to a non-participating reviewer. It MUST NOT return
  `PASS` on an artifact it authored.
- This definition governs every skill. Skill-local wording (e.g. `qfai-configure`'s "a reviewer
  who did not modify the config") is an instance of it, not a competing rule.

- Reviewers must verify Drift Protocol enforcement.
- Reviewers must verify test-layer policy enforcement when relevant.
- Do not treat test volume ratios or floors as hard gates unless the skill explicitly says so.
- Do not declare DONE until all routed blocking reviewers return `PASS`.
- Every reviewer returning `FAIL` or `REVISE` must include a concrete fix proposal.

### Round budget (MUST)

- **Two rounds per reviewer per artifact.** Round 1 is the initial review;
  round 2 reviews the fixes. **The budget is spent the moment round 2 returns
  `REVISE`**: the orchestrator MUST NOT start a third review, and MUST stop and
  escalate to the user with the open findings, the fixes already applied, and a
  recommendation. The decision point is round 2's verdict, never a prediction
  about a review that must not run.
- Escalation is not failure. The artifact stays at its current status and the
  user decides: accept with the finding recorded as an Open Question, apply a
  named fix, or drop the item from scope.
- **Completion after escalation.** The user's decision is the exception to
  "no DONE until all blocking reviewers `PASS`", so the escalation has an exit:
  - _Accept as Open Question_ or _drop from scope_ — the artifact may reach
    DONE with the finding recorded; the reviewer's outstanding `REVISE` is
    superseded by the recorded user decision. Cite the decision where the
    stage records decisions (`*_delta.md` / `07_Decisions.md` / a Change
    Request).
  - _Apply a named fix_ — one **verification review** of exactly that fix is
    permitted and does not consume budget (it is round 2b, not round 3). Its
    remit is the named fix only. It may not raise findings unrelated to that
    fix, but a defect the fix **introduced or exposed** is in remit and MUST be
    reported rather than passed over: verifying only the named lines and
    returning `PASS` while a regression sits next to them is a false `PASS`.
    Such a finding escalates immediately (see the severity floor below) and
    still does not start a round 3. The review returns `PASS` or escalates
    again.
  - **One 2b per artifact, total.** The verification review is free of budget,
    not unbounded: a second escalation on the same artifact MUST NOT be
    answered with another _apply a named fix_ + 2b cycle. Without this cap the
    two rules compose into a loop — 2b costs nothing, and escalating again is
    always allowed — so the gate has no guaranteed end. At the second
    escalation the user is offered only _accept as Open Question_ or _drop the
    item from scope_ (subject to the severity floor below); if the floor
    withholds both, the artifact does not reach DONE and the stage stops with
    the finding recorded.
  - **Severity floor on the exit.** _Accept as Open Question_ is NOT available
    for a finding that names a concrete security defect, data loss or
    corruption, or a correctness defect that would break a released contract.
    Present the user only _apply a named fix_ or _drop the item from scope_ for
    those, and say why the third option is withheld. Without this the general
    exit is a route around "deferring such a finding to an Open Question so a
    `PASS` can be returned is prohibited" — one that needs no lateness and no
    reviewer consent, only a user click.
- The round number MUST be recorded on each reviewer response
  (`Round:` in the shared response template).

### Convergence (MUST)

- A finding first raised in round N > 1 MUST state why it was not raisable in
  round N-1 — the fix introduced it, or the fix exposed it. A finding that was
  raisable in round 1 and was not raised is **out of budget**: record it as an
  Open Question or a `*_delta.md` Decision Record for the owning stage, do not
  block on it.
- A reviewer MUST NOT open a new blocking _class_ of finding after the artifact
  under review has been declared stable. New classes go to the owning stage.
- **Severity overrides lateness.** The out-of-budget rule is about review
  discipline, not about shipping known harm. A late finding that names a
  concrete security defect, data loss or corruption, or a correctness defect
  that would break a released contract is **not** deferrable: the orchestrator
  stops and escalates to the user immediately, exactly as it does when the
  round budget is spent. It is still not a third round — no further review is
  started, the finding goes straight to the user with its evidence. Deferring
  such a finding to an Open Question so a `PASS` can be returned is prohibited.
  That prohibition does not depend on lateness or on who proposes the deferral:
  the escalation exit in the round budget withholds _Accept as Open Question_
  for this same class, so a user choice cannot supersede it either.

### Reviewer remit (in scope per stage)

A finding outside the reviewing stage's remit is recorded and deferred, never
blocking:

| Stage              | In scope                                                          | Out of scope (record and defer)                |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------- |
| `/qfai-discussion` | Requirement clarity, scope boundary, decision traceability        | Spec structure, runtime behavior               |
| `/qfai-sdd`        | Spec / contract consistency, testability, traceability edges      | Runtime enforcement correctness, code quality  |
| `/qfai-atdd`       | Obligation coverage, layer placement, annotation validity         | Implementation structure                       |
| `/qfai-implement`  | Code quality, spec alignment of the item, RED/GREEN evidence      | Upstream spec content, contract design         |
| `/qfai-configure`  | Config / manifest validity and the surfaces the run generated     | Spec content, implementation structure         |
| `/qfai-verify`     | Gate execution, evidence completeness, report / artifact fidelity | Authoring quality of the artifacts it verifies |
| `/web-research`    | Source authority and freshness, citation accuracy, claim support  | Spec content, implementation structure         |

**Fallback for any stage not listed.** A stage that references this baseline
without a row above has, as its remit, the artifacts that stage itself
produces; everything upstream of them is out of scope, recorded and deferred.
Add the row when a new stage starts routing blocking reviewers, so the
in/out split is not re-derived per run.

### Finding provenance (MUST)

- Every finding must declare a severity (`blocking` or `advisory`) and a `Traces to:` value.
- `Traces to:` names what the finding enforces. Legal values:
  - an upstream obligation — an `AC-*`, `BR-*`, `TC-*`, `CON-*` ID, or a named constitution/catalog rule **that governs the product's behaviour**;
  - `defect:correctness`, `defect:security`, or `defect:code-quality` — a defect demonstrable from the changed artifacts themselves, cited with the evidence that demonstrates it
    (see `drift-protocol.md#defect-or-new-scope-decide-this-first`). A reviewer who can show the deliverable is wrong on its own terms does not need an `AC-*` to say so;
  - `record:<CODE>` — a defect in the run's own record rather than in the product: a ledger cell, a round block, an evidence anchor, the provenance prose. `<CODE>` names the record rule;
  - `none` — reviewer-originated scope, i.e. a new product obligation upstream never asked for.
- `record:*` and `none` MUST be recorded as `advisory`; neither can be `blocking` or gate `DONE`. A `record:*` finding never re-runs the row: the orchestrator files it in the record-defect queue the
  reviewing stage's own completion contract names, and that contract is what drains it (`drift-protocol.md#the-record-defect-queue`). **The class needs a drain: only a stage whose completion conditions require that queue drained may use it — today `/qfai-implement` alone, so `/qfai-sdd`, `/qfai-atdd`, `/qfai-configure`, `/qfai-verify`, `/qfai-discussion` and `/web-research` reviewers MUST NOT, and there the finding keeps the class it would otherwise have had.** An entry closes only on a repaired record, re-attested in a new pack where a reviewer hashed it; `record:unchecked` is a bug report against `validateTddList` and never a substitute for the repair —
  a record rule worth a round is worth a validator code.
- **Integrity is not record class.** Evidence copied from another round or a sibling row, an anchor resolving to a run other than the one it names, and a false
  `Authored/edited under review` attestation claim work that was not done or independence the reviewer lacked. `agents/qa-gatekeeper.md` and the response rules below refuse a `PASS`
  built on them, so they stay `blocking` as `defect:code-quality` and are never filed as `record:*` — which covers an honestly produced record that is merely wrong.
- A `none` advisory takes the Change Request / Open Question path (`drift-protocol.md#reviewer-originated-obligations`); a `record:*` advisory takes the queue above. Neither goes to the implementer.
- Only `blocking` findings — those citing a behaviour-governing obligation or a defect class — force `REVISE`.

### Reviewer budget exhausted

A blocking review that cannot be delegated because the agent budget is spent is a `saturated`
failure, not a licence to skip the gate or to self-review.

- First apply the `saturated` bounded retry. A freed slot is the preferred outcome.
- If retries are exhausted, a reviewer role MAY be reused sequentially with a cleared context,
  provided the reviewer did not author or edit any artifact under review in this run. The
  protected invariant is independence from authorship, not reviewer instance identity.
- Record the reuse in the Work Orders Summary (`Task title` prefixed `re-review (sequential reuse)`).
- If even sequential reuse is impossible, hard stop with the review gate recorded as `PENDING`
  rather than `PASS`. `PENDING` is not `PASS`; DONE stays blocked and the stage stays resumable.
- Never record a waived or self-performed review as `PASS`.

## Work order template

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
- constitution/drift-protocol.md#core-rule  <!-- the protected set, in front of the agent -->
Constraints:
- must: enforce Drift Protocol
- must: follow applicable test-layer or validation policy
- must_not: patch upstream artifacts directly; every upstream change requires
  STOP + Change Request + owner rerun per constitution/drift-protocol.md
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

## Reviewer response template

```text
Round: 1 | 2 | 2b
Result: PASS | REVISE
Reviewed revision: <git rev> | working-tree+<content hash>
Audited evidence hash: <content hash of the evidence read>   # one line per TDD-ID on a T1 group
Authored/edited under review: none | <artifact refs this reviewer authored or edited in this run>
Findings:
- <issue> | Severity: blocking|advisory | Traces to: <AC-*/BR-*/TC-*/CON-*/rule-name|defect:correctness|defect:security|defect:code-quality|record:<CODE>|none>
Required fixes:
- <action>   # blocking findings only
Advisory / Change Request proposals:
- <proposal>  # findings with `Traces to: none`; not a DONE gate
Evidence checked:
- <refs>
```

`Round` is required — the round budget above is counted from it. `2b` is the
post-escalation verification review of a user-named fix.

- `Audited evidence hash` is REQUIRED wherever the evidence tree is what the
  verdict is about. `Reviewed revision` excludes `.qfai/evidence/**` — see below
  for why it has to — so nothing else pins the RED/GREEN output this reviewer
  read, or the coverage justifications it accepted: edited after a PASS they
  leave the revision unchanged and the verdict reads as fresh. Hash the row's
  **phase-authored** entry, meaning the entry with the reviewer-appended fields
  removed — which is exactly what was read — plus
  `.qfai/evidence/coverage-depth-<spec-id>.md` where the row has one, in the
  same `path + NUL + blob hash` manifest form, sorted by path. **The reviewer
  computes it**, on the evidence it read; an orchestrator filling it in on the
  reviewer's behalf is recording something nobody audited.
- **How to compute it, exactly.** The subject is part of a file, so a
  file-level manifest alone is ambiguous, and two readers hashing different
  extents produce a verdict that is either always stale or never checked. One
  procedure, in four steps:
  1. **Extract — the fields this observation could read, named.** Not "the
     section minus what is written later": the entry keeps growing after every
     observation, so subtracting a list only moved the problem to the next
     field added. The RED gatekeeper hashes an entry that has no GREEN yet, the
     GREEN gatekeeper one that has no `Refactor verify`, and each was stale as
     soon as the phase wrote on. **Three subjects, from the row's
     `### <TDD-ID>` section** of the evidence file its `Layer` owns — the
     heading line through the line before the next `###` heading that names a
     `TDD-` id, or the next `##` / `#` heading, or end of file, **counting only
     headings outside a fenced block** (` ``` ` / `~~~`, closed at that length or
     longer; a body that would close its own fence gets a longer one). Every
     recorded output is fenced for this reason: a test asserting on Markdown
     prints `## ...` of its own, and a boundary that took it dropped the GREEN,
     the `Oracle proof` and the round evidence out of the subject. Each takes
     only its own fields, in the order the contract lists them:
     - **Row identity, in all three**: `TDD-ID`, `Layer`, `Test file` and
       `Selector` — copied from the ledger, which the revision excludes.
       Without them, changing `Selector` after a PASS to another valid test in
       the same file left every hash and revision unmoved, and a verdict that
       only ran the old selector stood as evidence for the new one. Mutable
       bookkeeping — `Status`, `Evidence` — stays out: it moves on its own.

       **The copy is checked against the ledger, not trusted** — the four
       identity fields **and the obligation reference**. Hashing a value the
       entry already holds proves only that the entry has not changed: edit
       `Selector` in `test-list.md` after the PASS and copy, hash and revision
       are all unmoved. Gate item 10 reads the four fields from
       `test-list.md` and requires them to equal the copy; a difference is the
       row moving under its own evidence, and the verdict is not fresh. The
       obligation is on that list for the same reason: change `TC-Refs` /
       `US-Refs` / `CON-API-Refs` alone after the PASS and the entry still holds
       the old copy, so a verdict about one requirement stands for another.

     - **RED observation**: the obligation reference the row's
       `Layer` selects (`TC-ref`, or `US-ref` on `E2E` and `CON-API-ref` on
       `API` — an ATDD-owned row has no `TC-ref`, so naming only that one left
       its obligation outside every hash), `RED test hash`, the row's own
       transient revision (`RED revision` or `Falsifiability revision`), and the
       RED pair or the falsifiability trio with `RED failure mode`. **Not
       `Revision`**: it names the tree the GREEN landed at and does not exist
       yet, so including it made every correct RED PASS stale at GREEN.
     - **GREEN observation**: the RED subject plus `Revision`, the GREEN pair,
       `Oracle proof` and, where the row has one, `Replacement proof revision` —
       it addresses the tree a re-taken proof ran against, which the revision
       does not reach, so a subject without it let that proof be attributed to a
       tree it never ran on.
     - **Stage review** (a `completion-reviewer` judging a stage rather than a
       row — a spec with no ATDD-owned rows is the ordinary case, and
       `qfai-atdd/SKILL.md` treats zero as a legitimate count): the stage
       evidence file **whole**, under its repo-relative path, plus
       `.qfai/evidence/coverage-depth-<spec-id>.md` whole — **minus the
       `## Final status` section**, which the P8 reviewer's own answer fills in.
       Whole-file included it, so writing PASS and the confirmer's name straight
       after hashing made the verdict stale on being recorded. There is no
       `### <TDD-ID>` section to extract and no per-row boundary to draw, so the
       rest of the file is the subject; step 2 normalizes it, steps 3 and 4 are
       unchanged.
       Without this the final review of such a spec either omitted a required
       field or PASSed with nothing pinning the evidence it read.
     - **Branch 3** (`exception`): row identity, the obligation reference the
       row's `Layer` selects, the `DR-ID`, and the `DR-*` artifact it names. The
       obligation is what the DR says cannot be observed, so a subject without
       it let the reference be pointed at a different requirement after the PASS
       — the ledger is out of the revision, and item 10's identity check covers
       four fields, so nothing moved. Item 10 checks this one against the ledger
       as well. There is no RED and no GREEN on this branch — the
       claim is that neither could be had — so the DR **is** the evidence, and
       leaving it out of every subject let the pointer be swapped after the PASS
       for another existing `DR-*`, one already waived perhaps, with the
       revision and the hash both unmoved. Gate item 10 also requires the
       verdict to name the `DR-ID` the row currently carries.
     - **Completion review** (`completion-reviewer` / `implementation-reviewer`):
       the GREEN subject plus `Refactor verify command` / `result`, the
       `Shared-artifact re-verify` block when the row has one — it records the
       earlier rows' re-runs and re-taken proofs, which these reviewers are the
       ones who audit, so leaving it out let it be edited or deleted without
       moving either hash — and, from every `### Round N` block the row
       carries, that block's **phase-authored** fields only. `Round N: reviewer verdict` is written by these reviewers
       after they have read the block, so taking the whole block put their own
       line inside what they hashed.

     A field absent at that point contributes nothing — it is not a placeholder
     and not an error. Nothing written after an observation is in its subject,
     which is what makes a verdict re-checkable at all: gate item 10 recomputes
     each one against its own list. **When in doubt about a new field, ask which
     observation could have read it**; that is the whole rule, and it is why the
     subjects are named rather than derived by subtraction. **A field written
     after every reviewer is in no subject at all** — the checkpoint pair, which
     the revision and the pack seal both miss — so it carries a seal of its own,
     taken as it is written and recomputed by the gate that reads it.

  2. **Normalize.** LF line endings; strip trailing whitespace from every line;
     drop leading and trailing blank lines; end with exactly one newline.
  3. **Serialize.** One record per artifact — the repo-relative path, a NUL
     byte, then the SHA-256 of that artifact's normalized bytes — sorted by
     path, joined with newlines. **This is the audit hash, not the working-tree
     revision**: that one has its own four steps, including the untracked
     record's `kind` and `mode`, in
     `../skills/qfai-implement/references/evidence-revision.md`, and restating
     it here is how the two came to disagree. Two artifacts: the extracted
     section, recorded under the evidence file's path, and
     on a branch-3 row the `DR-*` artifact the row names, whole, under its
     repo-relative path — the subject says the DR is that branch's evidence, and
     a subject with no record for it is a hash that does not move when the DR
     text changes; and
     the part of `.qfai/evidence/coverage-depth-<spec-id>.md` that belongs to
     this row's obligation — not the file whole, and matched **exactly**. A
     row may legitimately carry several (`TC-Refs: TC-0001, TC-0002`), so split
     the copied column on commas first and take each id in the order the column
     lists them; comparing the whole column against a single-id matrix cell
     matched nothing, and a row with two obligations had no matrix rows in its
     subject at all. For each id: the table rows whose obligation cell equals it
     (`TC-0001` does not match `TC-00011`), plus each justification paragraph
     whose first line names it. A justification that names no obligation belongs to
     none of them and is left out; "everything after the table" was the other
     reading, and two readers taking one each computed different hashes from one
     file. The matrix is one document
     for the spec and a later `/qfai-atdd` run recomputes it, so hashing all of
     it made every existing verdict stale when an unrelated obligation's cell
     moved, and a `done` row has no re-review path to clear that. Take the table
     rows whose obligation column matches, with any justification lines under
     them, normalized by step 2 as well; a row whose obligation appears nowhere
     in the matrix contributes nothing.
  4. **Hash.** SHA-256 of that record list; record the hex digest.

  **A T1 coherent group is one pass and several rows** (`volume-policy.md`).
  One hash over a representative would leave the other members' evidence free to
  change after the PASS, and a private concatenation of their sections has no
  defined member order or record shape for gate item 10 to reproduce. Record
  **one `Audited evidence hash` per `TDD-ID` in the group**, each by these four
  steps over that row's own subject, listed in the verdict beside the id it
  belongs to. Nothing about a group is special then; it is the single-row rule
  applied as many times as the group has members.

  Gate item 10 runs the same four steps. A row with no coverage-depth file, or
  none whose matrix names its obligation, has one record rather than a
  placeholder — an absent artifact contributes nothing, not a name with an empty
  hash.

- `Reviewed revision` is REQUIRED. It names the state the verdict describes — a `git rev-parse HEAD`
  value, or `working-tree+<content hash>` when the tree is uncommitted, computed by
  the four-step procedure in `../skills/qfai-implement/references/evidence-revision.md`:
  collect, exclude, serialize, hash. **Do not restate it**: it was restated here as
  `path + NUL + hash`, the canonical since gained the untracked record's `kind`
  and `mode`, and the two spellings gave producer and reviewer different
  addresses for one tree on any run with an untracked file in it — which a new
  acceptance test is.
  **The ledger, the evidence tree and the review pack are excluded**, exactly
  as that contract says — `.qfai/specs/*/tdd/test-list.md`, `.qfai/evidence/**`
  and `.qfai/review/**`. The pack is on the list because a project may
  legitimately track it, and then storing R01 moves the address R02 computes,
  so items 7-8 could not PASS on one revision. The phases write `test-list.md`
  and `.qfai/evidence/**` between the
  GREEN and the reviews, so hashing all of `git diff HEAD` here produced a
  `Reviewed revision` that could never equal the phase-authored `Revision` —
  and gate item 10 wants them equal. `references/evidence-revision.md` is the
  field's contract and this restates it; the two have to agree or the verdict
  cannot be re-checked. **Not** a
  `git status --porcelain` digest: that names the changed paths and their states, so it does not
  move when only the content of an already-changed file does, and a stale PASS reads as fresh.
  Without
  it a verdict cannot be re-checked, cannot be invalidated by a later commit, and cannot be told
  apart from a stale one, so "stale evidence MUST NOT be reused" has nothing to compare against.
  Reviewers are dispatched against the integrated tree by design, so the tree is legitimately
  allowed to move under them: an honest, independent verdict on a tree that no longer exists is the
  normal failure this field addresses. If the tree changed mid-review, say so and name the revision
  the ruling is pinned to.
- `Authored/edited under review` is REQUIRED. A response omitting it is not a valid review verdict.
- Anything other than `none` is a declared independence conflict: the verdict cannot be `PASS`,
  and the review must be handed to a non-participating reviewer (see
  `Definition: independent reviewer`).
- `Result: REVISE` is legal only when at least one finding is `Severity: blocking`. A response
  whose findings are all advisory returns `Result: PASS` with the proposals attached.

### Verdict vocabulary

- Reviewer responses in-flight use `Result: PASS | REVISE` (this file).
- `summary.json` archived into review packs historically uses
  `status: "PASS|FAIL"` (validated by the review-artifact validator
  shipped inside the QFAI package, which `npx qfai validate` runs).
- A `REVISE` verdict during iteration maps to `status: "FAIL"` when the
  final `summary.json` is written; they represent the same outcome.
  Review packs should not invent a third verdict.
