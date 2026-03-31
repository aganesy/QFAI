# 06 Test Cases

## TC-0015-0001: Agent Catalog 39 Entries

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0001
- Verify 39 agent definition files exist with required sections.

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

## TC-0015-0009: Roster Single-File SSOT

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0009
- Verify `review-roster.yml` contains all reviewers.

## TC-0015-0010: Existing Reviewers Unchanged

- EX-Ref: EX-0015-0001
- AC-Refs: AC-0015-0010
- Verify existing 10 reviewers' definitions are not modified.

## TC-0015-0011: Coverage Placeholder for EX-0015-0005

- EX-Ref: EX-0015-0005
- AC-Refs: AC-0015-0001
- Verify that migrated traceability includes EX-0015-0005.

## TC-0015-0012: Coverage Placeholder for EX-0015-0006

- EX-Ref: EX-0015-0006
- AC-Refs: AC-0015-0001
- Verify that migrated example EX-0015-0006 is covered by at least one test case.

## TC-0015-0013: Coverage Placeholder for EX-0015-0007

- EX-Ref: EX-0015-0007
- AC-Refs: AC-0015-0001
- Verify that migrated example EX-0015-0007 is covered by at least one test case.

## TC-0015-0014: Coverage Placeholder for EX-0015-0008

- EX-Ref: EX-0015-0008
- AC-Refs: AC-0015-0001
- Verify that migrated example EX-0015-0008 is covered by at least one test case.
