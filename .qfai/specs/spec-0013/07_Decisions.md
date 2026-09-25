# 07 Decisions

19 items.

## Decisions

### DR-0013-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: /qfai-sdd skill の全要件は SKILL.md テンプレートで定義済み。phase order, contract index, slice gate, reference direction, validate gate, mermaid, delta rejected guard 全て SKILL.md に構造として存在。one-shot GREEN で exception に確定する

### DR-0013-0002: Active discussion pointer reader — single helper over `state.json` (cites \_policies DR-0266)

- Decision: REQ-0155 reader side は \_policies **DR-0266** に従い、downstream `/qfai-sdd` skills が active discussion pack を `.qfai/state.json#discussion.currentId`（spec-0010 が writer の単一 SSOT）から single helper 経由で resolve する。filesystem mtime からの推論は禁止。missing/duplicate `currentId` は candidate dirs と `qfai discussion use <id>` を名指しした error で reject する。
- Context: REQ-0155 は spec-0010（writer）と spec-0013（reader）にまたがる。Source REQ は共通、file-local ID は spec ごと。
- Rationale: ephemeral session state を runtime-state surface（`state.json`）に集約し、19+ candidate dirs からの曖昧な推論を排除するため。

### DR-0013-0003: `primary_tasks` recommended count band 3..7 (cites \_policies DR-0267)

- Decision: REQ-0164 の band は \_policies **DR-0267** に従い **3..7** とし、`templates/contracts/ui-spec.yaml` comments と `references/ui-contract-guide.md` に文書化し、`QFAI-AUD-020` warning text が band を名指しする。
- Rationale: reporter projects の multi-screen SaaS surface で 5–6 primary task が常用される。2..5 / 1..3 は too strict。
- Rejected: ceiling を 5 に絞る / 1..3 minimal band — いずれも実 dashboard を過剰に flag する（DR-0267）。
  - DO NOT: recommended ceiling を 5 に固定しない。Temptation: tighter discipline。

### DR-0013-0004: `primary_tasks` structured shape `{id,label,acceptance}` all-required closed (cites \_policies DR-0268)

- Decision: REQ-0164 の structured shape は \_policies **DR-0268** に従い `{id, label, acceptance}` all-required・closed schema とし、`auditProfile.ts` は deprecation window 中 string-only と structured の双方を accept する。
- Rationale: `acceptance` field が task を testable にし、downstream atdd scaffolding (REQ-0157) の TODO assertion の anchor になる。
- Rejected: minimal `{id, label}`（`acceptance` を落とす）/ open `{...}` with `additionalProperties: true`（`priority?`/`owner?` は speculative / YAGNI）。
  - DO NOT: schema を open にしない / `acceptance` を省かない。Temptation: smallest schema / future-proofing（DR-0268）。

### DR-0013-0005: The qfai-sdd skill names the spec-pack homes only (2026-09-23)

- Status: accepted
- Context: The Triage subject says `SKILL.md` "names the same homes" as `/qfai-implement`, which include `Blocked-By`. `/qfai-sdd` holds no in-progress ledger row, so it never records a stop there. `discussion-20260923060900824#REQ-0007` asks that each home appear "in the skill that reaches it".
- Decision: The skill names a decision's home as `07_Decisions.md` or a Change Request, and a consultation's or out-of-scope discovery's as `08_Open-questions.md` or a Change Request. It does not name `Blocked-By`.
- Consequences: This narrows the Triage subject to the homes this skill reaches.
- Related: AC-0013-0030, BR-0013-0023
- Amended by: DR-0013-0018. The skill text this record decided stays. AC-0013-0030 and BR-0013-0023 are removed, so no item or test carries it.

### DR-0013-0006: Texts of AC-0013-0030, BR-0013-0023, EX-0013-0023 and TC-0013-0038 (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: The approved Triage appends one item per layer for `discussion-20260923060900824#REQ-0007`.
- Decision: State the homes as DR-0013-0005 names them, with no mention of the Decision Log entry and no split between settled and unsettled decisions. The absence clause covers every file under `packages/qfai/assets/init/.qfai/assistant/**` (DR-0013-0008).
- Consequences: The items state what the requirement names. The Decision Log pairing and the settled or unsettled split already have their home in `references/spec-traceability-rules.md`, and restating them here would give that rule a second copy to drift.
- Related: AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038

### DR-0013-0007: Texts of AC-0013-0029, BR-0013-0022, EX-0013-0022 and TC-0013-0039 (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: `discussion-20260923060900824#REQ-0008` requires the three files that describe the missing-approval stop to state the same stop and name no work-log entry.
- Decision: The items require the three steps in `SKILL.md` (`### --auto and approval-required rows`), `references/sdd-execution-playbook.md` (the missing-approval stop condition) and `references/sdd-triage.md` (step 7), and the absence of "work-log" and `consultation-needed` in each.
- Consequences: The implementation removes the work-log sentence from each stop, the `consultation-needed` kind bullet, the `W-PENDING-PROMOTION` example and the `## Work-log entries` section of `SKILL.md`. After that "work-log" appears nowhere else in these files, so a whole-file absence check is safe.
- Related: AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039

### DR-0013-0008: TC-0013-0038 carries the tree-wide absence check (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: `discussion-20260923060900824#REQ-0007` requires that no file under `packages/qfai/assets/init/.qfai/assistant/**` names `.qfai/steering/` or `worklog-entry.schema.md`, and every acceptance signal needs a test.
- Decision: AC-0013-0030, BR-0013-0023 and EX-0013-0023 state the tree-wide clause, and TC-0013-0038 checks it. spec-0011's TC-0011-0013 checks its own skill directory only.
- Consequences: The signal has one test and no new id is minted. A separate test case would change the approved Triage id list.
- Related: AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038

### DR-0013-0009: Source lines and qualified requirement lines (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: The Relevant Requirements list already holds local `REQ-0007` and `REQ-0008` with other meanings.
- Decision: AC-0013-0030 and AC-0013-0029 carry `- Source: discussion-20260923060900824#REQ-0007` and `#REQ-0008`. `01_Spec.md` names both as `discussion-20260923060900824#REQ-000N` with their titles, and mints no local id.
- Consequences: The new items trace to their pack, and the qualified ids cannot be read as the local ones.
- Related: AC-0013-0030, AC-0013-0029

### DR-0013-0010: One BR, one EX and one TC per new AC (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: The Triage lists one item per layer.
- Decision: Keep that granularity.
- Consequences: A `QFAI-COV-207` density warning may follow; it is triaged in the density review step, not by splitting the items.
- Related: AC-0013-0030, AC-0013-0029

### DR-0013-0011: TDD-0110 and TDD-0111 are `T2` (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: TC-0013-0038 and TC-0013-0039 read shipped files, which the tier table in `qfai-implement/references/volume-policy.md` places at `T2`.
- Decision: Seed both rows with `Tier = T2`.
- Consequences: The rows take per-row review. The neighbouring `Integration` rows keep `-`, which predates seeded tiers (DR-0013-0013).
- Related: TDD-0110, TDD-0111

### DR-0013-0012: The owning module of TDD-0110 and TDD-0111 is the skill directory (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: BR-0013-0023 and BR-0013-0022 are realized in the shipped `qfai-sdd` skill text.
- Decision: Set `Owning module` to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd` on both rows.
- Consequences: The two rows share a module and run in order. spec-0011's TDD-0021 names another module.
- Related: TDD-0110, TDD-0111, BR-0013-0023, BR-0013-0022

### DR-0013-0013: Seed `Tier` on new and reset rows only (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: Phase 2b re-derives `Tier` on every run, and a raised tier returns the row to `todo`. No Change Request drives this run, so re-deriving the older rows would reset `done` rows the change does not touch.
- Decision: Seed `Tier` on TDD-0110 and TDD-0111 only, and leave every other row's `Tier` as it is.
- Consequences: The older rows keep their recorded tier until a Change Request re-derives them.
- Related: TDD-0110, TDD-0111

### DR-0013-0014: BR-0013-0023 and BR-0013-0022 are realized by the shipped skill text (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: No contract under `.qfai/contracts/**` describes `/qfai-sdd`'s text. BR-0013-0023 names `07_Decisions.md`, `08_Open-questions.md` and a Change Request. BR-0013-0022 names the Triage `Approved By` cell, `QFAI-TRIAGE-005` and the stop report.
- Decision: Record both rules as realized by the shipped skill files under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`, with no contract. `07_Decisions.md` and `08_Open-questions.md` resolve to the spec-pack templates and their schemas under `packages/qfai/assets/mdschema/spec/`. `Approved By` resolves to the Triage table of the `09_delta.md` template, and `QFAI-TRIAGE-005` to `specPack.ts`. A Change Request resolves to `.qfai/decisions/CR-*`. The stop report is output and stores nothing.
- Consequences: No contract is added. A contract for skill text is something the request does not need.
- Related: BR-0013-0023, BR-0013-0022, AC-0013-0030, AC-0013-0029

### DR-0013-0015: The plan names where the skill text is edited and cites spec-0004 for the order (2026-09-23)

- Status: accepted
- Context: BR-0013-0023 and BR-0013-0022 are met by editing shipped skill text. The text has to land with the removal of `QFAI-TDDLIST-015`, like the `/qfai-implement` text.
- Decision: `10_Plan.md` gets one paragraph under `## Implementation approach`. It says the text is edited in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/` and mirrored by `pnpm sync:ssot`, and it cites spec-0004's `10_Plan.md` for the order.
- Consequences: The edit sits inside one skill and adds no architectural element. The order is stated once, in spec-0004.
- Related: BR-0013-0023, BR-0013-0022, TC-0013-0038, TC-0013-0039, TDD-0110, TDD-0111
- Amended by: DR-0013-0018. The plan paragraph stays; it no longer cites BR-0013-0022 and BR-0013-0023, and the text has no test of its own.

### DR-0013-0016: TC-0013-0038 and TC-0013-0039 hold one ledger row per boundary (2026-09-23)

- Status: superseded by DR-0013-0018
- Context: TC-0013-0038 checked four things behind one row: the record homes are stated, `SKILL.md` has no work-log section, `SKILL.md` has no `W-PENDING-PROMOTION` example, and no file of the assistant tree names the surface. TC-0013-0039 checked that three files state the stop steps and that none names a work-log entry. Each check is fixed by a different edit and can pass while another fails, so RED on one row observes only the first.
- Decision: TC-0013-0038 names four boundaries: `record-homes-stated` (TDD-0110), `no-worklog-section` (TDD-0112), `no-pending-promotion-example` (TDD-0113) and `no-surface-reference-in-tree` (TDD-0114). TC-0013-0039 names two: `stop-steps-stated` (TDD-0111) and `no-worklog-entry-named` (TDD-0115). Each TC-0013-0039 boundary is one assertion over all three files, whose failure lists every file that fails it. The new rows copy their sibling's Layer, Tier, owning module and `BR-Ref`. Level stays `integration`: the oracle reads the content of shipped files.
- Consequences: Each boundary is observed failing on its own, and all six fail against today's text. TDD-0114's own write is the `qfai-sdd` text, so its owning module stays the skill directory. It passes only after the spec-0011 and spec-0003/spec-0004 rows remove the other references, in the same change. DR-0013-0011..DR-0013-0013 apply to all six rows.
- Related: TC-0013-0038, TC-0013-0039, TDD-0110..TDD-0115. `09_delta.md` DL-0012.

### DR-0013-0017: The work-log removal chain moves to the next free IDs after the merge (2026-09-25)

- Status: superseded by DR-0013-0018
- Context: Main re-derived this pack under `CR-20260913-0012` and gave `AC-0013-0028`, `BR-0013-0021`, `EX-0013-0021`, `TC-0013-0036`, `TC-0013-0037` and `TDD-0044`..`TDD-0049` to the optional side artifact rules. That record allocated the test case IDs before this change gave the same IDs to the work-log removal chain, and `CR-20260923-0010` gave `AC-0013-0028` the same meaning. Main writes those IDs into its tests, its evidence and four Change Requests.
- Decision: Main's IDs keep their meaning. The work-log removal chain moves to the next free IDs: `AC-0013-0030`, `BR-0013-0023`, `EX-0013-0023`, `TC-0013-0038`, `TC-0013-0039` and `TDD-0110`..`TDD-0115`. `AC-0013-0029`, `BR-0013-0022` and `EX-0013-0022` did not collide and keep theirs. The wording of every item is unchanged.
- Consequences: Rule 4 of `spec-traceability-rules.md` ("a written `TDD-ID` is never renumbered") cannot hold on both sides of this collision. This side breaks it only in commit messages that have not merged, and `09_delta.md` maps each old ID to its new one. The test titles and annotations change with the IDs, so the six ledger rows are seeded at `todo` with no `DR-ID` and no `Evidence`, and are completed again.
- Related: AC-0013-0029, AC-0013-0030, BR-0013-0022, BR-0013-0023, EX-0013-0022, EX-0013-0023, TC-0013-0038, TC-0013-0039, TDD-0110..TDD-0115, CR-20260913-0012, CR-20260923-0010. `09_delta.md` DL-0013.

### DR-0013-0018: The record-homes and approval-stop obligations are withdrawn (2026-09-25)

- Status: accepted
- Context: The user decided on 2026-09-25 that no test checks the work-log surface is gone, and that the replacement skill text stays while its tests go. `CR-20260925-0010` records it, and its Triage group for this spec was approved at 2026-09-25T04:52:16Z. The pack's REQ-0007 and REQ-0008 are now checked by review.
- Decision: Remove AC-0013-0029, AC-0013-0030, BR-0013-0022, BR-0013-0023, EX-0013-0022, EX-0013-0023, TC-0013-0038 and TC-0013-0039, and the `discussion-20260923060900824#REQ-0007` and `#REQ-0008` lines of `01_Spec.md`. Delete ledger rows TDD-0110..TDD-0115 and tombstone each ID under a new `## TDD-ID reservations` section. DR-0013-0006..DR-0013-0014, DR-0013-0016 and DR-0013-0017 decided the withdrawn items or their IDs and are superseded. DR-0013-0005 and DR-0013-0015 are amended: the skill text and the plan paragraph they decided stand. The renumbering record in `09_delta.md` stays as history.
- Consequences: The shipped `/qfai-sdd` text that names each record's home and the approval stop stays, with no dedicated test. The stop steps stay pinned by `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`. The review that checks REQ-0007 searches for both `.qfai/steering/` and `worklog-entry.schema.md`; NFR-0006 lists only the first.
- Related: AC-0013-0029, AC-0013-0030, BR-0013-0022, BR-0013-0023, EX-0013-0022, EX-0013-0023, TC-0013-0038, TC-0013-0039, TDD-0110..TDD-0115, CR-20260925-0010. `09_delta.md` DL-0014.

### DR-0013-0019: [RE-OPEN] The record-homes acceptance signal has no test (2026-09-25)

- Status: re-open
- Context: DR-0013-0008 put the tree-wide absence check in TC-0013-0038, and DL-0004 rejected leaving an acceptance signal without a test.
- Decision: What changed is the acceptance signal itself. The user amended REQ-0007 in `CR-20260925-0010` so that it is checked by review, and withdrew its tests. TC-0013-0038 is removed with TDD-0110 and TDD-0112..TDD-0114.
- Consequences: No test scans the shipped assistant tree for the work-log surface.
- Related: TC-0013-0038, TDD-0110, TDD-0112, TDD-0113, TDD-0114, CR-20260925-0010. `09_delta.md` DL-0015.
- Re-opens: DR-0013-0008
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z
