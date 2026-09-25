# Acceptance Criteria

## Criteria

```gherkin
Feature: 4-layer asset-tree seeding

# AC-0001-0034-01
# Parent: US-0001-0034
Scenario: 4-layer asset-tree seed
  Given a clean new project directory
  When `qfai init` runs
  Then the four directories `.qfai/assistant/{constitution,manifest,catalog,process}/` are created with the shipped assets' content. A layer the shipped assets fill gets no `.gitkeep`; only an empty layer gets an empty one. The legacy `.qfai/assistant/steering/` layer is not created
  And with the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/{rule,skill,agent,prompt}/` are created from the shipped assets in place of the four layers, each skill under `skill/` carries its own `references/`, and none of `constitution/`, `manifest/` and `process/` is created. `catalog/` holds only the four adopter-owned seeds `product.md`, `manifest.md`, `tech.md` and `structure.md`, and is not created where init lays out the story tree
```
