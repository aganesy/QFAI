# 11 Slice Policy

> **SSOT notice**: The runtime slice policy is `.qfai/specs/_policies/11_Slice-Policy.md`. This template seeds the initial file used by that runtime policy.

Define the slicing model and triage operations for `.qfai/specs/`. This
template is consumed by `/qfai-sdd` Stage 1 Triage when classifying each
incoming requirement against the existing specs.

## Principle (read first)

Default = modify an existing active spec (UPDATE:APPEND /
UPDATE:MODIFY / UPDATE:REMOVE — the colon-separated form, no space, is
the canonical SSOT for validators and `references/sdd-triage.md`).
CREATE is reserved for clear scope deviations introducing a new
capability that is also being added to `_policies/03_Capabilities.md`.
Validator `QFAI-TRIAGE-006` enforces this: every CREATE row must cite
a `CAP-NNNN` in the Rationale column, and that CAP must already be
present in the capability catalog.

The classifier (`src/core/sddTriage.ts::classifyTriage`) implements an
append-first fallback: when capability does not match exactly, it still
proposes APPEND on the spec whose title/scope/capability shares the
most subject tokens. CREATE is only emitted when there is **zero**
token overlap with any active spec.

A single requirement frequently touches multiple specs. Always walk
every active spec for the _impact cascade_ and emit one Triage row per
affected spec (primary owner + companion MODIFY / REMOVE rows on other
specs whose AC/BR reference the changed concept).

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
- `cli`: commands implemented under this project's CLI command source directory. One command maps to one spec.
- `skill`: skills this project itself authors, in its own skill source directory. One skill maps to one spec. The QFAI skills installed under `.qfai/assistant/skills/` are generated artifacts, not sliceable subjects.
- `agent`: sub-agents this project itself authors, in its own agent source directory. All agents are grouped into one shared spec unless a newer approved slice policy says otherwise. The QFAI role cards under `.qfai/assistant/agents/` are generated artifacts, not sliceable subjects.

## Triage operations (8 first-class)

UPDATE is split into APPEND / MODIFY / REMOVE so that granularity is an
explicit decision recorded in delta.md, not an implicit one. Structural
operations (SPLIT / MERGE / SUPERSEDE) are 1st-class and require user
approval before any spec edits begin.

| Operation | Sub-op | Trigger                                                                                                                                                                                                                                                                                                                                                                   | AskUserQuestion |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| CREATE    | -      | New subject with no matching active spec                                                                                                                                                                                                                                                                                                                                  | Required        |
| UPDATE    | APPEND | Add new US/AC/BR/EX/TC to an existing active spec                                                                                                                                                                                                                                                                                                                         | Not required    |
| UPDATE    | MODIFY | Change the meaning of an existing US/AC/BR/EX/TC                                                                                                                                                                                                                                                                                                                          | Not required    |
| UPDATE    | REMOVE | Delete an existing US/AC/BR/EX/TC (cuts downstream refs)                                                                                                                                                                                                                                                                                                                  | Required        |
| DELETE    | -      | The spec's subject was removed from the product                                                                                                                                                                                                                                                                                                                           | Required        |
| SPLIT     | -      | Existing spec covers >1 capability; responsibilities must be separated                                                                                                                                                                                                                                                                                                    | Required        |
| MERGE     | -      | Multiple specs converge on one capability; collapse them                                                                                                                                                                                                                                                                                                                  | Required        |
| SUPERSEDE | -      | A spec's responsibilities move to a new spec; keep history (status flip). Also covers single-spec **RENAME** (subject change at the same ID is normally UPDATE:MODIFY; if the spec ID itself must change while the scope stays the same — i.e., **RENUMBER** — emit SUPERSEDE: create the new ID and mark the old as superseded). MERGE handles multi-spec consolidation. | Required        |

## APPEND vs CREATE algorithm

Steps 1-3, 5 and 6 select the operation; the **first** one that matches wins.
Step 4 is **not** an alternative branch — it is a recording obligation that
always runs afterwards, on whichever spec the selected operation targets. Do not
stop at step 2.

1. Resolve the REQ's capability from `_policies/03_Capabilities.md`.
2. If a single active spec already owns that capability → **UPDATE:APPEND**.
   Item counts do not change this answer. Continue to step 4: an oversized
   owner still needs its `Rationale` entry and its capability-ownership review.
3. If multiple active specs share the capability → **MERGE**.
4. **Always evaluate, whatever step 2/3/5 decided.** If any spec the selected
   operation targets exceeds the AC/TC thresholds (`acCount > 30` or
   `tcCount > 50`), that is a **size signal, not an operation**. A MERGE row
   targets several specs, so check them all. Record every breach in the Triage
   row's `Rationale` and start a **capability-ownership review**:
   - the spec genuinely owns more than one `CAP-NNNN` → **SPLIT** (approval
     required, see below);
   - the spec owns exactly one capability → **the operation selected in steps
     1-3/5 is unchanged** — MERGE stays MERGE with its approval, APPEND stays
     APPEND. This step never rewrites the operation; it only records the
     reasoned non-split, because there is nothing to split into.

   > A count-driven SPLIT of a single-capability spec is **illegal**.
   > `validateSpecSplitByCapability` hard-enforces one `CAP-NNNN` per spec —
   > each CAP row declares exactly one directory in the `Spec` column of
   > `_policies/03_Capabilities.md`, never a row-order sequence — so it raises
   > `QFAI-SPLIT-102` and `QFAI-SPLIT-104` at `error` severity. The SPLIT
   > trigger is capability ownership (line 64 of this file, and
   > `sdd-triage.md`), never a count.

   > An approved SPLIT moves capabilities, so it also rewrites the catalog.
   > Reassign the `Spec` cell of every moved `CAP-NNNN` row in
   > `_policies/03_Capabilities.md` to the directory that now owns it; the
   > original spec keeps only the capability it retains. A moved row still
   > pointing at the old directory makes two rows claim that directory
   > (`QFAI-SPLIT-106`), leaves the new one owned by no CAP
   > (`QFAI-SPLIT-104`), and pairs the CAP with the wrong `01_Spec.md`
   > back-reference (`QFAI-SPLIT-105`).

   > An **obligation-conserving re-granulation** — the same obligations
   > expressed as finer cells, zero added and zero removed — never triggers
   > SPLIT, whatever it does to `acCount` / `tcCount`. To claim it, state in
   > the `Rationale` which obligations existed before, which exist after, and
   > that the sets are equal.

5. If no active spec owns the capability **but at least one active
   spec's title / scope / capability shares any subject token with the
   REQ** → **UPDATE:APPEND on the closest spec** (subject-overlap
   fallback). A threshold breach on that spec is again a size signal
   recorded in `Rationale`, not an upgrade to SPLIT. Subject tokens follow
   `src/core/sddTriage.ts::tokenize` normalization (STOP_TOKEN drop,
   length ≥ 2, Unicode `\p{L}\p{N}`), so "the new flag"-style subjects
   collapse to zero tokens and skip to step 6 — author REQ subjects with
   meaningful nouns.
6. Only when **no active spec shares any token** with the REQ AND the
   underlying capability is genuinely new → **CREATE**. Add the new
   `CAP-NNNN` row to `_policies/03_Capabilities.md` _first_ and fill its
   `Spec` cell with the next unused `spec-NNNN` (never a retired one),
   then cite the CAP in the Triage row's Rationale column.
   `QFAI-TRIAGE-006` will reject any CREATE row that omits or references
   an unregistered CAP, and a row left with an empty `Spec` cell reports
   `QFAI-SPLIT-106` — at `warning` while that code is inside its
   promotion window, so `validate --fail-on error` still exits 0. Check
   the reported findings, not the exit code.
7. If the REQ removes existing items from a spec → **UPDATE:REMOVE**.
8. If the spec's subject is gone from the product → **DELETE**.
9. If the responsibilities move to a new spec while the old ID must
   remain in history → **SUPERSEDE**.

## Impact cascade

Steps 1–9 above only decide the _primary_ spec for each REQ. After
classifying every REQ (regardless of which step matched), walk the
rest of the active specs and add companion Triage rows for any spec
whose existing US/AC/BR/EX/TC must change as a knock-on effect.
Record the cascade rationale on each companion row and verify the
full set before persisting:

- Existing item still applies but wording must change → **UPDATE:MODIFY**.
- Existing item is now obsolete → **UPDATE:REMOVE** (requires approval).
- Glossary / contract change → record in `_policies/10_delta.md`.

The same `Source` (REQ ID) may legitimately appear on multiple Triage
rows — that is the canonical cascade pattern, not a duplicate.

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
- DELETE removes the spec directory entirely and drops the capability's row
  from `_policies/03_Capabilities.md` (record reason in delta). Surviving
  directories keep their IDs — see `## Gap policy`.
- Deprecated specs require `Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.

## ID stability rules

1. Keep existing IDs stable whenever the subject still exists.
2. The `Spec` column of `_policies/03_Capabilities.md` is the SSOT for the
   capability-to-spec mapping. `validateSpecSplitByCapability` reads that
   column, so the mapping is declared, not inferred from row order.
3. Do not renumber surviving specs only to close gaps.
4. Record any reorder or category-boundary change as an explicit Change Request plus delta entry.

## Gap policy

- Leave gaps after deletions unless an approved migration explicitly renumbers them.

  > A gap is legal only because the mapping is declared. Keep the `Spec` column
  > of `_policies/03_Capabilities.md` in step with every DELETE: drop the deleted
  > capability's row and leave every surviving row pointing at its own unchanged
  > directory. `QFAI-SPLIT-103` then means "a CAP names a spec directory that
  > does not exist", `QFAI-SPLIT-104` means "a spec directory no CAP names",
  > `QFAI-SPLIT-105` compares the declared pair, and `QFAI-SPLIT-106` reports a
  > CAP row with no spec directory of its own. A catalog with no `Spec` column
  > falls back to the positional derivation, where a gap does raise all of them.

- Append new specs at the end of the relevant category block.
- Do not merge or split categories implicitly; update this file first, then apply the approved structural change.
