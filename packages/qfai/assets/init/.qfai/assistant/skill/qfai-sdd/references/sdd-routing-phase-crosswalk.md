# SDD Routing Phase Crosswalk

The resolved `qfai-sdd` entry from package routing defaults, with any `qfai.config.yaml` override, has three routing phases. Each spans a contiguous part of `../SKILL.md` and has a blocking gate. `changed-scope-dependents` applies across these spans: a changed input reruns every author or reviewer that consumed it.

| Routing phase     | Skill stages                                                                        | Blocking decision                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `slice-and-scope` | Stage 0 source and preflight; Stage 1 triage and records                            | `delivery-planner` accepts the affected-flow scope and approval state before drafting.                                     |
| `design`          | Stage 2 policy and flows; Stage 3 stories and examples; Stage 4 contracts and rules | `solution-architect` accepts the connected BF → US → AC → EX ← BR design and contract realization before the quality gate. |
| `review`          | Per-flow validation, independent reviewers, evidence, and completion                | `completion-reviewer` returns PASS before a flow is declared complete.                                                     |

The mandatory roles in the routing entry are minimum participation, not exclusive ownership. `requirements-analyst`
contributes to both triage and requirement-aligned story drafting. `test-design-analyst` checks observable outcomes and
traceable test obligations during design. A UI-bearing target also routes the configured experience and surface roles.
Follow the current routing manifest for the exact conditional agent set and review profile.

For `--contract <CON-ID-or-path>`, scope design to the named contract, its paired contracts, and the existing flows
whose AC, EX, or BR depend on them. Reconcile those obligations after each contract change. Record the review and gate
in each affected BF's evidence. If no BF exists, say in the report what the stage waits on, record an `open-questions.md`
row for it, and do not claim DONE. No previous triage approval can substitute for approval of a new change-request row.

The orchestrator integrates delegated work and does not author or self-review it. A REVISE returns to the author of the affected artifact, then re-runs dependent reviewers after the repair. Follow `review-cycle-playbook.md` for the cycle limit and recorded verdicts.
