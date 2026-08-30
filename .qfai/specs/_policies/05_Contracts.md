# 05 Contracts

## Purpose

- `.qfai/contracts/**` を downstream execution の SSOT として扱う。
- discussion pack は planner artifact であり、`/qfai-sdd` 以降の skill は contracts を primary truth とする。
- 本ファイルは current-active な contract family を定義する。

## Active Contract Sets

### Design Contracts

| Short ID | Entity                | Declared ID           | File                                                                   | Purpose                                                                                                                                                                                              |
| -------- | --------------------- | --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DCON-001 | Exploration Brief     | exploration-brief     | `.qfai/contracts/design/exploration-brief.yaml`                        | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: brand SSOT moved to root `DESIGN.md`. History-only.)                                                                         |
| DCON-002 | Evaluation Rubric     | evaluation-rubric     | `.qfai/contracts/design/evaluation-rubric.yaml`                        | (DEPRECATED v2.0: 軸は code constants に移行、本 contract は P4 で削除予定 — spec-0012)                                                                                                              |
| DCON-003 | Evaluator Calibration | evaluator-calibration | `.qfai/contracts/design/evaluator-calibration.yaml`                    | (DEPRECATED v2.0: ordinal scale + 散文 critique で代替、P4 で削除予定 — spec-0012)                                                                                                                   |
| DCON-004 | Selected Direction    | selected-direction    | `.qfai/contracts/design/selected-direction.yaml`                       | (DEPRECATED v2.0: winner 選定なし、P4 で削除予定 — spec-0012)                                                                                                                                        |
| DCON-005 | Design System         | design-system         | `.qfai/contracts/design/design-system.yaml`                            | (UX-loop redesign / spec-0012 09_delta CHG-001: 最終 iter HTML からの抽出ではなく `DESIGN.md` token の deterministic mirror。validator は DCON-032。)                                                |
| DCON-006 | Reference Pool        | reference-pool        | `.qfai/contracts/design/reference-pool.yaml`                           | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: deviate-from framing 廃止、DESIGN.md compliance gate に統合。History-only.)                                                  |
| DCON-007 | Brand Design          | brand-design          | `.qfai/contracts/design/brand-design.yaml`                             | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: brand SSOT は root `DESIGN.md` に統合。History-only.)                                                                        |
| DCON-008 | Prototype Handoff     | prototype-handoff     | `.qfai/contracts/design/prototype-handoff.yaml`                        | v2.0+UX-loop: finalIterIndex / finalArtifact / extractedDesignSystem (= DESIGN.md mirror) / implementationNotes / imageSources[] (closed schema, CHG-002 — validated by core/prototyping/handoff.ts) |
| DCON-030 | DESIGN.md             | design-md             | `DESIGN.md` (repo root)                                                | (UX-loop redesign / spec-0012 09_delta CHG-001) brand vision / visual identity (color / font / radius / shadow tokens) の SSOT。markdown 直接編集。                                                  |
| DCON-031 | DESIGN.md Lock        | design-md-lock        | `.qfai/contracts/design/DESIGN.md.lock.yaml`                           | (UX-loop redesign / spec-0012 09_delta CHG-001) `DESIGN.md` の sha256 hash を `/qfai-sdd` Phase 0 で凍結。cycle ≥1 hash mismatch を fail-closed で検出。                                             |
| DCON-032 | Design System Mirror  | design-system-mirror  | (validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md) | (UX-loop redesign / spec-0012 09_delta CHG-001) `design-system.yaml` が `DESIGN.md` token と byte-equivalent mirror であることを検証。                                                               |

### UI Contracts

| Short ID  | Entity           | Declared ID | File                        | Purpose                                                            |
| --------- | ---------------- | ----------- | --------------------------- | ------------------------------------------------------------------ |
| UICON-001 | Screen Contracts | screens     | `.qfai/contracts/ui/*.yaml` | screen 単位 obligations / evidence expectation / route 参照の SSOT |

### Evidence Contracts

| Short ID   | Entity                | File                               | Purpose                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EVID-DCON1 | Breakthrough Evidence | `.qfai/evidence/breakthrough.json` | (DEPRECATED v2.0: plateau detector / branchPlanner 廃止に伴い P4 で削除予定 — spec-0012)                                                                                                                                                                                                                                                                              |
| EVID-PROT2 | Prototyping Evidence  | `.qfai/evidence/prototyping/`      | CHG-002 (2026-05-18): `iter-NN/spec-NNNN/<screen>.review.json` (per-spec; review.json only — no `.png`, no `.html`, no `interaction.json`) + cycle-0 frozen `specsCovered[]` + cycle-0 frozen license catalog + `prototype-handoff.yaml#imageSources[]` + `completion-certificate.json`. Supersedes the v2.0 `iter-NN/{screen.png, screen.html, review.json}` layout. |

### DB Contracts

0 items

QFAI 自体はデータベースを使用しない。

### API Contracts

0 items

QFAI 自体は外部公開 API を持たない。

### CLI Contracts

| Short ID | Entity                 | File                                          | Purpose                                                                                                                                                                                           |
| -------- | ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI-PROT | qfai prototyping (CLI) | `.qfai/contracts/cli/qfai-prototyping.md`     | spec-0012 の CLI surface (`iterate` / `certify` / `show-spec`) — cycle-0 freeze, license-verify exit 66, multi-spec resolveAll、Reviewer-driven Playwright を記述                                 |
| CLI-INIT | qfai init (CLI)        | `.qfai/contracts/cli/qfai-init.md`            | spec-0003 の CLI surface — assistant-tree seed, `--upgrade-assistant-tree`, work-log surface seed, deprecation window, path SSOT enforcement (CHG-003)                                            |
| CLI-VAL  | qfai validate (CLI)    | `.qfai/contracts/cli/qfai-validate.md`        | spec-0004 の CLI surface delta — new finding codes (`W-WORKLOG-SCHEMA`, `R-WORKLOG-DRIFT`, `R-REJECTED-READOPT`, `W-PENDING-PROMOTION`, etc.), Reviewer-Gate input bundle, promote-gate (CHG-003) |
| CLI-WLOG | worklog entry schema   | `.qfai/contracts/cli/worklog-entry.schema.md` | `.qfai/steering/*.md` frontmatter + body schema; `kind` enum SSOT; handoff-brief sections; parser unit-test obligations (CHG-003)                                                                 |

## Mapping Rules

- (UX-loop redesign / spec-0012 09_delta CHG-001) discussion sidecars `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`, `uiux/32_design_anti_goals.md` は廃止。`/qfai-discussion` はこれらを生成しない。
- discussion の `uiux/40_screen_contracts.md` は `/qfai-sdd` により `UICON-001` に正規化される。
- v2.0: `uiux/33_exploration_rubric.md` と `uiux/34_evaluator_calibration.md` は廃止（`/qfai-discussion` で生成しない）。`DCON-002`, `DCON-003` は P4 で物理削除。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-030` (root `DESIGN.md`) は `/qfai-discussion` の brand 出力。`/qfai-sdd` Phase 0 で sha256 凍結 (`DCON-031`) を行う。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-005` (design-system) は `/qfai-prototyping` の post-loop で `DESIGN.md` token の deterministic mirror として生成される。`DCON-032` validator が byte-equivalent を検証。
- v2.0+UX-loop: `DCON-008` (prototype-handoff) は最終 iter HTML を `finalArtifact` として参照し、`extractedDesignSystem` は `DCON-005` (= DESIGN.md mirror) を指す。
- v2.0: `DCON-004` (selected-direction) は P4 で物理削除（winner 選定の概念がないため）。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-001` (exploration-brief), `DCON-006` (reference-pool), `DCON-007` (brand-design) は active surface から削除。validator codepath からも除外。history-only。
- `/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement`, `/qfai-verify`, `qfai validate` は原則として上記 contract 群を読み、discussion pack を直接 truth source にしてはならない。

## Current Posture

- contract-first downstream を採用する。
- discussion-side UIUX artifacts は upstream discovery / authoring artifact であり、execution truth ではない。
- downstream skill が design / UI 評価を行うときの正式入力は `specs + DESIGN.md + .qfai/contracts/design/** + .qfai/contracts/ui/** + required evidence` である。
- screenshot / HTML evidence は contract から導かれる declared screen ごとに揃う必要がある。
- (UX-loop redesign) brand SSOT は root `DESIGN.md`。design-system は post-loop に DESIGN.md token の deterministic mirror として生成される。

## v2.0 Migration (absorbed into spec-0012)

- 削除対象 contracts (P4): `DCON-002`, `DCON-003`, `DCON-004`, `EVID-DCON1`
- (UX-loop redesign / spec-0012 09_delta CHG-001) 削除対象 contracts: `DCON-001`, `DCON-006`, `DCON-007`
- 簡素化 contracts (P1+P10): `DCON-008` (mustPreserve/mayAdapt/mustNotCopy 廃止)
- 評価軸は code constants `packages/qfai/src/core/prototyping/iteration.ts#OrdinalScore` に固定 (UX-loop redesign 後: informationArchitecture / navigationFlow / usability / functionality)。
- (UX-loop redesign) layout-anti-pattern (lap-001..008) は `qfai-prototyping/references/reviewer-prompt.md` に常駐（contract 化しない）。旧 anti-slop tokens (slop-\*) は廃止。
- (UX-loop redesign) `DCON-030` (`DESIGN.md`), `DCON-031` (`DESIGN.md.lock.yaml`), `DCON-032` (mirror validator) を新設。

## CHG-003 — Assistant-layer Recut + Work-log Surface (2026-05-22)

- CLI-INIT / CLI-VAL / CLI-WLOG を新設。CHG-003 が導入する surface delta はこの 3 contract に集約される。
- `packages/qfai/src/core/paths/assistantPaths.ts` は TS module 形式の SSOT であり、別途 yaml/md contract は不要。`assistantPaths.ts` をハードコード文字列で迂回することは NFR-0001 違反となる。
- `.qfai/steering/` (work-log surface, project-root) は配布物 (`packages/qfai/package.json#files`) に含まれない。seed される `README.md` / `.gitkeep` / `_templates/entry.md` は静的アセットではなく `packages/qfai/src/cli/commands/init.ts` が生成するため、`assets/` 配下のファイルとしてではなく `dist/` 内の文字列リテラルとしてのみ配布される (`.gitkeep` の body は空文字列リテラル)。詳細は `.qfai/contracts/cli/qfai-init.md#distributed-surface-obligations`。
- 旧 path layout は 1 minor release の deprecation window 中は受理されるが `D-DEPRECATED-PATH` warning を発する。sunset version は migration memo に明記される。

## CHG-005 — qfai-prototyping defect remediation (2026-05-24)

### Contract Index additions

| Short ID  | Entity                                | File                                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI-DOC   | `qfai doctor` (CLI)                   | `.qfai/contracts/cli/qfai-doctor.md`              | spec-0006 の CLI surface (NEW) — Playwright probe rename (`playwright` primary, legacy `playwright-cli` accepted-with-warn during deprecation window), `skills.integrity` defaults-to-warning (was error), opt-in capture-infrastructure preflight (`--check-capture`), `D-DEPRECATED-PROBE` finding code emission contract, exit codes for warn-only vs error-fail.                                                                                                                                   |
| CLI-PITER | `qfai prototyping iterate` (extended) | `.qfai/contracts/cli/qfai-prototyping-iterate.md` | spec-0012 の `iterate` 拡張契約 (NEW; companion to CLI-PROT) — `--capture` / `--auto-serve` opt-in flags re-introducing capture infrastructure with explicit user consent (amending the previous capture-removal rationale), `iterate-plan.json` Capture Contract block (`viewport` / `deviceScaleFactor` / `waitUntil` / `htmlSourceCopy`), screen-id underscore casing end-to-end, `prototyping.json` validate-conformant schema with explicit fields, `--force` / `--license-patch` flag semantics. |

### Contract Index updates (existing rows)

| Short ID | Updates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI-PROT | (UPDATE — `.qfai/contracts/cli/qfai-prototyping.md`) Capture surface re-introduced as opt-in: `--capture` / `--auto-serve` flag semantics, `prototyping.json` schema gains explicit fields accepted by the prototyping-profile validator (eliminating the current schema drift surfaced by SRC-0001..0002), `verify.json#scope` discriminator (`prototyping` / `full` / `atdd`) consumed by `certify` to break the certify↔verify circular dependency (per CHG-005 OQ-0107=B resolution). Detailed `iterate` extensions are split out to CLI-PITER for readability.                                                                                                                  |
| CLI-VAL  | (UPDATE — `.qfai/contracts/cli/qfai-validate.md`) Output path becomes profile-suffixed (e.g., `.qfai/report/validate-<profile>.json`) so profile runs no longer overwrite each other (Theme F in SRC-0001..0004); plain `.qfai/report/validate.json` continues to exist as the always-latest pointer carrying an explicit `profile` field. New drift findings: `D-DEPRECATED-PROBE` / `D-DEPRECATED-PATH` / `D-DEPRECATED-SCHEMA` (warning during one-minor deprecation window, error at sunset). New Reviewer-Gate findings `R-PROMPT-SCANNER-DRIFT` and `R-CERTIFY-VERIFY-CIRCULAR` integrated into the `--report` output. `W-SKILL-DOC-BROKEN-REF` for stale SKILL.md references. |
| DCON-005 | (UPDATE — `.qfai/contracts/design/design-tokens.schema.yaml`) `scannerContract` section added — declares the symmetric pair (`generator-prompt.md` ↔ `findDesignMdViolations.ts`) and which contract clauses each side must mirror (Tailwind preflight literals allowlist, body-scope rule, `SAFE_LITERALS` table). Asymmetric modification triggers `R-PROMPT-SCANNER-DRIFT` per CHG-005.                                                                                                                                                                                                                                                                                           |

### Notes

- New CLI contract files (`qfai-doctor.md`, `qfai-prototyping-iterate.md`) live under `.qfai/contracts/cli/` — authoring zone, NOT distributed (`package.json#files` excludes `.qfai/contracts/**`).
- The backwards-compatibility adapter window (REQ-0126) means all new finding codes are emitted as `warning` during the one-minor deprecation window and re-classified to `error` at sunset (see `_policies/07_Constraints.md` OC-NN one-minor-release deprecation window).
- The certify ↔ verify circular-dependency resolution (`verify.json#scope` discriminator, OQ-0107=B) is a behavior change to CLI-PROT but not a breaking change to any committed contract surface — `verify.json` previously had no `scope` field; the new discriminator is additive.

## CHG-006 — Second-Wave Defect Remediation (v1.9.2, 2026-05-27)

### Contract Index additions

| Short ID     | Entity                                 | File                                                                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI-HANDOFF  | Cross-skill handoff schema             | `packages/qfai/src/core/schemas/handoff.ts` (doc: `references/handoff.md`) | spec-0015 (REQ-0161) canonical `handoff.yaml` schema (NEW) — required minimum field set `companyName?` / `primarySpecId?` / `startDate?` / `signature?` / `entryPattern?` / `productScope?`; `additionalProperties: true` (per-skill extensions). Every skill that produces/consumes handoff state reads/writes this schema. Legacy ad-hoc per-skill handoff files (e.g. a hand-rolled `session-handoff.yaml`) accepted during the deprecation window with `D-HANDOFF-LEGACY-FORMAT` warning. **Distinct from DCON-008** (`prototype-handoff.yaml`, the active prototype→implement handoff) — CLI-HANDOFF is the cross-skill session handoff and does NOT supersede or deprecate DCON-008. SSOT-sync Pair IV (schema ↔ all skill writers); asymmetric drift emits `R-HANDOFF-SCHEMA-DRIFT`. |
| CLI-MANIFEST | Per-skill runtimeDependencies manifest | `assets/init/.qfai/assistant/skills/<skill>/manifest.json`                 | spec-0006 / cross-skill (REQ-0159) per-skill manifest schema (NEW) — `{ "runtimeDependencies": [{ "name": "<npm-pkg>", "version": "<semver-range>" }, ...] }` using npm `dependencies` semver syntax. `qfai doctor --profile <skill>` reads the manifest and probes `node_modules/.bin/...` / `node_modules/<name>/`; missing deps reported with the install command. Empty `runtimeDependencies` emits no probe. Layer-1 lint rejects malformed entries. SSOT-sync Pair III (manifest ↔ doctor probe); drift emits `R-SKILL-MANIFEST-DRIFT`.                                                                                                                                                                                                                                               |
| CLI-AUDIT    | `qfai audit log` (CLI, advisory)       | `.qfai/contracts/cli/qfai-audit.md`                                        | spec-0015 (REQ-0171, SHOULD) CLI surface (NEW) — lists `.qfai/evidence/decisions/<ts>.json` envelope-deviation decision records newest-first; filters `--scope` / `--operator` / `--clause` (on `envelopeContractClause`); `--format table\|json` default `table` (per DR-0271). Records written by the envelope-deviation audit-log (REQ-0158); `.qfai/evidence/decisions/` is tracked (governance record, negated in the managed `.gitignore` block).                                                                                                                                                                                                                                                                                                                                     |

### Contract Index updates (existing rows)

| Short ID | Updates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DCON-005 | (REFERENCE — no schema change) The SaaS-package lightweight verify profile (REQ-0166) requires a design-system attestation present at `.qfai/contracts/design/design-system.yaml` (= DCON-005). `qfai validate --profile saas-package` PASSes when (a) the prototyping-profile validate PASSes, (b) DCON-005 attestation present, (c) cross-skill handoff (CLI-HANDOFF) schema PASSes; ATDD / implement-class gates are SKIPPED with `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info). No new DCON row is introduced.                                                                                                                                                                                                                    |
| CLI-VAL  | (UPDATE — `.qfai/contracts/cli/qfai-validate.md`) New `--profile saas-package` (lightweight; skips ATDD / implement gates with `D-SAAS-PACKAGE-VERIFY-SKIPPED` info). New findings: `D-SCAFFOLD-PLACEHOLDER` (atdd-scaffold TODO unremoved; warning → error after 3 cycles per DR-0272), `D-SURFACE-TYPE-MISSING` (UI-contract spec lacking `surface_type: ui-bearing`; warning → error at sunset), `D-HANDOFF-LEGACY-FORMAT` (legacy handoff file during window). New Reviewer-Gate finding codes (REQ-0168 catalog) integrated into `--report`. `surface_type` auto-populate is a `/qfai-sdd` step (spec-0013); `auditProfile.ts` accepts both string-only and structured `{id,label,acceptance}` `primary_tasks` (DR-0268). |
| CLI-DOC  | (UPDATE — `.qfai/contracts/cli/qfai-doctor.md`) New `--autoremediate` mode (REQ-0156): `npm install` for `runtimeDependencies` (CLI-MANIFEST), `--clean` TTL-archive of stale review packs (`review.staleTtlDays`, default 14d per DR-0264 → `.qfai/review/_archive/<ts>/`), and writes default-keyed `qfai.config.yaml` fields. `--yes` confirm required by default; `--dry-run` previews; CI defaults to `--autoremediate=off` with an explicit "autoremediate disabled in CI" line. New `--profile <skill>` reads CLI-MANIFEST and probes runtimeDependencies.                                                                                                                                                              |

### Notes

- New CLI/schema contract files (`qfai-audit.md`, the `handoff.ts` module doc `references/handoff.md`) live under authoring zones; `packages/qfai/src/core/schemas/handoff.ts` is a TS-module SSOT (mirrors `assistantPaths.ts`: no separate yaml/md contract needed beyond the `references/handoff.md` doc). `.qfai/contracts/**` is NOT distributed (`package.json#files` excludes it).
- `assets/init/.qfai/assistant/skills/<skill>/manifest.json` (CLI-MANIFEST) IS distributed — its content MUST be generic (no internal IDs / version markers) per `.agents/rules/distributed-surface.md`; only npm package names + semver ranges appear.
- Pack-location lint (REQ-0167): the new CI lane `packages/qfai/scripts/check-pack-locations.mjs` is wired into `pnpm ci:lint` (no contract file — it is a lint script; recorded under `_policies/07_Constraints.md` OC-65 and `10_delta.md` CHG-006). It emits `R-PACK-LOCATION-DRIFT` for `review-*/` / `discussion-*/` dirs outside `tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`.
- The one-minor deprecation window (REQ-0169) makes every new `D-*` finding emit as `warning` during qfai 1.9.x and re-classify to `error` at the sunset version qfai 1.10.0 (see `_policies/07_Constraints.md` OC-63).
