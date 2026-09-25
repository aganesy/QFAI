# 01 Context

<!-- UX-INTENT: If UI-bearing, record brand intent and product context here and in 04_Sources.md -->

## UI-bearing Classification

Classification determines whether UI/UX sidecar artifacts are required.

- ui_bearing: true
- primary_surface: cli
- secondary_surfaces: []
- classification_rationale: The change rebuilds the operator's terminal surface — the free-text entry skill, the questions the run puts to the operator, the
  `npx qfai workflow` command family and its JSON and exit contract, and the mode setting after `qfai init`. That surface decides whether "the operator is
  asked only on material decisions" holds, so it gets screen contracts. `cli` is not a visual-prototyping surface, so the pack is cli-only.

Consequences of the classification (source: `.qfai/assistant/skills/qfai-discussion/references/ui-bearing-playbook.md` `### Visual-prototyping Surfaces vs cli`):

- three sidecars: `uiux/00_index.md`, `uiux/40_screen_contracts.md`, `uiux/50_review_input_bundle.md`;
- no root `DESIGN.md`, no brand interview, no `prototyping.yaml`;
- a screen contract's `route:` names the command invocation.

The nine earlier packs in `.qfai/discussion/` classify `non-ui` (for example `discussion-20260418170937652/01_Context.md` `## Surface Classification`).
Their reason was a library-internal change with no operator-facing terminal design, which does not hold here.

## Design Direction

Does not apply. The pack is cli-only, and the template requires a design direction only for `web`, `mobile`, `desktop` or `mixed`.

## Metadata

| Key           | Value                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Discussion ID | discussion-20260923171450572                                                                           |
| Date          | 2026-09-23                                                                                             |
| Owner         | User (decisions); requirements-analyst (framing author)                                                |
| Source        | The user's request to plan qfai 1.13.0 around an intent-driven entry, with the design package SRC-0001 |
| Target        | qfai 1.13.0 (minor release)                                                                            |
| Repository    | HEAD `ccca63a7a`; `packages/qfai/package.json` version `1.12.2`                                        |

## Goal and Completion Criteria

- Goal: an operator states a change in free text once, and QFAI routes it to the smallest safe workflow and runs the existing skills as orchestrated
  stages to completion. The operator is asked only where a material decision or a fact only they hold is needed.
- Measurable completion criteria (for the release; the pack's own completion is `Disposition: open` = 0 in `11_OQ-Register.md`):
  - a clear routine change reaches verification with zero manual stage selections (`05_Scope.md` DSC-001);
  - every safety case passes (DSC-003);
  - the routing eval has run on a real model before 1.13.0 ships (DSC-004);
  - the README describes the free-text entry as the primary usage (DSC-007).

## Stakeholders

- Primary stakeholders:
  - adopters' operators, who today type the stage chain themselves;
  - the AI agents running the stages under Claude Code and Codex, which read the work orders and submit results.
- Secondary stakeholders:
  - QFAI maintainers, who own the seven specs this change amends;
  - Copilot users, who keep receiving the skills for manual use without a support claim;
  - reviewers (`completion-reviewer`, `requirements-reviewer`, `architecture-reviewer`, `product-surface-reviewer`).

## Background

- Business context: an operator currently types `/qfai-discussion`, `/qfai-sdd`, `/qfai-atdd`, `/qfai-implement` and `/qfai-verify` in order. Each hand-off
  costs operator attention, and each stage re-reads project context the previous stage already read, which costs tokens. Comparable tools route a
  free-text request to a workflow (SRC-0029 Spec Kit, SRC-0030 Kiro, SRC-0031 BMAD, SRC-0032 CCPM).
- Technical context:
  - the CLI has no workflow executor; its twelve top-level commands are listed in `packages/qfai/src/cli/main.ts:47-60` (SRC-0012);
  - the harness, not the CLI, runs the AI, so the CLI can only hand out work orders and check results (design 02 AD-01, AD-02).
- Historical context: the design package (SRC-0001, SRC-0002) already corrects an earlier proposal. It keeps `--auto` as a no-question mode rather than
  an approval (design 00 "先行提案から修正した重要点"), and the session amended it further in sixteen decisions, with two more answered by the user during review (`99_delta.md`, D1 to D18).

## Inputs

- Existing repository facts (verified at HEAD `ccca63a7a`, working copy `tmp/idd-discussion/repo-facts.md`):
  - a discussion pack is already optional input to `/qfai-sdd` (`packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md` `## Stage 0: Preflight (Mandatory)`);
  - triage approval is checked for presence only, and `packages/qfai/src/core/validators/specPack.ts:474-480` (`APPROVAL_REQUIRED_OPS`) duplicates
    `requiresApproval()` in `packages/qfai/src/core/sddTriage.ts:57-74` (SRC-0004, SRC-0005);
  - `/qfai-sdd` with no argument targets every capability, and `/qfai-implement` asks to confirm even a single candidate spec
    (`qfai-sdd/SKILL.md` `### No-argument batch delegation (MUST)`; `qfai-implement/SKILL.md` `### User Selection Flow`);
  - a `done` ledger row reopens only through an approved upstream change, and BR-0011-0002 forbids backward transitions
    (`qfai-implement/references/execution-ledger.md` `### Allowed transitions`; `.qfai/specs/spec-0011/04_Business-Rules.md`);
  - ATDD already has a seam-only request to implement and a "PASS with cross-spec obligations" terminal state
    (`qfai-atdd/references/red-provenance.md:73-103`; `qfai-atdd/SKILL.md` `## Success Criteria`);
  - `.qfai/state.json` is shared by several subsystems and refuses a write that would drop another's keys (`packages/qfai/src/core/state.ts:79-90`);
  - the asset ceiling is 800 lines and 400 characters per line, and `qfai-implement/SKILL.md` is at 799 lines, `qfai-atdd/SKILL.md` at 797
    (`packages/qfai/src/core/doctor/assetLineBudget.ts:43,66`);
  - `qfai init --force` regenerates skills and agents and leaves `assistant/manifest/` alone except for the add-only routing-phase merge
    into `manifest/agent-routing.yml`; a fresh init creates the manifests
    (`packages/qfai/src/cli/commands/init.ts:145-180`; `packages/qfai/src/core/manifest/routingPhaseMerge.ts:1-40`);
  - no spec owns a workflow run, and spec-0015 lists "runtime execution engines" as out of scope (`.qfai/specs/spec-0015/01_Spec.md` `## Scope`).
- External references: harness behaviour (SRC-0022 to SRC-0026) and comparable tools (SRC-0027 to SRC-0032); verdicts in `tmp/idd-discussion/external-sources.md`.
- Assumptions:
  - the 64 routing seeds and 24 fault seeds are synthetic and unexecuted (SRC-0002 `package_validation.json`), so no routing accuracy or token saving
    is known yet;
  - the harness can run shell commands and submit their results, on both supported hosts.

## Key Issues

- Issue 1: authority. An orchestrated stage must not re-ask an approval already given, and must not invent one. `--auto` and "orchestrated mode" are not
  authorizations (AP-0001, AP-0007).
- Issue 2: a spec-unchanged bugfix on a `done` row has no legal path today other than a Change Request that states an upstream change nobody made (AP-0002).
- Issue 3: stage skills compete with the entry skill for automatic selection, and `disable-model-invocation` would block the entry skill's own calls on
  Claude Code (AP-0005).
- Issue 4: resume, idempotent resubmission and lock safety cannot be held by skill prose, so they need a deterministic control core (design 05 §4).
- Issue 5: the stage skill bodies are at the asset ceiling, so orchestrated-mode rules cannot be added inline (AP-0003).
