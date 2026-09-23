# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- AC-Refs: AC-0004-0001, AC-0004-0026
- `qfai validate` checks schema, evidence, and canonical validator rules.

## BR-0004-0002: UI Evidence Is Screen-Scoped

- AC-Refs: AC-0004-0002
- Validation of prototyping evidence is keyed by declared screen IDs from canonical screen contracts.

## BR-0004-0003: Missing Screenshot

- AC-Refs: AC-0004-0003
- Missing screenshot evidence emits `QFAI-UIE-001`.

## BR-0004-0004: Missing HTML

- AC-Refs: AC-0004-0004
- Missing HTML snapshot evidence emits `QFAI-UIE-002`.

## BR-0004-0005: Safe Skip Without Screen Contract

- AC-Refs: AC-0004-0005
- If no canonical screen contract is available, the UI evidence artifact validator skips instead of over-firing.

## BR-0004-0006: Skill Contract Validator

- AC-Refs: AC-0004-0006
- The prototyping skill validator checks current section presence, canonical evidence paths, and CLI-removal wording.

## BR-0004-0007: Legacy Validator Slices

- AC-Refs: AC-0004-0007
- Legacy design-system or artifact validators may remain in validate while corresponding code still exists.
- They do not redefine the current public execution model.

## BR-0004-0008: DESIGN.md Presence Validator

- AC-Refs: AC-0004-0008
- DCON-030 reads root `DESIGN.md` at validate time and checks for the four required token tables (color, typography, radius, shadow) per `references/design-md-spec.md`.
- Absent file or unparseable structure emits `QFAI-DCON-030` at error severity; presence + parseability passes.

## BR-0004-0009: DESIGN.md Lock Hash Integrity

- AC-Refs: AC-0004-0009
- DCON-031 computes `sha256(DESIGN.md bytes)` and compares it against `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.
- Mismatch emits `QFAI-DCON-031` at error severity, including both hashes in the message.

## BR-0004-0010: design-system Mirror Integrity

- AC-Refs: AC-0004-0010
- DCON-032 parses `.qfai/contracts/design/design-system.yaml` and compares its token tables byte-for-byte against the parsed token tables of root `DESIGN.md`.
- Any per-category divergence emits `QFAI-DCON-032` at error severity, naming the diverging category.

## BR-0004-0011: prototypingEvidenceV3 Schema Validation

- AC-Refs: AC-0004-0011
- prototypingEvidenceV3 validator enforces schema v3 on each `iter-NN/review.json`: required keys `scores` (4 UX axes ordinal), `proseCritique` (within its cap; the unit is selected by the text and neither unit has a lower bound), `pivotDirective` (∈ continue|refine|pivot), `layoutAntiPatternsDetected`, `designMdViolations`.
- Schema violation emits `QFAI-PROT-002` at error severity. v1.x fields (`mode`, `fullHarness`, `scoringTrace`, `allReviewerAxesPerfect100`) being present is an additional schema warning.

## BR-0004-0012: layoutAntiPatternsDetected Whitelist

- AC-Refs: AC-0004-0012
- Any string in `layoutAntiPatternsDetected` that `packages/qfai/assets/validators/layoutAntiPatterns.json` does not declare rejects the review.json.
- Detection of any `lap-*` token caps `informationArchitecture` at `acceptable` (cross-validated against AC-0012-0024 in spec-0012).

## BR-0004-0013: designMdViolations Shape and findDesignMdViolations Purity

- AC-Refs: AC-0004-0013, AC-0004-0014
- Each `designMdViolations` element MUST have exactly the keys `{category, expected, found, location}` with `category` ∈ `{color, font, radius, shadow}`.
- The producer `findDesignMdViolations(html, designMd)` is pure and deterministic; it MUST NOT touch `fs`, `process`, `Date.now`, network, or any side-channel.
- Non-empty `designMdViolations` blocks `/qfai-prototyping` convergence; convergence semantics are deferred to spec-0012, while spec-0004 only validates the data shape and producer purity.

## BR-0004-0014: 4-layer asset-tree enum is closed

- AC-Refs: AC-0004-0015
- `.qfai/assistant/` 直下に許可されるディレクトリ名は exactly `{constitution, manifest, catalog, process}` の 4 種類。他名は warning として surface する (deprecation window 中)。validator は `assistantPaths.ts#CANONICAL_LAYER_NAMES` を SSOT として参照する。

## BR-0004-0017: justification non-empty required for R-REJECTED-READOPT

- AC-Refs: AC-0004-0018
- An `R-REJECTED-READOPT` finding object requires a non-empty `justification: <string>` (trimmed length > 0); an empty, whitespace-only or missing value is an advisory-failing error. `R-WORKLOG-DRIFT` is no longer a Reviewer-Gate code; a report carrying it raises no justification finding.

## BR-0004-0021: sunset minor named in deprecation warning

- AC-Refs: AC-0004-0022
- `D-DEPRECATED-PATH` warning 本文には sunset minor version (例: `v1.10.0`) が文字列リテラルで含まれる。曖昧表現 (例: "次の release") は使用禁止。sunset SSOT は `core/paths/assistantPaths.ts#legacyAssistantSteeringSunsetLabel` (`"1.10.0"`)。

## BR-0004-0022: project_memory block required per skill

- AC-Refs: AC-0004-0023
- `.qfai/assistant/skills/qfai-*/SKILL.md` の trailing YAML block は `project_memory:` key を必ず含む。`reads:` (array of layer-relative paths) と `writes:` (array、空でも OK) を sub-key として持つ。

## BR-0004-0023: SKILL.md broken-ref surface

- AC-Refs: AC-0004-0024
- SKILL.md 本文の `.qfai/assistant/...` パス参照は validator が path-resolve する。解決失敗 → `W-SKILL-DOC-BROKEN-REF` (warning)。`assistantPaths.ts` で定義された canonical layer 配下に存在しない参照は broken と扱う。

## BR-0004-0024: informational pass-through preserved

- AC-Refs: AC-0004-0025
- `W-USER-EDIT-PRESERVED` は info severity の pass-through。warning/error として escalation してはいけない。validate report の "Informational" section に表示し、`counts.info` に算入する。

## BR-0004-0025: validate.json profile disambiguation

- AC-Refs: AC-0004-0031
- `qfai validate` の出力 path は次の SSOT 規約に従う:
  - profile-suffixed: `.qfai/report/validate-<profile>.json` — profile 別に独立、上書き禁止
  - always-latest: `.qfai/report/validate.json` — 直近 run を反映、top-level `profile: <string>` field を必須とする
- profile が明示されない run では `profile: "default"` を採用する。並行する複数 profile 実行で profile-suffixed path が衝突しないことが保証される。

## BR-0004-0026: legacy validate.json deprecation window

- AC-Refs: AC-0004-0032
- 旧 `.qfai/output/validate.json` への書き込みは deprecation window 中継続するが、書き込みと同時に `D-DEPRECATED-PATH` warning を fire する。warning 本文には sunset 版 `1.10.0` を文字列リテラルで含める (曖昧表現禁止、BR-0004-0021 の sunset-named パターンを再利用)。
- 実行時の tool 版が sunset 以上に達した時点で同条件は error にエスカレートし、旧 path への書き込みは停止する。SSOT 定数は spec-0004 owned validator 側で参照する。

## BR-0004-0027: SSOT-sync pair-changed CI lane

- AC-Refs: AC-0004-0033, AC-0004-0034
- 新 CI lane (`pnpm ci:lint` 配下) は次の pair-changed invariant を強制する:
  - 片方のみ変更: `findDesignMdViolations.ts` または `generator-prompt.md` のうち一方のみが PR で変更された場合、lane は FAIL し `R-PROMPT-SCANNER-DRIFT` (severity error) を emit する
  - 両方変更: 両ファイルが同一 PR で touched なら lane は pass する
  - 両方未変更: lane は silently pass する (no finding)
- pair の SSOT は本 BR (lane 設定は実装側で同 BR を参照)。lane は `.agents/rules/distributed-surface.md` の layer-1/2/3 mirror invariant pattern を再利用する。

## BR-0004-0028: R-PROMPT-SCANNER-DRIFT justification 3-part contract

- AC-Refs: AC-0004-0035
- `R-PROMPT-SCANNER-DRIFT` finding object は `justification: <string>` (non-empty, trimmed length > 0) を必須とする。`justification:` 本文は次の 3 要素を含むこと:
  1. 修正されたファイル path
  2. 対応する修正が欠落しているカウンターパート path
  3. match を確認できない契約条項 (clause text or anchor)
- 3 要素のうち 1 つでも欠落した justification は schema 違反として advisory-failing error として扱う。
- `qfai validate` rejects an empty, whitespace-only or missing `justification:` at once, the same shape as BR-0004-0017.

## BR-0004-0029: certify reads validate.json with profile awareness

- AC-Refs: AC-0004-0031, AC-0004-0032
- certify 系コマンドが `validate.json` を読む際は top-level `profile` field を必ず照合し、期待 profile と一致しない場合は読込を中断し再実行コマンドを operator に提示する。
- 旧 `.qfai/output/validate.json` を読む下流は deprecation window 中は許容するが、`D-DEPRECATED-PATH` warning を伝搬する。sunset 後は読込自体を error として扱う。

## BR-0004-0030: SaaS-package validate profile (REQ-0166 validate side)

- AC-Refs: AC-0004-0036
- `qfai validate --profile saas-package` PASSes only when ALL three conditions hold: (a) the prototyping-profile validate PASSes, (b) a DCON-005 design-system attestation is present at `.qfai/contracts/design/design-system.yaml`, and (c) the CLI-HANDOFF cross-skill handoff schema PASSes (per `_policies/05_Contracts.md` §CHG-006).
- ATDD-class and implement-class gates MUST be SKIPPED under this profile, and each skip MUST be surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate.
- This is the validate side of REQ-0166; the certify side (`qfai prototyping certify --scope saas-package`) is owned by spec-0014 (same Source REQ, file-local IDs). The skipped gates named here MUST match what the certify-side `notes:` field reports.

## BR-0004-0031: `primary_tasks` shape acceptance + count band (REQ-0164)

- AC-Refs: AC-0004-0037
- `auditProfile.ts` MUST accept BOTH the legacy string-only `primary_tasks` form AND the structured form `{ id: string, label: string, acceptance: string }` with all three required and `additionalProperties: false` (per DR-0268).
- String-only items MUST continue to PASS during the deprecation window (one-minor window per OC-63); a `D-DEPRECATED-*` warning may fire on string-only at sunset.
- The `QFAI-AUD-020` warning text MUST name the recommended count band `3..7` (per DR-0267).

## BR-0004-0032: pack-location lint lane emits R-PACK-LOCATION-DRIFT (REQ-0167)

- AC-Refs: AC-0004-0038
- `packages/qfai/scripts/check-pack-locations.mjs` MUST scan staged / changed directories (not a full-tree walk, per DR-0274) for `review-*/` or `discussion-*/` directories outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`) and be wired into `pnpm ci:lint`.
- On a misplaced directory the lane MUST emit `R-PACK-LOCATION-DRIFT` (severity error, advisory-failing) referencing `.agents/rules/root-additions-policy.md` and proposing the correct allowed-root path.

## BR-0004-0033: pack-location lane is scoped and non-flagging on clean PRs (REQ-0167)

- AC-Refs: AC-0004-0039
- The lane MUST pass silently (no `R-PACK-LOCATION-DRIFT`) when pack directories are added only under allowed roots or when no pack directory is touched.
- Pre-existing legacy packs on unrelated PRs MUST NOT be re-flagged — scope is staged/changed dirs only (per DR-0274).

## BR-0004-0034: validate does not read the work-log directory

- AC-Refs: AC-0004-0040
- Contract-Refs: CLI-VAL
- `qfai validate` does not read `.qfai/steering/` and reports nothing about it.
- The withdrawn schema is not in the governed-asset manifest, so a remaining `.qfai/assistant/catalog/worklog-entry.schema.md` is an unshipped file and raises `QFAI-ASSETS-006`.

## BR-0004-0035: a blocked row needs only its Blocked-By

- AC-Refs: AC-0004-0041
- Contract-Refs: CLI-VAL
- A `blocked` ledger row needs only a well-formed `Blocked-By`: what the row waits on, then `— blocked at <status>`, where the status is one of `todo`, `red`, `green`, `refactor` or `review-fix`.
- Ledger checks do not read `.qfai/steering/`.
