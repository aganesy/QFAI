# Acceptance Criteria

## Criteria

```gherkin
Feature: Migrate a project with the skill

# AC-0004-0012-01
# Parent: US-0004-0012
Scenario: SKILL.md plans, previews, runs and keeps the reports
  Given the installed /qfai-migration-spec-to-story skill
  When an AI follows SKILL.md on a project on the spec-pack layout
  Then it writes the plan, runs each step with --dry-run and then without it, keeps every report as evidence, and runs qfai validate after step 10
  And on a project with nothing to migrate it reports that there is nothing to migrate

# AC-0004-0012-02
# Parent: US-0004-0012
Scenario: The migrated fixture has no layout or chain error
  Given the old-layout fixture migrated by all ten steps, with every For a person item resolved
  When qfai validate runs on it
  Then it reports no layout error and no chain error
  And its test-obligation findings list every BF, AC and EX left without a test at its layer

# AC-0004-0012-03
# Parent: US-0004-0012
Scenario: A person can read how to migrate before running the skill
  Given the package's shipped skills
  When a person opens the migration skill's references
  Then migration-guide.md is there, naming the release that brings the story tree as 2.0.0
  And it states that 2.x does not read the spec-pack layout: a project that keeps it stays on a pinned 1.x release, and a project that upgrades runs the migration first
```
