# 06 Test Cases

## TC-0009-0001: Repository Analysis Identifies Frameworks

- EX-Ref: EX-0009-0001
- AC-Refs: AC-0009-0001
- Verify that test frameworks and directories are correctly identified from config files and directory structure.

## TC-0009-0002: Glob Patterns Cover Test Locations

- EX-Ref: EX-0009-0001
- AC-Refs: AC-0009-0002
- Verify that proposed globs match all known test locations without overly broad patterns.

## TC-0009-0003: Config Update Is Minimal

- EX-Ref: EX-0009-0004
- AC-Refs: AC-0009-0003
- Verify that config diff touches only traceability glob keys.

## TC-0009-0004: Steering Populated from Evidence

- EX-Ref: EX-0009-0003
- AC-Refs: AC-0009-0004
- Verify that steering files are populated with verifiable facts and TBD for unknowns.

## TC-0009-0005: Evidence Sampling Produces Valid Matches

- EX-Ref: EX-0009-0001
- AC-Refs: AC-0009-0005
- Verify that 5-15 matched files are listed in evidence.

## TC-0009-0006: Zero Match Triggers Stop

- EX-Ref: EX-0009-0002
- AC-Refs: AC-0009-0005
- Verify that zero matches cause the skill to stop and request clarification.

## TC-0009-0007: Tool Selection Rationale Exists

- EX-Ref: EX-0009-0003
- AC-Refs: AC-0009-0006
- Verify that tool selection rationale is present in the evidence file.
