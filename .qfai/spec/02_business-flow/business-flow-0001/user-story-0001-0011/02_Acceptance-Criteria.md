# Acceptance Criteria

## Criteria

```gherkin
Feature: Story-tree layout described by mdschema

# AC-0001-0011-01
# Parent: US-0001-0011
Scenario: Every story-tree Markdown file has one schema entry and one template
  Given the mdschema manifest and the `qfai-sdd` templates
  When each Markdown file of the story tree is matched against them
  Then each of the sixteen fixed files and the Markdown CLI contract matches exactly one manifest entry, paired with one template
  And `documentsWithoutOneEntry` in `check-mdschema.mjs` reports no file

# AC-0001-0011-02
# Parent: US-0001-0011
Scenario: The sample story tree passes both document lints
  Given the sample story tree built from the `qfai-sdd` templates
  When `pnpm lint:mdschema` and `pnpm lint:mermaid` run on it
  Then both report no failure
```
