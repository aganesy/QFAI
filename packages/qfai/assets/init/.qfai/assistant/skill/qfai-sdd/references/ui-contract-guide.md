# UI Contract Authoring Guide

Write UI contracts under `<paths.contractsDir>/ui/**/*.{yaml,yml}`, each named `ui-NNNN-<slug>.yaml` after its ID. A UI-bearing contract declares exactly one full `# QFAI-CONTRACT-ID: UI-NNNN` and a nonempty `screens[]` list. Add its row to `<paths.contractsDir>/contracts.md` in the same change.
The flows a UI contract serves are the flows whose examples its rules cite; the file name does not select them.

## Contents

- `screens[].primary_tasks` shape
- Recommended ceiling: at most 7
- `elements[].id` naming policy
- `elements[].label` is inspection-target text
- `data-qfai` marker convention
- Prototype metadata
- Purposeful copy: `supplements` and `structure`
- Screen contract rules
- Template
- Typical failures
- Prototyping coverage
- Root DESIGN.md
- Review checklist

## `screens[].primary_tasks` shape

Each entry in `screens[]` must carry a `primary_tasks:` slot. Each
slot entry is a mapping with exactly three required keys, no additional
keys allowed:

```yaml
- id: t1
  label: Mark order shipped
  acceptance: order status flips to shipped
```

- `id` — short stable handle for the task.
- `label` — human-readable task name.
- `acceptance` — testable acceptance condition, written so a reviewer
  can tell whether the task is actually done.

An entry that is a plain string, lacks any of `id` / `label` /
`acceptance`, or carries any extra key (e.g. `priority`, `owner`), is
rejected at validate time. The schema is intentionally closed (no
`additionalProperties: true`) for two reasons: a fixed key set lets
validate name a malformed task deterministically instead of accepting
a mistyped or invented key in silence; and an open shape invites
per-project field sprawl (`priority`, `owner`, …), which would leave
the same contract shape meaning different things in different
projects.

Validate is currently the only consumer of an entry: it
reads `label` for the empty-slot and count-band lanes, and requires
`id` and `acceptance` to be present and non-empty. Nothing generates
tests from them yet — requiring them now is what lets a generator be
added later without re-authoring every contract.

## Recommended ceiling: at most 7

`screens[].primary_tasks` holds **at most 7 entries per screen**. Above
that, validate emits `QFAI-AUD-020` at severity=warning:

| count | validate behavior                          |
| ----- | ------------------------------------------ |
| 0     | `QFAI-AUD-001` error (empty primary_tasks) |
| 1..7  | passes silently                            |
| 8+    | `QFAI-AUD-020` warning (over the ceiling)  |

The required minimum is one. Seven tasks on one screen weakens focus; one
task on one screen is focus. A screen that does one thing is the shape
this ceiling exists to protect, so it passes silently like any other.

The ceiling of 7 reflects multi-screen SaaS and dashboard workloads,
where 5 or 6 primary tasks per surface is common.

## `elements[].id` naming policy

IDs are referenced by flows, stories, evidence and tests, so they have to survive a copy
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
changes, two things move together:

1. `elements[].label` in the contract,
2. the rendered text, or the marker that stands in for it.

Update one and the other disagrees; the finding then stands unresolved with
nothing saying which side is wrong.

An element whose text is deliberately invisible — icon-only, or announced only
to assistive technology — carries a marker instead, and the contract says which
element the marker stands for.

## `data-qfai` marker convention

- The value is `CONTRACT_ID:ELEMENT_ID`, as in
  `data-qfai="UI-0001:search_input"`.
- The suffix is `elements[].id`, never `elements[].label`. An id survives a copy
  change and a label does not.
- Markers are what give an element fidelity coverage when its text is not
  visible.
- Nothing derives them for you. The marker lane collects the `data-qfai` values
  the contract writes and checks only those, so an element with an `id` and no
  declared marker is never inspected. A contract that declares no markers at all
  passes that lane having checked nothing.

A contract still carrying label-based markers works, and there is no deadline on
it; move it to the id form the next time that flow is edited, and check whatever
selector or evidence wiring reads the old value.

## Prototype metadata

A `prototype` mapping at the top level is optional. A contract that omits it is
asked for nothing. A contract that writes it carries three keys.

| Key         | Holds                                               | Read by                       |
| ----------- | --------------------------------------------------- | ----------------------------- |
| `mode`      | `interactive`                                       | `QFAI-CONTRACT-038`           |
| `mockPaths` | the flows the prototype has to be able to walk      | nothing                       |
| `markers`   | the selector convention used for runtime inspection | `QFAI-CONTRACT-037`, reviewer |

`markers` states the selector convention, so a reviewer inspecting the running
prototype knows what to look for and does not have to infer it from the markup.
A `data-qfai` value written in a selector here is a declared marker like any
other, so `QFAI-CONTRACT-037` looks for it under the source directory: a
convention declared here and rendered nowhere is reported.

`mode` names the kind of prototype the review walks. Nothing branches on it, so
a value outside the vocabulary breaks no run — it tells a reader the prototype
is something it is not, which is what `QFAI-CONTRACT-038` reports. The finding
names the release at which it stops being a warning. A contract that writes no
`mode` is asked nothing.

`mockPaths` names the flows a prototype has to be able to walk, each with an id
stable enough to be cited from a review. No lane reads it, and the prototyping
evidence records nothing against it — an entry is a note between the contract's
author and whoever reviews the prototype. Follow the shape
`templates/contracts/ui-contract.sample.yaml` shows.

## Purposeful copy: `supplements` and `structure`

A screen states the words it shows, so that implementation adds none the contract
did not ask for and review can compare the rendered screen with what was agreed.
The words are the screen `title` (its one heading), the labels of `elements` and
`actions`, the group headings, and the supplements below. Two keys carry them,
beside `primary_tasks`, `elements` and `actions`, which stay as they are.

### `supplements` (required)

Every text the screen shows beyond its `title`, group headings and labels: a
sentence under a field, a notice, an empty-state message, a disclosure, the result
of a save or a send, the instruction after a failure, the consequence of an action
that cannot be undone. Each is an entry with exactly these keys, all non-empty:

| Key    | Holds                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| `id`   | stable key, unique in the screen                                                          |
| `near` | the `id` of the element, action or structure group the text sits with                     |
| `when` | the state it shows in: `default`, `empty`, `loading`, `error` or `success`                |
| `text` | the words as displayed                                                                    |
| `why`  | what the user could not know or do without it, and why a label or structure is not enough |

`supplements: []` says the screen shows none. Most screens need few, and a screen
need not have any. Two kinds of text are not supplements: the message of a field
rule is owned by the `validations` of its element, and data the product shows or
the user types is not copy the contract authors. A field message that says more
than its rule does is a supplement with `when: error`.

The list is the whole inventory in both directions. Text the screen shows that is
not listed is excess. A listed text the screen does not show is an unmet need, so
a necessary condition, cost, destination, result, recovery step or consequence
that is written here cannot be dropped by a later tidy-up; removing it is a
change to the contract, which goes back to `/qfai-sdd`.

Write `why` for the point of decision. "Explains the Save button" is a reason to
delete the text. "After the click the user cannot see where the draft went" is a
reason to keep it.

### `structure` (optional)

The groups the screen is read in, in reading order. Each is an entry with exactly
`id`, `tasks`, `members` and, when the group shows a heading, `heading`:

| Key       | Holds                                                              |
| --------- | ------------------------------------------------------------------ |
| `id`      | stable key, unique in the screen                                   |
| `tasks`   | the `primary_tasks[].id` values the group serves, at least one     |
| `members` | the `elements[].id` and `actions[].id` values it holds, in order   |
| `heading` | the displayed heading; leave the key out when the group shows none |

An id belongs to one group, and an element or action may be left out of every
group. Without `structure` the screen shows no heading beyond its `title`, so a
heading that appears on the rendered screen has a group here. A group heading is
not the screen title: a second heading above or beside the real one repeats it.
A group that serves no task does not belong on the screen; name the task it
enables, or leave the heading and the group out.

### A worked example

The sample at `templates/contracts/ui-contract.sample.yaml` shows a complete
screen. Its draft action reads "Save draft", and no paragraph says what Save draft
does. What the label cannot say is declared instead: `Saved to Drafts` after the
click, and `Not saved. Your entries are still here. Try again.` after a failure.
The user learns where the draft went and what a failure means, and nothing is
written twice.

### What a necessary text looks like

Subtraction removes text that adds no meaning. It never removes:

- a condition, cost, storage or transmission destination, or the result of an
  action that is not visible otherwise (a demo-data notice that is true and
  shown where the user decides is one of these);
- error recovery, and the consequence of an action that cannot be undone;
- labels, accessible names, roles and states.

Moving such text into a tooltip or a placeholder does not keep it. A word or
character count never approves or rejects a screen; a count is an observation
a finding may cite.

### What validate checks

`QFAI-CONTRACT-043` reports `supplements` absent, a key that is not a list, an
entry that is not a mapping, a missing, empty or extra key, a `when` outside the
five states, and a repeated `id`; the same for `structure` when it is written.
`QFAI-CONTRACT-044` reports a `members`, `tasks` or `near` that names an id
the screen does not declare, and an element or action in two groups.
`QFAI-CONTRACT-045` warns when a group heading is the screen title, or a
supplement's text is the title, a group heading, the label of what it sits near, or
another supplement's text near the same target in the same state; case, spacing and
closing punctuation do not make a text different. Whether a sentence is needed is
judged against the task by the reviewer; validate compares ids and exact wording
only.

A contract written before these keys was valid without them. Add
`supplements` to each screen: `supplements: []` is the answer for a screen that
shows nothing beyond its title and labels. Keep `structure` out until a group
heading is wanted.

Two contracts that state the same screen `id` each hold their own `supplements`
and `structure`; the project-wide screen list compares `title`, `route` and
`primary_tasks` only.

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
that re-state the ceiling and the structured-shape schema, so an author
who reads only the template still learns the contract.

## Typical failures

**A declared marker is rendered nowhere, and `QFAI-CONTRACT-037` fires.** The
contract names a `data-qfai` marker that no file under `paths.srcDir` contains.
Render the element with that marker, or remove the marker from the contract.

**A label does not match.** Update the contract label, then the rendered text or
marker mapping. Updating one side leaves the two out of step.

**`QFAI-CONTRACT-043` names a screen with no `supplements`.** Add `supplements: []`
if the screen shows no text beyond its title, group headings and labels, or list each
text with its `near`, `when`, `text` and `why`.

**`QFAI-CONTRACT-045` warns that a supplement repeats a label.** Delete the supplement,
or word it so it tells the user something the label does not.

**The discussion pack already has screen contracts, so this looks redundant.**
It is not. A discussion pack is discovery output and is non-normative; the
downstream skills and every validate lane read `<paths.contractsDir>/ui/*.yaml`.
`/qfai-sdd` is what keeps the two in step.

## Prototyping coverage

`/qfai-prototyping` resolves UI-bearing contracts by their declared full `UI-NNNN` IDs across `<paths.contractsDir>/ui/`. `prototyping.primaryUiContract` and a primary contract named in the request accept only a full ID; the request takes precedence. There is no filename alias or numeric shorthand.

The review of a screen is scoped beneath `.qfai/prototype/iter-NN/UI-NNNN/<screen>.review.json`.

A malformed UI contract or an empty screen list is an authoring failure. Fix the declared contract and its index row, then refresh the affected flow's SDD validation and downstream evidence. Discussion UI/UX sidecars are source material; the contract is the execution authority.

## Root DESIGN.md

For a UI-bearing visual flow, the root `DESIGN.md` is authored and validated by `.qfai/assistant/step/common-design-md/STEP.md`. Normalize approved screen decisions with the UI design contract normalization reference. A CLI-only flow without a visual secondary surface does not need one.

## Review checklist

- [ ] Every UI-bearing contract has one full declared ID, at least one screen, and a matching `contracts.md` row.
- [ ] Screen IDs, routes, primary tasks, labels, markers, and actions are stable and testable.
- [ ] Every declared action has an observable effect, including relevant failure states.
- [ ] Every screen declares `supplements` (`[]` when none), each with the reason the text is needed, and its `structure` names every heading beyond the title.
- [ ] No supplement restates a label, heading or action the screen already shows, and none is development commentary.
- [ ] Prototyping coverage uses full contract IDs and the current cycle-0 fields.
