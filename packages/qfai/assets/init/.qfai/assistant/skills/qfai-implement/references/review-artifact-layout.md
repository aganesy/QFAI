# Review Artifact Layout

Items 7-9 of the 12-point reviewer gate in `SKILL.md` are evidence-bearing: the reviewer verdicts
must be written to a review pack, not left in conversation. There is exactly **one**
`.qfai/review/**` layout — the one the review-artifact validator shipped inside the
QFAI package enforces under `npx qfai validate`, and `npx qfai doctor` archives:

```text
.qfai/review/review-<YYYYMMDDhhmmssSSS>/     # 17-digit timestamp; no other directory shape is recognized
├── review_request.md                        # required
├── R01_<reviewer-id>.md                     # one per reviewer that responded; see the zero-response note
└── summary.json                             # required
```

- One pack per review round. A round covers one `TDD-ID`, or the members of one T1 coherent group
  (`volume-policy.md#batched-review`). Do not nest `<scope>/<layer>/attempt-NN/`
  directories under `.qfai/review/` — that layout is not validated and packs written there are
  invisible to `npx qfai validate`.
- The scope of the pack is recorded **inside** the artifacts, not in the directory name. In
  `summary.json` set `target.kind: "spec"` and `target.path` to the spec dir, and name the round's
  `TDD-ID`s in `review_request.md` as a **list** — one id for a T2 or T3 row, the group's whole
  membership for a T1 coherent group, written as the single block `volume-policy.md#batched-review`
  already requires of the evidence file. The verdict then carries one `Audited evidence hash` per
  listed id (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`).
- A T1 group review is **one round**, not one turn per member — and not one turn in total. Each
  reviewer this pack carries (`completion-reviewer`, `implementation-reviewer`, and
  `product-surface-reviewer` where item 9 applies) takes **one** turn over the whole group, as
  `volume-policy.md#batched-review` requires, so that gate items 7, 8 and 9 all have their
  verdicts. Those turns share **one** pack: one `R0N_<reviewer-id>.md` per reviewer inside it, and
  one `reviewers[]` entry each in `summary.json`. Do not write a pack per member: N packs assert N
  rounds, N-1 of which never happened, each holding a copy of the same verdict. Every member row's
  `Review pack seal` at gate item 10 is therefore the same seal over the same
  `review-<timestamp>/` directory **for that round**.
- **`qa-gatekeeper` is not in the pack, and gate items 3 and 5 are not pack verdicts.** This
  layout covers items 7-9, as the first line of this file says; the RED and the GREEN are
  _observations_, and the per-item evidence contract records them as **phase-authored fields of
  each member row's own entry** — `Round N: RED revision`, `RED command` / `RED result` /
  `RED failure mode`, then `Revision`, `GREEN command` / `GREEN result` and `Oracle proof`
  (`SKILL.md#per-item-evidence-contract-fresh-evidence-required`). Only the three reviewers above
  appear under _Gate-completed_. That is what keeps the two observations apart without a second
  pack: they are distinct fields at distinct revisions **on the row that was observed**, so a group
  whose members reach RED on different trees records each one truthfully and neither can overwrite
  the other. `volume-policy.md` batches the _gatekeeping_ — "confirms RED/GREEN once per coherent
  group" — but a batched confirmation still writes one RED and one GREEN record per member row, and
  the RED is still taken while no production code exists (Handoff Contracts step 2). Do not seal a
  RED into a `review-<timestamp>/`: a pack declares one `revision` and a row carries one
  `Round N: Review pack seal`, so a pack can hold neither several members' RED revisions nor a
  second seal beside the round's own.
- Say which stage wrote the pack: `producer: "implement"` in `summary.json`, and a
  `- Producer: implement` line in `review_request.md`. Both, because `summary.json` is written
  last — the request line is the only thing that answers the question while the pack is in
  flight. The allowed values are `discussion`, `sdd` and `implement`; a pack that declares none
  is placed by its `target.kind`, which cannot tell an implementation pack from an SDD one, so
  it is judged by the SDD gate as well.
- Minimum `summary.json` shape (`version: "2.0"`):
  `version`, `created_at`, `producer`, `target.{kind,path}`, `routing_profile`,
  `overall_status` (`PASS|FAIL`),
  `reviewers[]` where each entry is `{ reviewer, status: PASS|FAIL|NA, feedback_count }`,
  **and may be empty** — see the zero-response note below,
  **`revision_form: "content-hash"`** and **`revision`** — the state these verdicts describe, as a
  git rev or `working-tree+<content hash>` by the procedure in
  `evidence-revision.md`. Both are required, and **omitting either is a current-contract violation**, not a way to be read as
  older: a pack that declares the contract and names no tree cannot be re-checked, and one that
  declares no form at all is a producer that forgot. Only `revision_form: "legacy"`, corroborated by
  `.qfai/review/.legacy-packs`, marks a pack as predating the form.
  A `REVISE` verdict during iteration is written as `status: "FAIL"` here — see
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`.
- **A round that produced no responses is written down, not left as an absence.** When the routed
  reviewers die before writing anything, the pack still gets its `summary.json`, declaring
  `reviewers: []` and `overall_status: FAIL` — a round that returned no verdict returned no
  passing one. That declaration is what stands `QFAI-REVIEW-005` down; the summary must be present
  and schema-valid, which is what separates a statement from a pack somebody forgot to seal. The
  check runs both ways: a pack declaring `reviewers: []` with report files beside it fails too.
- Each additional review round creates a **new** `review-<timestamp>/` pack. Do not append
  ad-hoc per-round filenames inside an existing pack.
- A **record re-attestation** takes a new pack of this same shape, even though it is not a round
  (`.qfai/assistant/constitution/drift-protocol.md#the-record-defect-queue`). It carries the same
  `Reviewed revision` and `Result` as the verdict it supersedes and a recomputed
  `Audited evidence hash`; `summary.json` names the same `revision`. It is a separate pack because
  the superseded verdict's pack is fixed by a `Review pack seal` the completion gate recomputes —
  editing that pack to restamp a hash would break the seal, and editing only the evidence file's
  copy would leave the sealed response disagreeing with it. Both packs are sealed and both seals
  are recomputed at the gate.
- A response's `Result`, `Reviewed revision` and `Audited evidence hash`, and the `TDD-ID` in
  `review_request.md`, are read from the **visible** Markdown and must each appear exactly once.
  A line inside a fenced sample or an HTML comment is not a verdict — it is invisible to the
  person reading the response — and two `Result` lines are not a verdict either, they are a
  document a reader can take either answer from. A blocking `REVISE` beside a hidden or duplicated
  `PASS` is rejected.
- Review packs are local-only by default and therefore are absent in an ordinary fresh clone.
  The producer still creates and validates the pack before closing the row. At a later validation,
  gate item 10 recomputes the pack seal and its request/summary/response bindings whenever the
  named directory is present; when the exact directory is absent, it validates the committed
  verdict, revision, audited-evidence hash, canonical pack path, recorded seal and checkpoint
  instead. A pack path that exists but is malformed is always an error — deleting or renaming
  files inside a present pack is not the fresh-clone case.
- `QFAI-REVIEW-*` is reported by `--profile sdd` and `--profile discussion` — the profiles whose
  RCP footer mandates the pack — and by the full-scan profiles. `--profile tdd` does not report it,
  so a malformed or missing `summary.json` still passes the implementation gate on its own. Run
  `npx qfai validate --profile verify --fail-on error` (or the default full scan,
  `npx qfai validate --fail-on error`, or `/qfai-verify`, which runs the same profile) to see them
  alongside everything else.
- Each stage profile gates the packs its own stage produced: `--profile sdd` judges `producer: "sdd"`
  packs and `--profile discussion` judges `producer: "discussion"` ones, so one stage's in-flight
  pack never fails another stage's gate. An implementation pack belongs to neither — it declares
  `producer: "implement"` — and is judged by the full-scan profiles, which judge every pack.
- `target.kind` and `target.path` must agree, and so must `producer`: a `path` under the configured
  `specsDir` is a `spec` target, one under `discussionDir` is a `discussion` target. A declaration
  the path contradicts raises `QFAI-REVIEW-007` and is discarded — the path decides which gate the
  pack faces, so a wrong `kind` is never a way out of one. A `path` under neither root (an
  implementation pack naming a source file) proves nothing and is left alone.
- A `--spec <id>` run judges only the packs attributed to that spec: by `summary.json#target.path`,
  or — when `summary.json` is missing or unparseable — by the paths `review_request.md` names. A
  pack that forgot its `summary.json` is therefore still caught by its own spec's gate, while a
  sibling worker's in-flight pack stays out of it. Discussion packs belong to no spec, so `--spec`
  keeps them: they are repo-level, and the scope contract keeps repo-level findings in every slice.
  A pack that names its target in neither file is attributed to no one: `--spec` leaves it to the
  unscoped run, and both stage profiles judge it, since no other gate would.
- A directory under `.qfai/review/` whose name is not `review-<17-digit-timestamp>` is not a pack:
  its contents are never inspected, in any profile. `QFAI-REVIEW-010` (`info`) names each one so
  that a mis-named pack is visible rather than silently uninspected.
