# Review Artifact Layout

Items 7-9 of the 11-point reviewer gate in `SKILL.md` are evidence-bearing: the reviewer verdicts
must be written to a review pack, not left in conversation. There is exactly **one**
`.qfai/review/**` layout, the one validated by
`packages/qfai/src/core/validators/reviewArtifacts.ts` and archived by `npx qfai doctor`:

```text
.qfai/review/review-<YYYYMMDDhhmmssSSS>/     # 17-digit timestamp; no other directory shape is recognized
├── review_request.md                        # required
├── R01_<reviewer-id>.md                     # required, at least one; R02_, R03_, ... per reviewer
└── summary.json                             # required
```

- One pack per review round for one `TDD-ID`. Do not nest `<scope>/<layer>/attempt-NN/`
  directories under `.qfai/review/` — that layout is not validated and packs written there are
  invisible to `npx qfai validate`.
- The scope of the pack is recorded **inside** the artifacts, not in the directory name. In
  `summary.json` set `target.kind: "spec"` and `target.path` to the spec dir, and name the
  `TDD-ID` in `review_request.md`.
- Minimum `summary.json` shape (`version: "2.0"`):
  `version`, `created_at`, `target.{kind,path}`, `routing_profile`, `overall_status` (`PASS|FAIL`),
  `reviewers[]` where each entry is `{ reviewer, status: PASS|FAIL|NA, feedback_count }`,
  **`revision_form: "content-hash"`** and **`revision`** — the state these verdicts describe, as a
  git rev or `working-tree+<content hash>` by the procedure in
  `evidence-revision.md`. Both are required, and **omitting either is a current-contract violation**, not a way to be read as
  older: a pack that declares the contract and names no tree cannot be re-checked, and one that
  declares no form at all is a producer that forgot. Only `revision_form: "legacy"`, corroborated by
  `.qfai/review/.legacy-packs`, marks a pack as predating the form.
  A `REVISE` verdict during iteration is written as `status: "FAIL"` here — see
  `shared-skill-delegation-baseline.md#verdict-vocabulary`.
- Each additional review round creates a **new** `review-<timestamp>/` pack. Do not append
  ad-hoc per-round filenames inside an existing pack.
- `QFAI-REVIEW-*` is reported by `--profile sdd` and `--profile discussion` — the profiles whose
  RCP footer mandates the pack — and by the full-scan profiles. `--profile tdd` does not report it,
  so a malformed or missing `summary.json` still passes the implementation gate on its own. Run
  `npx qfai validate --profile verify --fail-on error` (or the default full scan,
  `npx qfai validate --fail-on error`, or `/qfai-verify`, which runs the same profile) to see them
  alongside everything else.
- Each stage profile gates the packs it owns: `--profile sdd` judges `target.kind: "spec"` packs and
  `--profile discussion` judges `target.kind: "discussion"` ones, so one stage's in-flight pack never
  fails the other stage's gate. The full-scan profiles judge both.
- A `--spec <id>` run judges only the packs attributed to that spec: by `summary.json#target.path`,
  or — when `summary.json` is missing or unparseable — by the paths `review_request.md` names. A
  pack that forgot its `summary.json` is therefore still caught by its own spec's gate, while a
  sibling worker's in-flight pack stays out of it. A pack that names its target in neither file is
  attributed to no one: `--spec` leaves it to the unscoped run, and both stage profiles judge it,
  since no other gate would.
- A directory under `.qfai/review/` whose name is not `review-<17-digit-timestamp>` is not a pack:
  its contents are never inspected, in any profile. `QFAI-REVIEW-010` (`info`) names each one so
  that a mis-named pack is visible rather than silently uninspected.
