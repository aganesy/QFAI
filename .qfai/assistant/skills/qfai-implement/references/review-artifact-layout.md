# Review Artifact Layout

Items 7-9 of the 11-point reviewer gate in `SKILL.md` are evidence-bearing: the reviewer verdicts
must be written to a review pack, not left in conversation. There is exactly **one**
`.qfai/review/**` layout, the one validated by
`packages/qfai/src/core/validators/reviewArtifacts.ts` and archived by `npx qfai doctor`:

```text
.qfai/review/review-<YYYYMMDDhhmmssSSS>/     # 17-digit timestamp; no other directory shape is recognized
├── review_request.md                        # required
├── R01_<reviewer-id>.md                     # one per reviewer that responded; see the zero-response note
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
  ad-hoc per-round filenames inside an existing pack. Once the round's last reviewer response has
  landed, that directory is sealed and the seal is recorded outside it, per round and naming the
  pack it seals — `evidence-revision.md#review-pack-seal`. A pack nobody sealed is a pack any
  later edit reaches unnoticed.
- Review artifacts are checked only by the full-scan profiles. Neither `--profile tdd` nor
  `--profile sdd` reports `QFAI-REVIEW-*`, so a malformed or missing `summary.json` passes both.
  Run `npx qfai validate --profile verify --fail-on error` (or the default full scan,
  `npx qfai validate --fail-on error`, or `/qfai-verify`, which runs the same profile) to see them.
