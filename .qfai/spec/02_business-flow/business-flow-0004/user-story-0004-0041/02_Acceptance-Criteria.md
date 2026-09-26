# Acceptance Criteria

## Criteria

```gherkin
Feature: A migrated project runs the free-text entry

# AC-0004-0041-01
# Parent: US-0004-0041
Scenario: Step 11 installs the free-text entry
  Given a 1.x project that steps 1 to 10 have migrated
  When step 11 runs
  Then every skill directory the installed package ships equals the package's copy
  And each host skills directory links every shipped skill
  And `AGENTS.md` and `CLAUDE.md` carry the entry directive
  And the managed `.gitignore` block carries `.qfai/run/` and `!.qfai/evidence/workflow/`

# AC-0004-0041-02
# Parent: US-0004-0041
Scenario: A customised shipped skill is archived, not lost
  Given a shipped skill directory whose content differs from the package's copy
  When step 11 runs
  Then the previous copy is under the migration evidence's `legacy/skill/` directory, whole
  And an archived copy is never overwritten

# AC-0004-0041-03
# Parent: US-0004-0041
Scenario: Step 12 passes on a migrated project
  Given a project that steps 1 to 11 have migrated
  When step 12 runs
  Then it changes no file, creates no run and exits 0
  And `npx qfai workflow start` is refused by none of `contract-undeclared`, `reviewer-missing` and `invalid-mode`

# AC-0004-0041-04
# Parent: US-0004-0041
Scenario: Step 12 reports what it cannot fix for a person
  Given a project on which one of step 12's checks fails
  When step 12 runs
  Then each failed check is one item under `## For a person` naming the check, the file and the reason
  And it changes no file and exits 3

# AC-0004-0041-05
# Parent: US-0004-0041
Scenario: Steps 11 and 12 are safe to preview, repeat and run out of order
  Given a project at any point of its migration
  When step 11 or step 12 runs again, runs with `--dry-run`, or runs before step 1
  Then a rerun changes no file, a dry run writes nothing and lists what the real run does
  And a run before step 1 exits 2 naming step 1 and writes nothing

# AC-0004-0041-06
# Parent: US-0004-0041
Scenario: The skill ends by handing over to `qfai-run`
  Given the shipped `SKILL.md` of the migration skill
  When an AI follows it past step 10
  Then it runs steps 11 and 12, resolves what step 12 lists, runs `npx qfai validate`
  And hands the first free-text change request to `qfai-run`

# AC-0004-0041-07
# Parent: US-0004-0041
Scenario: The old skill name is retired without breaking a migration under way
  Given a project that installed the skill as `qfai-migration-spec-to-story`
  When it upgrades and runs `qfai init --force`, or continues its migration with `qfai-migration-v1-to-v2`
  Then no host link and no `qfai validate` finding names the old skill
  And the new skill reads the plan and ID map the old one wrote under `.qfai/evidence/migration-spec-to-story/`
```
