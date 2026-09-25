# 10 Plan

- Spec: spec-0001
- Parent: CAP-0001

## Implementation approach

### フレームワーク設計仕様の特性

CAP-0001 はフレームワーク設計仕様であり、実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。既に `specLayout.ts`、`specPack.ts`、`specPackIds.ts` として実装済み。

### 主要成果物

| 成果物             | パス                                               | 操作 | 説明                                   |
| ------------------ | -------------------------------------------------- | ---- | -------------------------------------- |
| spec-pack 構造定義 | `.qfai/specs/spec-0001/01_Spec.md` ~ `09_delta.md` | 新規 | 統合された spec-pack 構造仕様          |
| 実装コード（既存） | `packages/qfai/src/core/specLayout.ts`             | 参照 | v1421 レイアウト検出・必須ファイル定義 |
| 実装コード（既存） | `packages/qfai/src/core/validators/specPack.ts`    | 参照 | spec-pack バリデーション               |
| 実装コード（既存） | `packages/qfai/src/core/specPackIds.ts`            | 参照 | ID フォーマット検証                    |

### 検証戦略

- E_SPEC_MISSING_FILESET: spec-0001 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0001 が記載
- QFAI-COV-201: AC → TC エッジ充足
- QFAI-COV-202: BR → EX エッジ充足
- QFAI-COV-203: EX → TC エッジ充足

### Intent-driven entry (CAP-0018)

This change introduces one architectural element: **the shared stage-skill
contract**. It is the entry check stated once in the shipped
`constitution/shared-skill-operating-baseline.md`, and the rule that a skill
keeps its orchestrated-mode rules in one `references/orchestrated-mode.md` cited
by one `SKILL.md` line (BR-0001-0025, BR-0001-0028). Its consumers are the seven
skills a built-in plan names, each bound to it by its own rule:

| Consumer           | Usage                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| `qfai-atdd`        | BR-0008-0013                                                                    |
| `qfai-discussion`  | BR-0010-0014                                                                    |
| `qfai-implement`   | BR-0011-0023                                                                    |
| `qfai-prototyping` | BR-0012-0136                                                                    |
| `qfai-sdd`         | BR-0013-0033                                                                    |
| `qfai-verify`      | BR-0014-0031                                                                    |
| `qfai-maintain`    | BR-0018-0087, and CLI-WFFILE `### Vocabulary`, which names it for `maintenance` |

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`.

- **U2:**
  - the entry-check text and the Stage 0 reuse key in the operating baseline
    (BR-0001-0023, BR-0001-0025);
  - the six stage-skill `description:` rewrites (BR-0001-0026);
  - the catalog and order text (BR-0001-0020, BR-0001-0021).
- **U3:**
  - the drift whitelist's two exceptions in `constitution/drift-protocol.md`
    (BR-0001-0019), landing with spec-0011's and spec-0013's carve-out lines;
  - the request-authority text in `constitution/constitution.md` and the
    route orthogonality in `workflow.md` (BR-0001-0030, BR-0001-0031).
- This spec's operating-baseline section lands before spec-0015's autopilot
  passage in the same file.

Left out: each skill's `orchestrated-mode.md` content (that skill's spec);
`agents/openai.yaml` and the wrappers (spec-0003); the manifests and the
autopilot bucket mapping (spec-0015).

## Test approach

### L-struct 構造検証（qfai validate）

| 検証項目               | ルール ID                 | 対応 TC 範囲       |
| ---------------------- | ------------------------- | ------------------ |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET    | TC-0001-0001, 0002 |
| Parent CAP 参照        | E_SPEC_MISSING_PARENT     | TC-0001-0024       |
| v1421 レイアウト検出   | カスタム検証              | TC-0001-0003, 0004 |
| ID フォーマット        | QFAI-SPACK-XXX            | TC-0001-0005       |
| トレーサビリティ連鎖   | カスタム検証              | TC-0001-0006~0009  |
| 参照方向ルール         | E_POLICIES_UPPER_TO_LOWER | TC-0001-0010, 0011 |
| Escalation Hook        | カスタム検証              | TC-0001-0012       |
| Drift Protocol         | Custom check              | TC-0001-0013, 0014 |
| Skill catalog          | Custom check              | TC-0001-0018       |
| Canonical Workflow     | カスタム検証              | TC-0001-0019, 0020 |

### L5 E2E / L3 Integration / L4 API

- No `L4` API case: this spec binds no API contract. The `L3` and E2E cases are listed under `### Intent-driven entry (CAP-0018)` below.

### Intent-driven entry (CAP-0018)

Layers follow `.qfai/assistant/catalog/test-layers.md`. Every case this change
adds reads a shipped file, so it is `L3`, under `packages/qfai/tests/integration/`.
One module holds the cases of one business rule.

| Layer | What it proves                                                                                                                                              | Module                                                                          | Cases                      |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| `L3`  | The drift whitelist keeps its entries and gains the two bugfix exceptions                                                                                   | `specPackSpec0001.test.ts`, rewritten in place                                  | TC-0001-0015               |
| `L3`  | The shipped skill tree holds `qfai-run` and `qfai-maintain`                                                                                                 | `specPackSpec0001.test.ts`, rewritten in place                                  | TC-0001-0016               |
| `L3`  | The stage order holds within each of the five built-in plans, and no plan names `qfai-run`                                                                  | `specPackSpec0001.test.ts`, rewritten in place                                  | TC-0001-0017               |
| `L3`  | Stage 0 output is reused inside a run only on an equal recomputed key                                                                                       | `stage0ReuseSpec0001.test.ts`                                                   | TC-0001-0025               |
| `L3`  | The entry check: hand over, work the order, `off`; and the mismatched work order                                                                            | `stageSkillEntryCheckSpec0001.test.ts`                                          | TC-0001-0026, TC-0001-0027 |
| `L3`  | Each description opens with its trigger condition                                                                                                           | `stageSkillDescriptionsSpec0001.test.ts`                                        | TC-0001-0028               |
| `L3`  | A stage invoked by name runs standalone                                                                                                                     | `stageSkillStandaloneSpec0001.test.ts`                                          | TC-0001-0029               |
| `L3`  | One `references/orchestrated-mode.md`, cited by one `SKILL.md` line                                                                                         | `orchestratedModeReferenceSpec0001.test.ts`                                     | TC-0001-0030               |
| `L3`  | No skill a plan names carries `disable-model-invocation`                                                                                                    | One module, annotated with this case and spec-0018's adapter case, written once | TC-0001-0031               |
| `L3`  | The constitution states request authority and binding, and `workflow.md` keeps routes apart from change types                                               | `governanceTextSpec0001.test.ts`                                                | TC-0001-0032               |
| E2E   | A stage skill picked up by free text hands over: the deterministic half, as spec-0018 `10_Plan.md` `### Which journey discharges which stage story` maps it | The spec-0018 journey's module, annotated with US-0001-0010                     | US-0001-0010 (TDD-0042)    |

- The three rewritten cases keep TDD-0015..0017 at `exception`. Their
  re-observation is owed to ATDD, and their tests stay in the one existing file
  this change edits.
- The tests hold the seven skills and the five plans as literals, and parse no
  contract.

**Cases that stand alone, and the kept failure.**

- The entry check is three cases, not one: the handover (TC-0001-0026), the
  mismatched work order (TC-0001-0027) and invocation by name (TC-0001-0029).
- The one kept failure is TC-0001-0027: a work order matching no issued one
  edits nothing and returns the refusal to the harness.
- No case is matrix-shaped.

**Held by an existing guard, so no case is written for it.**

- Description length and the `<`/`>` ban: the frontmatter validator.
- The 800-line `SKILL.md` ceiling: the doctor line budget.
- That no article gains an exception: TC-0001-0020, unchanged.
- "Does not summarize the pipeline" and "no other orchestrated-mode text in a
  `SKILL.md` body": judged at review, on the diff.

**Order.** This spec's `L3` rows are tier 2 of spec-0018 `10_Plan.md`
`### Order in which the rows go green`.

- The operating-baseline passages land before spec-0015's autopilot passage in
  the same file.
- The drift whitelist change lands in one change with spec-0011's and
  spec-0013's carve-out lines.
- TC-0001-0016, 0017, 0028, 0030 and 0031 read `qfai-run`, `qfai-maintain` or the
  plan files, so they go green once spec-0018 ships them.
- The E2E row closes at tier 5, on the handover variant of the spec-0018 journey.

**Findings carried on purpose.** Pushes follow spec-0018 `10_Plan.md`
`### Findings carried on purpose`: each push lists the findings it is expected
to show, and the pull request merges only when every lane is green.

| Finding                                                | Why it is expected                       | Until                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `QFAI-ATDD-111` for US-0001-0010                       | Its journey variant does not exist yet   | The spec-0018 handover variant lands                                                                                |
| `QFAI-ATDD-112` for TC-0001-0025..0032                 | Their integration tests do not exist yet | ATDD writes them                                                                                                    |
| `QFAI-ATDD-131` on this spec, pinned at 1 under `full` | The spec has no Coverage Depth Matrix    | ATDD writes the first one, and that push re-pins with `node scripts/check-dogfood-backlog.mjs --profile full --pin` |

## Dependencies

- spec-0001 は QFAI の構造設計原則を定義するため、全 spec が本 spec の原則に従う
- spec-0002（discussion-pack 構造定義）は本 spec の spec-pack 構造ルールに準拠する

## NFR approach

- NFR-0101..0106 are unchanged by this entry; `qfai validate` with error 0 stays their measurement.

### Intent-driven entry (CAP-0018)

- `discussion-20260923171450572#NFR-0002` (asset ceiling): the constitution, operating-baseline, `workflow.md` and drift-protocol edits and the stage-skill description rewrites stay within 800 lines and 400 characters per line. A breach shows in the `assets.lineBudget` doctor check and `packages/qfai/src/core/doctor/assetLineBudget.ts`. A description over 1024 characters, or holding `<` or `>`, shows as the frontmatter validator's finding (`packages/qfai/src/core/validators/assistantAssets.ts`).
- `discussion-20260923171450572#NFR-0015` (distributed surface): the edits under `packages/qfai/assets/init/` carry no internal identifier and no private version marker. A breach shows in the pre-build shipping lint, the post-build leakage guard or the init smoke test (`.agents/rules/distributed-surface.local.md` `## Four guards`).
- OC-70 (assistant files are written in the asset tree): a breach shows as a tracked-tree diff after `pnpm sync:ssot` in `pnpm ci:gate`.
- Owned elsewhere, cited here: inside a run, upstream drift halts the run, and the owner skill invoked by name applies the approved Change Request outside it. spec-0018's plan carries that risk. The drift protocol gains only the two bugfix exceptions.

## Risk mitigation

| リスク                       | 影響度 | 軽減策                                                    |
| ---------------------------- | ------ | --------------------------------------------------------- |
| 統合による情報欠落           | 中     | 09_delta.md に Consolidation Mapping を記録               |
| specLayout.ts との不整合     | 中     | 実装コードを SSOT とし、spec は設計意図の文書化に留める   |
| 参照方向ルール違反の見落とし | 高     | qfai validate の E_POLICIES_UPPER_TO_LOWER_REF で自動検出 |
| トレーサビリティエッジの欠損 | 高     | qfai validate の QFAI-COV-201~203 で自動検出              |

### Intent-driven entry (CAP-0018)

| Risk                                                                                                         | Likelihood / impact | Mitigation                                                                          | Trigger to act                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The four missing-test lines land in separate changes, so a diagnosed missing test gets two answers           | med / high          | One change across spec-0001, spec-0011 and spec-0013; DR-0297 is the single wording | A pull request that edits one of `drift-protocol.md`, `change-request-reset.md`, `qfai-implement/SKILL.md` and `sdd-phase-checklists.md` without the others |
| spec-0015's section of the operating baseline lands before spec-0001's, so two changes edit the file at once | med / med           | spec-0001's section lands first                                                     | A spec-0015 implementation change touching `shared-skill-operating-baseline.md` while spec-0001's is unmerged                                               |
| A host truncates a rewritten description, so the trigger condition never reaches it                          | low / high          | Descriptions stay short; the release routing eval exercises skill selection         | A release routing-eval case in which a host selects a stage skill for free text                                                                             |
| The deprecated `tdd-*` catalog entries are read as live skills                                               | low / low           | Left for a later change with its own triage row                                     | A new test, rule or reference that cites a `tdd-*` skill as current                                                                                         |
