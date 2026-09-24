# Acceptance Criteria

## Criteria

```gherkin
Feature: Story-tree seeding

# AC-0001-0038-01
# Parent: US-0001-0038
Scenario: Story-tree seed on a fresh project
  Given an empty project directory, which `qfai init` lays out as the story tree
  When `qfai init` runs
  Then `.qfai/spec/` holds `decisions.md` and `open-questions.md` with their header rows only, `01_policy/glossary.md`, `01_policy/constraint.md`, `02_business-flow/business-flows.md`, `03_contract/contracts.md` and the directories `03_contract/api/`, `db/`, `ui/`, `cli/` and `design/`
  And no business-flow or user-story instance is written, nothing is written under `.qfai/specs/` or `.qfai/contracts/`, every seeded Markdown file conforms to the schema the mdschema manifest routes it to, and `qfai validate --fail-on error` on the result exits 0

# AC-0001-0038-02
# Parent: US-0001-0038
Scenario: Story-tree seeds are create-only
  Given a project on the story tree whose `.qfai/spec/` seed files exist and carry the project's edits, with one seed file deleted
  When `qfai init` runs, and again as `qfai init --force`
  Then each existing seed file is left byte-identical on both runs, and only the deleted one is written

# AC-0001-0038-03
# Parent: US-0001-0038
Scenario: Configured spec and contract paths
  Given an empty project directory, which `qfai init` lays out as the story tree
  When `qfai init` runs
  Then `qfai.config.yaml` carries `paths.specsDir: .qfai/spec` and `paths.contractsDir: .qfai/spec/03_contract`, and a configuration that omits either key resolves it to the same path

# AC-0001-0038-04
# Parent: US-0001-0038
Scenario: Spec-pack layout left to the migration skill
  Given a project where the configured `paths.specsDir` holds a `spec-*/` or `_policies/` directory, or where `.qfai/contracts/` exists
  When `qfai init` runs
  Then nothing is written under `.qfai/spec/`, everything else is written as on any other run, the migration skill and its host links included, and one output line names the detected path and `/qfai-migration-spec-to-story`
  And the exit code is the one the run would have returned otherwise

# AC-0001-0038-05
# Parent: US-0001-0038
Scenario: Policy and contract files replace the catalog seeds
  Given an empty project directory, which `qfai init` lays out as the story tree
  When `qfai init` runs
  Then `.qfai/spec/01_policy/objective.md`, `initiative.md` and `principle.md` and `.qfai/spec/03_contract/tech.md` and `structure.md` are written, and none of `catalog/product.md`, `catalog/manifest.md`, `catalog/tech.md` and `catalog/structure.md` is, so no fact is seeded in two places
```
