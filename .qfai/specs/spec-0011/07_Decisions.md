# 07 Decisions

11 items.

## Decisions

### DR-0011-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: TC-0011-0001..0008 are carried by `packages/qfai/tests/integration/implementSkillSpec0011.test.ts`, which is the file the eight ledger rows name and which carries their annotations. Each case reads the shipped `qfai-implement` SKILL.md and holds the rule its test case states. None of them runs the skill, so the rows stay at `exception` rather than `done`.
- Correction: this rationale previously named `skillRoster.test.ts`, `completionContract.test.ts`, `evidenceContract.test.ts`, `parallelDispatch.test.ts` and `uixDetection.test.ts` as the coverage the exception rested on. Those files test the sub-agent roster, the completion and evidence contracts, the dispatch rules and the UI-bearing classification; none of them carries a `TC-0011-0001..0008` annotation, so the exception read as granted on coverage that was not there.

### DR-0011-0003: Decisions and discoveries leave `/qfai-implement` as a Change Request (2026-09-23)

- Status: accepted
- Context: `discussion-20260923060900824#REQ-0007` sends a decision to `07_Decisions.md` or a Change Request, and a consultation or discovery to `08_Open-questions.md` or a Change Request. `/qfai-implement` may not write `07_Decisions.md`, `08_Open-questions.md` or `09_delta.md` under the Drift Protocol.
- Decision: The skill sends a decision, a consultation and an out-of-scope discovery to `/qfai-sdd` as a Change Request, and `/qfai-sdd` records them in `07_Decisions.md` or `08_Open-questions.md`. A stop stays in the row's `Blocked-By`.
- Consequences: The skill names homes it can reach. Letting it write `07_Decisions.md` or `08_Open-questions.md` itself would contradict the Drift Protocol. Naming `.qfai/decisions/DR-*` as well would repeat an existing anomaly route the requirement does not ask for.
- Related: AC-0011-0012, BR-0011-0009, TC-0011-0013

### DR-0011-0004: Texts of AC-0011-0012, BR-0011-0009, EX-0011-0010 and TC-0011-0013 (2026-09-23)

- Status: accepted
- Context: The approved Triage appends one item per layer for `discussion-20260923060900824#REQ-0007`.
- Decision: Write the four items as DR-0011-0003 routes the records. EX-0011-0010 and TC-0011-0013 also assert that the `blocked -> todo` bullet contains no `archived` and no instruction to close a record.
- Consequences: The resume edge is checked for the closing step the removed surface asked for, because that bullet carries no `.qfai/steering/` literal an absence check would find.
- Related: AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013

### DR-0011-0005: TC-0011-0013 checks the `qfai-implement` skill directory only (2026-09-23)

- Status: accepted
- Context: `discussion-20260923060900824#REQ-0007` also requires that no file under `packages/qfai/assets/init/.qfai/assistant/**` names `.qfai/steering/` or `worklog-entry.schema.md`.
- Decision: spec-0013's TC-0013-0038 carries the tree-wide absence check. TC-0011-0013 keeps its own-directory clause.
- Consequences: Every acceptance signal has a test and no new id is minted. A separate test case for the tree-wide half would change the approved Triage id list.
- Related: TC-0011-0013

### DR-0011-0006: Source line and requirement copy-down (2026-09-23)

- Status: accepted
- Context: The Relevant Requirements list already holds a local `REQ-0007` with another meaning.
- Decision: AC-0011-0012 carries `- Source: discussion-20260923060900824#REQ-0007`. `01_Spec.md` names the requirement as `discussion-20260923060900824#REQ-0007` with its title, and mints no local id.
- Consequences: The new item traces to its pack. The qualified id cannot be read as the local `REQ-0007`.
- Related: AC-0011-0012

### DR-0011-0007: One BR, one EX and one TC for AC-0011-0012 (2026-09-23)

- Status: accepted
- Context: The Triage lists one item per layer.
- Decision: Keep that granularity.
- Consequences: A `QFAI-COV-207` density warning may follow; it is triaged in the density review step, not by splitting the items.
- Related: AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013

### DR-0011-0008: TDD-0021 is `T2` (2026-09-23)

- Status: accepted
- Context: TC-0011-0013 reads shipped files, which the tier table in `qfai-implement/references/volume-policy.md` places at `T2`.
- Decision: Seed TDD-0021 with `Tier = T2`.
- Consequences: The row takes per-row review. The neighbouring `Integration` rows keep `-`, which predates seeded tiers (DR-0011-0010).
- Related: TDD-0021

### DR-0011-0009: TDD-0021's owning module is the skill directory (2026-09-23)

- Status: accepted
- Context: BR-0011-0009 is realized in the shipped `qfai-implement` skill text.
- Decision: Set `Owning module` to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`.
- Consequences: TDD-0021 shares no module with the two spec-0013 rows, which share the `qfai-sdd` skill directory and run in order. The other parallel-dispatch conditions still apply.
- Related: TDD-0021, BR-0011-0009

### DR-0011-0010: Seed `Tier` on new and reset rows only (2026-09-23)

- Status: accepted
- Context: Phase 2b re-derives `Tier` on every run, and a raised tier returns the row to `todo`. No Change Request drives this run, so re-deriving the older rows would reset rows the change does not touch.
- Decision: Seed `Tier` on TDD-0021 only, and leave every other row's `Tier` as it is.
- Consequences: The older rows keep their recorded tier until a Change Request re-derives them.
- Related: TDD-0021

### DR-0011-0011: BR-0011-0009 is realized by the shipped skill text (2026-09-23)

- Status: accepted
- Context: No contract under `.qfai/contracts/**` describes `/qfai-implement`'s text. BR-0011-0009 names the row's `Blocked-By`, a Change Request, `07_Decisions.md` and `08_Open-questions.md`.
- Decision: Record the rule as realized by the shipped skill files under `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/`, with no contract. `Blocked-By` resolves to the column of the shipped `tdd/test-list.md` template. `07_Decisions.md` and `08_Open-questions.md` resolve to the spec-pack templates and their schemas under `packages/qfai/assets/mdschema/spec/`. A Change Request resolves to `.qfai/decisions/CR-*`.
- Consequences: No contract is added. A contract for skill text is something the request does not need.
- Related: BR-0011-0009, AC-0011-0012

### DR-0011-0012: The plan names where the skill text is edited and cites spec-0004 for the order (2026-09-23)

- Status: accepted
- Context: BR-0011-0009 is met by editing shipped skill text. The text has to land with the removal of `QFAI-TDDLIST-015`, or an agent following it meets an error that asks for the entry the text no longer mentions.
- Decision: `10_Plan.md` gets one paragraph under `## Implementation approach`. It says the text is edited in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/` and mirrored by `pnpm sync:ssot`, and it cites spec-0004's `10_Plan.md` for the order.
- Consequences: The edit sits inside one skill and adds no architectural element. The order is stated once, in spec-0004.
- Related: BR-0011-0009, TC-0011-0013, TDD-0021

### DR-0011-0013: TC-0011-0013 holds one ledger row per boundary (2026-09-23)

- Status: accepted
- Context: TC-0011-0013 checked three things behind one row: the record homes are stated, the `blocked -> todo` bullet closes no record, and the skill names no work-log surface. Each is fixed by a different edit and can pass while another fails, so RED on one row observes only the first. EX-0011-0010 also asserts that neither file contains "work-log entry", which the case did not check.
- Decision: TC-0011-0013 names three boundaries: `record-homes-stated`, `resume-closes-no-record` and `no-surface-reference`. TDD-0021 keeps the first, and TDD-0022 and TDD-0023 are appended at `todo` for the other two, with the same Layer, Tier, owning module and `BR-Ref`. The `no-surface-reference` boundary also checks that neither file contains "work-log entry". Level stays `integration`: the oracle reads the content of shipped files.
- Consequences: Each boundary is observed failing on its own. All three fail against today's text. DR-0011-0008..DR-0011-0010 apply to all three rows.
- Related: TC-0011-0013, EX-0011-0010, TDD-0021, TDD-0022, TDD-0023. `09_delta.md` DL-0011.
