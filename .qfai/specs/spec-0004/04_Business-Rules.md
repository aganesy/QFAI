# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- AC-Refs: AC-0004-0001
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
- prototypingEvidenceV3 validator enforces schema v3 on each `iter-NN/review.json`: required keys `scores` (4 UX axes ordinal), `proseCritique` (200..500 words), `pivotDirective` (∈ continue|refine|pivot), `layoutAntiPatternsDetected`, `designMdViolations`.
- Schema violation emits `QFAI-PROT-002` at error severity. v1.x fields (`mode`, `fullHarness`, `scoringTrace`, `allReviewerAxesPerfect100`) being present is an additional schema warning.

## BR-0004-0012: layoutAntiPatternsDetected Whitelist

- AC-Refs: AC-0004-0012
- Any string in `layoutAntiPatternsDetected` not in `{lap-001-orphan-page..lap-008-no-back-affordance}` rejects the review.json.
- Detection of any `lap-*` token caps `informationArchitecture` at `acceptable` (cross-validated against AC-0012-0024 in spec-0012).

## BR-0004-0013: designMdViolations Shape and findDesignMdViolations Purity

- AC-Refs: AC-0004-0013, AC-0004-0014
- Each `designMdViolations` element MUST have exactly the keys `{category, expected, found, location}` with `category` ∈ `{color, font, radius, shadow}`.
- The producer `findDesignMdViolations(html, designMd)` is pure and deterministic; it MUST NOT touch `fs`, `process`, `Date.now`, network, or any side-channel.
- Non-empty `designMdViolations` blocks `/qfai-prototyping` convergence; convergence semantics are deferred to spec-0012, while spec-0004 only validates the data shape and producer purity.

## BR-0004-0014: 4-layer asset-tree enum is closed

- AC-Refs: AC-0004-0015
- `.qfai/assistant/` 直下に許可されるディレクトリ名は exactly `{constitution, manifest, catalog, process}` の 4 種類。他名は warning として surface する (deprecation window 中)。validator は `assistantPaths.ts#CANONICAL_LAYER_NAMES` を SSOT として参照する。

## BR-0004-0015: work-log frontmatter schema is closed

- AC-Refs: AC-0004-0016
- 必須フィールド: `id`, `status`, `kind`, `created`, `updated`, `scope`, `blocking`, `promote-to`, `links`。enum (canonical contract: `.qfai/contracts/cli/worklog-entry.schema.md`):
  - `status ∈ {active, handoff, archived}`
  - `kind ∈ {milestone, decision, risk, consultation-needed, unexpected, unscoped-discovery, handoff, blocker, scope-up, scope-down, spike}`
  - `scope ∈ {global, spec-NNNN}`
  - `blocking: boolean`
  - `promote-to: null | "spec-NNNN/07_Decisions.md"`
- 違反は `W-WORKLOG-SCHEMA` (warning, non-blocking)。

## BR-0004-0016: link-integrity resolution

- AC-Refs: AC-0004-0017
- `links:` array の各要素は `spec-NNNN` / `discussion-YYYYMMDDhhmmssSSS` / `entry-<id>` のいずれかの prefix。validator は対応するパス (`.qfai/specs/spec-NNNN/`, `.qfai/discussion/discussion-*/`, `.qfai/steering/<id>.md` 等) を probe し、未解決は `W-WORKLOG-BROKEN-LINK` (warning)。

## BR-0004-0017: justification non-empty required for drift findings

- AC-Refs: AC-0004-0018
- `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` finding objects は `justification: <string>` (non-empty, trimmed length > 0) を必須とする。空文字列・undefined・whitespace-only は schema 違反として advisory-failing error にする。

## BR-0004-0018: handoff entry 5-section schema

- AC-Refs: AC-0004-0019
- `kind: handoff` の本文は 5 必須セクション (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first`) を順序通り含む (canonical contract: `.qfai/contracts/cli/worklog-entry.schema.md`)。1 セクションでも欠落 → `R-HANDOFF-INCOMPLETE` (error, advisory-failing)。順序の入れ替わりは warning ではなく検査対象外 (将来検討)。

## BR-0004-0019: promotion gate triplet

- AC-Refs: AC-0004-0020
- decision-promotion が satisfied と判定されるためには (a) entry frontmatter に `promote-to: 07_Decisions.md` が設定済み、(b) `07_Decisions.md` 内に entry を citing する行が存在、(c) entry frontmatter に `promoted-to: <DR-ID>` の back-ref が設定済み、の 3 条件すべてが揃っていること。1 つでも欠落 → `W-PENDING-PROMOTION`。

## BR-0004-0020: stale window is 90 days

- AC-Refs: AC-0004-0021
- `W-WORKLOG-STALE` の閾値は `now - updated > 90 days`。1 day = 86400 seconds、now は validator 実行時の UTC ISO-8601。閾値定数は `assistantPaths.ts#WORKLOG_STALE_DAYS = 90` の SSOT 参照。

## BR-0004-0021: sunset minor named in deprecation warning

- AC-Refs: AC-0004-0022
- `D-DEPRECATED-PATH` warning 本文には sunset minor version (例: `v1.10.0`) が文字列リテラルで含まれる。曖昧表現 (例: "次の release") は使用禁止。sunset SSOT は `core/sunset.ts#SUNSETS.legacyAssistantSteering = "1.10.0"`。

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
- 3 要素のうち 1 つでも欠落した justification は schema 違反として advisory-failing error として扱う。`qfai validate` は empty / whitespace-only / undefined を即時 reject する (BR-0004-0017 の R-WORKLOG-DRIFT パターンと同形)。

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
