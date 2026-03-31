# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0035-0001: Single shared detection module exists
Scenario: Shared detection module provides unified UI-bearing detection
  Given the codebase contains UI-bearing detection logic
  When a validator or skill needs to determine surface type
  Then a single shared detection module is imported
  And the module returns a surface type classification

# AC-0035-0002: Duplicated detection code removed
Scenario: No duplicate detection logic remains
  Given the shared detection module is implemented
  When inspecting uixDetection.ts and discussionDesignHardening.ts
  Then no inline surface parsing or classification logic remains in those files
  And all detection calls delegate to the shared module

# AC-0035-0003: All validators consume shared module
Scenario: Validators use shared detection module
  Given a validator that checks UI-bearing conditions
  When the validator runs
  Then it imports and calls the shared detection module
  And does not implement its own surface classification logic

# AC-0035-0004: Same detection result for same input (determinism)
Scenario: Detection is deterministic
  Given the same discussion pack input
  When the shared detection module is invoked twice
  Then both invocations return the identical surface type classification
  And no side effects alter results between invocations

# AC-0035-0005: Skill body describes static-first architecture
Scenario: Prototyping skill body aligned with static-first
  Given the prototyping SKILL.md file
  When reading the skill body description
  Then the description aligns with static-first architecture
  And no runtime-heavy language is present

# AC-0035-0006: No runtime-heavy language in skill body
Scenario: Banned phrases absent from skill body
  Given the prototyping SKILL.md and related docs
  When scanning for banned phrases ("must run runtime checks", "UI routes reachable", "API non-404", "DB objects present")
  Then zero matches are found

# AC-0035-0007: Three modes documented in skill body
Scenario: Low-cost, standard, and full-harness modes documented
  Given the prototyping SKILL.md file
  When reading the mode descriptions
  Then low-cost, standard, and full-harness modes are each explicitly described
  And obligations per mode are defined

# AC-0035-0008: Non-UI n/a paths documented
Scenario: Non-UI projects have documented n/a paths
  Given a non-UI project (surface_type: non-ui)
  When the prototyping skill is consulted
  Then UI-specific steps are documented as n/a for non-UI projects

# AC-0035-0009: Dedicated full-harness skill file exists
Scenario: Full-harness skill file present
  Given the skill directory structure
  When listing skill files
  Then a dedicated full-harness skill file exists
  And it contains workflow definition, not just routing guidance

# AC-0035-0010: CLI command integration for full-harness
Scenario: Full-harness accessible via CLI
  Given the CLI command structure
  When invoking the prototyping command with full-harness mode
  Then the full-harness workflow starts
  And is not limited to printing routing guidance

# AC-0035-0011: Routing guidance replaced with actual workflow
Scenario: Full-harness entrypoint provides real workflow
  Given a user invokes the full-harness path (CLI or skill)
  When the entrypoint is activated
  Then an actual workflow loop begins
  And routing guidance alone is not the output

# AC-0035-0012: Loop semantics defined for full-harness
Scenario: Full-harness loop semantics specified
  Given the full-harness workflow definition
  When reviewing evidence/reviewer/calibration obligations
  Then loop entry, iteration, exit, and convergence criteria are defined
```

---

## [v1.7.11 Completion Release] AC Gherkin

```gherkin
# AC-0035-0013
Scenario: Routing conditions documented and match implementation
  Given the prototyping SKILL.md and full-harness skill documentation
  When comparing the documented routing conditions with the mode router implementation
  Then the conditions that trigger standard-to-full-harness routing in documentation match the implementation exactly
  And the routing trigger is explicit (--mode full-harness flag or /qfai-prototyping-full-harness skill invocation)
  And no implicit routing conditions (e.g., automatic routing based on evidence scores) are documented or implemented

# AC-0035-0014
Scenario: No contradictory routing paths exist
  Given the full set of routing documentation (SKILL.md, CLI help, mode definitions)
  When checking for contradictory routing statements across all documentation sources
  Then no source claims a different routing trigger condition than the implementation
  And all sources agree on when full-harness routing occurs
  And all sources agree on the mode precedence chain (CLI > discussion > default)

# AC-0035-0015
Scenario: Mode precedence chain is documented and deterministic
  Given the mode precedence chain documentation in SKILL.md and spec-0006
  When reviewing the precedence resolver implementation
  Then the documented chain (1. CLI --mode override, 2. discussion recommended_mode, 3. system default standard) matches the implementation
  And the resolver produces the same effective mode for the same inputs on every invocation
  And the routing decision is logged as part of mode resolution output
```

## AC Catalog (optional)

| AC-ID        | Title                                                  | Notes                      | Priority |
| ------------ | ------------------------------------------------------ | -------------------------- | -------- |
| AC-0035-0001 | Shared detection module exists                         | Core unification contract  | P0       |
| AC-0035-0002 | Duplicate detection code removed                       | Consolidation verification | P0       |
| AC-0035-0003 | Validators consume shared module                       | Integration contract       | P0       |
| AC-0035-0004 | Detection determinism                                  | NFR-0003 compliance        | P0       |
| AC-0035-0005 | Skill body static-first aligned                        | Skill rewrite contract     | P0       |
| AC-0035-0006 | No banned phrases in skill body                        | REQ-0017 compliance        | P0       |
| AC-0035-0007 | Three modes documented                                 | REQ-0016 compliance        | P0       |
| AC-0035-0008 | Non-UI n/a paths documented                            | NFR-0002 compliance        | P1       |
| AC-0035-0009 | Full-harness skill file exists                         | Entrypoint contract        | P0       |
| AC-0035-0010 | CLI full-harness integration                           | CLI contract               | P0       |
| AC-0035-0011 | Real workflow replaces routing                         | Entrypoint quality         | P0       |
| AC-0035-0012 | Loop semantics defined                                 | REQ-0019 compliance        | P0       |
| AC-0035-0013 | Routing conditions documented and match implementation | US-0035-0004, REQ-0020     | P0       |
| AC-0035-0014 | No contradictory routing paths                         | US-0035-0004, REQ-0020     | P0       |
| AC-0035-0015 | Mode precedence chain documented and deterministic     | US-0035-0004, REQ-0020     | P0       |
