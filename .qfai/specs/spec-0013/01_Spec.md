# 01 Spec

- Spec: spec-0013
- Parent: CAP-0013
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0013/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-sdd` unified SDD workflow (Contracts-first -> Outline -> Slice -> Plan -> Delta)
  - Layered artifact generation: `_policies/01..10` + `spec-XXXX/01..10`
  - Contract-first mandatory outputs: `.qfai/contracts/(api|db|ui|design)/**`
  - UI-bearing discussion UIUX sidecar の downstream contract への正規化
  - Contract Index in `_policies/05_Contracts.md` with short IDs (DB-001, API-001, UI-001)
  - Discussion-pack preflight validation (latest pack, readiness checks)
  - Phase order enforcement (Contracts-first -> Outline -> Slice -> Plan -> Delta)
  - Reference direction rules (upper-to-lower forbidden, lower-to-upper allowed)
  - Required edges: US -> AC -> BR -> EX -> TC
  - Batch mode: no-argument invocation processes all capabilities
  - Spec Auto-Discovery Protocol (4-source unified diff detection)
  - RCP execution with 12-reviewer roster
  - Density Review Pass using `QFAI-COV-207` warnings
  - Preflight summary report (`.qfai/report/preflight_summary.md`)
  - Validate gate (`qfai validate --fail-on error`)
  - discussion-pack markdown readiness gate
  - optional side artifacts are ignored by preflight
  - Phase 0 freeze of root `DESIGN.md` sha256 into `.qfai/contracts/design/DESIGN.md.lock.yaml`
  - drop legacy design contracts (`exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml`)
  - emit only `design-system.yaml`, `prototype-handoff.yaml`, `DESIGN.md`, `DESIGN.md.lock.yaml`, and the design-system mirror validator as the active design-contract surface
- Out:
  - Writing production code or runnable tests
  - Skipping phase order or bypassing gates
  - Reintroducing rejected options without re-open approval

## Applicable NFR

- NFR-0001: Phase order -- Contracts-first -> Outline -> Slice -> Plan -> Delta must be preserved
- NFR-0002: Reference direction -- upper-to-lower references forbidden, lower-to-upper allowed
- NFR-0003: Required edges -- US -> AC -> BR -> EX -> TC chain completeness
- NFR-0004: Validate gate -- `qfai validate --fail-on error` must produce error=0
- NFR-0005: Contract alignment -- `_policies/05_Contracts.md` index and `.qfai/contracts/**` files must be aligned
- NFR-0006: Mermaid compliance -- `_policies/04_Business-Flow.md` must include Mermaid flowchart or sequenceDiagram

## Applicable Policy

- Policy: Drift Protocol mandatory
- Discussion-pack preflight is mandatory (stop if missing/incomplete)
- `10_Plan.md` is How-only SSOT; do not create `specs/plan.md`

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`
- Consolidates: old spec-0011 (Spec Diff Protocol), spec-0038 (Auto-Discovery)

## Relevant Requirements

- REQ-0001: Unified SDD workflow -- single entrypoint for full SDD flow (preflight + shared/spec + plan)
- REQ-0002: Contract-first phase -- create/update contracts before shared/spec slices
- REQ-0003: Outline phase -- `_policies/01..10` layered artifacts
- REQ-0004: Slice phase -- `spec-XXXX/01..08` with slice gate (US->AC, AC->BR, TC->EX)
- REQ-0005: Plan phase -- `spec-XXXX/10_Plan.md` finalized after slice gate pass
- REQ-0006: Delta phase -- `spec-XXXX/09_delta.md` with adoption/rejection rationale, DO NOT / Temptation
- REQ-0007: Discussion-pack preflight -- validate latest pack readiness before SDD
- REQ-0008: Batch mode -- no-argument processes all capabilities from `_policies/03_Capabilities.md`
- REQ-0009: Spec Auto-Discovery -- 4-source diff detection integrated from spec-0038
- REQ-0010: Reference direction enforcement -- upper-to-lower forbidden, lower-to-upper allowed
- REQ-0011: Required edges -- US -> AC -> BR -> EX -> TC completeness
- REQ-0012: Validate gate -- `qfai validate --fail-on error --format github` with error=0
- REQ-0013: Density Review -- `QFAI-COV-207` warnings triaged from specs-coverage reports
- REQ-0014: Discussion-Pack Markdown Gate — SDD preflight は discussion-pack の必須 markdown readiness を検証し、欠落・未完成時のみブロックする
- REQ-0015: Optional Side Artifact Neutrality — SDD preflight は optional side artifact の欠落や旧形式の補助 prototyping artifact だけではブロックしない
- REQ-0016: Exploration-brief normalization — `uiux/30_exploration_brief.md` を `.qfai/contracts/design/exploration-brief.yaml` に正規化する
- REQ-0017: Evaluation-rubric normalization — `uiux/33_exploration_rubric.md` を `.qfai/contracts/design/evaluation-rubric.yaml` に正規化する
- REQ-0018: Evaluator-calibration normalization — `uiux/34_evaluator_calibration.md` を `.qfai/contracts/design/evaluator-calibration.yaml` に正規化する
- REQ-0019: UI contract normalization — `uiux/40_screen_contracts.md` を `.qfai/contracts/ui/*.yaml` に正規化する
- REQ-0020: Downstream boundary — `/qfai-sdd` 以降の skill は discussion pack を直接読まず、正規化済み specs/contracts を読む
- REQ-0021: `selected-direction.yaml` と `design-system.yaml` は prototyping でさらに更新され得る downstream design contracts だが、UI-bearing flow では `/qfai-sdd` 完了時点で downstream validate readiness のために存在していなければならない
- REQ-0115: UI contract template carries `primary_tasks: []` slot — `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml` の `screens[]` 各エントリに `primary_tasks: []` slot を含める。requirements-analyst agent guide は各 screen に ≥ 1 primary_task を authoring するよう instruction を持つ。新 `qfai validate` lane (QFAI-AUD-001 aligned) は newly authored UI contracts の `primary_tasks` が non-empty であることを `/qfai-prototyping` 開始前に検証する
- REQ-0116: stale-path drift doc-sync — spec-0013 prose (01_Spec.md / 02_User-stories.md / 03_Acceptance-Criteria.md / 04_Business-Rules.md / 05_Examples.md / 06_Test-Cases.md / 10_Plan.md) は UI 契約テンプレートを `.claude/skills/qfai-sdd/templates/contracts/ui-spec.yaml` と参照しているが、`.claude → .qfai/assistant` migration 後の canonical 出荷パスは `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`。当該 7 ファイルの prose を canonical path に同期する。挙動変更なしの pure documentation drift fix。Acceptance signal: 上記 7 ファイル中の `.claude/skills/qfai-sdd/templates/contracts/ui-spec.yaml` 文字列出現回数が 0 になり、置き換え後の canonical path 文字列が同等の文脈で参照される。
- REQ-0155: active discussion session pointer (reader side) — downstream skills under `/qfai-sdd` read the active discussion pack through a single helper resolving `.qfai/state.json#discussion.currentId` (writer side owned by spec-0010). Multiple-active ambiguity surfaces a clear error naming the candidate dirs and the recovery command.
- REQ-0163: `/qfai-sdd` auto-populates `surface_type: "ui-bearing"` frontmatter for every spec that has a `.qfai/contracts/ui/<spec>-*.yaml` companion; `qfai sdd lint` emits `D-SURFACE-TYPE-MISSING` (warning during the deprecation window, sunsets to error) when UI contract present but frontmatter absent. `resolveAllUiBearingSpecs()` still requires the frontmatter as the strict signal (no behavioral change downstream). Body-prose quoting note: `surface_type` token literals in 01_Spec.md MUST use the quoted YAML form `surface_type: "ui-bearing"` so the bare-string regex in `core/prototyping/specResolution.ts#UI_BEARING_MARKER_RE` does not false-match prose mentions as a frontmatter signal.
- REQ-0164: `QFAI-AUD-020` `primary_tasks` recommended count band (3..7, DR-0267) is documented in `templates/contracts/ui-spec.yaml` comments and `references/ui-contract-guide.md`; the warning text names the band. `auditProfile.ts` accepts string-only AND structured `{id,label,acceptance}` (all-required, closed schema, DR-0268) items during the deprecation window; string-only continues to PASS.
- REQ-0117: QFAI-AUD-001 deprecation-window downgrade for slot-less contracts — 現状 QFAI-AUD-001 (visualHierarchy) finding は key-absent (`primary_tasks` slot を持たない legacy contracts) と key-empty (新規 authored だが slot 未充填) を同一 severity=error/tier-1 として扱う。これを 2-stage emission に分割: key-absent → severity=info (informational, non-blocking) を one-minor-release deprecation window 配下で発火、key-empty → severity=error (blocking, intentional violation)。Sunset window は OC-60 と整合 (one minor release; sunset = qfai 1.10.0)。Test surface: TC-0013-0027 sub-case "b" を現行 strict-semantics guard から 2-stage emission に flip する。deferral pointer は `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts` 内 inline TODO marker に保持。Acceptance signal: key-absent fixture は severity=info / non-blocking finding を emit し `qfai validate --fail-on error` を通過、key-empty fixture は severity=error を emit して fail する。

## Consumer View — Second-Wave (v1.9.2) behavior copy-down

- Active discussion pack is resolved through one helper reading `.qfai/state.json#discussion.currentId` (SSOT written by `/qfai-discussion`, spec-0010); never inferred from filesystem mtime. Missing/duplicate `currentId` raises an error naming candidate `discussion-*` dirs and `qfai discussion use <id>`.
- `/qfai-sdd` sets `surface_type: "ui-bearing"` frontmatter for every spec carrying a `.qfai/contracts/ui/<spec>-*.yaml` companion. `qfai sdd lint` warns (`D-SURFACE-TYPE-MISSING`) when the companion exists but the frontmatter is absent. `resolveAllUiBearingSpecs()` still requires the frontmatter as the strict downstream signal.
- `primary_tasks` recommended count band is 3..7 (`QFAI-AUD-020` warning names the band). UI contract items accept string-only (legacy) and structured `{id, label, acceptance}` (all-required, closed) shapes during the deprecation window.

## Entry points

- US range in this spec: US-0013-0001..US-0013-0014
- Primary actors: QFAI user (developer), AI Agent (requirements-analyst, solution-architect, test-design-analyst)
- Notes: Receives discussion-pack as input; produces spec artifacts and downstream-ready contracts for later execution skills

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: spec depth vs delivery speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
