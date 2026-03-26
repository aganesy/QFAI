# R11 Devil's Advocate

## Result: PASS

## Findings

The following challenges were raised under the premise that everything is wrong. For each challenge, the concrete alternative ("arubeki sugata") is provided, and after thorough analysis, none rise to the level of FAIL.

### Challenge 1: "The 3-set model (Token + Mock + Mermaid) is an arbitrary decomposition that will create integration overhead"

- **Reductio ad absurdum**: If we collapsed all three into a single artifact, we would lose separation of concerns -- visual data (tokens), layout (mocks), and navigation (flows) serve different consumers at different times.
- **Forced analogy**: This is like arguing that a database schema, API contract, and UI wireframe should be one file. They are complementary views of the same system.
- **Concrete alternative examined**: A single "UI Spec YAML" combining all three. This was implicitly rejected because (a) HTML Mocks need browser renderability, (b) Mermaid needs diagram parser compatibility, and (c) Design Tokens follow W3C DTCG which is its own standard. The 3-set model is correct.
- **Verdict**: The integration overhead is addressed by the consistency checker (BR-0013-0034, BR-0013-0035, uiDefinitionConsistency.ts). PASS.

### Challenge 2: "Ephemeral BP/AP DB (DEC-0013-0002) means repeating research every time, wasting effort"

- **Nitpicking**: Every /qfai-discussion invocation re-researches UI/UX best practices. For a team running 50 discussions/month, this is 50 redundant research cycles.
- **Concrete alternative examined**: Persistent global BP/AP DB with versioned updates. This was explicitly rejected (DEC-0013-0002) because UI/UX best practices evolve rapidly and a stale global DB creates false confidence in outdated rules. The discussion-scoped approach ensures freshness.
- **Counterargument**: The Research-First Protocol enforces quality (NFR-0011: source citation 100%, freshness >= 80% within 2 years). The cost of re-research is bounded by the /qfai-discussion execution context, not unbounded.
- **Verdict**: The trade-off is documented, justified, and the alternative was considered. PASS.

### Challenge 3: "5 sub-agents with 'soft separation' will create confusion about who owns what"

- **Nitpicking**: "Soft separation" (DEC-0013-0011) sounds like a euphemism for undefined boundaries. When 4 experts collaborate on form design (EX-0013-0085), who decides the final output?
- **Concrete alternative examined**: Hard separation with each expert producing independent, non-overlapping outputs. This was rejected because UI/UX domains naturally overlap (e.g., form design involves layout, color, navigation, and interaction). Hard separation would create artificial silos.
- **Resolution**: The Integrated UI/UX Reviewer (agent #5) serves as the explicit tie-breaker and integrator (BR-0013-0042, AC-0013-0024). Collaboration Rules are a mandatory section in each agent definition (BR-0013-0040). This is not undefined -- it is deliberately flexible with a clear escalation path.
- **Verdict**: The integration mechanism is defined. PASS.

### Challenge 4: "jsdom cannot compute CSS layout, so touch target and contrast ratio checks are unreliable"

- **Nitpicking**: TC-04 explicitly acknowledges jsdom does not support CSS layout. How can BR-0013-0027 (touch target 44x44px check) work without computed layout?
- **Concrete alternative examined**: Use a headless browser (Puppeteer/Playwright) for accurate layout computation. This was rejected because it would violate OC-02 (headless CI/CD) complexity and add heavy dependencies.
- **Resolution**: The plan (10_Plan.md section 1.3) explicitly addresses this: "extracting width/height from inline style attributes rather than relying on computed layout." This is a pragmatic compromise -- inline styles are the most common pattern in self-contained HTML Mocks (which have no external CSS by BR-0013-0008).
- **Verdict**: The limitation is acknowledged and the workaround is documented. PASS.

### Challenge 5: "The 2-second performance budget (NFR-0006) is arbitrary and will fail for real-world projects"

- **Forced analogy**: This is like setting a 100ms budget for a database query without knowing the data volume. The budget depends entirely on input size.
- **Concrete alternative examined**: Adaptive timeout based on input size (e.g., 50ms per token + 200ms per screen). This would be more precise but harder to communicate and enforce.
- **Resolution**: BR-0013-0025 handles the edge case: when 2s is exceeded, a warning is emitted and partial results are returned. The system does not crash or block. EX-0013-0043 and TC-0013-0028 cover the large-scale scenario explicitly. The 2s budget is a gate signal, not a hard failure.
- **Verdict**: Graceful degradation is specified. PASS.

### Challenge 6: "WCAG 2.2 AA auto-check at >= 80% coverage (NFR-0007) means 20% of accessibility issues are missed"

- **Nitpicking**: A 20% gap in accessibility checking is a liability risk (LC-01 notes WCAG compliance may be legally required).
- **Concrete alternative examined**: 100% automated WCAG coverage. This is infeasible because many WCAG criteria (e.g., meaningful sequence, sensory characteristics, language of parts) require human judgment and cannot be automated.
- **Resolution**: The hybrid review model (DEC-0013-0009) specifically addresses this: auto_check handles automatable rules, and ui-ux-reviewer handles subjective/judgment-based rules (BR-0013-0028). The combination targets full coverage, not auto-only.
- **Verdict**: The gap is covered by the manual review component. PASS.

### Challenge 7: "The consumption protocol order (Token -> Contract -> Mock -> Flow) is rigid and will be violated"

- **Nitpicking**: BR-0013-0032 mandates a specific reading order, but prototyping skills may need the Mock first to understand visual context before parsing Tokens.
- **Concrete alternative examined**: Unordered access with dependency graph resolution. This adds complexity without clear benefit for 4 artifacts.
- **Resolution**: EX-0013-0082 explicitly handles the non-standard order case: a warning is emitted but processing continues. The protocol is recommended, not enforced as a hard error. This is pragmatic.
- **Verdict**: Non-standard order is handled gracefully. PASS.

## Required fixes (if FAIL)

- (none -- all challenges resolved with documented alternatives and mitigations)

## N/A reason (if N/A)

- (not applicable -- can_be_na: false)

## Evidence checked

- spec-0013/01_Spec.md: Scope, NFR-0006, NFR-0007, TC-04, OC-02
- spec-0013/04_Business-Rules.md: BR-0013-0006, BR-0013-0008, BR-0013-0025, BR-0013-0027, BR-0013-0028, BR-0013-0032, BR-0013-0034, BR-0013-0035, BR-0013-0040, BR-0013-0042
- spec-0013/05_Examples.md: EX-0013-0043, EX-0013-0082, EX-0013-0085
- spec-0013/06_Test-Cases.md: TC-0013-0028, TC-0013-0032
- spec-0013/07_Decisions.md: DEC-0013-0001 through DEC-0013-0013
- spec-0013/10_Plan.md: Module decomposition, jsdom CSS layout workaround, no new dependencies
- \_policies/04_Business-Flow.md: v1.5.7 lifecycle flowchart
