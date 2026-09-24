# BF-0004: Migrate a spec-pack project to the story tree

## Purpose

Move an old layered spec-pack project to business flows, stories, criteria,
examples and contracts while retaining every unresolved source and a stable
old-to-new ID record.

## Flow

```mermaid
flowchart TD
  Inventory[Inventory old packs and contracts] --> Plan[Approve flows, stories, criteria and rule destinations]
  Plan --> Fixture[Pass migration fixture and independent review]
  Fixture --> Dry[Dry-run each of ten ordered steps]
  Dry --> Apply[Run step and retain report]
  Apply --> Check{Step result}
  Check -->|Exit 2| Correct[Correct plan or source before first write]
  Correct --> Dry
  Check -->|Exit 3| Person[Resolve listed item from archived source]
  Person --> Verify[Verify destination and evidence]
  Check -->|Exit 0| Verify
  Verify --> More{Steps remain?}
  More -->|Yes| Dry
  More -->|No| Recheck[Repeat steps and confirm zero-file change]
  Recheck --> Cutover[Validate story tree and retire old reader]
```

## Alternate and exception paths

- A dry run writes no files. Exit 2 identifies a blocked operation and stops
  before the step's first write.
- Exit 3 lists source paths and unresolved items under `For a person`. The
  source stays in the old pack or retired archive until a person resolves it.
- Step 4 writes the ID map once. A later plan cannot move or add an item that
  disagrees with that map; resolution proceeds in the migrated tree through
  SDD, with the old source retained as evidence.
- Re-running any completed step changes zero files. A partial run resumes
  under the same plan and retained report.
- Cutover requires the fixture DSC-003/004 gates, independent reviewer GO,
  resolved active items, and the final story-tree validation.

The ordered steps are directory rename, decision-table merge, catalog move,
ID renumbering, TC-only case conversion, EX criterion derivation, rule move,
test-annotation rewrite, host-link repointing and gitignore update. The
step-4 ID map binds every later step to the approved plan.

