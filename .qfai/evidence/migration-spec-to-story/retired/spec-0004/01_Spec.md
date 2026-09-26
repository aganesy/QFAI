# 01 Spec

- Spec: spec-0004
- Parent: CAP-0004
- Status: active
- Consolidates: old spec-0002

## Consumer View

- Primary SSOT for execution: `spec-0004/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- A clause marked "on the story tree" holds where the project's specification is the story-based tree, and a clause marked "with the `rule/ skill/ agent/ prompt/` assistant tree" holds once the assistant tree uses those directory names. A marked clause beside an unmarked one replaces it there, and the unmarked one holds in the current layout. `qfai validate` decides the spec layout from `paths.specsDir` (BR-0004-0043)

## Scope

- In:
  - `qfai validate` command
  - layered spec / traceability / contract / discussion validators
  - contract-first design/ui validators
  - direct discussion-pack canonical UIX validators
  - prototyping skill content validator
  - prototyping evidence validator
  - breakthrough evidence validator
  - UI evidence artifact validator
  - design contract readiness validator
  - non-UI safe skip behavior
  - waiver handling
  - design-md / design-md-lock / design-system-mirror validators (DCON-030 / DCON-031 / DCON-032)
  - prototyping evidence v3 validator (4 UX axes ordinal + layoutAntiPatternsDetected + designMdViolations + pivotDirective schema)
  - layoutAntiPatternsDetected schema validator (the identifiers declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`)
  - designMdViolations schema validator (`{category: color|font|radius|shadow, expected, found, location}` shape)
  - `findDesignMdViolations(html, designMd)` purity / determinism contract
  - SaaS-package validate profile (REQ-0166 validate side): `qfai validate --profile saas-package` gates on prototyping-profile PASS + DCON-005 attestation + CLI-HANDOFF schema; ATDD / implement-class gates SKIPPED with `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info)
  - `auditProfile.ts` `primary_tasks` shape acceptance (REQ-0164): string-only AND structured `{id,label,acceptance}` (DR-0268); `QFAI-AUD-020` warning names the `3..7` count band (DR-0267)
  - workflow-hygiene CI lane (CHG-007): a repository script wired into `pnpm ci:lint`, emitting `R-WORKFLOW-HYGIENE-DRIFT` / `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`. Recorded here because this spec owns the `pnpm ci:lint` lane inventory; the lane's own rule set is owned by spec-0017 (`CAP-0017`) and its shipped-file targets by spec-0003. No validator and no finding code is added to `qfai validate` itself — same posture as the pack-location lane below.
  - pack-location CI lane (REQ-0167): `packages/qfai/scripts/check-pack-locations.mjs` wired into `pnpm ci:lint`, emits `R-PACK-LOCATION-DRIFT` (DR-0274 scope)
  - tracked-scratch CI lane: `scripts/check-tracked-scratch.mjs` wired into `pnpm ci:lint`, failing when git tracks any path under the scratch directory. Recorded here because this spec owns the `pnpm ci:lint` lane inventory; the script is a root toolchain file and belongs to spec-0017. No validator and no finding code is added to `qfai validate` itself — same posture as the two lanes above
  - story-tree validators, selected by the detected layout: the story directory and ID findings, the unlisted-contract finding, the two tables and the rows a validator reads, the EX-to-AC and BR-to-EX links, the test obligations per layer with their exception rows, the old-layout error, and the append-only and change-request checks of the `drift` profile
  - `qfai validate --flow BF-NNNN`, which scopes a run on the story tree to named business flows, and the refusal of `--spec` there
- Out:
  - report rendering details
  - prototyping runtime execution
  - deleted prototyping recommendation validator surface
  - legacy compatibility namespaces removed from package surface

## Applicable NFR

- NFR-0001: Medium-size project validation completes within existing validate budget
- NFR-0002: Same input yields same validate result
- NFR-0003: Non-UI packs do not over-fire UI-bearing validators
- NFR-0004: Actionable issues include concrete file/rule guidance
- discussion-20260923063306456#NFR-0005: A complete default-profile `qfai validate --fail-on error` on the story tree written by the new `qfai init` takes at most 120% of the median for the complete validation of the pre-change `qfai init` tree on the same machine

## Applicable Policy

- Policy: validate is the mechanical truth gate
- Policy: new UI validators must stay deterministic

## Evidence Summary

- Evidence: `packages/qfai/src/core/validate.ts`
- Evidence: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`
- Evidence: `packages/qfai/src/core/validators/skill/prototypingSkill.ts`
- Evidence: `packages/qfai/src/core/validators/prototypingEvidence.ts`

## Relevant Requirements

- REQ-0010: `qfai validate` aggregates validator issues and writes structured output
- REQ-0011: `--phase`, `--format`, and `--fail-on` continue to control validate behavior
- REQ-0012: contract-first validators remain the repo-root downstream production path
- REQ-0013: validate no longer depends on a dedicated prototyping recommendation validator or `prototyping.yaml` schema gate
- REQ-0014: prototyping skill validator checks current `/qfai-prototyping` documentation contract
- REQ-0015: UI evidence artifact validator checks declared screen evidence paths
- REQ-0016: `QFAI-UIE-001` reports missing screenshot evidence
- REQ-0017: `QFAI-UIE-002` reports missing HTML snapshot evidence
- REQ-0018: absence of screen contracts skips UI evidence artifact validation safely
- REQ-0019: validate no longer treats full runtime-scoring integrity as its primary prototyping responsibility
- REQ-0020: deterministic validators retained from v1.7.16 stay under validate when still present in code
- REQ-0021: `validateDesignContractReadiness` checks `exploration-brief.yaml`, `evaluation-rubric.yaml`, `selected-direction.yaml`, `design-system.yaml`, and UI contract presence using `QFAI-DCON-*`
- REQ-0022: `runCanonicalUixValidators` is limited to direct discussion-pack validation and is not the repo-root downstream primary path

<!-- CHG-003 v1.9.0 additions (REQ-0034..0044). Original REQ-0023..0031
     numbers were preserved for pre-existing rows below to avoid breaking
     AC-Refs / TC-Refs that already cited them (e.g. AC-0004-0008 →
     DCON-030 → original REQ-0025). -->

- REQ-0034: 4-layer asset-tree enforcement (v1.9.0) - `qfai validate` checks that the layer names directly under `.qfai/assistant/` are limited to the four `{constitution, manifest, catalog, process}`. Any other name, such as the old `steering/`, is surfaced as a warning. With the `rule/ skill/ agent/ prompt/` assistant tree, the four are `{rule, skill, agent, prompt}`, and the project's own `skill.local/` is allowed beside them
- REQ-0035: work-log frontmatter schema validation (v1.9.0) - プロジェクトルートの `.qfai/steering/*.md` (work-log entry) の YAML frontmatter を schema 検証。違反は `W-WORKLOG-SCHEMA` (severity warning, non-blocking)
- REQ-0036: Reviewer-Gate drift findings (v1.9.0) - reviewer sub-agent 出力に `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` が含まれる場合、`justification:` field 非空を要求する (severity error, advisory-failing)
- REQ-0037: decision-promotion gate (v1.9.0) - `W-PENDING-PROMOTION` finding plus a dedicated section in the validate report. Satisfied once the `07_Decisions.md` row, the entry archive and the `promoted-to` back-ref are all present. On the story tree, the row is a `decisions.md` row and the back-ref holds its DEC ID
- REQ-0038: stale-entry surfacing (v1.9.0) - `.qfai/steering/*.md` で `status: active` かつ `updated` が 90 日以上前のエントリに `W-WORKLOG-STALE`
- REQ-0039: link-integrity validation (v1.9.0) - resolve a work-log entry's `links: [...]`. Each element must resolve to `spec-NNNN`, `discussion-*` or an `<entry-id>` (kebab-case ASCII, no prefix required) (canonical: the `links` section of `.qfai/contracts/cli/worklog-entry.schema.md`). An unresolved element raises `W-WORKLOG-BROKEN-LINK`. On the story tree, `BF-NNNN` and `DEC-NNNN` take the place of `spec-NNNN`
- REQ-0040: `D-DEPRECATED-PATH` warning (v1.9.0) - 旧 `.qfai/assistant/steering/` レイアウト検出時に出力。本文で sunset minor version を明示。sunset 到達時に error に escalate
- REQ-0041: SKILL.md `project_memory:` declaration enforcement (v1.9.0) - すべての `qfai-*` skill SKILL.md は `project_memory:` YAML block を宣言。未宣言 path への read は reject
- REQ-0042: `R-HANDOFF-INCOMPLETE` finding (v1.9.0) - `kind: handoff` work-log entry の本文に 5 必須セクション (`## State of the task` / `## Next single action` / `## Constraints to preserve` / `## Open questions` / `## References to consult first`) のいずれかが欠落していれば error (advisory-failing per qfai-validate.md contract)
- REQ-0043: `W-SKILL-DOC-BROKEN-REF` (v1.9.0) - SKILL.md 内の reference が新 layout で解決しない場合の warning
- REQ-0044: `W-USER-EDIT-PRESERVED` informational pass-through (v1.9.0) - `qfai init --upgrade-assistant-tree` がユーザー編集を preserve した際の informational note を validate 側でも認識可能にする
- REQ-0120: `validate.json` profile disambiguation - `qfai validate` は profile 別の出力を上書きせず、profile-suffixed path `.qfai/report/validate-<profile>.json` を必ず emit する。並行して、profile を明示した `validate.json` (常に直近 run を反映、`profile` field を持つ) も emit する。旧 `.qfai/output/validate.json` への書き込みは deprecation window 中は継続するが `D-DEPRECATED-PATH` (severity warning) を fire させ、sunset (`1.10.0`) で error にエスカレートする
- REQ-0102: SSOT-sync invariant — generator-prompt ↔ scanner pair-changed enforcement - `pnpm ci:lint` レーンが `findDesignMdViolations.ts` の変更と `generator-prompt.md` の変更を pair-changed として強制する。片方のみの変更時は Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` (severity error) を emit する
- REQ-0125: Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` enforcement - REQ-0102 を裏付ける CI lane が emit する `R-PROMPT-SCANNER-DRIFT` finding は mandatory `justification:` text を保持する。`justification:` は (a) 修正されたファイル、(b) 対応する修正が欠落しているカウンターパート、(c) match を確認できない契約条項 — の 3 要素を含む。`qfai validate` は空 `justification:` を持つ R-PROMPT-SCANNER-DRIFT finding を reject する (advisory-failing per BR-0004-0017 パターン)
- REQ-0023: `validateBreakthroughEvidence` checks `.qfai/evidence/breakthrough.json` and branch execution evidence when trigger=true
- REQ-0024: downstream skill prompt checks use read order `spec -> exploration-brief -> reference-pool -> evaluation-rubric -> evaluator-calibration -> selected-direction -> design-system -> ui contracts`
- REQ-0025: `qfai validate --fail-on error` の DCON-030 が root `DESIGN.md` の存在 / 構造 (color / typography / radius / shadow token tables) を検証する
- REQ-0026: DCON-031 checks that `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256` matches the sha256 of the on-disk `DESIGN.md`
- REQ-0027: DCON-032 checks that the token tables of `<paths.contractsDir>/design/design-system.yaml` are byte-equivalent to those of `DESIGN.md`
- REQ-0028: prototypingEvidenceV3 validator が `.qfai/evidence/prototyping/iter-NN/review.json` の 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) ordinal score / prose critique / pivotDirective enum を schema 検証する。prose critique length is a cap whose unit is selected by the text, with no lower bound — see `DR-0277`.
- REQ-0029: `layoutAntiPatternsDetected` が `packages/qfai/assets/validators/layoutAntiPatterns.json` の宣言にないトークンを含む場合、validator は `QFAI-PROT-002` を error 重大度で報告する
- REQ-0030: Each `designMdViolations` item requires `kind` (`color`, `font`, `radius`, or `shadow`) and a string `found`; extra fields are allowed.
- REQ-0031: `findDesignMdViolations(html, designMd)` は I/O / clock 依存を持たず、同一入力に対し同一出力を返す pure function である
- REQ-0166: `qfai validate --profile saas-package` PASSes on prototyping-profile + DCON-005 design-system attestation + CLI-HANDOFF schema; ATDD / implement-class gates SKIPPED with `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming each skip (certify side owned by spec-0014)
- REQ-0164: `auditProfile.ts` accepts string-only AND structured `{id,label,acceptance}` `primary_tasks` (DR-0268); `QFAI-AUD-020` warning names the `3..7` recommended count band (DR-0267); string-only continues to PASS during the deprecation window
- REQ-0167: `packages/qfai/scripts/check-pack-locations.mjs` (DR-0274 staged/changed-dir scope) integrated into `pnpm ci:lint`; rejects misplaced `review-*/` / `discussion-*/` dirs with `R-PACK-LOCATION-DRIFT` referencing `.agents/rules/root-additions-policy.md`
- REQ-0150: lint-shipping ID-class guard expansion — extend the `src-comment` rule set of `packages/qfai/scripts/lint-shipping.ts` to catch the composite ID classes `REQ-NNNN` / `REQ-NNNN-NNNN` / `AC-NNNN-NNNN` / `TC-NNNN-NNNN` / `US-NNNN-NNNN` / `BR-NNNN-NNNN` in comment lines of `src/**/*.ts`, where only the established forbidden classes were scanned. These IDs leaked into spec-0006's `doctor.ts` during the CHG-005 cycle and were caught only by a manual implementation-reviewer audit; this automates that check. The same regex set is mirrored in the layer-2 post-build guard (`packages/qfai/scripts/check-no-internal-version-leakage.sh`) under the SSOT-sync invariant. Acceptance signal: `pnpm ci:lint` fails with exit 1 on a change that adds a comment line carrying a composite ID class such as `REQ-0001-0001`. The guard also rejects the seven story-tree shapes (`BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN`, `OQ-NNNN`) with a numeric segment outside the sample band `0001` to `0009` (`01` to `09` for the two-digit tail), in one pattern set with the other two guards
- discussion-20260923063306456#REQ-0003, discussion-20260923063306456#REQ-0004: a story directory holds exactly its three files, and a malformed, duplicate or misplaced ID is an error (US-0004-0040)
- discussion-20260923063306456#REQ-0005: `contracts.md` lists every contract file, and the steering-placeholder check reads `tech.md` and `structure.md` from `paths.contractsDir` (US-0004-0041)
- discussion-20260923063306456#REQ-0011: `decisions.md` and `open-questions.md` keep four columns and their status vocabularies, their rows are only appended, and a keyword row holds by Status alone (US-0004-0042, US-0004-0043)
- discussion-20260923063306456#REQ-0012: a protected change needs a `Change request:` row in force (US-0004-0043)
- discussion-20260923063306456#REQ-0006, discussion-20260923063306456#REQ-0007, discussion-20260923063306456#REQ-0008: every EX names one AC of its story, every AC has an EX, every rule cites existing examples, and every EX is cited (US-0004-0044)
- discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010: a BF owes an E2E test, an AC an integration or API test, and an EX a test, unless a `Test exception:` row in force exempts it (US-0004-0045)
- discussion-20260923063306456#REQ-0021, discussion-20260923063306456#NFR-0007: the spec-pack layout is one error naming the path and `/qfai-migration-spec-to-story` (US-0004-0046)
- discussion-20260923063306456#REQ-0024, discussion-20260923063306456#NFR-0004: the source-comment guard learns the story-tree ID shapes (REQ-0150, US-0004-0047)
- discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018: validators read the `rule/ skill/ agent/ prompt/` assistant tree, and the Codex agent guard compares the agent card with its generated TOML (REQ-0034, AC-0004-0026)
- discussion-20260923063306456#REQ-0004, discussion-20260923063306456#REQ-0011: the work-log scope, promotion and links follow BF and DEC IDs and `decisions.md` (REQ-0037, REQ-0039)
- discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013: `qfai validate --flow BF-NNNN` replaces `--spec` on the story tree (US-0004-0048)

## Entry points

- US range in this spec: US-0004-0001..US-0004-0048
- AC range: AC-0004-0001..AC-0004-0075
- BR range: BR-0004-0001..BR-0004-0081
- EX range: EX-0004-0001..EX-0004-0090
- TC range: TC-0004-0001..TC-0004-0117
- Primary actors: QA engineer, AI agent, CI pipeline
- Notes: validate is the machine gate for current skill-first, contract-first downstream
