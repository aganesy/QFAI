# Review Artifact Layout

Items 7-9 of the 11-point reviewer gate in `SKILL.md` are evidence-bearing: the reviewer verdicts
must be written to a review pack, not left in conversation. There is exactly **one**
`.qfai/review/**` layout, the one validated by
`packages/qfai/src/core/validators/reviewArtifacts.ts` and archived by `qfai doctor`:

```text
.qfai/review/review-<YYYYMMDDhhmmssSSS>/     # 17-digit timestamp; no other directory shape is recognized
├── review_request.md                        # required
├── R01_<reviewer-id>.md                     # required, at least one; R02_, R03_, ... per reviewer
└── summary.json                             # required
```

- One pack per review round for one `TDD-ID`. Do not nest `<scope>/<layer>/attempt-NN/`
  directories under `.qfai/review/` — that layout is not validated and packs written there are
  invisible to `qfai validate`.
- The scope of the pack is recorded **inside** the artifacts, not in the directory name. In
  `summary.json` set `target.kind: "spec"` and `target.path` to the spec dir, and name the
  `TDD-ID` in `review_request.md`.
- Minimum `summary.json` shape (`version: "2.0"`):
  `version`, `created_at`, `target.{kind,path}`, `routing_profile`, `overall_status` (`PASS|FAIL`),
  and `reviewers[]` where each entry is `{ reviewer, status: PASS|FAIL|NA, feedback_count }`.
  A `REVISE` verdict during iteration is written as `status: "FAIL"` here — see
  `shared-skill-delegation-baseline.md#verdict-vocabulary`.
- Each additional review round creates a **new** `review-<timestamp>/` pack. Do not append
  ad-hoc per-round filenames inside an existing pack.
- Review artifacts are checked only by the full-scan profiles. Neither `--profile tdd` nor
  `--profile sdd` reports `QFAI-REVIEW-*`, so a malformed or missing `summary.json` passes both.
  Run `qfai validate --profile verify --fail-on error` (or the default full scan,
  `qfai validate --fail-on error`, or `/qfai-verify`, which runs the same profile) to see them.
