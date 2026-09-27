# 04 Sources

## Source Registry

Repository facts follow `.qfai/assistant/skills/qfai-discussion/SKILL.md#reviewer-gate-must`.
Each fact names where it was read, beside the fact itself or by the `SRC-ID` of
the row that holds it. A row nobody cites leaves the reader to work out which
fact it backs, which is the check this registry exists for.

SRC-0001 to SRC-0023 are the research sources in `## Research Summary` below.
SRC-0024 to SRC-0030 were read while authoring, to check a fact the pack states.
Every row was observed in this worktree on 2026-09-23.

| SRC-ID   | Title                                             | Type    | URL / Path                                                                                                                                                                                              | Retrieved  | Notes                                  |
| -------- | ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------- |
| SRC-0001 | Work-log surface validator and entry reader       | primary | `packages/qfai/src/core/validators/worklogSurface.ts`; `packages/qfai/src/core/worklogEntries.ts`                                                                                                       | 2026-09-23 | REQ-0002, REQ-0009, NFR-0006           |
| SRC-0002 | The tdd-profile stop check                        | primary | `packages/qfai/src/core/validators/tddList.ts` (`blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate`, Check 8b)                                                                           | 2026-09-23 | REQ-0004, REQ-0015                     |
| SRC-0003 | Path and enum constants, C versus A               | primary | `packages/qfai/src/core/paths/assistantPaths.ts:16-20,87-89,100-145`                                                                                                                                    | 2026-09-23 | REQ-0005, NFR-0001, NFR-0006           |
| SRC-0004 | `qfai init` seed, report lines, instructions      | primary | `packages/qfai/src/cli/commands/init.ts` (`seedProjectSteering`, `buildProjectSteeringEntryTemplate`, `classifyLegacySteeringEntry`)                                                                    | 2026-09-23 | REQ-0001, REQ-0010, NFR-0001, NFR-0003 |
| SRC-0005 | Rule-code registries and reviewer gate set        | primary | `packages/qfai/src/cli/commands/validate.ts:596-601,622-627`; `packages/qfai/src/core/validators/reviewerJustification.ts:15-27`                                                                        | 2026-09-23 | REQ-0002, REQ-0003, REQ-0009, REQ-0012 |
| SRC-0006 | Governed-asset manifest and the retire path       | primary | `packages/qfai/src/core/governedAssistantManifest.ts:27`; `init.ts:1514-1570` `retireWithdrawnGovernedAssets`; `assistantAssetProvenance.ts:55-65,781-787`; `validators/assistantAssets.ts:519,983-992` | 2026-09-23 | REQ-0006, REQ-0011, NFR-0002, NFR-0003 |
| SRC-0007 | Shipped assets that define or ask for entries     | primary | `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`; qfai-implement and qfai-sdd skill files                                                                                    | 2026-09-23 | REQ-0006, REQ-0007, REQ-0008, NFR-0006 |
| SRC-0008 | Tests that pin the surface                        | primary | `packages/qfai/tests/**` (list in the research summary)                                                                                                                                                 | 2026-09-23 | REQ-0017                               |
| SRC-0009 | Spec packs that specify the surface               | primary | `.qfai/specs/spec-0003`, `.qfai/specs/spec-0004`                                                                                                                                                        | 2026-09-23 | REQ-0016                               |
| SRC-0010 | Shared policies that establish the surface        | primary | `.qfai/specs/_policies/08_Decisions.md:1531`; `07_Constraints.md:44-57`; `06_Glossary.md`; `05_Contracts.md`                                                                                            | 2026-09-23 | REQ-0016                               |
| SRC-0011 | CLI contracts that describe the surface           | primary | `.qfai/contracts/cli/worklog-entry.schema.md`; `qfai-init.md`; `qfai-validate.md`; `shipped-workflows.md:30`                                                                                            | 2026-09-23 | REQ-0016                               |
| SRC-0012 | Published and repository-only documents           | primary | `README.md:719`; `packages/qfai/README.md:713`; `packages/qfai/docs/finding-codes.md:64`; others in the research summary                                                                                | 2026-09-23 | REQ-0012                               |
| SRC-0013 | The managed `.gitignore` block                    | primary | `packages/qfai/src/core/gitignore.ts:70-81`                                                                                                                                                             | 2026-09-23 | OQ-0012                                |
| SRC-0014 | This repository's seven entries                   | primary | `.qfai/steering/*.md`, `.gitkeep`, `_templates/entry.md`                                                                                                                                                | 2026-09-23 | REQ-0013                               |
| SRC-0015 | Tracked records that point into the directory     | primary | CR-20260805-0001, CR-20260810-0001, CR-20260912-0003; `.qfai/evidence/*`; spec-0006 files                                                                                                               | 2026-09-23 | REQ-0013, REQ-0014                     |
| SRC-0016 | Dogfood backlog ratchet                           | primary | `scripts/check-dogfood-backlog.mjs` (`compareAgainstPin`); `scripts/dogfood-backlog.json`                                                                                                               | 2026-09-23 | REQ-0015, NFR-0005                     |
| SRC-0017 | Drift protocol on deleted obligations             | primary | `packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md:363-368`                                                                                                                      | 2026-09-23 | REQ-0016                               |
| SRC-0018 | Distributed surface rule and guards               | primary | `.agents/rules/distributed-surface.md`; `.agents/rules/distributed-surface.local.md`                                                                                                                    | 2026-09-23 | NFR-0004                               |
| SRC-0019 | Minimal implementation ladder                     | primary | `.agents/rules/minimal-implementation.md`                                                                                                                                                               | 2026-09-23 | REQ-0010                               |
| SRC-0020 | Version discipline and the adopted branch pin     | primary | `.agents/rules/version-discipline.md`; `.agents/rules/version-discipline.local.md`                                                                                                                      | 2026-09-23 | REQ-0011, OQ-0011                      |
| SRC-0021 | CHANGELOG conventions                             | primary | `CHANGELOG.md` (`## [Unreleased]`; `### Removed (BREAKING)` under 1.8.4, 1.8.7, 1.8.8)                                                                                                                  | 2026-09-23 | REQ-0011, OQ-0011                      |
| SRC-0022 | Documentation clarity rule                        | primary | `.agents/rules/documentation-clarity.md`                                                                                                                                                                | 2026-09-23 | REQ-0007, NFR-0007                     |
| SRC-0023 | Repository structure note on the two trees        | primary | `CLAUDE.md` section "`packages/qfai/` and `.qfai/`"                                                                                                                                                     | 2026-09-23 | REQ-0006                               |
| SRC-0024 | Stage evidence: grilling session and dispositions | primary | `.qfai/evidence/discussion-20260923060900824.md` `## Grilling Session`, `### Options shown per round`, `### Per-entry disposition (decision 6)`                                                         | 2026-09-23 | REQ-0013, OQ-0001 to OQ-0009           |
| SRC-0025 | spec-0003 blocked rows and ledger reservations    | primary | `.qfai/specs/spec-0003/tdd/test-list.md` rows `TDD-0058..0063`; no `## TDD-ID reservations` heading in the spec-0003 or spec-0004 ledger                                                                | 2026-09-23 | REQ-0015, OQ-0010                      |
| SRC-0026 | What a `Blocked-By` cell names                    | primary | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/obligation-columns.md:16-18`                                                                                                | 2026-09-23 | REQ-0004, REQ-0007                     |
| SRC-0027 | B's Stage 0 refresh contract                      | primary | `packages/qfai/assets/init/.qfai/assistant/constitution/workflow.md` `### Stage 0 — Steering refresh contract (mandatory)`                                                                              | 2026-09-23 | NFR-0002                               |
| SRC-0028 | Review routing for this stage                     | primary | `.qfai/assistant/manifest/review-profiles.yml` `requirements-heavy`; `.claude/skills/qfai-discussion/references/rcp_footer.md`                                                                          | 2026-09-23 | `14_Review-Request.md`                 |
| SRC-0029 | Evidence that cites the tracked spec-0017 report  | primary | `.qfai/evidence/atdd-spec-0017.md:410,2326`; `.qfai/report/validate.spec-0017.json:40-149`                                                                                                              | 2026-09-23 | OQ-0013                                |
| SRC-0030 | Discussion packs are ignored by default           | primary | `.qfai/discussion/.gitignore:1` (`discussion-*/`)                                                                                                                                                       | 2026-09-23 | `14_Review-Request.md`                 |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Research Summary

The `research_summary` output of `.qfai/assistant/constitution/research-first-protocol.md`,
carried here unchanged from this run's stage evidence (SRC-0024, `## Research Summary`).
Repository research began before round 1, and the facts looked up for rounds 3 and 4 are in
that evidence. The research-first protocol pass itself ran after rounds 1-4 were confirmed at
2026-09-23T06:33:23Z. It raised two decisions, so the session was reopened for round 5 and
confirmed again at 2026-09-23T07:08:14Z, before any pack file was written (SRC-0024,
`## Grilling Session`). Every source is `primary`. The run had no web tool, so no `external`
source exists and no freshness ratio is computed.

```yaml
research_summary:
  sources:
    - id: SRC-0001
      title: Work-log surface validator and entry reader
      type: primary
      locator: >-
        packages/qfai/src/core/validators/worklogSurface.ts (whole module:
        W-WORKLOG-SCHEMA, W-WORKLOG-BROKEN-LINK, W-WORKLOG-STALE,
        W-PENDING-PROMOTION, R-HANDOFF-INCOMPLETE);
        packages/qfai/src/core/worklogEntries.ts (whole module:
        collectWorklogEntries, collectStoppedSpecIds, unreadableWorklogEntries,
        parseWorklogEntry, WORKLOG_STOP_KINDS);
        packages/qfai/src/core/validators/index.ts:86;
        packages/qfai/src/core/validate.ts:99,784
      observed: 2026-09-23
    - id: SRC-0002
      title: The tdd-profile stop check that depends on the surface
      type: primary
      locator: >-
        packages/qfai/src/core/validators/tddList.ts:28,60-66 (imports),
        :4962-4988 (StoppedSpecIndex, BlockedWorklogGate), :4990-5034
        (blockedWithoutWorklog, QFAI-TDDLIST-015), :5036-5107
        (readSteeringIndex, QFAI-TDDLIST-016), :5154-5170 (gate wiring in
        validateTddList), :5499 (gate parameter of validateSpecTddList),
        :6198-6227 (Check 8b call and comment)
      observed: 2026-09-23
    - id: SRC-0003
      title: Path and enum constants, C versus A
      type: primary
      locator: >-
        packages/qfai/src/core/paths/assistantPaths.ts:18-20
        (PROJECT_STEERING_DIR, PROJECT_STEERING_TEMPLATES_SUBDIR), :87-89
        (joinProjectSteering), :100-145 (WORKLOG_ENTRY_KINDS,
        WORKLOG_ENTRY_STATUSES, HANDOFF_REQUIRED_SECTIONS). The
        LEGACY_ASSISTANT_* constants and joinLegacyAssistant* functions in the
        same file are A and stay.
      observed: 2026-09-23
    - id: SRC-0004
      title: qfai init seed, report lines and generated instructions
      type: primary
      locator: >-
        packages/qfai/src/cli/commands/init.ts:93-94 (imports), :178 (the
        STANDARD_ASSET_PATHS comment naming steering/), :642-647
        (seedProjectSteering call), :686,701,716 (result folding),
        :1732 (section comment), :1967-2020
        (buildProjectSteeringEntryTemplate), :2022 (summarizeSeedDrift),
        :2079 (readSeedBodyForDrift), :2128-2186 (seedProjectSteering),
        :8147 (generated copilot-instructions line). classifyLegacySteeringEntry
        (:2713) and the upgrade path (:2625-2860) are A and stay.
      observed: 2026-09-23
    - id: SRC-0005
      title: Rule-code registries, profile lists and reviewer gate set
      type: primary
      locator: >-
        packages/qfai/src/cli/commands/validate.ts:598-601 (W-WORKLOG-*,
        W-PENDING-PROMOTION in the sdd list), :624-625 (R-HANDOFF-INCOMPLETE,
        R-WORKLOG-DRIFT in reviewer-gate-sdd), :1990-1999 (QFAI-TDDLIST-015 and
        -016 descriptions); packages/qfai/src/core/emittedRuleCodes.ts:373-374,
        439, 512, 516-518, 782-783, 826;
        packages/qfai/src/core/validators/reviewerJustification.ts:18-25,
        141-142; comments only in justificationCatalog.ts:9,
        assistantTreeMigration.ts:55-56, skillDocReferences.ts:187-193 (also the
        W-SKILL-PROJECT-MEMORY message text), prototypingEvidence.ts:459,
        parse/spec.ts:157
      observed: 2026-09-23
    - id: SRC-0006
      title: Governed-asset manifest and the retire path for a withdrawn file
      type: primary
      locator: >-
        packages/qfai/src/core/governedAssistantManifest.ts:27 (generated;
        npm run generate:governed-manifest);
        packages/qfai/src/cli/commands/init.ts:926-927,1514-1570
        (retireWithdrawnGovernedAssets);
        packages/qfai/src/core/assistantAssetProvenance.ts:63-65
        (ADOPTER_OWNED_ASSETS)
      observed: 2026-09-23
    - id: SRC-0007
      title: Shipped assets that define or demand work-log entries
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md
        (187 lines; tracked symlink .qfai/assistant/catalog/worklog-entry.schema.md);
        skills/qfai-implement/SKILL.md:260;
        skills/qfai-implement/references/execution-ledger.md:412-419,477-483;
        skills/qfai-sdd/SKILL.md:96-98,294,368-371;
        skills/qfai-sdd/references/sdd-execution-playbook.md:206;
        skills/qfai-sdd/references/sdd-triage.md:179. No match in qfai-atdd,
        qfai-verify, qfai-prototyping, agents/, constitution/, manifest/
        (agent-routing.yml, review-profiles.yml) or root/.
      observed: 2026-09-23
    - id: SRC-0008
      title: Tests that pin the surface
      type: primary
      locator: >-
        whole files: packages/qfai/tests/validators/worklogSurface.test.ts,
        tests/assets/worklogSchemaShipped.test.ts,
        tests/assets/implementWorklogObligation.test.ts,
        tests/assets/initContractSteeringSeed.test.ts. Blocks:
        tests/core/tddListBlockedStatus.test.ts:313-530 (QFAI-TDDLIST-015/016
        describe), tests/cli/init.test.ts:37,3580-3760 (TC-0003-0022),
        tests/integration/initSpec0003.test.ts:222-224,
        tests/validators/reviewerJustification.test.ts:5,46-88,
        tests/assets/autoModeApprovalDegrade.test.ts:56,59,86,101,
        tests/scripts/checkReadmeAlignment.test.ts:168-176. Registries:
        tests/core/findingCodeGrammar.test.ts:100,180,184-186,
        tests/core/issueCodeUniqueness.test.ts:195,346,530,
        tests/validators/ruleCodeUniqueness.test.ts:202-209,
        tests/integration/cli/commands/validate.profileCoverageNotice.test.ts:658-659,
        tests/unit/core/validators/justificationCatalog.test.ts:77,
        tests/scripts/typeCheckEnumeration.allowlist.ts:82,468,
        packages/qfai/tsconfig.tests.json:96. Cosmetic only (example strings,
        titles, comments): tests/cli/args.test.ts:1405-1409,
        tests/cli/commands/sddPreflight.test.ts:310-324,
        tests/core/sddPreflight.test.ts:80-88,
        tests/validators/assistantTreeMigration.test.ts:47,
        tests/assets/stopReasonSpecAlignment.test.ts:30,
        tests/integration/validatorConvergenceIntegration.test.ts:9-10,
        tests/integration/validators/justificationRejectEmpty.test.ts:6,
        tests/integration/contractDeferralNotes.test.ts:202-543 (synthetic
        E-WORKLOG-SECRET / R-WORKLOG-DRIFT fixtures),
        tests/core/contractSsotModules.test.ts:172-184,377 (synthetic fixture)
      observed: 2026-09-23
    - id: SRC-0009
      title: Spec packs that specify the surface
      type: primary
      locator: >-
        .qfai/specs/spec-0003 (01_Spec.md:55,89 REQ-0019; 02 US-0003-0016;
        03 AC-0003-0018; 04 BR-0003-0016; 05 EX-0003-0019; 06 TC-0003-0022;
        08 OQ-0003-0002; tdd/test-list.md TDD-0022 done);
        .qfai/specs/spec-0004 (01_Spec.md:85-89,92 REQ-0035..0039, REQ-0042;
        02 US-0004-0029..0031; 03 AC-0004-0016..0021, AC-0004-0027..0030;
        04 BR-0004-0015..0020; 05 EX-0004-0014..0019, EX-0004-0027..0031;
        06 TC-0004-0016..0021, TC-0004-0027..0031; tdd/test-list.md
        TDD-0016..0021, TDD-0027..0031, all done)
      observed: 2026-09-23
    - id: SRC-0010
      title: Shared policies that establish the surface
      type: primary
      locator: >-
        .qfai/specs/_policies/08_Decisions.md:1531-1610 (DR-0250..0260);
        07_Constraints.md:37-57 (TC-66, TC-70, OC-51, OC-52);
        06_Glossary.md:35-64 (CHG-003 work-log terms);
        05_Contracts.md:57-59 (CLI-INIT, CLI-VAL, CLI-WLOG rows), :91-96;
        10_delta.md:621-660 (CHG-003 history); 02_Initiative.md:78
      observed: 2026-09-23
    - id: SRC-0011
      title: CLI contracts that describe the surface
      type: primary
      locator: >-
        .qfai/contracts/cli/worklog-entry.schema.md (165 lines);
        qfai-init.md:14,37-46,413-415; qfai-validate.md:3,9-11,20-33,53-75,
        144-158; shipped-workflows.md:30 (cites the schema as a precedent)
      observed: 2026-09-23
    - id: SRC-0012
      title: Published and repository-only documents
      type: primary
      locator: >-
        README.md:702,719-732 and packages/qfai/README.md:696,713-726 (section
        "AI work-log surface"); packages/qfai/docs/finding-codes.md:64 (uses
        W-WORKLOG-SCHEMA as the W- example); .github/copilot-instructions.md:19;
        AGENTS.md:52; .instruction/02_project/domain.md:22;
        scripts/check-doc-clarity.mjs:44,60
      observed: 2026-09-23
    - id: SRC-0013
      title: The managed .gitignore block
      type: primary
      locator: >-
        packages/qfai/src/core/gitignore.ts:70-81 (report, evidence,
        discussion, review, state.json; no steering path); .gitignore:58-67
      observed: 2026-09-23
    - id: SRC-0014
      title: This repository's seven work-log entries
      type: primary
      locator: >-
        .qfai/steering/*.md (7 entries), .qfai/steering/.gitkeep,
        .qfai/steering/_templates/entry.md; all tracked
      observed: 2026-09-23
    - id: SRC-0015
      title: Tracked records that point into .qfai/steering/
      type: primary
      locator: >-
        .qfai/decisions/CR-20260805-0001-*.md:34;
        CR-20260810-0001-*.md:5,90-93,183; CR-20260912-0003-*.md:1311-1329
        (approved action 10); `.qfai/evidence/implement-spec-0006.md` (lines 3166,
        4852-4865, 5152, 7663, 8160, 8281); `.qfai/evidence/implement-spec-0017.md` (lines 916, 978);
        `.qfai/evidence/coverage-depth-spec-0002.md` (line 495);
        .qfai/specs/spec-0006/09_delta.md:198;
        .qfai/specs/spec-0006/tdd/test-list.md:100;
        `.qfai/report/validate.spec-0017.json` (lines 44-149, tracked report)
      observed: 2026-09-23
    - id: SRC-0016
      title: Dogfood backlog ratchet
      type: primary
      locator: >-
        scripts/check-dogfood-backlog.mjs:60-66 (compareAgainstPin), :160-169
        (an improved count fails until re-pinned); scripts/dogfood-backlog.json
        (spec-0003/tdd/test-list.md 73, spec-0017/tdd/test-list.md 140);
        .github/workflows/ci.yml:803,826,850
      observed: 2026-09-23
    - id: SRC-0017
      title: Drift protocol on upstream change and deleted obligations
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md:206-230
        (drift classes), :363-368 (sweep; a deleted obligation's row is
        removed and its TDD-ID tombstoned under ## TDD-ID reservations)
      observed: 2026-09-23
    - id: SRC-0018
      title: Distributed surface rule and this repository's guards
      type: primary
      locator: >-
        packages/qfai/assets/init/root/.agents/rules/distributed-surface.md;
        .agents/rules/distributed-surface.local.md
      observed: 2026-09-23
    - id: SRC-0019
      title: Minimal implementation ladder
      type: primary
      locator: packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md
      observed: 2026-09-23
    - id: SRC-0020
      title: Version discipline and the adopted branch pin
      type: primary
      locator: >-
        packages/qfai/assets/init/root/.agents/rules/version-discipline.md;
        .agents/rules/version-discipline.local.md
      observed: 2026-09-23
    - id: SRC-0021
      title: CHANGELOG conventions
      type: primary
      locator: >-
        CHANGELOG.md:5 (## [Unreleased]), :10810-10830 (1.9.0 "Added
        (assistant-layer recut + steering work-log surface)"), :13176-13195
        ("### Removed (BREAKING)" precedent);
        .agents/rules/repository-language.md (Unreleased held at zero Japanese)
      observed: 2026-09-23
    - id: SRC-0022
      title: Documentation clarity rule
      type: primary
      locator: packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md
      observed: 2026-09-23
    - id: SRC-0023
      title: Repository structure note on the two trees
      type: primary
      locator: CLAUDE.md (section "packages/qfai/ and .qfai/"); pnpm sync:ssot
      observed: 2026-09-23
  best_practices:
    - id: BP-0001
      category: shipped-asset removal
      title: Retire the schema through the existing withdrawn-asset path
      description: >-
        Delete the asset and regenerate governedAssistantManifest.ts. On
        `qfai init --force` the existing retire pass then deletes an adopter's
        unedited copy of catalog/worklog-entry.schema.md and keeps an edited
        one with a note. No new migration code is needed.
      source_id: SRC-0006
    - id: BP-0002
      category: shipped-asset removal
      title: Reuse before writing
      description: >-
        Removal needs no replacement mechanism. Stop records already have homes
        (Blocked-By naming a CR, a contract line or a cross-spec row;
        07_Decisions; 08_Open-questions; stage evidence), so the change is
        deletions plus skill text naming those homes.
      source_id: SRC-0019
    - id: BP-0003
      category: traceability
      title: Remove a deleted obligation's ledger rows and tombstone their ids
      description: >-
        spec-0003 TDD-0022 and spec-0004 TDD-0016..0021, TDD-0027..0031 lose
        their obligation outright. Remove the rows, and add each TDD-ID to the
        ledger's "## TDD-ID reservations" section so the next allocation does
        not reissue it.
      source_id: SRC-0017
    - id: BP-0004
      category: CI
      title: Re-pin the dogfood backlog in the same change
      description: >-
        Removing QFAI-TDDLIST-015/016 lowers error counts on ledgers with
        blocked rows (spec-0017 has six today). An improved count fails the
        dogfood lanes until `node scripts/check-dogfood-backlog.mjs --profile
        <p> --pin` runs for tdd, sdd and full in the same change.
      source_id: SRC-0016
    - id: BP-0005
      category: release notes
      title: Record the removal under Unreleased as a breaking removal
      description: >-
        One English entry under "## [Unreleased]", in the "### Removed
        (BREAKING)" shape, naming the codes that no longer appear, the seed
        init no longer writes, and that an existing .qfai/steering/ is left
        alone and unread. CHANGELOG may carry internal ids; shipped text may not.
      source_id: SRC-0021
    - id: BP-0006
      category: versioning
      title: Leave the version to the user
      description: >-
        The branch is unpinned, so the version field, a release heading and a
        chore(release) commit each need an explicit instruction. A breaking
        change is expressed by raising the npm minor or major, never by a
        private marker.
      source_id: SRC-0020
    - id: BP-0007
      category: repository layout
      title: Edit the package tree, then sync
      description: >-
        Change packages/qfai/assets/init/.qfai/**, run pnpm sync:ssot, and
        delete the tracked symlink .qfai/assistant/catalog/worklog-entry.schema.md.
        Editing .qfai/assistant/** directly is reverted.
      source_id: SRC-0023
    - id: BP-0008
      category: shipped text
      title: State where each record goes, without history
      description: >-
        The replacement skill text names the current home of each kind and
        why. It does not say the stage used to write a work-log entry.
      source_id: SRC-0022
  anti_patterns:
    - id: AP-0001
      category: scope
      title: Removing by the word "steering"
      description: >-
        A token sweep reaches A (LEGACY_ASSISTANT_STEERING_DIR,
        classifyLegacySteeringEntry, D-DEPRECATED-PATH) and B (Stage 0
        steering refresh, catalog steering files), which stay. "handoff" also
        names an unrelated live feature: .qfai/handoff.yaml,
        handoffUpgrade.ts, R-HANDOFF-SCHEMA-DRIFT. Remove by symbol:
        PROJECT_STEERING_*, WORKLOG_*, HANDOFF_REQUIRED_SECTIONS,
        R-HANDOFF-INCOMPLETE.
      source_id: SRC-0003
    - id: AP-0002
      category: scope
      title: Treating R-REJECTED-READOPT as part of the work-log family
      description: >-
        DR-0258 and REQ-0036 pair it with R-WORKLOG-DRIFT, but it concerns a
        rejected option in 07_Decisions.md and reads no work-log entry. Only
        the R-WORKLOG-DRIFT half is superseded.
      source_id: SRC-0005
    - id: AP-0003
      category: ordering
      title: Deleting the entries before the stop check
      description: >-
        spec-0003's TDD-0058..0063 are blocked and its blocker entry is what
        satisfies QFAI-TDDLIST-015. Deleting the directory first raises an
        error and trips the ratchet. The check, its skill text and the
        directory go in one change.
      source_id: SRC-0002
    - id: AP-0004
      category: traceability
      title: Leaving specs that describe a removed surface
      description: >-
        spec-0003 and spec-0004 would keep REQ/AC/TC rows for behaviour that
        no longer exists. They are superseded through the owner path, with
        approval-required UPDATE:REMOVE triage rows, not left for later.
      source_id: SRC-0009
    - id: AP-0005
      category: request bound
      title: Adding a warning for the old directory
      description: >-
        A finding for a leftover .qfai/steering/ is a control the request did
        not ask for, and decision 5 rules it out.
      source_id: SRC-0019
    - id: AP-0006
      category: evidence
      title: Rewriting dated observations while moving content
      description: >-
        Content moved from an entry is appended to the target evidence file
        with its original date. An existing dated observation in that file is
        not rewritten to match.
      source_id: SRC-0015
  reflection:
    - source_id: SRC-0002
      finding: >-
        QFAI-TDDLIST-016 exists only to report that QFAI-TDDLIST-015 could not
        be answered. It falls with 015, along with BlockedWorklogGate,
        readSteeringIndex and the gate parameter of validateSpecTddList.
      action: apply
      reason: It has no subject once 015 is gone; this is scope the decision implies, not a new decision.
    - source_id: SRC-0016
      finding: The dogfood ratchet fails on an improved count until re-pinned.
      action: apply
      reason: Without the re-pin the removal change is red in CI.
    - source_id: SRC-0006
      finding: >-
        Adopters' catalog/worklog-entry.schema.md is retired by the existing
        --force path (deleted when unedited, kept and named when edited).
      action: apply
      reason: >-
        Decision 5 leaves .qfai/steering/ untouched; the schema is a governed
        QFAI asset, not project content. The CHANGELOG note should say so.
    - source_id: SRC-0017
      finding: Ledger rows of deleted obligations are removed and their TDD-IDs tombstoned.
      action: apply
      reason: The drift protocol prescribes it.
    - source_id: SRC-0007
      finding: >-
        The qfai-sdd --auto stop and the Stage 1 approval stop write a
        consultation-needed entry before Phase 0, where a CREATE row has no
        spec pack and so no 08_Open-questions.md.
      action: defer
      reason: >-
        Decision 4 names 08_Open-questions for consultation; the home for a
        stop that precedes any pack (candidates: the sdd stage evidence,
        _policies/09_Open-questions.md) is for the requirements or sdd stage to
        settle.
    - source_id: SRC-0015
      finding: >-
        Two approved Change Requests (CR-20260805-0001, CR-20260810-0001) and
        one open one (CR-20260912-0003, approved action 10) cite entry paths.
      action: defer
      reason: >-
        Rewriting the open record's action 10 is ordinary. Whether an approved
        record's pointer is rewritten or left as a historical path is a
        record-hygiene call for the authoring stage.
    - source_id: SRC-0013
      finding: >-
        DR-0254, OC-51, the glossary and the schema say .qfai/steering/ is
        gitignored by default; the managed block never ignored it.
      action: reject
      reason: >-
        Moot on removal. Correcting the statement would repair a surface that
        is being deleted; the superseding records note the contradiction
        instead.
```

The two `defer` reflections were answered in the session: the SRC-0007 one by
OQ-0007 and the SRC-0015 one by OQ-0008. The SRC-0013 `reject` is OQ-0012.

BP-0001 and the SRC-0006 reflection state the retire path too broadly. The corrected
statement, which REQ-0006 and REQ-0011 carry:

- `retireWithdrawnGovernedAssets` (`packages/qfai/src/cli/commands/init.ts:1514-1570`)
  walks only the adopter's `.assets.lock.json` records. Under `--force` it deletes a copy
  that has a record and still matches it. An edited copy, or one with no record, stays.
- Once the release stops shipping `catalog/worklog-entry.schema.md`, `qfai validate`
  reports any remaining copy as `QFAI-ASSETS-006` at error
  (`packages/qfai/src/core/assistantAssetProvenance.ts:781-787`,
  `packages/qfai/src/core/validators/assistantAssets.ts:519,983-992`) until it is gone.
- This is what QFAI already does for every withdrawn asset. The pack adopts it as a
  consequence of OQ-0005, with no special case and no new code.

## Trend Scan

Not applicable. The pack is non-ui and the subject is this repository's own
code, so there is no market, platform or visual signal to scan.

## Component Catalogue Registry

Not applicable: the pack is non-ui.

## Competitive Reference Registry

Not applicable: the pack is non-ui.

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
- Every row in `## Source Registry` names the REQ, NFR or OQ it backs in its
  `Notes` column. SRC-0028 and SRC-0030 back `14_Review-Request.md` only.
