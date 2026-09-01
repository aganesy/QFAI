# Review Artifact Layout

Items 7-9 of the 11-point reviewer gate in `SKILL.md` are evidence-bearing: the reviewer verdicts
must be written to a review pack, not left in conversation. There is exactly **one**
`.qfai/review/**` layout, the one validated by the review-artifact validator
shipped inside the QFAI package and archived by `npx qfai doctor`:

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
  listed id (`shared-skill-delegation-baseline.md#reviewer-response-template`).
- A T1 group review is **one round**, not one turn per member — and not one turn in total. Each
  required reviewer (`qa-gatekeeper`, `completion-reviewer`, `implementation-reviewer`) takes
  **one** turn over the whole group **per round**, as `volume-policy.md#batched-review` requires,
  so that gate items 3, 5, 7 and 8 all have their verdicts. Those turns share **one** pack: one
  `R0N_<reviewer-id>.md` per reviewer inside it, and one `reviewers[]` entry each in
  `summary.json`. Do not write a pack per member: N packs assert N rounds, N-1 of which never
  happened, each holding a copy of the same verdict. Every member row's `Review pack seal` at gate
  item 10 is therefore the same seal over the same `review-<timestamp>/` directory **for that
  round**.
- **`qa-gatekeeper` answers in two rounds over a T1 group, not one**, because RED and GREEN are
  two observations: `volume-policy.md` batches them as "confirms RED/GREEN once per coherent
  group", and the Handoff Contracts take the RED **while no production code exists** and the GREEN
  after it — one combined turn is exactly the post-hoc submission that contract refuses. They
  cannot share a pack either: `summary.json` declares a **single** `revision`, "the state these
  verdicts describe", while gate item 10 puts item 3 at `RED revision` and items 5, 7 and 8 at
  `Revision`. So the group's RED confirmation is sealed in its own `review-<timestamp>/` before
  Green begins, carrying its own `R01_qa-gatekeeper.md` and its own `reviewers[]` entry, and its
  `Audited evidence hash` per listed id is taken over the **RED** subject — a different subject
  from the GREEN one (`shared-skill-delegation-baseline.md#reviewer-response-template`). Each
  member row records both under the `Round N:` prefix `evidence-revision.md` already requires, so
  neither observation overwrites the other and gate items 3 and 5 each keep their own verdict.
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
  `shared-skill-delegation-baseline.md#verdict-vocabulary`.
- **A round that produced no responses is written down, not left as an absence.** When the routed
  reviewers die before writing anything, the pack still gets its `summary.json`, declaring
  `reviewers: []` and `overall_status: FAIL` — a round that returned no verdict returned no
  passing one. That declaration is what stands `QFAI-REVIEW-005` down; the summary must be present
  and schema-valid, which is what separates a statement from a pack somebody forgot to seal. The
  check runs both ways: a pack declaring `reviewers: []` with report files beside it fails too.
- Each additional review round creates a **new** `review-<timestamp>/` pack. Do not append
  ad-hoc per-round filenames inside an existing pack.
- A **record re-attestation** takes a new pack of this same shape, even though it is not a round
  (`../../../constitution/drift-protocol.md#the-record-defect-queue`). It carries the same
  `Reviewed revision` and `Result` as the verdict it supersedes and a recomputed
  `Audited evidence hash`; `summary.json` names the same `revision`. It is a separate pack because
  the superseded verdict's pack is fixed by a `Review pack seal` the completion gate recomputes —
  editing that pack to restamp a hash would break the seal, and editing only the evidence file's
  copy would leave the sealed response disagreeing with it. Both packs are sealed and both seals
  are recomputed at the gate.
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
