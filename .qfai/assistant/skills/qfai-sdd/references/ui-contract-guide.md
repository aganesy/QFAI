# UI Contract Authoring Guide

This guide explains how to author a UI contract YAML under
`.qfai/contracts/ui/` so it satisfies the QFAI validate lanes
(`QFAI-AUD-001` empty-slot, `QFAI-AUD-020` recommended count band) and
the downstream `/qfai-prototyping` preflight gates.

## `screens[].primary_tasks` shape

Each entry in `screens[]` MUST carry a `primary_tasks:` slot. Each
slot entry may be authored in one of two shapes:

1. **String-only (legacy)** — a plain bullet such as
   `- Review pending orders`. Accepted during the deprecation window
   for backwards compatibility with contracts authored before the
   structured shape was introduced.

2. **Structured (closed schema)** — a mapping with exactly three
   required keys, no additional keys allowed:

   ```yaml
   - id: t1
     label: Mark order shipped
     acceptance: order status flips to shipped
   ```

   - `id` — short stable handle for the task.
   - `label` — human-readable task name.
   - `acceptance` — testable acceptance condition, written so a
     reviewer can tell whether the task is actually done.

A structured entry missing any of `id` / `label` / `acceptance`, or
carrying any extra key (e.g. `priority`, `owner`), is rejected at
validate time. The schema is intentionally closed (no
`additionalProperties: true`) for two reasons: a fixed key set lets
validate name a malformed task deterministically instead of accepting
a mistyped or invented key in silence; and an open shape invites
per-project field sprawl (`priority`, `owner`, …), which would leave
the same contract shape meaning different things in different
projects.

Validate is currently the only consumer of a structured entry: it
reads `label` for the empty-slot and count-band lanes, and requires
`id` and `acceptance` to be present and non-empty. Nothing generates
tests from them yet — requiring them now is what lets a generator be
added later without re-authoring every contract.

## Recommended count band: 3..7

The recommended count band for `screens[].primary_tasks` is **3..7
entries per screen** (inclusive bounds). Outside the band, validate
emits `QFAI-AUD-020` at severity=warning, naming the band 3..7
explicitly:

| count | validate behavior                          |
| ----- | ------------------------------------------ |
| 0     | `QFAI-AUD-001` error (empty primary_tasks) |
| 1..2  | `QFAI-AUD-020` warning (below 3..7 band)   |
| 3..7  | passes silently                            |
| 8+    | `QFAI-AUD-020` warning (above 3..7 band)   |

The 3..7 band reflects multi-screen SaaS / dashboard workloads where
5–6 primary tasks per surface is common; tighter ceilings (e.g. 1..3
or "single primary CTA") over-flag legitimate productivity surfaces.

## Template

The shipped UI contract template at
`templates/contracts/ui-contract.sample.yaml` includes inline comments
that re-state the 3..7 band and the structured-shape schema, so an
author who reads only the template still learns the contract.

## Where a per-spec contract is looked for

`npx qfai prototyping certify` resolves per-spec UI contracts under
`.qfai/contracts/ui/` in two tiers.

1. **Single-file tier** — first hit wins across candidates 1..3. The first
   candidate that exists wins alone; the remaining single-file candidates and
   the whole multi-file tier are ignored for that spec.
2. **Multi-file tier** — used only when every single-file candidate is absent.
   Candidates 4 and 5 are aggregated, with first-write-wins deduplication for
   duplicate `screenId`s.

| Tier        | Within tier | Candidate                                      | Layout                          |
| ----------- | ----------- | ---------------------------------------------- | ------------------------------- |
| Single-file | 1           | `<spec-id>.yaml` (e.g. `spec-0007.yaml`)       | Canonical per-spec single file  |
| Single-file | 2           | `<bare-numeric>.yaml` (e.g. `0007.yaml`)       | Bare-numeric alias              |
| Single-file | 3           | `ui-<bare-numeric>.yaml` (e.g. `ui-0007.yaml`) | `ui-` prefixed canonical        |
| Multi-file  | 4 (with 5)  | `ui-<bare-numeric>-<slug>.yaml` (glob)         | Split-file convention           |
| Multi-file  | 5 (with 4)  | `<spec-id>/<subpath>.yaml`                     | Recursive per-spec subdirectory |

Author `<spec-id>.yaml` for a single-file spec: it is the canonical layout and
the most-tested path. For a multi-file spec, pick either the split convention
or a per-spec subdirectory.

**Pick one tier per spec.** Authoring a single-file candidate alongside a
multi-file one — `spec-0007.yaml` with `ui-0007-home.yaml`, or with
`spec-0007/home.yaml` — means the multi-file tier is ignored entirely, and the
screens that live only there fail the per-screen review gate without saying
why. Two canonical single-file candidates for one spec (1 and 3) are the same
trap in miniature: the resolver takes 1, and whoever is reading 3 cannot tell
which file is authoritative.

When the per-spec match finds files but extracts no valid screens — a YAML
parse error, a `screens:` typo — certify warns on stderr with the offending
path and falls back to the project-wide screen list, so the authoring fault is
visible rather than silently re-enabling the cross-product check.

## `elements[].id` is a stable handle

An id outlives the words on the screen, so it is not written from them.

- Recommended shape: `<screen>_<semantic>_<type>`, as in
  `order_create_submit_button`.
- Lowercase snake_case, so the same id survives every tool that reads it.
- Never positional: `button1`, `row2` stop being true the moment the layout
  changes.

Change policy:

| what changed        | what to do                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| the wording only    | keep the `id`, update the `label`                                                                      |
| the element's role  | new `id`, and update the specs and evidence that cite it                                               |
| the element is gone | delete it from the contract, and update the affected `uiFidelity` and test evidence in the same change |

## `elements[].label` is inspection-target text

An L2 review reads `label` as the text it expects to find at runtime, so a
wording change is a three-part edit made together:

1. `contracts/ui/*.yaml` — `elements[].label`
2. the UI itself — the visible label, or its marker mapping
3. `.qfai/evidence/prototyping.json` — the `uiFidelity` snapshot

Updating one leaves `QFAI-PROT-238` unresolved with nothing wrong in the
change that caused it.

Where the text is deliberately not visible — an icon-only control, an
aria-only label — add a `data-qfai` marker instead and document the mapping in
the contract.

## `data-qfai` markers

The canonical value is `CONTRACT_ID:ELEMENT_ID`, as in
`data-qfai="CON-UI-0001:search_input"`.

The suffix is `elements[].id`, never `elements[].label`: the marker exists to
survive the wording, and autogen derives the expected markers from the ids.
This is what gives fidelity coverage to an element whose text the page never
shows.

Older contracts and downstream tooling may still carry label-based markers.
When touching one of those flows, move it to the id-based form and check
whatever selector or evidence wiring still reads the old one.

## `prototype` metadata

`prototype` sits at the top level and carries three keys: `mode`
(`interactive`), `mockPaths` and `markers`.

`mockPaths[]` is a **negative-only ledger**. An entry records a failure or gap
a browser QA finding identified — never an expected success flow, which
belongs in `screens[].actions[]`.

```yaml
prototype:
  mode: interactive
  mockPaths:
    - id: mp_create_to_list_mobile_reflow
      finding_ref: "BQ-2026-04-18-014"
      failure_condition: "Mobile viewport: created row not reflected in list within 2s (stale cache)."
      status: open
```

## What a screen declares

`screens[].elements[]` are the display SSOT, and each carries `id`, `label`,
`type` (`input`, `table`, `button`, …), `required` and `validations`.

`screens[].actions[]` are the minimum interactions, each with `id`, `label`,
`kind` (`submit`, `navigate`, `toggle`, …) and `effect` — the UI state change
it produces.

For an L2 review, every interactive primary route needs at least one action
that changes UI state, and at least one action tied to an observed browser QA
finding so action coverage can be traced. Keep `effect` concrete enough to
check: `navigates to /orders`, `shows success toast`.

## When a review fails

**The page renders a static string.** `QFAI-PROT-238`
(`prototypingEvidence.uiFidelityContractCoverage`) fails because the contract
declares elements and actions the runtime evidence does not place or wire. Add
the elements, or add `data-qfai` markers and wire the route's minimum actions.

**A label does not match.** Make the three-part edit above, in that order. One
side alone leaves the finding open.

**The discussion pack already has `40_screen_contracts.md`.** That is upstream
discovery output. Execution and validation read `contracts/ui/*.yaml`, and
`/qfai-sdd` is what keeps the two in step.

## Before the contract is done

- [ ] Screen ids are stable, and the specs and scenarios cite them.
- [ ] `elements[].id` follows the naming and change policy above.
- [ ] `elements[].label` matches runtime-visible text, or a documented marker
      mapping.
- [ ] Elements and actions carry the fields listed above.
- [ ] `prototype.mode` is `interactive`, and `mockPaths` holds only findings.
- [ ] Every screen a downstream skill needs exists under `contracts/ui/`.
