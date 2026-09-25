# 07 Decisions

## Decisions

### DR-0004-0001: GitHub annotation 重複排除

- 重複する Issue は issueKey (code|severity|message|file|line|column|suppressed) で排除する
- Why: GitHub Actions のアノテーション上限（100件）を有効活用するため

### DR-0004-0002: Phase guard による refinement ブロック

- CI 環境で `--phase refinement` を指定した場合、バリデーションをスキップし blocking issue を生成する
- Why: refinement フェーズは開発者のローカル検証用であり、CI では full フェーズを使用すべきため

### DR-0004-0003: Legacy Validator 完全削除 (v1.7.14, DR-0115)

- Decision: legacy/ ディレクトリ、legacyStatusDir.ts、migration/formatDetection.ts、uix/rollout.ts を production ソースツリーから完全削除
- Context: v1.7.13 で canonical/legacy 分離を導入したが、legacy validator コードは migration tooling として残存していた
- Rationale: v1.7.14 は current-only SSOT リリース。migration tooling の存在自体が migration 期間の延長を示唆し、convergence を遅延させる。ソースツリーからの完全削除により、構造的に legacy path への依存を排除

### DR-0004-0004: IssueCategory "compatibility" 削除 (v1.7.14, DR-0294)

- Decision: IssueCategory union type から "compatibility" を削除し、"canonical" | "change" のみとする
- Context: v1.7.13 で canonical/legacy 分離後も "compatibility" カテゴリがレポート出力に残り、ユーザーに migration 文脈を想起させていた
- Rationale: current-only SSOT では全 issue が仕様準拠性（canonical）または変更追跡（change）に分類される。compatibility の概念は不要

### DR-0004-0005: Strict Classification & Strategy Semantic Validation (v1.7.14, DR-0111, DR-0114)

- Decision: classification.ts に意味的矛盾検出、strategy.ts に canonical enum 強制と状態機械検証を追加
- Context: v1.7.13 の classification.ts は構造チェックのみ（フィールド存在確認）。strategy.ts は 8 フィールドの型チェックのみで decision 値は任意文字列
- Rationale: 構造的に正しいが意味的に矛盾するデータ（ui_bearing=true + primary_surface=non-ui 等）を検出し、downstream の execution/report エラーを validator レイヤーで事前に防止

### DR-0004-0006: PROT-295..306, 308..309 Taxonomy Allocation (v1.7.15)

- Decision: fullHarness validator taxonomy range を 281-294 から 281-321 に拡張。PROT-295..306 に 12 の新規 error-level validator rules を割り当て、PROT-308..309 に追加の converged/reviewer checks を割り当て
- Context: v1.7.14 で PROT-290..294 を warning/info として導入したが、v1.7.15 でこれらを error に昇格し追加 rules を配置
- Rationale: 連番を維持し taxonomy 衝突を回避。PROT-307 はスキップ（将来予約）

### DR-0004-0007: All PROT-290..309 Rules Are Error Severity — Breaking Change (v1.7.15)

- Decision: PROT-290..306, PROT-308..309 の severity をすべて error とする（PROT-302, PROT-303 は warning に据え置き）。v1.7.14 の PROT-290..292 は warning→error に昇格
- Context: v1.7.14 では soft introduction のため warning で導入。v1.7.15 は破壊的変更リリースであり、evidence truthfulness を enforcement レベルで強制
- Rationale: warning では CI を通過するため enforcement として機能しない。v1.7.15 は後方互換を考慮しない設計判断（discussion 05_Scope.md §Constraints）に基づき、全 critical rules を error に統一

### DR-0004-0008: No Waiver Allowed for PROT-295..309 Error Rules (v1.7.15)

- Decision: PROT-295..309 の error-level rules に対する waiver を認めない
- Context: waivers.yml で warning/info を suppress/downgrade する仕組みが存在するが、error-level findings は waiver 対象外（spec-0014 BR-0014-0003 と一貫）
- Rationale: これらの rules は evidence truthfulness の根幹であり、waiver による回避は evidence 品質の保証を無効にする

### DR-0004-0009: Rev2 Validator Rules Use New Rule IDs for Semantic Changes (v1.7.15 rev2)

- Decision: rev2 で追加される validator rules のうち、既存 rule の severity upgrade は rule ID を維持し、semantic 変更（新しい検出対象）は新 rule ID に分離する
- Rationale: rule ID の安定性を保ちつつ、新検出対象を明確に区別。既存の waiver や CI 設定が意図せず新ルールを抑制するリスクを回避
- Status: Adopted

### DR-0004-0010: TDD impl-first backfill for v1.7.15 rev2

- Decision: v1.7.15 rev2 の validator 実装が先行完了しているため、TC-0004-0054..0062 の TDD エントリは exception (impl-first backfill) として登録
- Rationale: PROT-310..315 validator rules は prototypingEvidence.ts に実装済み。unit tests を追加し PASS 確認済み
- Status: Adopted

### DR-0004-0011: Guideline validators start at warning severity (v1.7.17)

- Decision: UIX-VAL-T05 / UIX-VAL-T06 は v1.7.17 では warning とする
- Context: discussion-20260418170937652 OQ-0003 で staged rollout が deferred されていた
- Rationale: 既存 discussion pack の migration note なしに即時 error 化すると導入ノイズが大きい
- Status: Adopted

### DR-0004-0012: Guideline coverage belongs to trendScan validator ownership (v1.7.17)

- Decision: `design_guideline_research` coverage check は `uix/trendScan.ts` に追加する
- Rationale: `04_Sources.md` category completeness は Trend Scan schema responsibility であり、trend validator に最も近い
- Status: Adopted

### DR-0004-0013: Anchor concreteness belongs to scoringReady validator ownership (v1.7.17)

- Decision: quantitative proxy check は `uix/scoringReady.ts` に追加する
- Rationale: `score_anchors` は scoring-ready schema の一部であり、新規 top-level validator より責務境界が明確
- Status: Adopted

### DR-0004-0014: v1.9.2 second-wave shared decisions referenced (REQ-0166 / REQ-0164 / REQ-0167)

- Decision: the v1.9.2 second-wave validate-side behavior follows shared `_policies/08_Decisions.md` decisions verbatim:
  - DR-0267 — `QFAI-AUD-020` recommended `primary_tasks` count band is `3..7` (OQ-0158 resolved); cited by BR-0004-0031 / AC-0004-0037.
  - DR-0268 — structured `primary_tasks` shape is the closed `{id, label, acceptance}` schema (`additionalProperties: false`, all required) accepted alongside string-only during the deprecation window (OQ-0159 resolved); cited by BR-0004-0031.
  - DR-0274 — pack-location lint scope is staged/changed dirs against the three allowed roots (OQ-0167 lint-scope dimension resolved); cited by BR-0004-0032 / BR-0004-0033.
- Decision: the SaaS-package validate profile (REQ-0166 validate side) gates on prototyping-profile PASS + DCON-005 attestation + CLI-HANDOFF schema, skips ATDD / implement-class gates with `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) per `_policies/05_Contracts.md` §CHG-006 (DCON-005 / CLI-VAL). Certify side owned by spec-0014.
- Status: Adopted

### DR-0004-0015: Delete removed items with no marker in the file

- Status: accepted
- Context: The `.qfai/steering/` removal deletes requirements, stories, criteria, rules, examples and cases from this spec. Each could be deleted, left as a gap note, or kept under a heading marked removed.
- Decision: Delete each removed heading or row outright and leave nothing in its place. The approved `## Triage (2026-09-23)` row in `09_delta.md` is the record of the removal.
- Consequences: The files hold gaps in their ID sequences. A gap note would restate the Triage row as history, and a heading kept as removed would still be read by the orphan and trace checks.
- Related: `09_delta.md` DL-0001. The REMOVE rows for `discussion-20260923060900824#REQ-0002` and `#REQ-0009`.

### DR-0004-0016: Tombstone each retired ledger ID on its own line

- Status: accepted
- Context: Deleting a ledger row lowers the highest `TDD-ID` in the file, so the next allocation would reissue a retired ID.
- Decision: Under a new `## TDD-ID reservations` section in `tdd/test-list.md`, write one tombstone bullet per retired ID: `- ~~TDD-NNNN~~ — row deleted 2026-09-23, obligation removed by <Source>`. TDD-0019 cites `discussion-20260923060900824#REQ-0009`; the other eleven cite `#REQ-0002`.
- Consequences: Retired IDs still count toward the allocation maximum. The removal path is an approved Triage row, so the bullets cite its `Source` and no Change Request.
- Related: TDD-0016, TDD-0017, TDD-0019, TDD-0020, TDD-0021, TDD-0027..TDD-0031, TDD-0059, TDD-0061. `09_delta.md` DL-0002.

### DR-0004-0017: Record the retired ledger rows beside the approved Triage rows

- Status: accepted
- Context: The record of a deleted row names it as `spec-0004/TDD-NNNN`, carries its `Evidence` cell verbatim, and says what happens to its test. The approved Triage rows do not carry that.
- Decision: Add a "Retired ledger rows" bullet list under `## Triage (2026-09-23)` in `09_delta.md` and leave the approved rows unchanged. The list also names the rewrite `/qfai-implement` owes on the live TDD-0018 test.
- Consequences: The approved Rationale cells stay as approved. The ledger holds no retired row.
- Related: `09_delta.md` DL-0003.

### DR-0004-0018: Reset TDD-0018 to todo under DR-0296

- Status: superseded by DR-0004-0044
- Context: TDD-0018 is `done`, and its evidence proves that an empty justification on `R-WORKLOG-DRIFT` is an error. The narrowed rule makes that case raise nothing.
- Decision: Reset TDD-0018 to `todo` with `DR-ID` `DR-0296`. `Evidence` opens with the reset and keeps the prior cell after it. Seed `Tier` T2, `Owning module` `packages/qfai/src/core/validators/reviewerJustification.ts` and `BR-Ref` BR-0004-0017.
- Consequences: The row is re-executed against the reversed oracle. An upstream reset is the only lawful way out of `done`; leaving the row `done` would keep evidence for behaviour that no longer holds.
- Related: TDD-0018, TC-0004-0018, BR-0004-0017. `_policies/08_Decisions.md` DR-0296. `09_delta.md` DL-0004.

### DR-0004-0019: TC-0004-0018 has two boundaries

- Status: superseded by DR-0004-0044
- Context: The narrowed REQ-0036 has two halves: an empty justification on `R-REJECTED-READOPT` is an error, and one on `R-WORKLOG-DRIFT` raises nothing. TC-0004-0018 is the only case for either.
- Decision: Split TC-0004-0018 into two ledger rows. TDD-0018 keeps its test, which already drives `R-WORKLOG-DRIFT`, and takes Boundary `worklog-drift-ignored`. New TDD-0072 takes Boundary `rejected-readopt-empty` at `todo`.
- Consequences: TDD-0072 asserts behaviour production already has, so it records that state at RED. Both halves stay inside the approved MODIFY row.
- Related: TDD-0018, TDD-0072, TC-0004-0018, AC-0004-0018. `09_delta.md` DL-0005.

### DR-0004-0020: New cases use Level integration and Layer integration

- Status: superseded by DR-0004-0044
- Context: This spec's cases spell the integration level `integration`, and its integration ledger rows spell the layer the same way.
- Decision: TC-0004-0074..0076 use Level `integration`. TDD-0067..TDD-0071 use Layer `integration`, lowercase, like TDD-0032..TDD-0053.
- Consequences: One spelling per file. Normalising the spec's other level and layer values is outside this change.
- Related: TC-0004-0074, TC-0004-0075, TC-0004-0076, TDD-0067..TDD-0071. `09_delta.md` DL-0006.

### DR-0004-0021: TDD-0072 sits in the validators layer with TDD-0018

- Status: superseded by DR-0004-0040
- Context: TDD-0072 splits a boundary off TC-0004-0018, whose existing row TDD-0018 has Layer `validators`.
- Decision: Give TDD-0072 Layer `validators`.
- Consequences: The rows of one case stay in one group. Moving TDD-0018 to another layer would need a Change Request.
- Related: TDD-0018, TDD-0072. `09_delta.md` DL-0007.

### DR-0004-0022: Tier is not re-derived on unchanged rows

- Status: accepted
- Context: Most existing rows carry no `Tier`. Deriving it for them would raise some, and a raised Tier on a `done` row is an upstream reset.
- Decision: Seed `Tier` only on the new rows and on the reset row TDD-0018.
- Consequences: Rows this change does not touch keep a blank `Tier`, which is read as T1.
- Related: TDD-0018, TDD-0067..TDD-0072. `09_delta.md` DL-0008.

### DR-0004-0023: Parents of the new criteria

- Status: superseded by DR-0004-0044
- Context: AC-0004-0040 and AC-0004-0041 need a parent story. A new story would add an E2E ledger row the approved Triage does not list.
- Decision: AC-0004-0040 hangs from US-0004-0020, which asks that removed surfaces do not reappear. AC-0004-0041 hangs from US-0004-0001, the deterministic machine gate.
- Consequences: No story and no E2E row is added.
- Related: AC-0004-0040, AC-0004-0041, US-0004-0020, US-0004-0001. `09_delta.md` DL-0009.

### DR-0004-0024: The unshipped-schema case hangs from AC-0004-0040

- Status: superseded by DR-0004-0044
- Context: TC-0004-0075 needs a parent criterion and rule. The approved Triage row places it under AC-0004-0040 and BR-0004-0034.
- Decision: Give AC-0004-0040 and BR-0004-0034 a second clause: a remaining `.qfai/assistant/catalog/worklog-entry.schema.md` raises `QFAI-ASSETS-006`.
- Consequences: No criterion or rule is added beyond the Triage.
- Related: TC-0004-0075, EX-0004-0043, AC-0004-0040, BR-0004-0034. `09_delta.md` DL-0010.

### DR-0004-0025: Name the upstream requirements without a local ID

- Status: accepted
- Context: This spec's own REQ-0010 means something different from the discussion pack's REQ-0010, so reusing the pack IDs locally would collide.
- Decision: `## Relevant Requirements` names each upstream requirement this spec now answers as `- discussion-20260923060900824#REQ-000N: <title>`, for REQ-0002, REQ-0004, REQ-0006 and REQ-0010. Each new criterion also carries a `- Source:` line.
- Consequences: No local REQ ID is minted.
- Related: AC-0004-0040, AC-0004-0041. `09_delta.md` DL-0011.
- Amended by: DR-0004-0044. No criterion carries a `- Source:` line now, because both criteria that did are removed. The four requirement lines stay: each requirement's behaviour clause still describes what `qfai validate` does.

### DR-0004-0026: Changed text is written in English

- Status: accepted
- Context: Several items this change edits are in Japanese. The repository is written in English.
- Decision: Write every changed line in English. REQ-0036 and BR-0004-0017 are rewritten whole; BR-0004-0028 changes only its last bullet.
- Consequences: Unchanged Japanese text stays as it is.
- Related: REQ-0036, BR-0004-0017, BR-0004-0028. `09_delta.md` DL-0012.

### DR-0004-0027: Narrow the justification rule to R-REJECTED-READOPT

- Status: accepted
- Context: The approved MODIFY rows narrow REQ-0036 to `R-REJECTED-READOPT`, reword the `R-WORKLOG-DRIFT` precedent in US-0004-0036 and BR-0004-0028, and re-parent the agent-catalog guard.
- Decision: REQ-0036, US-0004-0030, AC-0004-0018, BR-0004-0017, EX-0004-0016 and TC-0004-0018 require a justification on `R-REJECTED-READOPT` only. AC-0004-0018 drops "entry ID" and adds that an empty justification on `R-WORKLOG-DRIFT` raises no justification error. US-0004-0030 drops the handoff clause. BR-0004-0028 cites BR-0004-0017. US-0004-0036 cites REQ-0036, which states the same rule: a story may not cite a business rule, because references run from lower layers to upper ones only (`TRACE_DOWNSTREAM_REF`). AC-0004-0026 moves under US-0004-0001, EX-0004-0026 under BR-0004-0001, and BR-0004-0001 lists AC-0004-0026.
- Consequences: BR-0004-0017 ends with "`R-WORKLOG-DRIFT` is no longer a Reviewer-Gate code; a report carrying it raises no justification finding."
- Related: REQ-0036, US-0004-0030, US-0004-0036, AC-0004-0018, AC-0004-0026, BR-0004-0001, BR-0004-0017, BR-0004-0028, EX-0004-0016, EX-0004-0026, TC-0004-0018. `09_delta.md` DL-0013.
- Amended by: DR-0004-0044. AC-0004-0018, BR-0004-0017, EX-0004-0016 and TC-0004-0018 no longer state that an empty justification on `R-WORKLOG-DRIFT` raises nothing, and BR-0004-0017 no longer ends with the sentence this record quotes. The rest stands.

### DR-0004-0028: Keep every appended item

- Status: superseded by DR-0004-0044
- Context: The approved APPEND rows add AC-0004-0040..0041, BR-0004-0034..0035, EX-0004-0042..0044 and TC-0004-0074..0076. Some of them assert behaviour an existing check already has.
- Decision: Keep all of them. Each answers an acceptance signal of the discussion pack's REQ-0002, REQ-0004, REQ-0006 or REQ-0010.
- Consequences: Six new ledger rows: TDD-0067..TDD-0071 for the appended cases and TDD-0072 for the second boundary of TC-0004-0018.
- Related: TDD-0067..TDD-0072. `09_delta.md` DL-0014.

### DR-0004-0029: The Tier limit is stated in the delta

- Status: accepted
- Context: Seeding `Tier` only on new and reset rows leaves the other rows blank, and a reader cannot tell a limit from an omission.
- Decision: State the limit and its reason in one ledger bullet under `## Triage (2026-09-23)` in `09_delta.md`: no Change Request drives the other rows, and re-deriving would reset rows this change does not touch.
- Consequences: Each ledger this change edits carries the same bullet in its own delta.
- Related: DR-0004-0022. `09_delta.md` DL-0015.

### DR-0004-0030: The contract's broader justification sentence stays

- Status: superseded by DR-0004-0038
- Context: `.qfai/contracts/cli/qfai-validate.md` says `qfai validate` rejects Reviewer reports whose `R-*` findings lack `justification:`. That is broader than the narrowed REQ-0036.
- Decision: Leave the contract sentence as it is. BR-0004-0017 states the narrower rule in its own words.
- Consequences: Narrowing the contract would edit a contract outside the approved list, which is a decision for the user.
- Related: BR-0004-0017, CLI-VAL. `09_delta.md` DL-0016.

### DR-0004-0031: BR-0004-0034 binds CLI-VAL

- Status: superseded by DR-0004-0044
- Context: BR-0004-0034 states what `qfai validate` reads, which is the subject of the `qfai validate` contract.
- Decision: BR-0004-0034 carries `Contract-Refs: CLI-VAL`.
- Consequences: The rule is traced to the contract that governs it.
- Related: BR-0004-0034, CLI-VAL. `09_delta.md` DL-0017.

### DR-0004-0032: The justification rule resolves to the set `qfai validate` enforces

- Status: superseded by DR-0004-0039
- Context: `qfai-validate.md` says `qfai validate` rejects Reviewer reports whose `R-*` findings lack a justification. Read literally, that rejects an empty justification on `R-WORKLOG-DRIFT`, which BR-0004-0017 and AC-0004-0018 say raises nothing.
- Decision: Resolve the rule by a stated join, with no write. The sentence is enforced as the advisory-failing set plus the catalog codes, less the codes whose catalog registration is deferred (`ADVISORY_FAILING_CODES`, `CATALOG_ADVISORY_FAILING_CODES` and `DEFERRED_CATALOG_REGISTRATION_CODE_SET` in `reviewerJustification.ts`). `R-WORKLOG-DRIFT` leaves that set, and no contract declares it any more.
- Consequences: The broad sentence stays, as DR-0004-0030 decided. It is also the rejection rule BR-0015-0013 relies on for the eight catalog codes, so narrowing it would leave that rule without a contract line. Narrowing the contract or dropping the `R-WORKLOG-DRIFT` clause would each contradict a recorded decision and go to the user.
- Related: BR-0004-0017, AC-0004-0018, CLI-VAL, DR-0004-0030, BR-0015-0013. `09_delta.md` DL-0018.

### DR-0004-0033: `QFAI-ASSETS-006` resolves through the existing validate surface

- Status: superseded by DR-0004-0044
- Context: BR-0004-0034 reports a remaining `catalog/worklog-entry.schema.md` as `QFAI-ASSETS-006`. `qfai-validate.md` lists only the finding codes its own change introduced and says the rest of the existing surface is unchanged.
- Decision: Resolve the code by a stated join, with no write. `assistantAssets.ts` classifies a governed file the release does not ship as unshipped and emits `QFAI-ASSETS-006`. The shipped set is `SHIPPED_GOVERNED_ASSISTANT_FILES` in `governedAssistantManifest.ts`, which `npm run generate:governed-manifest` regenerates once the schema asset is deleted. The half of the rule that says validate does not read `.qfai/steering/` is realized by absence: the contract's scope line and codes table no longer name it.
- Consequences: The contract gains no row. A row for the code in the table of new codes would misfile an existing code and widen the approved contract edits.
- Related: BR-0004-0034, AC-0004-0040, CLI-VAL. `09_delta.md` DL-0019.

### DR-0004-0034: BR-0004-0035 binds CLI-VAL

- Status: superseded by DR-0004-0044
- Context: BR-0004-0035 states what a `blocked` ledger row needs under `qfai validate --profile tdd`. It named no contract.
- Decision: BR-0004-0035 carries `Contract-Refs: CLI-VAL`. The join runs from the existing validate surface to `TDDLIST_BLOCKED_MISSING_REF` in `tddList.ts`, over the ledger's `Status` value `blocked` and its `Blocked-By` column in the shipped `tdd/test-list.md` template. BR-0004-0017's join to CLI-VAL is recorded in the evidence and adds no line to the rule.
- Consequences: Both rules this run added about what validate reads name the contract, as DR-0004-0031 set for BR-0004-0034. The binding is a CLI contract, so it creates no API ledger row.
- Related: BR-0004-0035, AC-0004-0041, BR-0004-0017, CLI-VAL, DR-0004-0031. `09_delta.md` DL-0020.

### DR-0004-0035: BR-0004-0028 and AC-0004-0026 are reconciled with no write

- Status: accepted
- Context: BR-0004-0028 was reworded in this run to cite BR-0004-0017. AC-0004-0026 was moved under US-0004-0001.
- Decision: BR-0004-0028 resolves to `qfai-validate.md`: the `R-PROMPT-SCANNER-DRIFT` row carries its three-part content, and the sentences after that table carry its empty-justification rejection. AC-0004-0026 is realized by the agent-catalog guard in `tests/codex/agents.test.ts` and binds no contract, like the skill-text rules of spec-0011 and spec-0013.
- Consequences: Neither item changes.
- Related: BR-0004-0028, AC-0004-0026, CLI-VAL. `09_delta.md` DL-0021.

### DR-0004-0036: The plan holds the one order of the work-log removal

- Status: accepted
- Context: The removal spans six specs and lands as one change. The order matters because of this spec's validators: `TDDLIST_TEST_FILE_MISSING`, `TDDLIST_SELECTOR_UNRESOLVED`, `QFAI-TDDLIST-015` and the dogfood ratchet.
- Decision: `10_Plan.md` states the order once, under `## Implementation approach`, in seven steps. The first writes the failing tests; TDD-0072 and TDD-0070 record RED under `qfai-implement/references/red-not-observable.md`. The last re-pins the dogfood backlog, which may only lower a count. The plans of spec-0003, spec-0011 and spec-0013 cite it. Code is named by symbol, not by line range. Only the head of the change has to be green.
- Consequences: The change adds no architectural element, so the usage-reference check has nothing to count here. Earlier sections of the plan are not re-audited or rewritten.
- Related: BR-0004-0017, BR-0004-0034, BR-0004-0035, TC-0004-0018, TC-0004-0074, TC-0004-0075, TC-0004-0076. `09_delta.md` DL-0022.
- Amended by: DR-0004-0044. Step 1 no longer writes failing tests: the only test the change adds is TDD-0072. Step 4 also deletes the tests the withdrawal retires.

### DR-0004-0037: The removal's tests build their own trees

- Status: superseded by DR-0004-0044
- Context: TC-0004-0074 and TC-0004-0076 need trees under `.qfai/steering/`, and spec-0003's TC-0003-0060 needs another.
- Decision: Each test builds its own tree. No shared fixture or helper is planned.
- Consequences: The three trees differ, so there is no third identical caller for a shared fixture. Reusing a helper the suite already has is decided when the tests are written.
- Related: TC-0004-0074, TC-0004-0076, TC-0003-0060. `09_delta.md` DL-0023.

### DR-0004-0038: [RE-OPEN] The contract's justification sentence is narrowed

- Status: re-open
- Context: DR-0004-0030 left the `qfai-validate.md` sentence rejecting any `R-*` finding without a justification, because narrowing it was held to be outside the approved contract edits. Read alone, that sentence predicts an error on an empty `R-WORKLOG-DRIFT` justification, the reverse of AC-0004-0018's second clause and TDD-0018's oracle.
- Decision: What changed is the approval. The user approved narrowing the sentence. `## Reviewer-Gate input bundle` now requires a justification, and rejects a report that lacks one, only for `R-REJECTED-READOPT`, the other codes the contract declares with a required justification, and the codes the justification catalog registers. A finding in any other code raises no justification error.
- Consequences: The contract and AC-0004-0018 state the same rule. BR-0004-0017 keeps its words.
- Related: BR-0004-0017, AC-0004-0018, TC-0004-0018, CLI-VAL. `09_delta.md` DL-0024.
- Amended by: DR-0004-0044. BR-0004-0017 no longer keeps its words: it loses the sentence about `R-WORKLOG-DRIFT`. The contract sentence this record narrowed still states the rule that remains.
- Re-opens: DR-0004-0030
- Approved by: yusuke_senaga, through AskUserQuestion
- Approved at: 2026-09-23T11:38:07Z

### DR-0004-0039: [RE-OPEN] The justification rule resolves directly to the contract

- Status: re-open
- Context: DR-0004-0032 reconciled the broad contract sentence with AC-0004-0018 by a join the contract did not state. It rejected narrowing the sentence as contradicting DR-0004-0030 and as leaving BR-0015-0013 without a contract line.
- Decision: What changed is DR-0004-0038, which the user approved. The narrowed sentence states the set `qfai validate` enforces, so BR-0004-0017 and AC-0004-0018 resolve to it with no join. The catalog codes stay in the set, so BR-0015-0013 keeps its contract line.
- Consequences: No reading beyond the contract text is needed to reconcile the rule.
- Related: BR-0004-0017, AC-0004-0018, BR-0015-0013, CLI-VAL, DR-0004-0038. `09_delta.md` DL-0025.
- Re-opens: DR-0004-0032
- Approved by: yusuke_senaga, through AskUserQuestion
- Approved at: 2026-09-23T11:38:07Z

### DR-0004-0040: TC-0004-0018 is a unit case, and both its rows are unit rows

- Status: accepted
- Context: TC-0004-0018 had Level `validators` and its rows TDD-0018 and TDD-0072 had Layer `validators`. Neither is a legal value. `QFAI-ATDD-112` routes an unreadable Level to `tests/integration/**`, while the ledger treats it as a coverage target, so the case had two owners.
- Decision: Derive the level by the falsifying oracle. The oracle is the justification issue returned for a finding with an empty `justification:`. BR-0004-0017 owns which codes need one, not how reports are found or how a severity becomes an exit code, so the file read is setup and the level is `unit`. TC-0004-0018 takes Level `unit`. TDD-0018 and TDD-0072 take Layer `unit` in place, keeping every other cell.
- Consequences: `/qfai-implement` owns both rows and writes both tests, which matches the rewrite of `reviewerJustification.test.ts` it already owes. The case owes no ATDD annotation. The line for it in `tests/integration/qfai-traceability.md` is then read by no gate (`QFAI-ATDD-123` skips a unit case), so it is left in place. `TDDLIST_UNKNOWN_LAYER` no longer fires on the two rows. Relabelling in place is lawful: both rows are at `todo`, TDD-0018's prior trail has no anchor in any evidence file, and a `validators` row was already implement-owned, so no owner or evidence file changes. Retiring and reseeding TDD-0018 would contradict the approved Triage set, which keeps it.
- Related: TC-0004-0018, TDD-0018, TDD-0072, BR-0004-0017, AC-0004-0018. Supersedes DR-0004-0021. `09_delta.md` DL-0026.
- Amended by: DR-0004-0044. TDD-0018 is deleted. TC-0004-0018 stays `unit`, and TDD-0072 stays a `unit` row.

### DR-0004-0041: TDD-0072 runs after TDD-0018

- Status: superseded by DR-0004-0044
- Context: TDD-0072 asserts that an empty justification on `R-REJECTED-READOPT` is an error, which production already does. On a `unit` row `red-not-observable.md` accepts a `done` sibling as `Satisfied-by`, not a production path.
- Decision: TDD-0072 runs after TDD-0018 reaches `done` and cites TDD-0018 as `Satisfied-by`. Its falsifiability mutation removes `R-REJECTED-READOPT` from `ADVISORY_FAILING_CODES`. `10_Plan.md` step 1 states the order.
- Consequences: Both rows of the case run in one fixed order. Run first, TDD-0072 would have no lawful RED form and would end at `exception`.
- Related: TDD-0018, TDD-0072, TC-0004-0018. `09_delta.md` DL-0027.

### DR-0004-0042: The other new rows need no change

- Status: superseded by DR-0004-0044
- Context: The test design of TDD-0067..TDD-0071 was reviewed for level, boundaries, RED, Tier, owning module and `BR-Ref`.
- Decision: Keep them as seeded. TC-0004-0074 holds one row: its two assertions, none of the five codes and no finding naming `.qfai/steering/`, observe one boundary (validate does not read the directory) and pass on the same edit. TC-0004-0075 holds one boundary. TC-0004-0076 keeps its three rows, one per boundary.
- Consequences: The ledger keeps 60 rows. The next free ID is still TDD-0073.
- Related: TC-0004-0074, TC-0004-0075, TC-0004-0076, TDD-0067..TDD-0071. `09_delta.md` DL-0028.

### DR-0004-0043: A blocked row passes on a well-formed `Blocked-By`

- Status: superseded by DR-0004-0044
- Context: AC-0004-0041, BR-0004-0035, EX-0004-0044 and TC-0004-0076 said a `blocked` row passes when its `Blocked-By` is filled or non-empty. The check they keep, `TDDLIST_BLOCKED_MISSING_REF` through `parseBlockedBy` in `tddList.ts`, also requires `— blocked at <status>`. EX-0004-0044's passing value, `spec-0004:TDD-0001`, raises that error, so a test written to the example could not pass.
- Decision: The four items state the check as it is. A `blocked` row needs what it waits on and the status it was blocked at, one of `todo`, `red`, `green`, `refactor` or `review-fix`. EX-0004-0044 and TC-0004-0076 use `spec-0004:TDD-0001 — blocked at todo` for the passing row. The empty-cell boundary is unchanged.
- Consequences: No product code changes. TDD-0069 and TDD-0071 take the new fixture value and keep their boundaries. TDD-0070 is unchanged. All three stay at `todo`, so the sweep resets nothing. The contract join in DR-0004-0034 still holds, since it names the same code and column.
- Related: CR-20260923-0015, AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076, TDD-0069..TDD-0071, DR-0004-0034. `09_delta.md` DL-0029.

### DR-0004-0044: The work-log absence obligations are withdrawn

- Status: accepted
- Context: The user decided on 2026-09-25 that no test checks the work-log surface is gone, that nothing reacts to it, and that a behaviour an existing test already covers gets no second test. `CR-20260925-0010` records it, and its Triage group for this spec was approved at 2026-09-25T04:52:16Z. The production removal stays.
- Decision: Remove AC-0004-0040, AC-0004-0041, BR-0004-0034, BR-0004-0035, EX-0004-0042..0044 and TC-0004-0074..0076. Narrow AC-0004-0018, BR-0004-0017, EX-0004-0016 and TC-0004-0018 to `R-REJECTED-READOPT`. Delete ledger rows TDD-0018 and TDD-0067..TDD-0071 and tombstone each ID. TDD-0072 stays `done`: its boundary is the one TC-0004-0018 keeps. In `16_Traceability-ledger.md`, remove the bindings of the removed items, bind BR-0004-0001 to `packages/qfai/tests/core/specScopeValidate.test.ts`, and restate the Notes of BR-0004-0017. DR-0004-0018..0020, DR-0004-0023, DR-0004-0024, DR-0004-0028, DR-0004-0031, DR-0004-0033, DR-0004-0034, DR-0004-0037 and DR-0004-0041..0043 decided the withdrawn items and are superseded. DR-0004-0025, DR-0004-0027, DR-0004-0036 and DR-0004-0040 are amended.
- Consequences: `TDDLIST_BLOCKED_MISSING_REF` stays tested by `packages/qfai/tests/core/tddListBlockedStatus.test.ts`: "errors when Blocked-By is empty" for an empty cell, and "accepts ... with its departure status" for a well-formed one. `QFAI-ASSETS-006` on an unshipped file stays tested by `assistantAssetProvenance.test.ts` ("does report an unshipped sibling"). BR-0004-0001 is bound to `specScopeValidate.test.ts` because that file runs the real `validateProject` over the `sdd` profile and asserts findings from its validators; `tests/cli/validateRunIncomplete.test.ts` replaces `validateProject` with a mock.
- Related: AC-0004-0018, AC-0004-0040, AC-0004-0041, BR-0004-0001, BR-0004-0017, BR-0004-0034, BR-0004-0035, EX-0004-0016, EX-0004-0042, EX-0004-0043, EX-0004-0044, TC-0004-0018, TC-0004-0074, TC-0004-0075, TC-0004-0076, TDD-0018, TDD-0067..TDD-0072, CR-20260925-0010. `09_delta.md` DL-0030.

### DR-0004-0045: [RE-OPEN] Items that assert existing behaviour are dropped

- Status: re-open
- Context: DR-0004-0028 kept every appended item, and DL-0014 rejected dropping EX-0004-0043 or TC-0004-0075 "as needing no new code".
- Decision: What changed is the user's decision in `CR-20260925-0010`. A behaviour an existing test already covers gets no second test, and a surface that is gone gets no test of its absence. So TC-0004-0075 goes because `assistantAssetProvenance.test.ts` covers `QFAI-ASSETS-006` for any unshipped file, and TDD-0070 goes because `tddListBlockedStatus.test.ts` predates it with the same case.
- Consequences: The appended items leave with no replacement.
- Related: EX-0004-0043, TC-0004-0075, TC-0004-0076, TDD-0068, TDD-0070, CR-20260925-0010. `09_delta.md` DL-0031.
- Re-opens: DR-0004-0028
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z

### DR-0004-0046: [RE-OPEN] The R-WORKLOG-DRIFT clause leaves AC-0004-0018 and BR-0004-0017

- Status: re-open
- Context: DL-0018, under DR-0004-0032, rejected dropping the `R-WORKLOG-DRIFT` clause from AC-0004-0018 and BR-0004-0017, because the drop would have removed an approved acceptance clause to fit the contract.
- Decision: What changed is the user's decision in `CR-20260925-0010`: nothing reacts to the work-log surface, and no test checks that a removed code is ignored. The clause goes because the code it names is gone, not to fit the contract. The contract sentence DR-0004-0038 narrowed already states the rule that remains.
- Consequences: TC-0004-0018 holds one boundary, `rejected-readopt-empty`, which TDD-0072 tests.
- Related: AC-0004-0018, BR-0004-0017, EX-0004-0016, TC-0004-0018, TDD-0018, CR-20260925-0010. `09_delta.md` DL-0032.
- Re-opens: DR-0004-0032
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z

### DR-0004-0047: [RE-OPEN] TDD-0018 is retired

- Status: re-open
- Context: DL-0026, under DR-0004-0040, rejected retiring TDD-0018, because the user had approved keeping it.
- Decision: What changed is the approval. The user approved deleting TDD-0018 in `CR-20260925-0010`, and its boundary, `worklog-drift-ignored`, is no longer an obligation. No fresh row is seeded in its place.
- Consequences: TC-0004-0018's only row is TDD-0072.
- Related: TDD-0018, TDD-0072, TC-0004-0018, CR-20260925-0010. `09_delta.md` DL-0033.
- Re-opens: DR-0004-0040
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z
