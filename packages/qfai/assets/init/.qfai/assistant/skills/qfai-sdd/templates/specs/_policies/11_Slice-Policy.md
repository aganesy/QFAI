# 11 Slice Policy

> **SSOT notice**: The runtime slice policy is `.qfai/specs/_policies/11_Slice-Policy.md`. This template seeds the initial file; keep it in sync with the SSOT when updating slice rules.

Define the slicing model for `.qfai/specs/`. `/qfai-sdd` MUST create or update this file before it decides whether to create, update, or delete any spec.

## Slice categories

| Category   | Slice Rule                     | ID Range        |
| ---------- | ------------------------------ | --------------- |
| structural | 1 pack-type = 1 spec           | spec-0001..0002 |
| cli        | 1 command = 1 spec             | spec-0003..0007 |
| skill      | 1 skill = 1 spec               | spec-0008..0014 |
| agent      | all agents = 1 collective spec | spec-0015       |

## Category definitions

- `structural`: framework-level pack definitions such as spec-pack and discussion-pack.
- `cli`: commands implemented under `packages/qfai/src/cli/commands/`. One command maps to one spec.
- `skill`: skills defined under `packages/qfai/assets/init/.qfai/assistant/skills/`. One skill maps to one spec.
- `agent`: sub-agents defined under `packages/qfai/assets/init/.qfai/assistant/agents/`. All agents are grouped into one shared spec unless a newer approved slice policy says otherwise.

## Create / Update / Delete decision rules

| Operation | Trigger                                                               | AskUserQuestion |
| --------- | --------------------------------------------------------------------- | --------------- |
| CREATE    | New CLI command, skill, or structural pack-type with no matching spec | Required        |
| UPDATE    | Requirements or implementation scope changed for an existing slice    | Not required    |
| DELETE    | CLI command, skill, or structural slice was removed from the product  | Required        |

### Decision procedure

1. Discover the current repository subjects for each category.
2. Match each subject to existing specs and `_policies/03_Capabilities.md`.
3. Apply CREATE when a subject exists without a corresponding spec.
4. Apply UPDATE when the subject exists and the spec already owns it.
5. Apply DELETE when the owned subject no longer exists in the repository.

## ID stability rules

1. Keep existing IDs stable whenever the subject still exists.
2. Follow `_policies/03_Capabilities.md` order as the SSOT for capability-to-spec mapping.
3. Do not renumber surviving specs only to close gaps.
4. Record any reorder or category-boundary change as an explicit Change Request plus delta entry.

## Gap policy

- Leave gaps after deletions unless an approved migration explicitly renumbers them.
- Append new specs at the end of the relevant category block.
- Do not merge or split categories implicitly; update this file first, then apply the approved structural change.
