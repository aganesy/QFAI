# 04 Sources

## Source Registry

Repository facts follow `.qfai/assistant/skills/qfai-discussion/SKILL.md#reviewer-gate-must`.
Each fact names where it was read, beside the fact itself or by the `SRC-ID` of
the row that holds it. A row nobody cites leaves the reader to work out which
fact it backs, which is the check this registry exists for.

Repository paths were read at HEAD `ccca63a7a`. `local-only:` marks a user-supplied input that is not in the repository; its working copy is under
`tmp/idd-discussion/`. "Backs" lists the REQ and NFR rows whose Source column cites the row; other citations are in `01_Context.md`,
`05_Scope.md` and the sections below.

| SRC-ID   | Title                                                       | Type     | URL / Path                                                                                                                                                                    | Retrieved  | Notes                                                                                     |
| -------- | ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| SRC-0001 | QFAI Intent-Driven Architecture design (11 chapters)        | primary  | `local-only:QFAI_Intent_Driven_Architecture_20260923.md`                                                                                                                      | 2026-09-23 | Backs most REQ and NFR rows; amended by D1 to D16                                         |
| SRC-0002 | QFAI Intent-Driven Design package (schemas, plans, seeds)   | primary  | `local-only:QFAI_Intent_Driven_Design_20260923.zip`                                                                                                                           | 2026-09-23 | Backs REQ-0002, 0003, 0006, 0009-0011, 0026, 0029, 0033, 0038, 0041, 0066; NFR-0005, 0010 |
| SRC-0003 | User's research conversation (comparable tools, harnesses)  | primary  | `local-only:research-conversation-20260923`                                                                                                                                   | 2026-09-23 | Backs REQ-0001; the last four tools in `## Competitive Reference Registry`                |
| SRC-0004 | `sddTriage.ts` `requiresApproval`                           | primary  | `packages/qfai/src/core/sddTriage.ts:57-74`                                                                                                                                   | 2026-09-23 | Backs REQ-0004, 0042, 0043                                                                |
| SRC-0005 | `specPack.ts` triage approval validation                    | primary  | `packages/qfai/src/core/validators/specPack.ts:474-480,1295-1417`                                                                                                             | 2026-09-23 | Backs REQ-0043                                                                            |
| SRC-0006 | `qfai-sdd` SKILL.md                                         | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`                                                                                                          | 2026-09-23 | Backs REQ-0013, 0042                                                                      |
| SRC-0007 | `qfai-implement` SKILL.md                                   | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md`                                                                                                    | 2026-09-23 | Backs REQ-0013, 0038, 0045                                                                |
| SRC-0008 | Execution ledger reference                                  | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`                                                                              | 2026-09-23 | Backs REQ-0046, 0047, 0048                                                                |
| SRC-0009 | Change Request reset and drift protocol                     | primary  | `qfai-implement/references/change-request-reset.md:40-53`; `constitution/drift-protocol.md:250-280` (both under `packages/qfai/assets/init/`)                                 | 2026-09-23 | Backs REQ-0046                                                                            |
| SRC-0010 | `qfai-atdd` SKILL.md and `red-provenance.md`                | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/` (`SKILL.md`; `references/red-provenance.md:73-103`)                                                             | 2026-09-23 | Backs REQ-0037, 0038                                                                      |
| SRC-0011 | `qfai-verify` SKILL.md and verify output contract           | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/` (`SKILL.md:61-65`; `references/verify-output-contract.md`)                                                    | 2026-09-23 | Backs REQ-0035, 0060, 0062, 0063, 0068                                                    |
| SRC-0012 | CLI known commands and `state.json` ownership               | primary  | `packages/qfai/src/cli/main.ts:47-60`; `packages/qfai/src/core/state.ts`; `packages/qfai/src/cli/commands/discussion.ts:199-282`                                              | 2026-09-23 | Backs REQ-0014, 0022, 0024; NFR-0017                                                      |
| SRC-0013 | `init` regeneration, add-only routing merge, provenance     | primary  | `packages/qfai/src/cli/commands/init.ts`; `packages/qfai/src/core/manifest/routingPhaseMerge.ts`; `packages/qfai/src/core/assistantAssetProvenance.ts`                        | 2026-09-23 | Backs REQ-0064, 0065; NFR-0011                                                            |
| SRC-0014 | Grilling skills and rule master                             | primary  | `qfai-grilling/SKILL.md:27-31`; `qfai-grill/SKILL.md:1-7`; `.agents/rules/grilling.md`                                                                                        | 2026-09-23 | Backs REQ-0055                                                                            |
| SRC-0015 | Constitution Article X rule 4 and the `--auto` degrade test | primary  | `constitution/constitution.md:435-450`; `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`                                                                          | 2026-09-23 | Backs REQ-0044, 0068                                                                      |
| SRC-0016 | Asset line and width budget                                 | primary  | `packages/qfai/src/core/doctor/assetLineBudget.ts:43,66,72-84`                                                                                                                | 2026-09-23 | Backs REQ-0052; NFR-0002, 0003                                                            |
| SRC-0017 | Host wrapper generation                                     | primary  | `packages/qfai/src/core/agentEntryPoints.ts`; `codexAgentToml.ts`; `claudeCodeHooks.ts` (same directory)                                                                      | 2026-09-23 | Backs REQ-0064                                                                            |
| SRC-0018 | Skill frontmatter validator                                 | primary  | `packages/qfai/src/core/validators/assistantAssets.ts:1642-1734`; `packages/qfai/src/cli/commands/validate.ts:1929`                                                           | 2026-09-23 | Backs REQ-0050                                                                            |
| SRC-0019 | Spec ownership (spec-0011, spec-0015, spec-0001, spec-0013) | primary  | `.qfai/specs/spec-0011/04_Business-Rules.md`; `.qfai/specs/spec-0015/01_Spec.md`; `.qfai/specs/spec-0001/02_User-stories.md:67`; `.qfai/specs/spec-0013/04_Business-Rules.md` | 2026-09-23 | Backs REQ-0046, 0054                                                                      |
| SRC-0020 | SDD phase checklists (Phase 2b seeding, Phase 2c)           | primary  | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md:72,96-112`                                                                      | 2026-09-23 | Backs REQ-0047                                                                            |
| SRC-0021 | Shared skill delegation baseline                            | primary  | `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md:29-36`                                                                            | 2026-09-23 | Backs REQ-0031, 0040                                                                      |
| SRC-0022 | Agent Skills specification                                  | external | <https://agentskills.io/specification>                                                                                                                                        | 2026-09-23 | Backs NFR-0001; page undated                                                              |
| SRC-0023 | Claude Code — Skills                                        | external | <https://code.claude.com/docs/en/skills>                                                                                                                                      | 2026-09-23 | Backs REQ-0051, 0058; NFR-0018; page undated                                              |
| SRC-0024 | Claude Code — Hooks and Workflows                           | external | <https://code.claude.com/docs/en/workflows>                                                                                                                                   | 2026-09-23 | `05_Scope.md` Out of Scope; AP-0006; page undated                                         |
| SRC-0025 | Codex — Build skills                                        | external | <https://learn.chatgpt.com/docs/build-skills>                                                                                                                                 | 2026-09-23 | Backs REQ-0058; NFR-0018; page undated                                                    |
| SRC-0026 | VS Code — Copilot agent skills, with GitHub Copilot docs    | external | <https://code.visualstudio.com/docs/copilot/customization/agent-skills>                                                                                                       | 2026-09-23 | Backs REQ-0058                                                                            |
| SRC-0027 | gsd-core changelog and the get-shit-done router issue       | external | <https://github.com/open-gsd/gsd-core/blob/main/CHANGELOG.md>; <https://github.com/gsd-build/get-shit-done/issues/3192>                                                       | 2026-09-23 | `05_Scope.md` Out of Scope; AP-0004                                                       |
| SRC-0028 | obra/superpowers writing-skills                             | external | <https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md>                                                                                                | 2026-09-23 | Backs REQ-0050                                                                            |
| SRC-0029 | github/spec-kit workflow engine                             | external | <https://github.com/github/spec-kit/pull/4504>                                                                                                                                | 2026-09-23 | `01_Context.md` Background; BP-0006                                                       |
| SRC-0030 | Kiro specs and Powers                                       | external | <https://kiro.dev/docs/specs/>                                                                                                                                                | 2026-09-23 | `01_Context.md` Background                                                                |
| SRC-0031 | BMAD Method — build a change                                | external | <https://docs.bmad-method.org/build/build-a-change/>                                                                                                                          | 2026-09-23 | `01_Context.md` Background; BP-0007; page undated                                         |
| SRC-0032 | automazeio/ccpm                                             | external | <https://github.com/automazeio/ccpm>                                                                                                                                          | 2026-09-23 | `01_Context.md` Background                                                                |
| SRC-0033 | CLI UX guidelines                                           | primary  | `packages/qfai/assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md`                                                                                                      | 2026-09-23 | Trend Scan design guideline; supports NFR-0012, 0016, 0017                                |
| SRC-0034 | User Questions rule                                         | primary  | `packages/qfai/assets/init/root/.agents/rules/user-questions.md`                                                                                                              | 2026-09-23 | Trend Scan accessibility entry; supports REQ-0002, REQ-0008                               |

Verdicts on the external claims (confirmed, partly contradicted) are in `tmp/idd-discussion/external-sources.md`, rows H1 to H5 and T1 to T6.

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Research Summary

The protocol output from `.qfai/evidence/discussion-20260923171450572.md` `## Research Summary`, carried here. It differs from the evidence copy
in three ways:

- SRC-0033 and SRC-0034 were added for the terminal-surface signals in `## Trend Scan`.
- Five external pages show no publication date (SRC-0022, 0023, 0024, 0025, 0031). The schema requires a date, so each carries its retrieval
  date, marked with a comment. They are not evidence of freshness.
- Reflection entries after the `# Settled by the user's decisions` comment record where a decision in `99_delta.md` changed what the research
  implied. The entries before it are unchanged.

Freshness: of the six external sources with a real publication date, all six are from 2026, so 100% are within two years. Counting the five
retrieval dates would not change the ratio.

```yaml
research_summary:
  sources:
    - id: SRC-0001
      title: QFAI Intent-Driven Architecture design (11 chapters, concatenated)
      type: primary
      locator: local-only:QFAI_Intent_Driven_Architecture_20260923.md
      observed: 2026-09-23
    - id: SRC-0002
      title: QFAI Intent-Driven Design package (schemas, workflows.json, state-transitions.json, 64 routing seeds, 24 fault seeds, examples)
      type: primary
      locator: local-only:QFAI_Intent_Driven_Design_20260923.zip (working copy tmp/idd-discussion/package/)
      observed: 2026-09-23
    - id: SRC-0003
      title: User's pasted research conversation (ten comparable tools, harness capabilities, proposed routes)
      type: primary
      locator: local-only:research-conversation-20260923
      observed: 2026-09-23
    - id: SRC-0004
      title: sddTriage.ts requiresApproval
      type: primary
      locator: packages/qfai/src/core/sddTriage.ts:57-74
      observed: 2026-09-23
    - id: SRC-0005
      title: specPack.ts triage approval validation (QFAI-TRIAGE-005)
      type: primary
      locator: packages/qfai/src/core/validators/specPack.ts:474-480,1295-1417
      observed: 2026-09-23
    - id: SRC-0006
      title: qfai-sdd SKILL.md (Stage 0, --auto approval rows, target selection)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md
      observed: 2026-09-23
    - id: SRC-0007
      title: qfai-implement SKILL.md (User Selection Flow, Red 3a/3b)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md
      observed: 2026-09-23
    - id: SRC-0008
      title: Execution ledger reference (tiers, BR-Ref, Owning module, status lifecycle)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/execution-ledger.md
      observed: 2026-09-23
    - id: SRC-0009
      title: Change Request reset and drift protocol (checkpoint regression from a done row)
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/change-request-reset.md:40-53;
        packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md:250-280
      observed: 2026-09-23
    - id: SRC-0010
      title: qfai-atdd SKILL.md and red-provenance.md (seam request, cross-spec obligations)
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/SKILL.md;
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/red-provenance.md:73-103
      observed: 2026-09-23
    - id: SRC-0011
      title: qfai-verify SKILL.md and verify-output-contract.md
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md:61-65;
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/verify-output-contract.md
      observed: 2026-09-23
    - id: SRC-0012
      title: CLI known commands and state.json ownership
      type: primary
      locator: >-
        packages/qfai/src/cli/main.ts:47-60; packages/qfai/src/core/state.ts;
        packages/qfai/src/cli/commands/discussion.ts:199-282
      observed: 2026-09-23
    - id: SRC-0013
      title: init regeneration, add-only routing merge, governed-asset provenance
      type: primary
      locator: >-
        packages/qfai/src/cli/commands/init.ts:145-180,4817-4910;
        packages/qfai/src/core/manifest/routingPhaseMerge.ts:1-40;
        packages/qfai/src/core/assistantAssetProvenance.ts:12-38
      observed: 2026-09-23
    - id: SRC-0014
      title: Grilling skills and rule master (user vs delegated sessions)
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-grilling/SKILL.md:27-31;
        packages/qfai/assets/init/.qfai/assistant/skills/qfai-grill/SKILL.md:1-7; .agents/rules/grilling.md
      observed: 2026-09-23
    - id: SRC-0015
      title: Constitution Article X rule 4 (--auto) and autoModeApprovalDegrade regression test
      type: primary
      locator: >-
        packages/qfai/assets/init/.qfai/assistant/constitution/constitution.md:435-450;
        packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts
      observed: 2026-09-23
    - id: SRC-0016
      title: Asset line and width budget
      type: primary
      locator: packages/qfai/src/core/doctor/assetLineBudget.ts:43,66,72-84
      observed: 2026-09-23
    - id: SRC-0017
      title: Host wrapper generation (skills, agents, Codex TOML, Claude hooks, entry files)
      type: primary
      locator: >-
        packages/qfai/src/core/agentEntryPoints.ts; packages/qfai/src/core/codexAgentToml.ts;
        packages/qfai/src/core/claudeCodeHooks.ts
      observed: 2026-09-23
    - id: SRC-0018
      title: Skill frontmatter validator (name, description length, disable-model-invocation)
      type: primary
      locator: packages/qfai/src/core/validators/assistantAssets.ts:1642-1734; packages/qfai/src/cli/commands/validate.ts:1929
      observed: 2026-09-23
    - id: SRC-0019
      title: Spec ownership (spec-0011 BR-0011-0002, spec-0015 Scope Out, spec-0001 REQ-0008, spec-0013 BR-0013-0003)
      type: primary
      locator: >-
        .qfai/specs/spec-0011/04_Business-Rules.md; .qfai/specs/spec-0015/01_Spec.md;
        .qfai/specs/spec-0001/02_User-stories.md:67; .qfai/specs/spec-0013/04_Business-Rules.md
      observed: 2026-09-23
    - id: SRC-0020
      title: SDD phase checklists (Phase 2b row seeding from CRs, Phase 2c obligation reconciliation)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md:72,96-112
      observed: 2026-09-23
    - id: SRC-0021
      title: Shared skill delegation baseline (failure taxonomy, retry backoff)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md:29-36
      observed: 2026-09-23
    - id: SRC-0022
      title: Agent Skills specification
      type: external
      url: https://agentskills.io/specification
      published: 2026-09-23 # page undated; retrieval date
    - id: SRC-0023
      title: Claude Code — Skills
      type: external
      url: https://code.claude.com/docs/en/skills
      published: 2026-09-23 # page undated; retrieval date
    - id: SRC-0024
      title: Claude Code — Hooks and Workflows
      type: external
      url: https://code.claude.com/docs/en/workflows
      published: 2026-09-23 # page undated; retrieval date
    - id: SRC-0025
      title: Codex — Build skills
      type: external
      url: https://learn.chatgpt.com/docs/build-skills
      published: 2026-09-23 # page undated; retrieval date
    - id: SRC-0026
      title: VS Code — Copilot agent skills (with GitHub Copilot add-skills docs)
      type: external
      url: https://code.visualstudio.com/docs/copilot/customization/agent-skills
      published: 2026-09-16
    - id: SRC-0027
      title: gsd-core CHANGELOG (router nesting) and the get-shit-done router issue
      type: external
      url: https://github.com/open-gsd/gsd-core/blob/main/CHANGELOG.md
      published: 2026-09-14
    - id: SRC-0028
      title: obra/superpowers writing-skills SKILL.md
      type: external
      url: https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
      published: 2026-09-19
    - id: SRC-0029
      title: github/spec-kit workflow engine
      type: external
      url: https://github.com/github/spec-kit/pull/4504
      published: 2026-09-21
    - id: SRC-0030
      title: Kiro specs (Feature / Bugfix, Quick Spec) and Powers
      type: external
      url: https://kiro.dev/docs/specs/
      published: 2026-08-27
    - id: SRC-0031
      title: BMAD Method — build a change
      type: external
      url: https://docs.bmad-method.org/build/build-a-change/
      published: 2026-09-23 # page undated; retrieval date
    - id: SRC-0032
      title: automazeio/ccpm (single intent-routing skill)
      type: external
      url: https://github.com/automazeio/ccpm
      published: 2026-03-18
    - id: SRC-0033
      title: CLI UX guidelines (output format, message language, command invocation)
      type: primary
      locator: packages/qfai/assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md
      observed: 2026-09-23
    - id: SRC-0034
      title: User Questions rule (structured choices, fallback, no invented recommendation)
      type: primary
      locator: packages/qfai/assets/init/root/.agents/rules/user-questions.md
      observed: 2026-09-23
  best_practices:
    - id: BP-0001
      category: authorization
      title: Keep intent inference and approval evidence in separate fields
      description: >-
        The validator today accepts any non-empty Approved By string, so the audit value depends on prose alone.
        A typed authority reference (who, which question, which answer) is what lets a stage reuse an approval without asking again.
      source_id: SRC-0005
    - id: BP-0002
      category: binding
      title: Pass an explicit target binding downstream and never let a missing argument widen scope
      description: >-
        /qfai-sdd with no argument targets every capability, and /qfai-implement demands confirmation of a single candidate.
        An orchestrated run must hand both a validated spec binding, including an explicit new-capability target.
      source_id: SRC-0006
    - id: BP-0003
      category: ownership
      title: Reuse the existing seam round trip and cross-spec obligation terminal state
      description: >-
        ATDD's seam request to implement and its "PASS with cross-spec obligations" state already model the ATDD-implement loop
        and accepted-with-debt. A workflow layer should route them, not redefine them.
      source_id: SRC-0010
    - id: BP-0004
      category: state
      title: Put run state in its own namespace
      description: >-
        .qfai/state.json is shared by several subsystems and refuses writes that would drop their keys; verify.json is a single path
        with a closed enum. New run state belongs under a separate directory and must not add values to verify.json.
      source_id: SRC-0012
    - id: BP-0005
      category: skill-authoring
      title: Descriptions state when to use the skill, not the workflow it runs
      description: >-
        Tested finding that agents follow a workflow summary in the description instead of reading the body.
        All ten QFAI descriptions are currently function summaries.
      source_id: SRC-0028
    - id: BP-0006
      category: control-core
      title: Persist per-step state and pause at human gates in a deterministic engine
      description: >-
        Spec Kit's workflow engine persists state per step, pauses at gate steps and resumes by CLI; its bugfix path is
        assess, gate, fix, test. Prior art for a small CLI control core with resumable human gates.
      source_id: SRC-0029
    - id: BP-0007
      category: escalation
      title: Publish the escalation rule
      description: >-
        BMAD plans first only on intent gaps, irreversible actions, a multi-system footprint or contradictions; Kiro separates Quick Spec
        from full specs. A stated rule of this shape gives the router a checkable escalation criterion.
      source_id: SRC-0031
    - id: BP-0008
      category: distribution
      title: Keep host-specific invocation control out of shared SKILL.md frontmatter
      description: >-
        Portable frontmatter is name, description, license, compatibility, metadata and allowed-tools. Claude Code, VS Code and Codex
        each control invocation differently (frontmatter against agents/openai.yaml), and QFAI generates no openai.yaml today.
      source_id: SRC-0022
    - id: BP-0009
      category: terminal-output
      title: One structured document on stdout, logs on stderr, English operator text
      description: >-
        QFAI's CLI guidelines fix a deterministic output format with no timestamps or random values, English operator-facing strings,
        and npx qfai in shipped documents. The workflow command family inherits them rather than defining its own.
      source_id: SRC-0033
    - id: BP-0010
      category: questions
      title: Ask in the shape the answer has
      description: >-
        A question with listable candidates is a structured choice with a description per option and the selection constraint;
        an open value is a plain request naming what depends on it. A recommendation is given only where the evidence supports one.
      source_id: SRC-0034
  anti_patterns:
    - id: AP-0001
      category: authorization
      title: Writing "auto" or a synthesized name into Approved By
      description: >-
        Passes QFAI-TRIAGE-005 because the check is presence-only, and produces a false audit record.
        The shipped skill forbids it in prose; nothing in code does.
      source_id: SRC-0005
    - id: AP-0002
      category: ledger
      title: Inventing a Change Request to reopen a done row for a spec-unchanged bug
      description: >-
        The only legal reopen is an approved upstream change that invalidated the obligation, and BR-0011-0002 forbids backward
        transitions. Filing a CR whose content is "nothing upstream changed" misstates the drift record.
      source_id: SRC-0008
    - id: AP-0003
      category: skill-authoring
      title: Adding orchestrated-mode prose to skill bodies already at the ceiling
      description: >-
        qfai-implement is at 799 of 800 lines and qfai-atdd at 797, with a 400-character width cap.
        Packing wider lines is what the width cap was added to stop.
      source_id: SRC-0016
    - id: AP-0004
      category: routing
      title: Shipping a router while the stage skills stay in the listing
      description: >-
        gsd shipped six routers but kept about 65 flat skills listed, and the listed cost went up.
        Nesting hides skills only on non-recursive loaders.
      source_id: SRC-0027
    - id: AP-0005
      category: invocation
      title: Using disable-model-invocation to hide a stage the router must call
      description: >-
        On Claude Code it blocks every Skill-tool call, including one made while following the router.
        user-invocable false does the opposite of what is needed.
      source_id: SRC-0023
    - id: AP-0006
      category: control-core
      title: Building the gated core on a host-only workflow runtime
      description: >-
        Claude Code dynamic workflows take no mid-run user input, can be disabled per user or organization and exist on one host only.
      source_id: SRC-0024
    - id: AP-0007
      category: approval
      title: Treating --auto or orchestrated mode as authorization
      description: >-
        --auto is a no-question mode; an approval-required row stops the stage with consultation-needed.
        A mode that skips the question must carry its own authority, not reuse --auto.
      source_id: SRC-0015
  reflection:
    - source_id: SRC-0006
      finding: Discussion is already optional input to SDD. Making it optional is not new work.
      action: apply
      reason: Confirms the design's correction; the 1.13.0 scope should not spend effort there.
    - source_id: SRC-0005
      finding: Approval evidence is presence-only and duplicated between sddTriage.ts and specPack.ts.
      action: apply
      reason: >-
        Any authority change must change both sets and add a validator that checks the reference resolves,
        or the new reference is decorative.
    - source_id: SRC-0008
      finding: >-
        A done-row regression today goes through a CR to /qfai-sdd Phase 2b; there is no same-obligation reopen,
        and BR-0011-0002 forbids backward transitions.
      action: apply
      reason: >-
        defect-reopen would be a change to spec-0011 and a critical decision, because it contradicts a spec.
        The design's premise that the path is missing is only partly right.
    - source_id: SRC-0019
      finding: spec-0015 excludes runtime execution engines, and spec-0001's skill catalog is stale.
      action: apply
      reason: Supports a new capability and spec for the entry and control core, with CRs to the owning specs.
    - source_id: SRC-0016
      finding: The ceiling is 800 lines and 400 characters; implement and atdd have one to three lines of headroom.
      action: apply
      reason: Orchestrated-mode contracts go into new reference files.
    - source_id: SRC-0020
      finding: SDD already seeds rows from downstream CRs, and Phase 2c "Obligation reconciliation" is an existing, different operation.
      action: apply
      reason: A missing-test row must reuse the row-seeding path, under a stage name that does not collide with Phase 2c.
    - source_id: SRC-0023
      finding: disable-model-invocation blocks programmatic calls on Claude Code; hiding stages needs another mechanism.
      action: apply
      reason: >-
        Keep stage skills as normal skills with scoped "when to use" descriptions, or have qfai-run read stage bodies by path.
        Do not set the flag on stage skills.
    - source_id: SRC-0024
      finding: Claude Code dynamic workflows cannot take mid-run input.
      action: reject
      reason: Rejected as the control core; at most an optional accelerator inside one stage.
    - source_id: SRC-0001
      finding: The design proposes an intent_scoped_additive CREATE with no question at all in active mode.
      action: defer
      reason: >-
        The cheaper option, one real human_decision captured at routing and carried by binding, meets "do not re-ask at each stage"
        without a new policy. Which to adopt is a user decision.
    - source_id: SRC-0002
      finding: The 64 routing seeds and 24 fault seeds are synthetic and unexecuted.
      action: defer
      reason: >-
        Deterministic fault seeds can become CI tests; routing seeds need a harness runner, and when they run is a release-gate
        question for the user.
    # Settled by the user's decisions (99_delta.md): how D1 to D16 resolve the entries above.
    - source_id: SRC-0001
      finding: Design 03 §7 intent_scoped_additive, deferred above.
      action: reject
      reason: >-
        D5: the run asks once, at routing, and records the answer as a human_decision bound to SDD.
        SDD Stage 1 validates it and does not ask again (REQ-0042).
    - source_id: SRC-0001
      finding: Design 05 §7 defect-reopen, with Repair-Ref, repair-reopen.schema.json and the repair_prepare stage.
      action: reject
      reason: >-
        D6: a spec-unchanged bugfix appends a row for the missing test; the done row stays done.
        This keeps BR-0011-0002 and makes AP-0002 unnecessary to work around (REQ-0046).
    - source_id: SRC-0020
      finding: The row-seeding path SDD already has can carry a missing-test row.
      action: apply
      reason: >-
        D13: SDD appends the TC and the row through Phase 2b with the diagnosis as the recorded reason and no CR document.
        The operation name is left to SDD so it does not collide with Phase 2c (REQ-0047; OQ-0009).
    - source_id: SRC-0008
      finding: A defective existing test is a third case the ledger rules do not name.
      action: apply
      reason: >-
        D14: the layer owner fixes it with status untouched only while the expectation still points at the same AC or BR,
        with an independent review and a re-run recorded (REQ-0048).
    - source_id: SRC-0001
      finding: Design 05 §10 refuses agent_reported results alone for automatic completion.
      action: reject
      reason: >-
        D10: finish runs npx qfai validate itself; repository gates stay on today's footing, verify.json plus an independent
        qa-gatekeeper review. Each receipt records its trust level (REQ-0060).
    - source_id: SRC-0001
      finding: Design 04 §8 exec operation, command-ID registry and Windows launcher adapters.
      action: reject
      reason: >-
        D2 and D9: seven operations, no exec; the harness runs commands and submits results (REQ-0014).
    - source_id: SRC-0001
      finding: Design AD-11 made activation explicit, with off as the starting point for existing users.
      action: reject
      reason: >-
        D7: active by default for every adopter; off and shadow stay available; fail-closed on invariant violation, unsupported
        capability or policy drift is kept (REQ-0059).
    - source_id: SRC-0002
      finding: The seeds deferred above.
      action: apply
      reason: >-
        D8: the 24 fault seeds become deterministic tests on every pull request; the 64 routing seeds become a manual real-model
        eval run as a release gate before 1.13.0 ships (REQ-0066).
    - source_id: SRC-0028
      finding: Trigger-condition descriptions, with the pipeline kept in the body.
      action: apply
      reason: >-
        D15: stage skill descriptions become "use when invoked by name or handed a QFAI work order"; entry checks hand over
        to qfai-run; no disable-model-invocation and no Codex openai.yaml in 1.13.0 (REQ-0050, REQ-0051).
    - source_id: SRC-0029
      finding: A CLI engine that persists state per step and pauses at human gates is working prior art.
      action: apply
      reason: >-
        D2: the control core is npx qfai workflow with run state on disk and a separate decision operation (REQ-0014, REQ-0018).
    - source_id: SRC-0031
      finding: Published escalation triggers match the stops the router needs.
      action: apply
      reason: The cross-cutting risk stops are stated as a checkable list, not left to judgement (REQ-0008).
    - source_id: SRC-0027
      finding: A router bundle's token saving depends on the stage skills leaving the listing, which only some loaders allow.
      action: reject
      reason: >-
        Namespace routers and skill nesting stay out (05_Scope.md). The stage skills stay listed, so 1.13.0 claims no listing saving;
        DSC-009 is a measured candidate, not a promise.
    - source_id: SRC-0003
      finding: OpenSpec, Agent OS, Task Master and SuperClaude were compared in the research conversation only.
      action: defer
      reason: >-
        No 1.13.0 decision rests on them. Re-check against each project's own documentation if SDD bases a decision on one.
```

## Trend Scan

The pack is cli-only (`01_Context.md` `## UI-bearing Classification`). The visual categories of the template — color, typography, visual,
spacing, shape and imagery — have no reader on the `cli` path and are omitted (`references/ui-bearing-playbook.md`
`### Visual-prototyping Surfaces vs cli`). Per-tool adoption is in `## Competitive Reference Registry`.

### user expectation / market norm

#### Entry 1

- reference: CCPM (SRC-0032), BMAD `bmad-build` (SRC-0031), Kiro Powers (SRC-0030)
- observation: Comparable tools take a request in the user's own words and pick the workflow themselves. CCPM detects intent from natural language
  inside one skill; BMAD takes a sentence, an issue or a spec; Kiro loads only the powers relevant to the task.
- decision_connection: The operator types one free-text request and no stage name afterwards (REQ-0001, D1).
- evaluation_connection: Count manual stage selections after the first prompt on the routine workload; the target is zero (DSC-001, NFR-0007).
- local_implication: `qfai-run` is the only entry an operator needs; the `/qfai-*` stage commands remain as the expert path in the README (REQ-0067).

#### Entry 2

- reference: BMAD `bmad-build` (SRC-0031), Kiro Quick Spec (SRC-0030)
- observation: Users expect a trivial edit to skip the process, and a risky one to stop. BMAD plans first only on intent gaps, irreversible actions,
  a multi-system footprint or contradictions.
- decision_connection: A narrow `direct` route for non-normative text (REQ-0007, REQ-0049) and a fixed list of stops on every route (REQ-0008).
- evaluation_connection: Routing seeds for each excluded class never yield `direct`, and every safety seed ends `awaiting_input` (DSC-003).
- local_implication: Kiro's gate-free Quick Spec is not copied: a `direct` change still gets an independent review and a full verify.

### product neighbor / comparable flow

#### Entry 1

- reference: github/spec-kit workflow engine (SRC-0029)
- observation: A YAML workflow engine with `specify workflow run/status/resume`, state persisted per step, and `gate` steps that pause for a human
  approve or reject. Its bundled bugfix workflow is assess, gate, fix, test.
- decision_connection: The control core is a CLI with run state on disk, `status` and `resume`, and a separate `decision` operation (D2, D9).
- evaluation_connection: A run interrupted at any stage resumes at the smallest valid checkpoint, shown by a fault seed (REQ-0030).
- local_implication: QFAI takes the engine shape but not the generic step language: plans hold allowed stages, predicate names and dependencies
  only (REQ-0057).

#### Entry 2

- reference: get-shit-done and gsd-core router consolidation (SRC-0027; `tmp/idd-discussion/external-sources.md` T1)
- observation: A release note claimed 86 entries became 6 routers ("about 2,150 to about 120 tokens"). A later report found the change added six
  routers and left about 65 concrete skills listed, a slight increase. The claim is contested. The successor project made it real only by nesting
  skills, which hides them on non-recursive loaders; Codex and Copilot recurse and still list them.
- decision_connection: No namespace routers or nesting in 1.13.0; stage skills stay listed with narrowed descriptions (D15; `05_Scope.md`).
- evaluation_connection: Token effect is measured, not assumed: median total tokens against today's manual chain (DSC-009, NFR-0004, NFR-0006).
- local_implication: 1.13.0 promises no token saving from routing. The listing cost is expected to rise by the two new skills.

#### Entry 3

- reference: obra/superpowers (SRC-0028)
- observation: A session-start hook injects a using-skills skill on several hosts, and the writing-skills guide says a description states only when
  to use the skill, because agents follow a workflow summary in the description instead of reading the body.
- decision_connection: Stage skill and `qfai-run` descriptions are rewritten as trigger conditions (D15; REQ-0050).
- evaluation_connection: Each rewritten description opens with its trigger condition and passes the frontmatter validator (SRC-0018).
- local_implication: A short entry instruction points a first free-text change request to `qfai-run`; how it reaches each host is left to SDD
  (REQ-0064; OQ-0017).

### platform convention

#### Entry 1

- reference: Claude Code skills and workflows (SRC-0023, SRC-0024)
- observation: `disable-model-invocation: true` blocks every Skill-tool call, including one made while following another skill.
  `user-invocable: false` hides a skill from `/` and leaves it auto-selectable. Dynamic workflows take no mid-run user input.
- decision_connection: No stage skill carries `disable-model-invocation`; the gated control core is QFAI's own CLI, not a host workflow (D15, D2).
- evaluation_connection: The Claude Code adapter test shows `qfai-run` can invoke each stage skill, and a question can be relayed mid-run (REQ-0058).
- local_implication: Stage skills are reached as ordinary skills, with an entry check instead of a hiding flag (REQ-0051).

#### Entry 2

- reference: Codex skills (SRC-0025), Agent Skills specification (SRC-0022), Copilot agent skills (SRC-0026)
- observation: Codex selects by description, is invoked explicitly with `$skill`, and reads `policy.allow_implicit_invocation` from
  `agents/openai.yaml`. The portable frontmatter is six fields. Copilot documents no suppression field for its cloud agent or CLI.
- decision_connection: Shared SKILL.md frontmatter stays portable (BP-0008); no `openai.yaml` in 1.13.0 (D15); Copilot gets no support claim (D3).
- evaluation_connection: No shipped SKILL.md carries a host-only key; `qfai init` writes no `openai.yaml` (REQ-0051).
- local_implication: Host-specific invocation control, if it is added later, goes in per-host sidecar files generated from one source (REQ-0064).

### accessibility / compliance relevant signal

#### Entry 1

- reference: QFAI User Questions rule (SRC-0034)
- observation: A question with listable candidates arrives as a structured choice, each option with a description and the selection constraint; an
  open value is a plain request naming what depends on it. A host that cannot carry the shape falls back to plain text with the same parts.
- decision_connection: The CREATE approval, material decisions and the choice between resumable runs are asked this way (REQ-0002, REQ-0008, REQ-0042).
- evaluation_connection: Each `awaiting_input` state names the decision and the options in the screen contract (`uiux/40_screen_contracts.md`).
- local_implication: `decision` records the question, the options offered and the answer, so an audit reads what the operator actually saw (REQ-0018).

#### Entry 2

- reference: QFAI distributed-surface and evidence rules (`.agents/rules/distributed-surface.md`; REQ-0024, NFR-0014, NFR-0015)
- observation: Tracked evidence is readable from a fresh clone by anyone with repository access, so conversation text and secrets in it would be
  disclosed. Shipped files must carry no private version marker or internal ID.
- decision_connection: Runtime state stays in git-ignored `.qfai/runs/`; only sanitized evidence goes to tracked `.qfai/evidence/workflow/` (D11).
- evaluation_connection: A test with a secret in the request finds it in no tracked file; the leakage guards pass on the run schema (REQ-0025).
- local_implication: The run context records `qfaiVersion` from the package and no `schemaVersion` (REQ-0025).

### design_guideline_research

#### Entry 1

- source_id: SRC-0033
- guideline_name: QFAI CLI UX Guidelines
- rule_refs:
  - `## Output Format` — no timestamps or random values in messages
  - `## Message Language` — operator-facing strings in English
  - `## Command Invocation` — `npx qfai` in shipped documents, bare `qfai` in runtime messages
- local_translation: Every `workflow` operation prints one JSON document on stdout, including on error, and logs to stderr (REQ-0022). Operator text
  is English (NFR-0017). Skill text writes `npx qfai workflow …` (NFR-0016).
- evidence: `packages/qfai/tests/assets/canonicalQfaiLauncher.test.ts` and `packages/qfai/tests/unit/cliMessageLanguage.test.ts` hold the last two.

#### Entry 2

- source_id: SRC-0034
- guideline_name: QFAI User Questions rule
- rule_refs:
  - `## 1. No exceptions` — every question goes through the structured tool where it is callable
  - `## 3. Recommend` — recommend only where the evidence supports it
  - `## 5. When the tool is not callable` — the plain-text fallback keeps every part
- local_translation: `qfai-run` asks through the host's structured question tool on both supported hosts, and the adapter test checks that a
  question and its answer can be relayed (REQ-0058).
- evidence: The rule's `## Scope` table; the adapter capability list in REQ-0058.

## Component Catalogue Registry

A competitor is consulted to differ from. A component catalogue is consulted
to adopt from, and the catalogues a screen's structure came from go here.

None registered. A cli-only pack builds no screen from a component catalogue, and the count is not gated unless `uiux.catalogue_refs_min` is set.

## Competitive Reference Registry

UI-bearing packs must register at least `uiux.competitive_refs_min` complete
references (default: 3). Ten are registered: the tools compared in the research. The first six were re-checked against their own documentation
and cite an external source. The last four are named in the research conversation (SRC-0003) and were not re-checked, so their entries describe
each tool's publicly known shape only. No 1.13.0 decision rests on them.

### Reference: github/spec-kit

- reference: <https://github.com/github/spec-kit/pull/4504> (SRC-0029)
- adopted_points: A CLI that persists state per step, pauses at human gates and resumes by command; a bugfix path of assess, gate, fix, test.
- rejected_points: The generic YAML step language with branching, loops and fan-out. QFAI's plans are built in and hold stages, predicate names and
  dependencies only.
- local_translation: `npx qfai workflow` with `start`, `next`, `accept`, `status`, `resume`, `decision`, `finish` (D2, D9); plans under
  `process/workflows/` refused on unknown values or cycles (REQ-0057).

### Reference: Kiro

- reference: <https://kiro.dev/docs/specs/> (SRC-0030)
- adopted_points: A bugfix record that names current, expected and unchanged behaviour before anything is fixed.
- rejected_points: Quick Spec with no approval gates, and a separate spec type per change kind. QFAI keeps one spec shape and its review gates.
- local_translation: Diagnose-only records the expected-behaviour reference and the observed failure (REQ-0045); routes are orthogonal to the
  existing change types (REQ-0057).

### Reference: BMAD Method

- reference: <https://docs.bmad-method.org/build/build-a-change/> (SRC-0031)
- adopted_points: One entry that takes any input, and published triggers for when to plan first.
- rejected_points: Letting a trivial edit skip review because the user will review it.
- local_translation: The cross-cutting stop list (REQ-0008); `direct` still ends with an independent review and verify (REQ-0049).

### Reference: CCPM

- reference: <https://github.com/automazeio/ccpm> (SRC-0032)
- adopted_points: One skill that detects intent in natural language and routes to references, with deterministic scripts for status work.
- rejected_points: Project-management scope (issue sync, epics). QFAI routes changes, not backlog.
- local_translation: `qfai-run` as the single entry, with the deterministic part in the CLI rather than in scripts the skill runs (REQ-0001, REQ-0014).

### Reference: get-shit-done and gsd-core

- reference: <https://github.com/open-gsd/gsd-core/blob/main/CHANGELOG.md> (SRC-0027)
- adopted_points: Profiles that ship fewer skills, as evidence that listing cost matters and must be measured.
- rejected_points: Namespace routers and skill nesting. The token saving claimed for the first router release is contested (external-sources T1),
  and nesting hides skills only on some loaders.
- local_translation: No nesting in 1.13.0; token effect measured against the manual chain (DSC-009, NFR-0004).

### Reference: Superpowers

- reference: <https://github.com/obra/superpowers> (SRC-0028)
- adopted_points: Descriptions that state only when to use a skill; one bootstrap instruction that points the agent at the skill system.
- rejected_points: Depending on a hook for the skills to work at all. Typed `/qfai-*` invocation keeps working with none, and how the entry
  instruction reaches each host is left to SDD (OQ-0017).
- local_translation: Trigger-condition descriptions (REQ-0050) and a short entry instruction delivered by `qfai init` (REQ-0064).

### Reference: OpenSpec

- reference: OpenSpec, named in the research conversation (SRC-0003); not re-checked
- adopted_points: A change expressed as a delta against the current spec rather than a new spec.
- rejected_points: A separate proposal-apply-archive command chain the operator drives by hand.
- local_translation: The `bounded-change` route runs an SDD delta or applicability check (REQ-0006).

### Reference: Agent OS

- reference: Agent OS, named in the research conversation (SRC-0003); not re-checked
- adopted_points: Standards and product context read once and reused across stages.
- rejected_points: Re-reading the whole project context at every stage.
- local_translation: Shared preflight reuse inside a run, refreshed only for what changed (REQ-0056).

### Reference: Task Master

- reference: Task Master, named in the research conversation (SRC-0003); not re-checked
- adopted_points: A `next` operation that returns the next unit of work from a persisted dependency graph.
- rejected_points: A second task list beside the spec. QFAI's execution ledger stays the only record of item state.
- local_translation: `next` returns a work order that references ledger row IDs rather than copying their status (REQ-0016, REQ-0034).

### Reference: SuperClaude

- reference: SuperClaude, named in the research conversation (SRC-0003); not re-checked
- adopted_points: Automatic activation of the right specialist for a request.
- rejected_points: A large command and persona surface the operator has to learn.
- local_translation: Roles stay those in `agent-catalog.yml`; `qfai-run` delegates to them and adds no layer (REQ-0054).

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.

Every REQ in `06_REQ.md` and every NFR in `07_NFR.md` cites at least one SRC-ID. Sources with no REQ or NFR citation, and why they stay:

| SRC-ID                       | Kept because                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| SRC-0024                     | Backs the exclusion of host workflows as the control core (`05_Scope.md`; AP-0006)    |
| SRC-0027                     | Backs the exclusion of namespace routers and nesting (`05_Scope.md`; AP-0004)         |
| SRC-0029, SRC-0030, SRC-0031 | Comparable flows behind the control core and the stop list (`01_Context.md`; BP-0006) |
| SRC-0032                     | Comparable single-entry router (`01_Context.md` `## Background`)                      |
| SRC-0033, SRC-0034           | Terminal-surface guidelines for the screen contracts (`## Trend Scan`)                |
