# Acceptance Criteria

## Criteria

```gherkin
Feature: Migrate a project with the skill
  # AC-0004-0012-01
  Scenario: SKILL.md plans, previews, runs and reads the reports
    Given the installed /qfai-migration-v1-to-v2 skill
    When an AI follows SKILL.md on a project on the spec-pack layout
    Then it writes the plan, runs each step with --dry-run and then without it, reads every report from its standard output, and runs qfai validate after step 10
    And on a project with nothing to migrate it reports that there is nothing to migrate, names the specs directory the steps looked in and asks the person to check that the specs live there
    And on a project an earlier 2.x release migrated it runs the steps again and reports that only what that release lacked changed

  # AC-0004-0012-02
  Scenario: The migrated fixture has no layout or chain error
    Given the old-layout fixture migrated by all ten steps, with every For a person item resolved
    When qfai validate runs on it
    Then it reports no layout error and no chain error
    And its test-obligation findings list every BF, AC and EX left without a test at its layer

  # AC-0004-0012-03
  Scenario: A person can read how to migrate before running the skill
    Given the package's shipped skills
    When a person opens the migration skill's references
    Then migration-guide.md is there, naming the release that brings the story tree as 2.0.0
    And it states that 2.x does not read the spec-pack layout: a project that keeps it stays on a pinned 1.x release, and a project that upgrades runs the migration first
    And it states that each checkout and each git worktree needs its own install before `npx qfai` resolves 2.x

  # AC-0004-0012-04
  Scenario: The person learns where the working state is and where retired files went
    Given the shipped SKILL.md of the migration skill
    When an AI follows it to the end of a migration
    Then it tells the person that the plan and the ID map are under tmp/qfai-migration/, which git ignores and which they may delete
    And that every file the migration retired is kept only in git history
```
