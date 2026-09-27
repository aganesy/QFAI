# 10 Plan

## Implementation approach

1. Agent catalog: document 19 consolidated agents with standard contract structure in `.qfai/assistant/agents/*.md`
2. Orchestrator Protocol: define delegation rules, phase gates, and review handoff rules
3. Work Orders schema: define table format used across all skills
4. Review profiles: keep devils-advocate and pattern-doubler optional and advisory; require rationale for concrete pattern proposals without a numeric target
5. Agent routing: define mandatory, conditional, blocking, and parallel agents per skill phase
6. Skill integration: update all SKILL.md files to reference routing-driven delegation
7. RCP footer: update skill-specific footers for targeted rerun policy
8. Gate rules: retain routing-based gates and bound pattern proposals to business-flow, US, AC, EX and TC coverage in the existing catalog

Use existing `review-profiles.yml` and `review-gate.rules.yml` data only; add no runtime reader, validator, role or framework. Empty and abstract-only artifacts return N/A, but missing mandatory pairings, independently required gates and product obligations, and the whole safety floor in `.agents/rules/minimal-implementation.md` § 2 remain required.

### Intent-driven entry (CAP-0018)

This change introduces no architectural element: the manifest entries are data,
and the baseline text is prose.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U3**:

- `manifest/agent-routing.yml` gains the `qfai-run` and `qfai-maintain`
  entries on the existing `default` profile, and `review-profiles.yml` gains
  none (BR-0015-0018).
- The operating baseline gains the autopilot bucket mapping and the binding
  exception (BR-0015-0010, 0019). This lands after spec-0001's Stage 0 section in
  the same file.
- The delegation baseline gains the actor history and grilling inside a run
  (BR-0015-0020, 0021).

Left out: a new review profile; the operating baseline's Stage 0 section
(spec-0001); how an upgraded project's manifest gains the entries (spec-0003,
J2).

## Test approach

- Unit tests: agent contract structure validation, routing/profile integrity, gate rule parsing
- Integration tests: skill-agent integration, RCP footer consistency, Codex TOML parity
- Concrete-pattern integration: reuse `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts` for rationale, concrete scope, N/A and catalog authority; real init must preserve legacy profile bytes without force and with force
- Asset tests: required/forbidden phrase guardrails across docs, wrappers, and skill files

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped file, so it is `L3`, under
`packages/qfai/tests/integration/`. One module holds the cases of one business
rule. Each is a new module, because editing an existing one would make its
completed rows stale.

| Layer | What it proves                                                                                                    | Module                                          | Cases        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------ |
| `L3`  | A `primarySpecId` that a run's binding supplies counts as supplied, and without a binding it stays hard-required  | `autopilotBindingExceptionSpec0015.test.ts`     | TC-0015-0037 |
| `L3`  | The shipped manifests route `qfai-run` and `qfai-maintain`, and `review-profiles.yml` keeps its six profiles      | `routingManifestEntrySkillsSpec0015.test.ts`    | TC-0015-0038 |
| `L3`  | Each Default Autopilot bucket maps to its authorization kind, and `--auto` satisfies nothing                      | `autopilotAuthorizationBucketsSpec0015.test.ts` | TC-0015-0039 |
| `L3`  | The actor history travels with the run, and an author or recommender never counts as its own independent reviewer | `actorHistoryRunSpec0015.test.ts`               | TC-0015-0040 |
| `L3`  | Grilling inside a run takes the work order's `settled` field as settled and works only the remaining frontier     | `grillingInRunSpec0015.test.ts`                 | TC-0015-0041 |

This change adds no story, so it adds no E2E row.

**Cases that stand alone, and kept failures.** No case is matrix-shaped, and
none is a kept failure. The stop on an unavailable required delegation keeps
BR-0015-0003's existing cases. Refusing a reviewer that is not independent is
spec-0018's.

**Held by an existing guard, so no case is written for it.**

- Manifest well-formedness: the agent-definition and skill-role validators.
- The Default Autopilot section and its buckets: the existing `autopilotPolicy`
  tests and TC-0015-0020, 0021 and 0034, all unchanged.
- That no plan names `qfai-grill`: the plan vocabulary, checked when spec-0018
  loads the plans.

**Order.** The five `L3` rows are tier 2 of spec-0018 `10_Plan.md`
`### Order in which the rows go green`.

- The operating-baseline passages land after spec-0001's in the same file.
- TC-0015-0038 reads `qfai-run` and `qfai-maintain`, so it goes green once
  spec-0018 ships them.
- An upgraded project gains the two routing entries through `qfai init --force`.
  The upgrade report that names it is tested by spec-0003, and the `start`
  refusal that names it by spec-0018.

**Findings carried on purpose.** Pushes follow spec-0018 `10_Plan.md`
`### Findings carried on purpose`.

| Finding                                                | Why it is expected                       | Until                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `QFAI-ATDD-112` for TC-0015-0037..0041                 | Their integration tests do not exist yet | ATDD writes them                                                                                                    |
| `QFAI-ATDD-131` on this spec, pinned at 1 under `full` | The spec has no Coverage Depth Matrix    | ATDD writes the first one, and that push re-pins with `node scripts/check-dogfood-backlog.mjs --profile full --pin` |

## Dependencies

- Requires: QFAI skill framework (SKILL.md structure)
- Consumed by: all QFAI skills reference this framework

## NFR approach

- NFR-0001 and NFR-0002 are unchanged by this entry.

### Intent-driven entry (CAP-0018)

- `discussion-20260923171450572#NFR-0002` (asset ceiling): the routing entries and the operating- and delegation-baseline passages stay within 800 lines and 400 characters per line. A breach shows in the `assets.lineBudget` doctor check and `packages/qfai/src/core/doctor/assetLineBudget.ts`.
- `discussion-20260923171450572#NFR-0015` (distributed surface): the manifest entries and baseline passages carry no internal identifier. A breach shows in the pre-build shipping lint, the post-build leakage guard or the init smoke test (`.agents/rules/distributed-surface.local.md` `## Four guards`).
- NFR-0003 (the first delegation failure hard-stops the stage): BR-0015-0003 stands. A breach shows as a run that continues past an unavailable required delegation in the existing delegation hard-stop tests.
- Owned elsewhere, cited here: whether a release claims a host as supported is spec-0018's. No routing entry claims a host.

## Risk mitigation

- Routing drift between SKILL.md and steering SSOT can break delegation
- Mitigation: central routing files become the only dispatch SSOT; tests validate Codex/init parity
- Adoption: preserved numeric targets are ineffective once the current catalog is adopted. Init's manifest-preservation behavior is unchanged; a project retaining an older catalog still needs the current catalog to receive this bound.
- Execution: reset only the two approved changed ledger rows and preserve their old evidence as history. Newly seeded rows remain todo until the executing owner supplies actual test identities and evidence; package regression success is not whole-workflow completion.

### Intent-driven entry (CAP-0018)

| Risk                                                                                                                                                                                                            | Likelihood / impact | Mitigation                                                                         | Trigger to act                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A plain upgrade leaves out the `qfai-run` and `qfai-maintain` routing entries, so `active` fails closed at `start` until `qfai init --force` runs, short of the active-by-default decision as the user accepted | high / med          | The upgrade report and the `start` refusal name `qfai init --force` (DR-0015-0010) | An upgraded fixture whose `start` refusal does not name the command, or an adopter report that chaining never starts after an upgrade |
| A new review profile is added for `qfai-maintain`, which the add-only merge never delivers to an upgraded manifest                                                                                              | low / high          | `qfai-maintain` uses the existing `default` profile (BR-0015-0018)                 | A diff that adds a profile to `manifest/review-profiles.yml`                                                                          |

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0015-0013..0014 per AC-0015-0013..0014:
  1. Reviewer-Gate adds `R-CERTIFY-VERIFY-CIRCULAR` (severity error) structural check: if a future PR wires `certify` to read a validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, the gate fires with a 3-part justification (offending certify code path, offending validator-output file/profile, option-B contract clause violated).
  2. Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with the 3-part justification SSOT shared with spec-0004's validate ingestion (one contract, two enforcers).
- Pair with spec-0004 wave: the validate-ingestion gate in spec-0004 is the rejector; this spec defines the emitter shape.

## CHG-006 (2026-05-27) — second-wave agent-collective + cross-skill governance

- Implement REQ-0158 / 0160 / 0161 / 0168 / 0171 / 0172 / 0173 per AC-0015-0015..0021:
  1. Add a `R-AUTOPILOT-POLICY-MISSING` Reviewer-Gate check that asserts every SKILL.md carries the `## Default Autopilot Policy` section with the three DR-0269 buckets (auto-decide / ask-user / hard-required); fail at severity error with a non-empty justification when the section is absent OR is present but missing one or more required buckets (heading-only / partial population — the `justification:` MUST name the missing bucket(s)).
  2. In the skill body, write an envelope-deviation decision record to `.qfai/evidence/decisions/<ISO8601-ts>.json` when an `AskUserQuestion` names one of the four DR-0270 contexts; keep the path tracked in version control by negating it in the managed `.gitignore` block (unlike the regenerable `.qfai/evidence/prototyping/`).
  3. Reference the canonical CLI-HANDOFF schema (`packages/qfai/src/core/schemas/handoff.ts`, doc `references/handoff.md`) from every handoff writer; add the `R-HANDOFF-SCHEMA-DRIFT` check covering non-conforming writes and asymmetric SSOT-sync Pair IV edits; accept legacy files with `D-HANDOFF-LEGACY-FORMAT` during the window.
  4. Register the eight-code catalog (BR-0015-0013) as membership only — the catalog declares no per-code severity column, each code keeping the severity its own detector emits (`R-DESIGN-MD-PATCH-OUT-OF-ZONE` stays warning per REQ-0151) — with a mandatory non-empty `justification:` on every entry; rely on the shared `qfai validate` advisory-failing ingestion, which rejects an empty / whitespace-only value at severity error for every one of the eight. Do not touch the OQ-0119-deferred prompt-augmentation timing.
  5. Wire `qfai audit log` (CLI-AUDIT) per DR-0271 filters + `--format table|json`; wire `qfai handoff upgrade` to emit a conforming handoff preserving originals under `legacy:`.
  6. Realign `references/*.md` + each SKILL.md in the same atomic PR as the OQ-0152..0157 implementation; rely on `qfai validate --report` for the zero-stale-reference obligation (a warning per stale reference).
- Cross-spec: the new finding-code catalog severity/justification SSOT and the doc-realignment rule are recorded in `_policies` (REQ-0168 / REQ-0173); spec-0015 owns the cross-skill governance surface. CLI surfaces (`qfai-audit.md`, `references/handoff.md`) and the handoff TS-module SSOT live under authoring zones (not distributed).
