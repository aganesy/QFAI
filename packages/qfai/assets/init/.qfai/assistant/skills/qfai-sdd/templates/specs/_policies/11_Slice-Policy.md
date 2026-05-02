# 11 Slice Policy

> **SSOT notice**: The runtime slice policy is `.qfai/specs/_policies/11_Slice-Policy.md`. This template seeds the initial file used by that runtime policy.

Define the slicing model and triage operations for `.qfai/specs/`. This
template is consumed by `/qfai-sdd` Stage 1 Triage when classifying each
incoming requirement against the existing specs.

## Slice categories

> Adjust the categories and ID ranges below to match your project. The
> ranges shown are illustrative only.

| Category   | Slice Rule                     | ID Range Example |
| ---------- | ------------------------------ | ---------------- |
| structural | 1 pack-type = 1 spec           | spec-0001..0002  |
| cli        | 1 command = 1 spec             | spec-0003..0005  |
| skill      | 1 skill = 1 spec               | spec-0006..0008  |
| agent      | all agents = 1 collective spec | spec-0009        |

## Category definitions

- `structural`: framework-level pack definitions such as spec-pack and discussion-pack.
- `cli`: commands implemented under `packages/qfai/src/cli/commands/`. One command maps to one spec.
- `skill`: skills defined under `packages/qfai/assets/init/.qfai/assistant/skills/`. One skill maps to one spec.
- `agent`: sub-agents defined under `packages/qfai/assets/init/.qfai/assistant/agents/`. All agents are grouped into one shared spec unless a newer approved slice policy says otherwise.

## Triage operations (8 first-class)

UPDATE is split into APPEND / MODIFY / REMOVE so that granularity is an
explicit decision recorded in delta.md, not an implicit one. Structural
operations (SPLIT / MERGE / SUPERSEDE) are 1st-class and require user
approval before any spec edits begin.

| Operation        | Sub-op  | Trigger                                                                 | AskUserQuestion |
| ---------------- | ------- | ----------------------------------------------------------------------- | --------------- |
| CREATE           | -       | New subject with no matching active spec                                | Required        |
| UPDATE           | APPEND  | Add new US/AC/BR/EX/TC to an existing active spec                       | Not required    |
| UPDATE           | MODIFY  | Change the meaning of an existing US/AC/BR/EX/TC                        | Not required    |
| UPDATE           | REMOVE  | Delete an existing US/AC/BR/EX/TC (cuts downstream refs)                | Required        |
| DELETE           | -       | The spec's subject was removed from the product                         | Required        |
| SPLIT            | -       | Existing spec covers >1 capability; responsibilities must be separated  | Required        |
| MERGE            | -       | Multiple specs converge on one capability; collapse them                | Required        |
| SUPERSEDE        | -       | A spec's responsibilities move to a new spec; keep history (status flip)| Required        |

## APPEND vs CREATE algorithm

For each incoming REQ/NFR, apply in order:

1. Resolve the REQ's capability from `_policies/03_Capabilities.md`.
2. If a single active spec already owns that capability and its
   `acCount <= 30 && tcCount <= 50` → **UPDATE:APPEND**.
3. If multiple active specs share the capability → **MERGE**.
4. If a single active spec owns the capability but exceeds the AC/TC
   thresholds → **SPLIT**.
5. If no active spec owns the capability and the capability itself is
   new → **CREATE**.
6. If the REQ removes existing items from a spec → **UPDATE:REMOVE**.
7. If the spec's subject is gone from the product → **DELETE**.
8. If the responsibilities move to a new spec while the old ID must
   remain in history → **SUPERSEDE**.

## Decision procedure

1. Read `_policies/03_Capabilities.md` and the active spec summaries
   (status: active only).
2. Build the Triage table for the entire change request before
   any spec edits.
3. Obtain AskUserQuestion approval for every CREATE / DELETE / SPLIT /
   MERGE / SUPERSEDE / UPDATE:REMOVE row.
4. Record the Triage table in:
   - per-spec `09_delta.md` for rows that touch a single spec, and
   - `_policies/10_delta.md` for cross-spec rows (SPLIT / MERGE /
     SUPERSEDE) and policy-only changes.
5. Only then begin Phase 0 (Contracts-first) and the per-spec Phases.

## Status field

Every spec's `01_Spec.md` declares `Status: active | superseded | deprecated | removed`.

- SUPERSEDE switches the source spec to `Status: superseded` and sets
  `Superseded-by: spec-NNNN`.
- DELETE removes the spec directory entirely (record reason in delta).
- Deprecated specs require `Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.

## ID stability rules

1. Keep existing IDs stable whenever the subject still exists.
2. Follow `_policies/03_Capabilities.md` order as the SSOT for capability-to-spec mapping.
3. Do not renumber surviving specs only to close gaps.
4. Record any reorder or category-boundary change as an explicit Change Request plus delta entry.

## Gap policy

- Leave gaps after deletions unless an approved migration explicitly renumbers them.
- Append new specs at the end of the relevant category block.
- Do not merge or split categories implicitly; update this file first, then apply the approved structural change.
