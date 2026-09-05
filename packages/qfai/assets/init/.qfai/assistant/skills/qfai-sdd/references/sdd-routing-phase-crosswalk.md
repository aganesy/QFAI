# Routing Phase Crosswalk (Normative)

The mapping `agent-routing.yml`'s three phases for `/qfai-sdd` have onto the nine stages
and phases `SKILL.md#stage-and-phase-order-fixed` fixes. Normative: `SKILL.md` points here
rather than restating it, so there is one copy to keep honest.

### Routing Phase Crosswalk (Normative)

`agent-routing.yml` names three phases for this skill; `## Stage and Phase Order (Fixed)` names
nine stages and phases. They are one sequence in two vocabularies, and this table is the only
mapping between them. Each routing phase spans a contiguous run of the fixed order: its mandatory
agents run inside that span, and its blocking agents MUST return `PASS` before the span's last
entry is left. `rerun_policy` keeps the meaning `agent-routing.yml` defines for it and is not
narrowed by these spans: `changed-scope-dependents` re-runs every agent whose inputs the changed
artifacts touched, wherever that agent sits — a `REVISE` that edits a `design`-span contract or
spec therefore re-runs the `review`-span reviewers that read it, so a span boundary never caps the
scope.

| Routing phase (`agent-routing.yml`) | Spans (from `## Stage and Phase Order (Fixed)`)                                                                                                                          | Blocking gate                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `slice-and-scope`                   | Stage 0 Preflight, Stage 1 Triage                                                                                                                                        | `delivery-planner` must PASS the Triage table persisted by this run before Phase 0 opens — see the Triage-less exception below |
| `design`                            | Phase 0 Contracts-first, Phase 1 Outline, Phase 2 Slice, Phase 2b Seed tdd/test-list.md, Phase 2c Obligation reconciliation, Phase 3 Plan finalize, Phase 4 Delta update | `solution-architect` must PASS the drafted artifacts before the Quality Gate runs                                              |
| `review`                            | the terminal gates that follow Phase 4: `## Quality Gate`, the Reviewer Gate section below, `## Done Declaration`                                                        | `completion-reviewer` must PASS before DONE is declared                                                                        |

Every fixed-order entry falls inside exactly one span and the spans do not overlap, so honouring
per-phase blocking never reorders the fixed order. Two exceptions bound the table:

- **Contract-scoped runs carry no Triage gate.** `/qfai-sdd --contract <CON-ID>` runs Stage 0 +
  Phase 0 + Phase 4 only (`## Arguments and Target Selection (Mandatory)`), so its
  `slice-and-scope` span is Stage 0 Preflight alone and the `delivery-planner` Triage gate does not
  apply. A Triage table persisted by an earlier run MUST NOT be replayed to satisfy it.
- **Batch mode fans out only the per-spec tail of `design`.** Without an argument, Phase 0
  Contracts-first and Phase 1 Outline are shared work run once per batch; only Phase 2 Slice
  through Phase 4 Delta update fan out per spec, and `slice-and-scope` and `review` run once per
  invocation, per `### No-argument batch delegation (MUST)`. No worker may edit shared contracts or
  `_policies` after the fan-out begins. That prohibition is not a licence to carry a mismatch: when
  a worker's Phase 2c finds the correct fix is on the shared-contract side, it neither edits the
  contract nor weakens the obligation to fit — it stops, records the mismatch, and the orchestrator
  suspends the fan-out and delegates the contract fix once to `solution-architect`, the role
  `Stage minimum roles` gives contract drafting; the orchestrator integrates that output and never
  drafts the amendment itself, then re-runs Phase 2 Slice through Phase 2c for every spec whose
  obligations read the amended contract before resuming.

Span membership partitions the fixed order, not the agent roster. Being mandatory in a span is a
floor — the agent MUST run inside it — never a ban on running in another span, so a role may be
mandatory in more than one. `requirements-analyst` is: it authors the Stage 1 Triage table in
`slice-and-scope` and drafts the requirement-aligned spec content `Stage minimum roles` assigns it
in Phase 2 Slice, inside `design`, after Phase 0 has frozen the contracts. A `delivery-planner`
`REVISE` at the Triage gate therefore returns the table to `requirements-analyst`, its author, and
the planner re-evaluates the amended table; `slice-and-scope` is `changed-scope-dependents` for
exactly that reason, because `failed-agents-only` would re-run the planner alone against an
unchanged table and repeat the same verdict.

### Crosswalk sources

- `../SKILL.md#stage-and-phase-order-fixed` — the nine fixed entries this table partitions.
- `../../../manifest/agent-routing.yml` — the three routing phase IDs it maps them onto.
