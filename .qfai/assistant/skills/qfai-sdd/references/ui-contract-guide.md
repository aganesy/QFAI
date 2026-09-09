# UI Contract Authoring Guide

This guide explains how to author a UI contract YAML under
`.qfai/contracts/ui/`: what each part of the document declares, where
the files go so one spec's contracts resolve, and what the validate
lanes and the downstream `/qfai-prototyping` gates read.

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

## Per-spec contract resolution

`npx qfai prototyping certify` resolves the UI contracts belonging to one spec
under `.qfai/contracts/ui/`, in two tiers.

1. **Single-file tier** — first hit wins outright. The first candidate that
   exists on disk is the answer; the remaining single-file candidates and the
   whole multi-file tier are ignored for that spec.
2. **Multi-file tier** — read only when every single-file candidate is absent.
   Candidates 4 and 5 are aggregated together, and a `screenId` declared twice
   keeps its first definition.

| Tier        | Order | Candidate                              | Layout                                  |
| ----------- | ----- | -------------------------------------- | --------------------------------------- |
| Single-file | 1     | `<spec-id>.yaml`                       | canonical per-spec single file          |
| Single-file | 2     | `<bare-numeric>.yaml`                  | bare-numeric alias                      |
| Single-file | 3     | `ui-<bare-numeric>.yaml`               | `ui-` prefixed                          |
| Multi-file  | 4     | `ui-<bare-numeric>-<slug>.yaml` (glob) | split-file convention                   |
| Multi-file  | 5     | `<spec-id>/<subpath>.yaml`             | per-spec subdirectory, read recursively |

Author `<spec-id>.yaml` unless a spec has more screens than one file should
hold. For a spec that does, pick **one** multi-file shape and stay in it.

Two layouts are a mistake the resolver cannot report:

- **Two single-file candidates for one spec** — say `spec-0007.yaml` and
  `ui-0007.yaml`. Candidate 1 wins deterministically, and whoever reads the
  other file believes they are reading the contract in force.
- **A single-file candidate plus a multi-file one** — say `spec-0007.yaml`
  alongside `ui-0007-home.yaml`. The multi-file tier is skipped entirely, so
  screens that live only in the split files fail the per-screen review gate
  without ever being read.

When the per-spec match finds files but extracts no valid screen — a YAML parse
error, or `screens:` mistyped — `certify` names the offending path on stderr and
falls back to the project-wide screen list, so the authoring mistake is visible
instead of silently re-enabling the cross-product check.

## `elements[].id` naming policy

IDs are referenced by specs, evidence and tests, so they have to survive a copy
change.

- Use `<screen>_<semantic>_<type>`, lowercase snake_case:
  `order_create_submit_button`.
- Never positional: `button1`, `row2`.
- **Text changed** — keep the `id`, update the `label`.
- **Role changed** — new `id`, and update every spec and evidence reference.
- **Element removed** — delete it from the contract and update the affected
  fidelity evidence in the same change.

## `elements[].label` is inspection-target text

`label` is what a review looks for at runtime, not a caption. When UI text
changes, three things move together:

1. `elements[].label` in the contract,
2. the rendered text, or the marker that stands in for it,
3. the fidelity snapshot in `.qfai/evidence/prototyping.json`.

Update one and the others disagree; the finding then stands unresolved with
nothing saying which side is wrong.

An element whose text is deliberately invisible — icon-only, or announced only
to assistive technology — carries a marker instead, and the contract says which
element the marker stands for.

## `data-qfai` marker convention

- The value is `CONTRACT_ID:ELEMENT_ID`, as in
  `data-qfai="CON-UI-0001:search_input"`.
- The suffix is `elements[].id`, never `elements[].label`. An id survives a copy
  change and a label does not.
- Markers are what give an element fidelity coverage when its text is not
  visible.
- Expected markers are generated from `elements[].id`, so a contract that names
  its elements well needs no separate marker list.

A contract still carrying label-based markers works, and there is no deadline on
it; move it to the id form the next time that flow is edited, and check whatever
selector or evidence wiring reads the old value.

## Prototype metadata

A `prototype` mapping at the top level carries three keys.

| Key         | Holds                                               |
| ----------- | --------------------------------------------------- |
| `mode`      | `interactive`                                       |
| `mockPaths` | the flows the prototype has to be able to walk      |
| `markers`   | the selector convention used for runtime inspection |

No validate lane reads `prototype` today. It is authoring metadata: the shape
`templates/contracts/ui-contract.sample.yaml` shows is the one to follow, and
what the entries mean is settled between the contract's author and whoever
reviews the prototype.

`markers` states the selector convention, so a reviewer inspecting the running
prototype knows what to look for and does not have to infer it from the markup.
`mockPaths` names the flows a prototype has to be able to walk, each with an id
stable enough to be cited from a review.

## Screen contract rules

`screens[].elements[]` are the display fields:

| Field         | Holds                                   |
| ------------- | --------------------------------------- |
| `id`          | stable key, per the naming policy above |
| `label`       | inspection-target text                  |
| `type`        | `input`, `table`, `button`, …           |
| `required`    | boolean                                 |
| `validations` | simple rule strings                     |

`screens[].actions[]` are the minimum interactions:

| Field    | Holds                             |
| -------- | --------------------------------- |
| `id`     | stable key                        |
| `label`  | what the interaction is called    |
| `kind`   | `submit`, `navigate`, `toggle`, … |
| `effect` | the UI state change it produces   |

Every interactive primary route declares at least one action that changes UI
state, and `effect` is concrete enough to test: `navigates to /orders`, `shows a
success toast`. Tie at least one action per screen to an observed finding, so
action coverage can be traced rather than asserted.

## Template

The shipped UI contract template at
`templates/contracts/ui-contract.sample.yaml` includes inline comments
that re-state the 3..7 band and the structured-shape schema, so an
author who reads only the template still learns the contract.

## Typical failures

**The page renders a static string, and `QFAI-PROT-238` fires.** The contract
declares elements and actions that the runtime evidence does not satisfy. Either
render the declared elements, or add `data-qfai` markers and wire the minimum
actions for that route.

**A label does not match.** Update the contract label, then the rendered text or
marker mapping, then the fidelity evidence. Updating one side leaves
`QFAI-PROT-238` standing.

**The discussion pack already has screen contracts, so this looks redundant.**
It is not. A discussion pack is discovery output and is non-normative; the
downstream skills and every validate lane read `.qfai/contracts/ui/*.yaml`.
`/qfai-sdd` is what keeps the two in step.

## Checklist

- [ ] Screen ids are stable, and the specs and scenarios reference them.
- [ ] `elements[].id` follows the naming policy, and changes follow the change
      policy.
- [ ] `elements[].label` matches the runtime-visible text, or a documented
      marker stands in for it.
- [ ] `elements` and `actions` carry the fields tabulated above.
- [ ] `prototype.mode` is `interactive`, and `mockPaths` ids are stable enough
      to cite.
- [ ] Every screen a downstream skill needs exists under `.qfai/contracts/ui/`.
- [ ] One resolution tier per spec.
