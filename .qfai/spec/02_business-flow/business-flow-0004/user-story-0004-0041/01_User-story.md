# US-0004-0041: A migrated project runs the free-text entry

## User Story

- Parent: CAP-0018
- Goal: As an adopter moving a project from QFAI 1.x to 2.x, I want the
  migration skill to install the free-text entry and check it after the ten
  migration steps, so that my first free-text change request goes to `qfai-run`
  and `npx qfai workflow start` accepts the project without further setup.
- Non-goals: creating a run; changing a routing or review-profile override the
  project wrote; repairing an item step 12 reports; installing agent cards.
- Notes: requested by the user on 2026-09-26 (DEC-0919). The skill's name
  becomes `qfai-migration-v1-to-v2`; the old name is a retired skill ID, and the
  evidence directory keeps its name so a migration already under way continues.

## Source Provenance

- Change request: `decisions.md#DEC-0919`
