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

## TC-0009-0008: Coverage Placeholder for AC-0009-0007

- EX-Ref: EX-0009-0001
- AC-Refs: AC-0009-0007
- Verify that migrated traceability includes AC-0009-0007.

## TC-0009-0009: Coverage Placeholder for EX-0009-0005

- EX-Ref: EX-0009-0005
- AC-Refs: AC-0009-0001
- Verify that migrated example EX-0009-0005 is covered by at least one test case.

## TC-0009-0010: Story-Tree Specs Directory Added When Absent

- EX-Ref: EX-0009-0006
- AC-Refs: AC-0009-0008
- Level: integration
- Verify that on a project on the story tree whose `qfai.config.yaml` has no `paths.specsDir`, the config update writes `paths.specsDir: .qfai/spec`.

## TC-0009-0011: Existing Specs Directory Kept

- EX-Ref: EX-0009-0006
- AC-Refs: AC-0009-0008
- Level: integration
- Verify that on a project on the story tree whose `qfai.config.yaml` already sets `paths.specsDir`, the value is left unchanged, and that no update writes `paths.specsDir: .qfai/specs`.

## TC-0009-0012: One Changed Routing Assignment Written as One Whole Entry

- EX-Ref: EX-0009-0007
- AC-Refs: AC-0009-0003
- Level: integration
- Verify that with the `rule/ skill/ agent/ prompt/` assistant tree, a user's change to one skill's agent assignment adds one whole `routing:` entry keyed by that skill, copies no unchanged default into `qfai.config.yaml`, and writes no routing file or review-profile file.

## TC-0009-0013: Override Recording Writes Nothing Under the Assistant Tree

- EX-Ref: EX-0009-0007
- AC-Refs: AC-0009-0003
- Level: integration
- Verify that with the `rule/ skill/ agent/ prompt/` assistant tree, recording a routing or review-profile override leaves every file under `.qfai/assistant/` unchanged and writes the override into `qfai.config.yaml` alone.

## TC-0009-0014: Gate Commands Live Only in the Standard Commands Section

- EX-Ref: EX-0009-0008
- AC-Refs: AC-0009-0004
- Level: integration
- Verify that on the story tree the populated files are the five merged files, that the quality-gate commands appear only in the Standard commands section of `<paths.contractsDir>/tech.md`, and that an unverifiable fact is written as `TBD` with its missing evidence recorded.

## TC-0009-0015: A Duplicated Fact or a Catalog Write Fails

- EX-Ref: EX-0009-0008
- AC-Refs: AC-0009-0004
- Level: integration
- Verify that a populated result is rejected when a fact appears in two of the five merged files, when a gate command is written into `qfai.config.yaml`, or when any file is written under `.qfai/assistant/catalog/`.
