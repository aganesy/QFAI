# 09 Delta

## Change Summary

- Change ID: DELTA-0001-0001
- Date: 2026-04-01
- Primary: spec-0001 統合初回作成
- Tags: spec-pack, traceability, governance, consolidation
- Summary: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）を spec-0001（spec-pack 構造定義）に統合

- Change ID: DELTA-0001-0002
- Date: 2026-09-23
- Primary: spec-to-story restructure (`## Triage (2026-09-23 spec-to-story)`)
- Tags: story-tree, traceability, drift-protocol, assistant-tree, mdschema
- Summary: Adds the story-tree items beside the spec-pack items: US-0001-0010 to 0017, AC-0001-0013 to 0031, BR-0001-0025 to 0051, EX-0001-0025 to 0097, TC-0001-0025 to 0097 and ledger rows TDD-0034 to 0114. US-0001-0007, US-0001-0009, AC-0001-0009 and BR-0001-0009, 0017, 0018 and 0019 gain a clause for the story tree. The spec-pack items stay until the REMOVE row lands. Landing, retirements and recorded drift: `## 2026-09-23 — Spec-to-story restructure: record of this run` below.

## Rationale

- 旧 3 spec はいずれもフレームワーク設計仕様であり、spec-pack 構造、トレーサビリティ連鎖、Governance は密接に関連
- v1421 layered spec-pack 構造への移行に伴い、構造定義を 1 つの spec に集約
- 実装 SSOT（specLayout.ts, specPack.ts）との整合性を優先

## Consolidation Mapping

| 新 ID 範囲        | 旧 spec   | 旧 ID 範囲              | 概要                              |
| ----------------- | --------- | ----------------------- | --------------------------------- |
| US-0001-0001~0003 | spec-0009 | US-0009-0001~0003       | Layered Spec 構造、レイアウト検出 |
| US-0001-0004~0007 | spec-0009 | US-0009-0001, 0003~0005 | トレーサビリティ、参照方向、Drift |
| US-0001-0008      | spec-0007 | US-0007-0001~0005       | Skill オーケストレーション        |
| US-0001-0009      | spec-0010 | US-0010-0001~0006       | Steering & Governance             |

## Candidates Considered

1. 旧 3 spec を独立に維持し ID のみ再採番
2. 3 spec を 1 つの spec-0001 に統合（採用）

## Adopted

- Adopted: 統合
- Why: 構造定義・トレーサビリティ・Governance は相互参照が密接で、分離管理のコストが統合コストを上回る

## Rejected

- Candidate: 独立維持
- Reason: spec 間の相互参照が多く、変更時の整合性維持が困難
- DO NOT: spec-pack 構造に関する仕様を複数 spec に分散させない

## Impact

- Affects: `.qfai/specs/spec-0001/` 配下の全ファイル
- 旧 spec-0007, spec-0009, spec-0010 は `.qfai/archive/specs-v1.7.x/` に退避済み
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行
- Owner: /qfai-sdd
- Due: 本バッチ完了時

## Implementation Delta Notes

- specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 は 9 ファイル（10_Plan.md は含まない）。旧 spec-0009 は 10 ファイル（10_Plan 含む）と記載していたが、実装に合わせて 9 + optional 10_Plan.md に修正
- 旧 spec-0007 の AskUserQuestion Protocol 関連 BR/EX/TC は Steering & Governance の一部として US-0001-0009 に包含

## Triage

| Source             | Subject                                                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| REQ-0001 (CHG-003) | 4-layer assistant-tree (constitution / manifest / catalog / process + agents / skills) を structural definition に追加 | spec-0001     | UPDATE    | APPEND | pin-implied | spec-pack structural definition の責務 (CAP-0001)。subject-token overlap (`asset`, `tree`, `assistant`). 新 CAP 不要。 |

## CHG-003 (v1.9.0) — Assistant-layer Recut Structural Definition

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Subject: `.qfai/assistant/` の top-level entry を 6 つに固定 (`constitution/`, `manifest/`, `catalog/`, `process/`, `agents/`, `skills/`) — `assistantAssets.ts` がこの enum を SSOT として参照する
- Cascade:
  - downstream spec-0003 (init) が新 layer 構造を seed
  - downstream spec-0004 (validate) が新 layer 構造を enforce
- Out-of-scope (this spec): 旧 layout の deprecation 受理は spec-0004 が記述。`assistantPaths.ts` SSOT module は spec-0003 / spec-0004 が記述
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0001

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                                                                                                            | Subject                                                                                                                                                                                                                            | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Depends-On                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0003                                                                                                                      | Story tree `.qfai/spec/`: three layers, flow and story directories, a story directory holding exactly three files                                                                                                                  | spec-0001     | UPDATE    | APPEND | -             | Slice A. New-layout items stand beside the old ones until P7. Conservation: every old-structure obligation is restated here or retired by this spec's REMOVE row, none dropped silently. Agents adopted this split over SUPERSEDE without a user question: this spec also owns the chain, escalation hook, drift protocol, governance and assistant tree, and the positional capability gate ignores `Status`. Size signal: 12 AC / 24 TC today, about 30 AC / 45 TC at the peak while both layouts coexist; the spec owns exactly CAP-0001, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | -                                              |
| discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0011                                                                               | Policy layer files, contract layer (index, `tech.md`, `structure.md`, five directories), `decisions.md` and `open-questions.md`                                                                                                    | spec-0001     | UPDATE    | APPEND | -             | Slice A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | -                                              |
| discussion-20260923063306456#REQ-0004, discussion-20260923063306456#REQ-0006, discussion-20260923063306456#REQ-0007, discussion-20260923063306456#REQ-0008, discussion-20260923063306456#REQ-0009 | ID grammar BF / US / AC / EX / BR; chain BF→US→AC→EX←BR; tests annotate BF, AC and EX                                                                                                                                              | spec-0001     | UPDATE    | APPEND | -             | Slice A. Conservation pairs with this spec's REMOVE row, which retires the old ID formats and the US→AC→BR→EX→TC chain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | -                                              |
| discussion-20260923063306456#REQ-0022, discussion-20260923063306456#NFR-0006                                                                                                                      | This spec owns the mdschema manifest: one entry and one paired template per new-tree file                                                                                                                                          | spec-0001     | UPDATE    | APPEND | -             | Slice A. No active spec owns the mdschema manifest today (zero item references)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                              |
| discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018                                                                                                                      | Assistant tree becomes `rule/`, skill `references/`, `agent/`, `skill/` and `prompt/`                                                                                                                                              | spec-0001     | UPDATE    | MODIFY | -             | Slice B, lands P6; the old names end in the same phase. The mechanical path rewrite also covers `qfai-grill` and `qfai-grilling`, whose SKILL.md cite `constitution/` and `catalog/`; no spec owns those two skills, a follow-up outside this run. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0012, discussion-20260923063306456#REQ-0013                                                                                                                      | Remove the old-layout items: 01_Spec, 06_Test-Cases, 10_Plan, 16_Traceability-ledger, test-list, 01_Spec-retired, CAP, Slice-Policy, lifecycle `Status`, `spec_required_files.json`, the old ID formats and the TC chain           | spec-0001     | UPDATE    | REMOVE | yusuke_senaga | Slice C. This repository's self-validation reads all of these, so the row lands in the change that deletes `specLayout` and the validators, together with the tests annotating these TCs; the Article V chain in `constitution.md` is rewritten in that change. 33 live ledger rows are tombstoned under `## TDD-ID reservations`. Replacements: this spec's three APPEND rows. By the user's Phase 2 grilling answer (Q3) the row also covers spec-pack layout detection — the US-0001-0002 chain (AC-0001-0003, BR-0001-0004, BR-0001-0005, EX-0001-0004, EX-0001-0005, with TC-0001-0003 and TC-0001-0004) — and the `_policies` reference direction — the US-0001-0005 chain (AC-0001-0007, BR-0001-0014, BR-0001-0015, EX-0001-0011, EX-0001-0024, with TC-0001-0010 and TC-0001-0011); both retire at P7                                                                                                                                                                                                                                                                                  | OQ-0170                                        |
| discussion-20260923063306456#REQ-0012                                                                                                                                                             | Drift protocol: a change request is a `decisions.md` row, the protected set is re-keyed to the story tree, `contractsDir` and both tables, and appending a change-request row or changing a change-request row's Status is allowed | spec-0001     | UPDATE    | MODIFY | -             | Slice C. This spec owns the drift protocol. Adopted (N07)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | OQ-0170                                        |

## 2026-09-23 — Spec-to-story restructure: record of this run

Run: `/qfai-sdd` batch `sdd-batch-20260923100952585`, recorded in
`.qfai/evidence/sdd-batch-20260923100952585.md`. The rows are the ones under
`## Triage (2026-09-23 spec-to-story)` above. No approved change request ordered
this run, so `## Change Requests` gains no row.

### What this run changed

| File                        | Change                                                                                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_Spec.md`                | Scope gains the story tree; Applicable NFR gains the pack's NFR-0006; Relevant Requirements gains 15 pack pairs; the US range becomes US-0001-0001 to 0017                                                                  |
| `02_User-stories.md`        | US-0001-0010 to 0017 added. US-0001-0007 (Goal, Notes) and US-0001-0009 (Non-goals) gain the story-tree and `rule/` clauses                                                                                                 |
| `03_Acceptance-Criteria.md` | AC-0001-0013 to 0031 added. AC-0001-0009 gains two story-tree lines                                                                                                                                                         |
| `04_Business-Rules.md`      | BR-0001-0025 to 0051 added. BR-0001-0009, 0017, 0018 and 0019 gain a story-tree clause beside the spec-pack clause                                                                                                          |
| `05_Examples.md`            | EX-0001-0025 to 0097 added                                                                                                                                                                                                  |
| `06_Test-Cases.md`          | TC-0001-0025 to 0097 added                                                                                                                                                                                                  |
| `tdd/test-list.md`          | TDD-0034 to 0114 added at `todo`: 73 rows for TC-0001-0025 to 0097 (TDD-0034 to 0103 and 0112 to 0114) and 8 E2E rows for US-0001-0010 to 0017 (TDD-0104 to 0111). No existing row changed Status                           |
| `10_Plan.md`                | A `### Story-tree layout` subsection under each H2: elements E1 (layout and ID grammar), E2 (tree reader) and E3 (decision and open-question rows), the test layers, the NFR breach signals, the dependencies and the risks |

No existing item was deleted, and `07_Decisions.md` and `08_Open-questions.md`
are unchanged.

### Operations and landing

The change is delivered in three pull requests:

1. **P1**, merged first: the guard pattern sets, the shape table, and the
   removal of out-of-band IDs from shipped files.
2. **P2 to P8**, one pull request. It also carries the `/qfai-atdd` and
   `/qfai-implement` passes and their tests.
3. **Exception removal**, after the second has merged: the guard exception for
   the migration memo's file name goes, with no template edit.

spec-0001 has no P1 or P5 work, so everything below lands in the second pull
request.

| Triage row                                   | Operation     | Items this run wrote                                                                                                                                                                | Lands                                                                                                   |
| -------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Story tree `.qfai/spec/`                     | UPDATE:APPEND | US-0001-0010; AC-0001-0013 to 0015; BR-0001-0025 to 0027; EX and TC-0001-0032 to 0038                                                                                               | P2 (templates and schemas), P3 (E1 and the story-directory family)                                      |
| Policy and contract layers, the two tables   | UPDATE:APPEND | US-0001-0011, 0012; AC-0001-0016 to 0020; BR-0001-0028 to 0035; EX and TC-0001-0039 to 0053                                                                                         | P2 (templates), P3 (E3 and the two-tables family)                                                       |
| ID grammar, chain and annotations            | UPDATE:APPEND | US-0001-0013 to 0015; AC-0001-0021 to 0027; BR-0001-0036 to 0046; EX and TC-0001-0054 to 0085 and 0097; BR-0001-0009 changed in place, layout-conditioned, with EX and TC-0001-0025 | P3 (E1, E2 and the grammar, EX-to-AC and BR-to-EX families); P7 for TC-0001-0025, the Article V rewrite |
| mdschema entries and paired templates        | UPDATE:APPEND | US-0001-0016; AC-0001-0028, 0029; BR-0001-0047 to 0049; EX and TC-0001-0086 to 0090                                                                                                 | P2                                                                                                      |
| Assistant tree `rule/ skill/ agent/ prompt/` | UPDATE:MODIFY | US-0001-0017; AC-0001-0030, 0031; BR-0001-0050, 0051; EX and TC-0001-0091 to 0094; the `rule/` path clause in US-0001-0007 Notes and US-0001-0009 Non-goals                         | P6                                                                                                      |
| Remove the old-layout items                  | UPDATE:REMOVE | Nothing: items stay untouched until landing                                                                                                                                         | P7, the first commit of the cutover. The list follows                                                   |
| Drift protocol on `decisions.md` rows        | UPDATE:MODIFY | US-0001-0007 Goal; AC-0001-0009; BR-0001-0017 to 0019; EX and TC-0001-0026 to 0031, 0095, 0096                                                                                      | P3 (E3 and `upstreamSsotGuard.ts`), P7 (`rule/drift-protocol.md` text)                                  |

"EX and TC-0001-NNNN" means the EX and the TC of the same number: in this run
each new TC cites the EX that shares its number.

### What the REMOVE row retires at landing

Approved by yusuke_senaga in Stage 1. By the user's Phase 2 answer (Q3) it also
covers the layout-detection and `_policies` reference-direction chains. It lands
in the first commit of the P7 cutover, while this repository is still on the
spec-pack layout.

| Subject                                                | Items                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Required file set, CAP edge, 01_Spec                   | US-0001-0001; AC-0001-0001, 0002; BR-0001-0001, 0002, 0003, 0013; EX-0001-0001, 0002, 0003, 0023 |
| Layout detection (Q3)                                  | US-0001-0002; AC-0001-0003; BR-0001-0004, 0005; EX-0001-0004, 0005                               |
| Old ID formats                                         | US-0001-0003; AC-0001-0004; BR-0001-0006; EX-0001-0006                                           |
| `_policies` reference direction (Q3)                   | US-0001-0005; AC-0001-0007; BR-0001-0014, 0015; EX-0001-0011, 0024                               |
| The TC chain                                           | AC-0001-0006; BR-0001-0010, 0011, 0012; EX-0001-0008, 0009, 0010                                 |
| Escalation Hook, which lives in 01_Spec                | US-0001-0006; AC-0001-0008; BR-0001-0016; EX-0001-0012                                           |
| Test cases, since `06_Test-Cases.md` goes              | TC-0001-0001 to 0024                                                                             |
| Ledger rows, tombstoned under `## TDD-ID reservations` | TDD-0001 to 0033: 24 rows for TC-0001-0001 to 0024 and 9 E2E rows for US-0001-0001 to 0009       |

Totals: 5 US, 7 AC, 13 BR, 13 EX, 24 TC and 33 ledger rows.

The row does not retire TC-0001-0025 to 0097 or TDD-0034 to 0114. They reach
the story tree through the repository migration, the third commit of the same
cutover: the migration rewrites each TC annotation to the EX the TC cites and
archives the ledger under
`.qfai/evidence/migration-spec-to-story/retired/spec-0001/`. Every item not in
the table above passes through the migration the same way.

### Co-changes the landing carries

| Phase | Co-change                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2    | Schemas under `packages/qfai/assets/mdschema/story/` with their `manifest.yml` entries, and templates under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/spec/`. Only this spec's plan fixes those two folder names; no contract does |
| P2    | `check-mdschema.mjs` expands `{contractsDir}` from `paths.contractsDir`, and exports `documentsWithoutOneEntry` over a manifest text; `mdschemaSchemas.test.ts` holds schemas and templates in both directions                                                |
| P2    | The CLI contract schema entry `{contractsDir}/cli/*.md` matches this repository's own `.qfai/contracts/cli/*.md` from P2, so its `## Rules` section is optional                                                                                               |
| P2    | Needs the P1 pull request merged: the templates carry sample-band IDs the guards must already know                                                                                                                                                            |
| P6    | `packages/qfai/tests/integration/specPackSpec0001.test.ts` reads `drift-protocol.md` and `constitution.md` from `rule/`: lines 57, 68–69 and the read at line 240                                                                                             |
| P6    | The repository co-change list in the assistant-tree Triage row above: `skillsDir`, the 42 tracked links, and the listed citations                                                                                                                             |
| P7    | `specPackSpec0001.test.ts` goes with the TCs it annotates                                                                                                                                                                                                     |
| P7    | Article V of `packages/qfai/assets/init/.qfai/assistant/rule/constitution.md` states the chain BF → US → AC → EX ← BR (TC-0001-0025), and `rule/drift-protocol.md` states a change request as a `decisions.md` row                                            |
| P7    | `specLayout.ts` and the readers of `.qfai/decisions/` go with the spec-pack validators                                                                                                                                                                        |
| P7    | `storyTree/ids.ts` merges into `packages/qfai/src/core/ids.ts` and is deleted. The ledger rows naming it, TDD-0069, 0070 and 0114, are re-pointed in the same commit                                                                                          |
| P7    | `buildContractIndex` takes over the `cli/` and `design/` enumeration from E2                                                                                                                                                                                  |
| P7    | The deletion keeps `parseFirstMarkdownTable`, `parseAllMarkdownTables` and `splitMarkdownRow`, or moves them to `core/parse/markdown.ts` first, because E2 and E3 import them                                                                                 |
| P7    | The plan rows that cite `specLayout.ts` as the source of truth leave with the items they describe                                                                                                                                                             |
| -     | No `scripts/dogfood-backlog.json` pin for `QFAI-ATDD-111` or `QFAI-ATDD-112`: the ATDD and implement passes write the new L3 and E2E tests before the pull request merges (P3-C1)                                                                             |

### Recorded drift

Found while drafting, not fixed under a row that does not cover it.

| Drift                                                                                                                                                                                                                                            | Where it is handled                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| US-0001-0007 Notes name `.qfai/assistant/instructions/drift-protocol.md`; the file is at `constitution/drift-protocol.md`. The new clause adds the `rule/` path and leaves the old one as it was                                                 | Open. The landing drops the old clause (OQ-0170)                                                                  |
| BR-0001-0019's spec-pack clause calls `.qfai/evidence/**` the only approval-free change. `drift-protocol.md` also allows ledger cells, change-request creation and `*.local.md` overlays                                                         | Open until P7, when the clause retires and `rule/drift-protocol.md` is rewritten                                  |
| The drift gate cannot tell an owner's edit from a downstream one: triage, retired-story and REJECTED rows that `/qfai-sdd` appends are flagged as spec-pack edits are today                                                                      | Open, no row. Rows confined to `Change request:` are exempt by the user's answer P2C-O1                           |
| Owning module cells follow the plan's table rather than the code: TDD-0087 to 0092 name `storyTreeObligations.ts`, where the kind function stays in `atddTraceability.ts`; TDD-0070 names `storyTree/ids.ts`, where E2 collects the declarations | Open; the implement pass reconciles the cells with the module it writes                                           |
| Cells that name a path only part of the work order has: TDD-0052 names `assistant/skill/` (from P6); TDD-0069, 0070 and 0114 name `storyTree/ids.ts` (P3 to P7)                                                                                  | The P7 commit that deletes `storyTree/ids.ts` rewrites those cells                                                |
| TC-0001-0043 says "the check", but no finding family owns the gate-commands rule; TDD-0052's oracle reads the shipped `tech.md` template instead (P3-D11)                                                                                        | Recorded; the TC wording stays                                                                                    |
| BR-0001-0038 would have reissued a retired highest ID, against BR-0001-0035                                                                                                                                                                      | Settled in Phase 2c (P2C-13): the count includes `decisions.md` rows, and the lift condition matches BR-0013-0028 |
| `W-ASSISTANT-LAYOUT` did not say it names a leftover old directory (EX-0001-0092)                                                                                                                                                                | Settled in Phase 2c (P2C-10) in `qfai-validate.md`                                                                |
| No finding family for BR-0001-0026 (a Mermaid diagram per `business-flow.md`) or BR-0001-0031 (gate commands stated once)                                                                                                                        | Settled in Phase 2c (P2C-18): the `business-flow.md` schema and the writers' rules realise them                   |
| BR-0001-0049's "sample story tree" was defined only by its fixture                                                                                                                                                                               | Settled: the rule now says the tree is built from the templates with one flow and one story                       |
| `specPackSpec0001.test.ts` was missing from the P6 co-change list                                                                                                                                                                                | Settled: in the plan and in the co-change table above                                                             |

### Adopted

- APPEND, MODIFY and REMOVE rows rather than a SUPERSEDE of the spec. Adopted
  by agents at the Triage gate.
- A story-tree clause beside the unchanged spec-pack clause, conditioned on the
  detected layout (X1). The spec text stays true against the running code, and
  the tests that read it stay green.
- BR-0001-0009 changed in place rather than retired and restated (G1-6).
- E1, E2 and E3 land at P3 with their first three consumers each.

### Rejected

- Rejected: supersede spec-0001 with a new story-tree spec.
  - Reason: this spec also owns the chain, the drift protocol, governance and
    the assistant tree, and the positional capability gate ignores `Status`.
  - DO NOT: open a second structural spec for the story tree.
  - Temptation: a fresh spec reads more simply than one holding both layouts
    until P7.
- Rejected: rewrite an existing item to the target text only.
  - Reason: the running code still implements the spec-pack clause, and tests
    read the item text.
  - DO NOT: drop a spec-pack clause before the change that retires it lands.
  - Temptation: the target-only text is shorter.
- Rejected: restate spec-pack layout detection as a new criterion.
  - Reason: validate and init each own their old-layout predicate (X8).
  - DO NOT: define the old-layout predicate in spec-0001.
  - Temptation: the predicate looks structural, which is this spec's subject.
- Rejected: a `story-tree` kind in `specLayout.ts#collectSpecEntries`.
  - Reason: the file is deleted at P7.
  - DO NOT: extend `specLayout.ts` for the story tree.
  - Temptation: one directory walker for both layouts.
- Rejected: extend `buildContractIndex` in place before P7.
  - Reason: its six spec-pack callers would start reading this repository's
    `cli/` and `design/` files (NFR-0105).
  - DO NOT: widen `buildContractIndex` before the cutover.
  - Temptation: one contract enumeration instead of two.
- Rejected: E1 at P1.
  - Reason: nothing calls it before P3.
  - DO NOT: land an element ahead of its consumers.
  - Temptation: the grammar looks like groundwork every later phase needs.
- Rejected: pin `QFAI-ATDD-111` and `QFAI-ATDD-112` in
  `scripts/dogfood-backlog.json`.
  - Reason: the user chose to land the tests in the same pull request (P3-C1).
  - DO NOT: add a dogfood pin for the new `todo` rows.
  - Temptation: a green dogfood lane before the tests exist.

### Corrections from the Reviewer Gate (2026-09-24)

The gate of review pack `review-20260924014832174` returned REVISE. The
griller's rulings and the user's answers behind these corrections are in the
batch record.

| Ruling             | What changed                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5                 | TC-0001-0086 and 0087 are restated over `documentsWithoutOneEntry`, a function `check-mdschema.mjs` exports, instead of `mdschemaSchemas.test.ts`, which hard-codes the shipped manifest path. EX-0001-0086 and 0087, BR-0001-0047 and the last line of AC-0001-0028 say the same. TC-0001-0087 moves from L3 to L1 and TDD-0096 to Unit/T1, owned by `check-mdschema.mjs`. The plan's P2 step names the function |
| D11                | TC-0001-0025 moves from L1 to L3 and TDD-0034 to Integration/T2, because its oracle reads the shipped `rule/constitution.md`. TC-0001-0041 and 0042 move to L3 and TDD-0050 and 0051 to Integration/T2, because `contractReferences.ts` reads `api/` through `buildContractIndex` from disk. The other family cases stay L1: E2 exposes `buildStoryTreeModel(files)` and the cases pass texts                     |
| U2                 | X8 stands: validate reads only the configured `paths.specsDir`, with no fallback to the old default path when the key is absent. The plan's X8 bullet says so                                                                                                                                                                                                                                                     |
| R02 findings 6, 16 | `contractReferences.ts` is listed among E2's consumers: it takes `cli/` and `design/` from E2 on the story-tree path. The kind function to export is named: the existing private `resolveTestKind` in `atddTraceability.ts`                                                                                                                                                                                       |

The second gate, review pack `review-20260924053652061`, returned REVISE. The
griller's ruling D12 is in the batch record.

| Ruling | What changed                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D12    | The plan's `readFileAtBase` reads at the merge base of `baseBranch` and HEAD, and its third usage, `upstreamSsotGuard.ts`, adds the base-without-story-tree predicate (EX-0004-0089). No item of this spec changes |

## Triage (2026-09-24)

| Source                                                         | Subject                                                                                             | Existing Spec | Operation | Sub-op | Approved By     | Rationale                                                                                                                                                                                                                                                                                                                                 | Depends-On |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| The accepted package-owned assistant tree and routing defaults | Retire the fixed nine-skill catalog and the claim that three absent TDD skills have catalog entries | spec-0001     | UPDATE    | REMOVE | user@2026-09-24 | BR-0001-0020/0022, AC-0001-0010, EX-0001-0016/0018, and TC-0001-0016/0018 assert an inventory the package no longer ships. The package skill files and `assistant-routing.md` own the current inventory. US-0001-0008 and REQ-0008 retain the orchestration requirement without a count. Preserve the old items in the migration archive. | OQ-0170    |
| The accepted package-owned assistant tree and routing defaults | Resolve skill inventory from the installed package rather than an enumerated count                  | spec-0001     | UPDATE    | MODIFY | -               | REQ-0008 and US-0001-0008 cite the package inventory and its routing contract; BR-0001-0021 continues to own execution order. The migration guide explains former TDD skills.                                                                                                                                                             | OQ-0170    |
