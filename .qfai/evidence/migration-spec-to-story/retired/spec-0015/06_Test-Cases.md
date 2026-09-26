# 06 Test Cases

## TC-0015-0001: Agent Cards 19 Entries

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0001
- Verify 19 cards under `.qfai/assistant/agent/` carry the required frontmatter fields and sections, without an `agent-catalog.yml`.

## TC-0015-0002: Standard Contract Structure

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0002
- Verify each agent file contains Mission, Inputs, Deliverables, Stop Conditions, Sign-off sections.

## TC-0015-0003: Orchestrator No Direct Generation

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0003
- Verify Orchestrator protocol restricts direct artifact generation.

## TC-0015-0004: Devils-Advocate Concrete Alternative

- EX-Ref: EX-0015-0002
- AC-Refs: AC-0015-0004
- Verify bare negation FAIL triggers re-judgment.

## TC-0015-0005: Devils-Advocate 3-FAIL Demotion

- EX-Ref: EX-0015-0003
- AC-Refs: AC-0015-0005
- Verify 3 consecutive FAILs trigger advisory demotion.

## TC-0015-0006: Pattern-Doubler Rationale Required

- EX-Ref: EX-0015-0004
- AC-Refs: AC-0015-0006
- Verify optional pattern review remains advisory and each proposed addition concerns concrete business-flow, US, AC, EX or TC coverage with a rationale.
- Verify the shipped profile has no numeric target and does not demand more abstract rules.
- Negative control: making rationale optional, assigning a numeric target or demanding additional abstract items fails the oracle.

## TC-0015-0007: Pattern-Doubler N/A Default

- EX-Ref: EX-0015-0004
- AC-Refs: AC-0015-0007
- Boundary `abstract-only-na`: verify empty and abstract-only artifacts return N/A even when BR, NFR, policy, decision or architectural items carry IDs. Concrete proposals remain eligible for advisory review. Missing mandatory pairings, independently required product obligations and blocking gates remain required.
- Negative control: removing the abstract-only N/A rule fails the oracle.

## TC-0015-0008: All-Reviewer FAIL Obligation

- EX-Ref: EX-0015-0002
- AC-Refs: AC-0015-0008
- Verify feedback without concrete alternative is invalid.

## TC-0015-0009: Built-In Routing SSOT

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0023
- Verify package defaults define reviewer routing, with whole-entry overrides from `qfai.config.yaml`.

## TC-0015-0010: Specialist Responsibilities Preserved

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0010
- Verify the cards preserve prior specialist responsibilities through their `replaces` frontmatter and body.

## TC-0015-0011: Delegation Failure Hard Stop Reporting

- EX-Ref: EX-0015-0005
- AC-Refs: AC-0015-0012
- Verify a failed first delegation is classified, that an `unavailable` classification stops the stage and reports remediation details including the failure class, that a `saturated` classification retries the identical delegation with the stage held open, and that neither class simulates or self-executes.

## TC-0015-0012: Capability Probe First Real Delegation Contract

- EX-Ref: EX-0015-0006
- AC-Refs: AC-0015-0011
- Verify the shared delegation baseline requires the stage to attempt the first required delegation as the Capability Probe, and `qfai-implement` inherits that contract without adding any separate probe step before the hard-stop handling path.

## TC-0015-0013: Coverage Placeholder for EX-0015-0007

- EX-Ref: EX-0015-0007
- AC-Refs: AC-0015-0001
- Verify that migrated example EX-0015-0007 is covered by at least one test case.

## TC-0015-0014: Coverage Placeholder for EX-0015-0008

- EX-Ref: EX-0015-0008
- AC-Refs: AC-0015-0001
- Verify that migrated example EX-0015-0008 is covered by at least one test case.

## TC-0015-0015: Prototyping Routing Rebuild

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0023
- Verify that `/qfai-prototyping` routing in the package defaults resolves the orchestrator to product-experience-architect (generator), product-surface-reviewer (evaluator), and devops-ci-engineer (capture); same-Claude generator/reviewer assignment is rejected to avoid self-preference bias.

## TC-0015-0016: Full-Harness Profile Absent From Built-In Defaults

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0023
- Verify that the package review-profile defaults define `default` but no `full-harness` profile; references to `full-harness` in routing surfaces must surface a routing-config validator finding.

## TC-0015-0017: Reviewer-Gate Emits R-CERTIFY-VERIFY-CIRCULAR on Regressed Certify Path

- EX-Ref: EX-0015-0009
- AC-Refs: AC-0015-0013
- Type: error
- Level: integration
- Verify that when a fixture certify code path reads a `verify.json` whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts (regressed cycle), the Reviewer Gate emits `R-CERTIFY-VERIFY-CIRCULAR` at severity error with a `justification:` naming the certify path, the offending validator-output profile, and the option-B contract clause violated. Implemented under `packages/qfai/tests/integration/reviewerGateCertifyVerifyCycle.test.ts`.

## TC-0015-0018: Option-B Compliant Certify Passes Without R-CERTIFY-VERIFY-CIRCULAR

- EX-Ref: EX-0015-0009
- AC-Refs: AC-0015-0013
- Type: normal
- Level: integration
- Verify that a certify code path that reads only prototyping-phase scoped validator output (no `/qfai-atdd` / `/qfai-implement` artifact requirements) passes the Reviewer Gate without emitting `R-CERTIFY-VERIFY-CIRCULAR`. Control case for TC-0015-0017.

## TC-0015-0019: Reviewer-Gate Emits R-PROMPT-SCANNER-DRIFT with 3-part justification

- EX-Ref: EX-0015-0010
- AC-Refs: AC-0015-0014
- Type: error
- Level: integration
- Verify that when the upstream SSOT-sync-pair CI lane (spec-0004 BR-0004-0027) signals drift on a fixture PR (scanner edited but prompt not, or vice versa), the Reviewer Gate emits `R-PROMPT-SCANNER-DRIFT` at severity error with a non-empty 3-part `justification:` naming the modified file, the un-paired counterpart, and the Tailwind contract clause whose match cannot be confirmed. Downstream `qfai validate` ingestion accepts the 3-part justification and rejects an empty-`justification:` variant (cross-spec assertion against BR-0004-0028). Implemented under `packages/qfai/tests/integration/reviewerGatePromptScannerDrift.test.ts`.

## TC-0015-0020: SKILL.md missing Default Autopilot Policy emits R-AUTOPILOT-POLICY-MISSING

- EX-Ref: EX-0015-0011
- AC-Refs: AC-0015-0015
- Type: error
- Level: integration
- Verify that a fixture SKILL.md lacking the `## Default Autopilot Policy` section makes the Reviewer Gate emit `R-AUTOPILOT-POLICY-MISSING` (severity error) with a non-empty `justification:` naming the SKILL.md path and the absent section.

## TC-0015-0021: SKILL.md with 3 named buckets passes (no autopilot finding)

- EX-Ref: EX-0015-0011
- AC-Refs: AC-0015-0015
- Type: normal
- Level: unit
- Verify that a SKILL.md whose `## Default Autopilot Policy` lists all three buckets (auto-decide / ask-user / hard-required) per DR-0269 passes without `R-AUTOPILOT-POLICY-MISSING`; a section that widens the auto-decide bucket beyond the DR-0269 set is flagged.

## TC-0015-0034: SKILL.md with section present but missing buckets emits R-AUTOPILOT-POLICY-MISSING

- EX-Ref: EX-0015-0011
- AC-Refs: AC-0015-0015
- Type: error
- Level: integration
- Verify the present-but-incomplete branch of AC-0015-0015 / BR-0015-0010. A fixture SKILL.md whose `## Default Autopilot Policy` heading exists but the body lacks one or more required buckets (e.g. only `auto-decide`, or empty body) MUST emit `R-AUTOPILOT-POLICY-MISSING` (severity error) with a non-empty `justification:` that names each missing bucket by name (`ask-user`, `hard-required`, etc). Distinct from TC-0015-0020 (section absent) and TC-0015-0021 (fully populated PASS), this pins the partial-population trigger and the per-bucket justification enumeration introduced by the validator extension.

## TC-0015-0022: Envelope-deviation AskUserQuestion writes a decision record

- EX-Ref: EX-0015-0012
- AC-Refs: AC-0015-0016
- Type: normal
- Level: integration
- Verify that an `AskUserQuestion` naming one of the four envelope-deviation contexts writes `.qfai/evidence/decision/<ISO8601-ts>.json` shaped `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}` per DR-0270.

## TC-0015-0023: Non-envelope AskUserQuestion writes no record (no fail-open)

- EX-Ref: EX-0015-0012
- AC-Refs: AC-0015-0016
- Type: boundary
- Level: unit
- Verify that an `AskUserQuestion` naming none of the four contexts writes no decision record, and that `.qfai/evidence/decision/` is tracked (negated in the managed `.gitignore` block after `.qfai/evidence/*`).

## TC-0015-0024: Non-conforming handoff write emits R-HANDOFF-SCHEMA-DRIFT

- EX-Ref: EX-0015-0013
- AC-Refs: AC-0015-0017
- Type: error
- Level: integration
- Verify that a skill writing a handoff file not conforming to the CLI-HANDOFF schema, or an asymmetric edit of SSOT-sync Pair IV (schema ↔ writers), makes the Reviewer Gate emit `R-HANDOFF-SCHEMA-DRIFT` (severity error) with a non-empty `justification:`.

## TC-0015-0025: Conforming handoff with extra keys passes; legacy file warns

- EX-Ref: EX-0015-0013
- AC-Refs: AC-0015-0017
- Type: normal
- Level: unit
- Verify that a `handoff.yaml` matching the minimum field set plus extra per-skill keys passes (`additionalProperties: true`), and a legacy `session-handoff.yaml` read during the window surfaces `D-HANDOFF-LEGACY-FORMAT` (warning) rather than `R-HANDOFF-SCHEMA-DRIFT`.

## TC-0015-0026: All eight catalog codes enforce mandatory non-empty justification

- EX-Ref: EX-0015-0014
- AC-Refs: AC-0015-0018
- Type: normal
- Level: unit
- Verify that the eight catalog codes (`R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT`) are registered in the catalog (membership only — the catalog declares no per-code severity; `R-DESIGN-MD-PATCH-OUT-OF-ZONE` stays warning at its own detector per REQ-0151) and that each requires a mandatory non-empty `justification:` whose empty / whitespace-only value is rejected at severity error for every one of the eight.

## TC-0015-0027: Catalog finding with empty justification rejected by validate

- EX-Ref: EX-0015-0014
- AC-Refs: AC-0015-0018
- Type: error
- Level: integration
- Verify that a Reviewer report emitting a catalog code with empty / whitespace-only `justification:` is rejected by `qfai validate` ingestion (advisory-failing, R-WORKLOG-DRIFT family pattern), and the same code with a non-empty justification is accepted. The OQ-0119 prompt-augmentation-timing deferral is not exercised.

## TC-0015-0028: `qfai audit log --scope/--operator/--clause` filters records

- EX-Ref: EX-0015-0015
- AC-Refs: AC-0015-0019
- Type: normal
- Level: integration
- Verify that `qfai audit log` lists `.qfai/evidence/decision/<ts>.json` records newest-first and that `--scope`, `--operator`, `--clause` filter the set and `--format json` emits JSON per DR-0271.

## TC-0015-0029: `qfai audit log` default format is table; empty store handled

- EX-Ref: EX-0015-0015
- AC-Refs: AC-0015-0019
- Type: boundary
- Level: unit
- Verify that `qfai audit log` with no `--format` defaults to `table`, and that an empty / absent `.qfai/evidence/decision/` directory yields an empty result without error.

## TC-0015-0030: `qfai handoff upgrade` emits conforming handoff with legacy: preserved

- EX-Ref: EX-0015-0016
- AC-Refs: AC-0015-0020
- Type: normal
- Level: integration
- Verify that `qfai handoff upgrade <legacy-file>` emits a conforming `handoff.yaml` at the canonical path with recognized fields mapped and all original fields preserved under a `legacy:` key.

## TC-0015-0031: `qfai handoff upgrade` on malformed legacy input errors without data loss

- EX-Ref: EX-0015-0016
- AC-Refs: AC-0015-0020
- Type: error
- Level: unit
- Verify that `qfai handoff upgrade` on a malformed / unreadable legacy file fails with a clear error and does not overwrite or partially emit a canonical `handoff.yaml`.

## TC-0015-0032: `validate --report` reports zero stale references for an in-PR doc rewrite

- EX-Ref: EX-0015-0017
- AC-Refs: AC-0015-0021
- Type: normal
- Level: integration
- Verify that when `references/*.md` + SKILL.md are rewritten in the same atomic PR as the OQ-0152..0157 implementation, `qfai validate --report` reports zero stale references at HEAD.

## TC-0015-0033: `validate --report` flags a stale reference as a warning

- EX-Ref: EX-0015-0017
- AC-Refs: AC-0015-0021
- Type: error
- Level: integration
- Verify that a `references/*.md` still describing pre-implementation behavior surfaces as a warning at HEAD, and that the severity is the same whatever the date of the run.

## TC-0015-0035: Reviewer-Gate ingests hygiene drift without demanding a justification

- EX-Ref: EX-0015-0018
- AC-Refs: AC-0015-0022
- Type: normal
- Level: integration
- Verify that a fixture lane report carrying `R-WORKFLOW-HYGIENE-DRIFT` (file, job, rule name) is surfaced by the Reviewer Gate with all three fields intact, and that no `justification:` is demanded. The oracle MUST assert the exemption against an explicitly enumerated divergence list naming exactly the two `CLI-WFSET` codes (BR-0015-0017), and MUST NOT derive it from the emitter or from absence-by-default: a code absent from that list stays justification-gated whatever emits it. Pin the deferral by asserting the list has exactly two members; when OQ-0015-0001 resolves by registering them, this oracle is expected to flip rather than to keep passing silently.

## TC-0015-0036: Shipped-shape drift is ingested and never justification-gated

- EX-Ref: EX-0015-0018
- AC-Refs: AC-0015-0022
- Type: error
- Level: integration
- Verify that a fixture report carrying `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` with an empty `justification:` is still surfaced rather than rejected. Negative control: `R-PACK-LOCATION-DRIFT` — an error-class, script-emitted catalog member — with an empty `justification:` MUST still be rejected in the same run, so the assertion proves the exemption is an enumerated per-code deferral rather than an emitter-derived rule or a blanket weakening of the justification contract.

## TC-0015-0037: Card Frontmatter Carries Every Agent Field

- EX-Ref: EX-0015-0019
- AC-Refs: AC-0015-0001
- Type: normal
- Level: integration
- Verify that each of the 19 cards under `.qfai/assistant/agent/` carries `name`, `kind`, `domain`, `mission`, `replaces`, `owned_artifacts`, `tool_profile`, `permission_profile` and `specialization_tags` in its frontmatter, with `mission` a key separate from `description`; that no `agent-catalog.yml` exists; and that each generated Codex agent TOML equals the generator's output for its card.

## TC-0015-0038: A Second Agent Definition Is Rejected

- EX-Ref: EX-0015-0019
- AC-Refs: AC-0015-0001
- Type: error
- Level: integration
- Verify that each planted violation, on its own, is caught and names the file:
  - A card with no `mission` key: `qfai validate` reports `QFAI-AGENT-011`, the card frontmatter check `agentDefinition.ts` runs through `parseAgentFrontmatter`, naming the card.
  - A card whose `mission` value is its `description` value: the oracle reads each card's frontmatter and names every card whose two values are equal.
  - An `agent-catalog.yml` in the tree: the oracle reads the shipped asset tree and the tree `qfai init` writes, and names any `agent-catalog.yml` in either.
  - A Codex agent TOML edited so that it differs from its card: the oracle compares each TOML with the `renderCodexAgentToml` output for its card, as `scripts/gen-codex-agents.mjs --check` does, and names the TOML.

## TC-0015-0039: No Override Means the Built-In Defaults

- EX-Ref: EX-0015-0020
- AC-Refs: AC-0015-0023
- Type: normal
- Level: integration
- Verify that with no `routing:` or `reviewProfiles:` key in `qfai.config.yaml`, each skill resolves the routing and review profile built into the package, and that the project holds no `agent-routing.yml` and no `review-profiles.yml`.

## TC-0015-0040: An Override Replaces the Matching Default Whole

- EX-Ref: EX-0015-0020
- AC-Refs: AC-0015-0023
- Type: boundary
- Level: unit
- Verify that a `routing:` entry for a skill the defaults carry replaces that default entry whole, with no field of the default merged in; that a `reviewProfiles:` entry replaces the default profile of the same name the same way; and that an entry matching no default is added beside the defaults.

## TC-0015-0041: An Override Naming a Card-less Agent Fails Validation

- EX-Ref: EX-0015-0021
- AC-Refs: AC-0015-0023
- Type: error
- Level: integration
- Verify that a `routing:` override naming an agent that has no card makes `qfai validate` report `QFAI-AGENT-008` naming that agent.

## TC-0015-0042: The Optional Review Modes Have No Override Key

- EX-Ref: EX-0015-0021
- AC-Refs: AC-0015-0023
- Type: boundary
- Level: unit
- Verify that the `qfai.config.yaml` schema declares `routing:` and `reviewProfiles:` as its override keys and no key that overrides `devils-advocate` or `pattern-doubler`.

## TC-0015-0043: The Migration Skill's Routing Matches Its Roles

- EX-Ref: EX-0015-0022
- AC-Refs: AC-0015-0024
- Type: normal
- Level: integration
- Verify that the shipped routing defaults carry a `qfai-migration-spec-to-story` entry whose phases are `plan`, `execution` and `review` in that order, with the mandatory and blocking agents AC-0015-0024 lists and review profile `architecture-heavy`; that the skill's `roles:` covers every agent the entry binds and every reviewer the profile selects; that its `routing-profile:` is `architecture-heavy`; and that `qfai validate` reports no `QFAI-AGENT-015` to `QFAI-AGENT-019` finding for the skill.
