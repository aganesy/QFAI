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
- prototypingEvidenceV3 validator enforces schema v3 on each `iter-NN/review.json`: required keys `scores` (4 UX axes ordinal), `prose` (200..500 words), `pivotDirective` (∈ continue|refine|pivot), `layoutAntiPatternsDetected`, `designMdViolations`.
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
- `D-DEPRECATED-PATH` warning 本文には sunset minor version (例: `v1.10.0`) が文字列リテラルで含まれる。曖昧表現 (例: "次の release") は使用禁止。sunset SSOT は `assistantPaths.ts#LEGACY_LAYOUT_SUNSET = "v1.10.0"`。

## BR-0004-0022: project_memory block required per skill

- AC-Refs: AC-0004-0023
- `.qfai/assistant/skills/qfai-*/SKILL.md` の trailing YAML block は `project_memory:` key を必ず含む。`reads:` (array of layer-relative paths) と `writes:` (array、空でも OK) を sub-key として持つ。

## BR-0004-0023: SKILL.md broken-ref surface

- AC-Refs: AC-0004-0024
- SKILL.md 本文の `.qfai/assistant/...` パス参照は validator が path-resolve する。解決失敗 → `W-SKILL-DOC-BROKEN-REF` (warning)。`assistantPaths.ts` で定義された canonical layer 配下に存在しない参照は broken と扱う。

## BR-0004-0024: informational pass-through preserved

- AC-Refs: AC-0004-0025
- `W-USER-EDIT-PRESERVED` は info severity の pass-through。warning/error として escalation してはいけない。validate report の "Informational" section に表示し、`counts.info` に算入する。
