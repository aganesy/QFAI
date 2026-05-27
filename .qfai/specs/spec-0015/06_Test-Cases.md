# 06 Test Cases

## TC-0015-0001: Agent Catalog 19 Entries

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0001
- Verify 19 agent definition files exist with required sections.

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
- Verify each proposed pattern includes rationale.

## TC-0015-0007: Pattern-Doubler N/A Default

- EX-Ref: EX-0015-0004
- AC-Refs: AC-0015-0007
- Verify N/A returned when no ID-bearing items exist.

## TC-0015-0008: All-Reviewer FAIL Obligation

- EX-Ref: EX-0015-0002
- AC-Refs: AC-0015-0008
- Verify feedback without concrete alternative is invalid.

## TC-0015-0009: Routing SSOT

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0009
- Verify `agent-routing.yml` and `review-profiles.yml` define reviewer routing.

## TC-0015-0010: Specialist Responsibilities Preserved

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0010
- Verify merged agent definitions preserve prior specialist responsibilities through catalog replacement mappings and merged responsibilities.

## TC-0015-0011: Delegation Failure Hard Stop Reporting

- EX-Ref: EX-0015-0005
- AC-Refs: AC-0015-0012
- Verify failed first delegation stops the stage, does not simulate or self-execute, and reports remediation details.

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
- AC-Refs: AC-0015-0009
- Verify that `/qfai-prototyping` v2.0 routing in `agent-routing.yml` resolves the orchestrator to product-experience-architect (generator), product-surface-reviewer (evaluator), and devops-ci-engineer (capture); same-Claude generator/reviewer assignment is rejected to avoid self-preference bias.

## TC-0015-0016: Full-Harness Profile Drop From review-profiles.yml

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0009
- Verify that `review-profiles.yml` no longer defines the `full-harness` profile and that only the `default` profile is active; references to `full-harness` in routing surfaces must surface a routing-config validator finding.

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
