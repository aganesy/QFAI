---
name: qfai-discussion
title: QFAI Discussion (Exploration Planner)
description: "Run structured discussion that defines exploration conditions, evaluation rubric, and anti-goals for downstream prototyping."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    discovery-analyst,
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    completion-reviewer,
    requirements-reviewer,
    architecture-reviewer,
    product-surface-reviewer,
  ]
routing-profile: requirements-heavy
mode: interactive-by-default
---

## /qfai-discussion - Exploration Planner

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- ask-user bucket decisions (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations)
- destructive operations and scope expansions outside the active envelope

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`, and `.qfai/assistant/skills/qfai-grilling/SKILL.md` before the interview in step 2
- P2: `.qfai/assistant/manifest/agent-routing.yml` + `.qfai/assistant/manifest/review-profiles.yml` + `.qfai/assistant/catalog/*`; from `.qfai/assistant/manifest/agent-catalog.yml` read the acting `orchestrator`'s and each routed role's entry (`owned_artifacts` / `tool_profile` / `permission_profile` / `specialization_tags`), not the whole file — its `developer_instructions` bodies mirror the agent cards (`.qfai/assistant/constitution/constitution.md` Article III)
- P3: the pack under work — `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/**`
- P4: what the project already settled (`.qfai/specs/_policies/**`, active `.qfai/specs/*/01_Spec.md`, `.qfai/contracts/**`, `qfai.config.yaml`)

## Goal

Produce a unified 15-file discussion pack plus exploration-first UI sidecars so `/qfai-sdd` and `/qfai-prototyping` can operate without forcing an early visual direction decision.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- All 15 mandatory fixed files remain unchanged.
- UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.
- Completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- If UI requirements exist, behavior obligations are primary and HTML+CSS mock is optional fallback only.
- When an HTML+CSS mock includes links, author them in anchor-form (`<a href="#name">`); external `http(s)://` links are also allowed. Do NOT use same-origin absolute paths (`/orders/`) — a static mock cannot serve them and the validator rejects them (QFAI-MOCK-010).
- Discussion is planner-first: carry the screen explorations unranked and do not finalize the design system here. The brand direction is the exception — which published theme the product is built on is the user's decision, and there is no later stage where they are asked.
- Use artifact files, not conversational summaries, as the downstream handoff.

## UI-bearing Canonical Sidecar Family

Decide whether the target is UI-bearing with `references/ui-bearing-playbook.md` (surface mapping plus detection signals) before applying any UI-bearing branch in this file.

Every UI-bearing pack must produce, as primary truth: `uiux/00_index.md`, `uiux/40_screen_contracts.md`, `uiux/50_review_input_bundle.md`. That is the whole family, on every UI-bearing surface including `cli`.

Discussion authors no design artifact outside its own pack. Its run also writes this stage's evidence and the cycle's review pack, which record what the run did rather than specify anything.
The brand SSOT — root `DESIGN.md` — is authored by `/qfai-sdd` Phase 0 from what this pack records: the classification in `01_Context.md`, the reference registries in `04_Sources.md`, and the `uiux/` sidecars. Interview for it here, in the depth `references/design-dna-intake.md` sets out, and record the answers; do not write the file.

A **cli-only** pack (`primary_surface: cli`, no visual secondary surface) stays `ui_bearing: true` and keeps all three sidecars, but the brand questions do not apply to it: `/qfai-prototyping` rejects `cli`, so no downstream reader consumes a `visual.*` token tree, and `/qfai-sdd` Phase 0 skips the freeze. The test is the whole classified surface set — `primary_surface` **and** every `secondary_surfaces` entry. See `references/ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`.

## Required Process

0. Open this run's stage evidence at `.qfai/evidence/discussion-<YYYYMMDDhhmmssSSS>.md`, under the run's own
   stamp, before anything else is written. Two things below need a home that is not the
   pack: step 1's research summary, and the `## Grilling Session` row whose `Ended at` is
   written before the first pack file. A row with nowhere to go until the pack exists can
   only be written after drafting, which is the order it was added to rule out.
1. Run `.qfai/assistant/constitution/research-first-protocol.md` before any other artifact is authored, record its `research_summary` output in this run's stage evidence, and carry it into the `## Research Summary` section of `04_Sources.md` when step 3 opens the pack, then register source traceability there. Its `best_practices` / `anti_patterns` are inputs to every step below, not a late fill-in.
   **Nothing is written under `.qfai/discussion/` until an ending authorizes authoring.**
   The pack under work is resolved by the greatest timestamp with no completeness check,
   so a run cancelled during the session would leave a one-file directory that every
   later validator and the `/qfai-sdd` preflight read in place of the last complete pack.
   A cancellation would make the project look broken.
2. Read `.qfai/assistant/skills/qfai-grilling/SKILL.md`, then run the core interview
   for concept, scope, stakeholders, and constraints as a grilling session through
   that skill, covering every topic in `references/discussion-coverage-checklist.md` **and**, where any classified surface is
   `web`, `mobile`, `desktop` or `mixed`, the design-direction decisions in
   `references/design-dna-intake.md`. Not every UI-bearing target: a cli-only pack is UI-bearing
   and the brand questions do not apply to it, because nothing downstream reads a `visual.*` token
   tree for one. The method is
   `.agents/rules/grilling.md` and this step does not restate it. An interview with no method is
   the agent deciding and reporting.
   **Read the file, do not work from the name.** A host that loads a skill body lazily gives an
   agent the reference and not the procedure, and an agent with the reference alone improvises an
   interview that looks like the method and answers to nothing. If the file is absent, stop and
   report that `npx qfai init` installs it.
   The design-direction decisions belong in this session because step 9 runs after steps 3 to 8
   have authored the pack, and a user-owned visual choice asked there is asked after the thing it
   governs is written.
   Step 1's findings are inputs to the session's tree, not a later fill-in: a decision settled
   before the research that bears on it is settled against evidence nobody had, and the method
   reads a fact rather than asking about it.
3. Run Inception Deck and include at least one Mermaid diagram.
4. Run Story Workshop, capture user stories and user flows; HTML+CSS mock is optional fallback only.
5. Capture scope, REQ, NFR, glossary, constraints, and policies.
6. Run Example Mapping per `references/example-mapping-guide.md` and capture `Example Seeds`.
7. Update `11_OQ-Register.md`, resolve OQs until open count is zero, and move deferred items to `13_Deferred.md`; take the canonical field definitions for both files from `references/oq-and-deferred-rules.md`.
8. Generate the exploration-first sidecar family for UI-bearing targets.
9. Record the design direction settled in step 2's session — the chosen theme and the
   `references/design-dna-intake.md` answers behind it — in `01_Context.md#Design Direction`. The choice is
   made in the session, not here; this step writes it down. Required when any classified surface — primary or
   secondary — is `web`, `mobile`, `desktop` or `mixed`; skip for cli-only and non-ui targets. The answers,
   not a rendered brand file, are the handoff: `/qfai-sdd` Phase 0 authors root `DESIGN.md` from them.
10. Generate `prototyping.yaml` only when the latest discussion pack targets a prototyping execution surface (`web`, `mobile`, `desktop`, `mixed`) and an explicit prototyping recommendation is useful. A cli-only pack emits none — `/qfai-prototyping` rejects `cli`.
11. Request review and record the Reviewer result, following `references/review-cycle-playbook.md` for pack layout, cycle rules, and the `summary.json` fields. It owns the write paths under `.qfai/review/review-YYYYMMDDhhmmssSSS/`, which is the only tree `npx qfai validate` reads.

For UI-bearing targets, follow `references/design-dna-intake.md` while authoring the UI/UX sidecars, and apply the durable decision rules in `references/ui_ux_best_practices.md` (open only the `ui_ux/` appendix the current task needs). Keep this `SKILL.md` compact; put detailed interview prompts and examples in the reference file.

## UI-bearing Authoring Requirements

- On a visual-prototyping surface, `04_Sources.md` must carry both reference registries, each entry naming what was adopted, what was rejected, and how it was translated. Competitor references are **deviate-from** inputs, not imitate-this; catalogue references are adopt-from. Together they are what `/qfai-sdd` Phase 0 turns into root `DESIGN.md` front-matter and its `# Brand Philosophy` body, so an entry left blank leaves a brand field with nothing behind it.
- `40_screen_contracts.md` defines each screen contract per the template schema; `50_review_input_bundle.md` documents review inputs for downstream skills.
- Evaluation axes are global constants (4-step ordinal: weak / acceptable / strong / exceptional) and are not authored as discussion sidecars.

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

The full completion logic, including the UI-bearing blocking conditions, is in
`references/discussion-completion-matrix.md`. It must stay consistent with the canonical
sidecar family declared above and with `templates/uiux/00_index.md#Forbidden Legacy Files`.

**Authoring the pack** — the fifteen mandatory files and the UI sidecars, as the artifacts a
reader takes the design from — does not start until the session has ended. A pack drafted
mid-session records a design that was still being decided, and the draft is what the rest of the
run then defends.

Three writes are not that authoring, and happen when the process reaches them:

| Write                                                                       | When                       | Why it is not authoring                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The research summary in this run's stage evidence                           | Step 1, before the session | The session reads it. Held back, the decisions are settled against evidence nobody had. It is not in the pack: no pack directory exists yet, and one opened here is what a cancelled run would leave behind |
| A register entry or a labelled assumption the session's own ending produces | As the session ends        | It records what the session did. Withheld, a no-question run cannot write the open questions that block its completion                                                                                      |
| A throwaway artifact built to make a question answerable                    | Mid-session                | The method calls for it where talking cannot settle the question. It is not the pack, and it is not kept                                                                                                    |

A session has four endings, and three of them let authoring start:

| Ended         | What the user did                                                                                                | Authoring                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `confirmed`   | Confirmed on the session's own condition: no node open — the frontier empty **and** no fact lookup still running | Starts                                                                                                                                                                     |
| `user-closed` | Said `proceed`, `done`, or words to that effect                                                                  | Starts. Lookups already running are finished and each decision still open becomes a labelled assumption, except one a document requires the user to make and record        |
| `no-question` | Nothing — `--auto` reached nobody                                                                                | Starts. Every node still open is registered — a decision, and a fact only the user holds, which nothing else can supply, and the open count is then what blocks completion |
| `stopped`     | Said `stop`                                                                                                      | **Does not start.** Report every open decision as open and end the run                                                                                                     |

**No ending authorizes authoring while a `hard-required` input this invocation consumes is missing.** Those are excluded from both assumption paths: an interactive closure still asks for them, and a no-question run stops and names them. Registering an open question does not make an input defaultable — the value is what the run needs, and a question about it is not one.

**An interactive closure does not assume a decision some document requires the user to make
and record.** `proceed` and `done` end the asking while the user is still there, so a
decision they own is put again rather than assumed. The `hard-required` bound above does not
reach it: that one is about an input the run consumes, and this is a decision the run is not
permitted to take. The visual direction is the case this skill has —
`references/design-dna-intake.md` says only the user may choose a theme. The rule states the
same bound from its side: closing the questions waives the agent's own uncertainty, never an
authorization the user has not given.

**`--auto` is the other case, and its answer is already written.** Nobody is there to put the
question to, so the documented path holds: take the most conventional candidate, record it
`chosen_by: assumption`, open it in `11_OQ-Register.md`, and author — the open count is what
blocks completion. That is the rule's own shape for a no-question mode, the defaulted value
written down **and** labelled beside the open question. What is forbidden is the assumption
on its own, and a bar on authoring here would produce neither: no pack, and so nowhere to
register the question that was supposed to block it.

`stopped` is the one the vocabulary must keep separate. The rule says a stop ends the session
immediately and no further work follows it, so a closure that authorizes proceeding and a
cancellation cannot share a value — a pack drafted after `stop` is the run doing exactly what the
user told it not to.

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- confirm every required topic in `references/discussion-coverage-checklist.md` is covered, or captured as an OQ or deferred item;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` and `03_Story-Workshop.md` include Mermaid diagrams;
- ensure the `## Research Summary` section of `04_Sources.md` is filled from an actual protocol run (`sources`, `best_practices`, `anti_patterns`, and `reflection` with at least one `action: apply`);
- ensure the UI-bearing sidecar family is complete, and — when any classified surface (primary or secondary) is `web`, `mobile`, `desktop` or `mixed` — that both reference registries in `04_Sources.md` are complete;
- run `npx qfai validate --profile discussion --fail-on error` and fix discussion-owned findings;
- avoid selecting a single visual winner in discussion artifacts.

### Reviewer Gate (MUST)

Reviewer checks must confirm:

- the stage evidence's `## Grilling Session` row shows the session ended before authoring began,
  with `Ended` one of `confirmed`, `user-closed` or `no-question`;
  and every decision it settled is recorded where `references/oq-and-deferred-rules.md` says;
- the cycle's review pack was written per `references/review-cycle-playbook.md`, i.e. the three
  required artifacts exist under a `.qfai/review/review-YYYYMMDDhhmmssSSS/` directory;
- the 15-file discussion pack is complete; `Disposition: open` count is zero in `11_OQ-Register.md`;
- the UI-bearing sidecar family is complete when the pack is UI-bearing;
- discussion stayed planner-first and did not choose a single visual winner;
- Drift Protocol is enforced; review policy is checked against `.qfai/assistant/catalog/test-layers.md`;
- planning and coverage heuristics are signals, not gates;
- review findings end with `Status (PASS/REVISE/PENDING)` and Reviewer result is explicit as `PASS` or `REVISE` (`PENDING` marks a gate that could not be run and never counts as `PASS`).

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- do not self-approve; use artifact files as the handoff surface; integrate delegated outputs only after checking pack completeness.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE/PENDING)` column, reviewer response `Reviewer role:` + `Reviewed artifact:` + `Result: PASS | REVISE`). A response missing the role or artifact line is not a verdict; re-request it.

The stage evidence also carries `## Grilling Session`, which is what the Reviewer Gate reads its
session condition off:

```text
| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |
| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |
| confirmed | <ISO8601> | <ISO8601> | empty | none in flight | <n> | <n> |
```

**Both times, and the first written before the pack is.** A row holding only the final state reads the same whether the session ran first, ran after, or never ran: it is written at the end either way. Writing `Ended at` before the first pack file makes the order a record rather than a claim.

What it still cannot do is prove a session happened — the agent writes its own record. It establishes the order, which is the part a later reader has no other way to recover.

`Ended` is `confirmed`, `user-closed`, `no-question` or `stopped`, and only the first three authorize authoring. Without the record a skipped session and a
completed one present the same pack — fifteen files, every topic covered, every open question
registered — so the reviewer would have to block every run or accept a claim it cannot check.

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-sdd` in the active user language.

- Japanese output (use this exact sentence):
  ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick — demonstrably equivalent, which a design choice is not: moving one
    here is how a design nobody agreed to gets recorded as decided
- ask-user:
  - every decision the interview puts on the frontier, over every topic in
    `references/discussion-coverage-checklist.md`. Running the interview is what this skill
    performs, so these are its own operations
  - the confirmation that closes the session
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

Route every ask-user and hard-required item through the protocol in [User Questions (AskUserQuestion Protocol)](#user-questions-askuserquestion-protocol) above, including its `--auto` no-question rule.

project_memory:

- 15-file mandatory output set is fixed; the UI-bearing sidecar family (00_index.md + 40_screen_contracts.md + 50_review_input_bundle.md) is required whenever the target is UI-bearing, cli included. Root DESIGN.md is not a discussion output: /qfai-sdd Phase 0 authors it from this pack.
- Discussion is planner-first: never pick a single visual winner; carry exploration references as deviate-from inputs, not imitate-this.
- Completion requires Disposition: open count = 0 in 11_OQ-Register.md; deferred items must move to 13_Deferred.md with full metadata.
