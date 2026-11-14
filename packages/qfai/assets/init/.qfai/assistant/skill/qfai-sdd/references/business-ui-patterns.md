# Business UI Patterns

What a standard business screen contains. A UI contract lists what is specific
to a screen; this reference lists what a screen of its type has anyway, so the
contract is not mistaken for the whole screen. The contract author, the
implementer and the screen reviewer read the same entry.

The parts every business application has are
`.agents/rules/interface-clarity.md#what-a-business-screen-always-has`; this
reference adds what each type of screen has. A part of a type counts as asked
for once the screen's UI contract names it: the contract author writes it there
or records why the screen leaves it out. Where a part comes from is
`.qfai/assistant/rule/ui-procurement.md`: most of these are a catalogue block
or a design-system component, not authored code.

## Contents

- Every screen
- List
- Detail
- Create and edit form
- Settings
- Member management
- Dashboard
- Using this reference

## Every screen

- **Place in the app.** The app shell's navigation shows which section the
  screen is in; a screen below the top level shows the way back.
- **States.** `default`, `empty`, `loading`, `error` and `success` each render
  as the screen's UI contract `states` entry describes, or carry `none` with
  the reason.
- **Feedback.** Every change the user makes is confirmed where they made it,
  and a failure says what was not done and how to retry.

Anti-patterns: a screen reachable only by typing its URL; a spinner that never
gives way to an error; a save that changes nothing visible.

Catalogue: an application shell or sidebar layout, a breadcrumb, a toast or
inline alert.

## List

Standard parts:

- a title with the primary action that creates an item;
- search, and filters for the attributes users narrow by;
- sortable columns, the column the list is sorted by by default marked as such;
- a total count, and pagination or incremental loading once the list can
  outgrow one screen;
- each row opens the item's detail; row actions only for what users do without
  opening it;
- bulk selection and bulk actions, when users act on several items at once;
- an empty state that says what to do next, distinct from "no results" for a
  search or filter, which offers to clear it.

Anti-patterns: a table of every field; filters that reset when the user comes
back from a detail; a destructive row action with no confirmation; an empty
list shown as a blank table.

Catalogue: a data table with toolbar, pagination and empty state.

## Detail

Standard parts:

- the item's name and status at the top, with the actions that apply to it;
- the attributes grouped as users read them, most consulted first;
- related items and the item's history, when users need them to decide;
- edit and delete reached from the item, delete confirmed;
- the way back to the list it was opened from, keeping that list's search,
  filters and page.

Anti-patterns: every attribute at equal weight; actions hidden in a menu when
there are two of them; a deleted item whose page stays open with no notice.

Catalogue: a description list, a page header with actions, an activity feed.

## Create and edit form

Standard parts:

- fields in the order users have the information, grouped under headings when
  there are more than a handful;
- required and optional fields told apart;
- validation at the field, in words that say how to fix the value;
- one primary submit action, a cancel that discards, and protection from
  losing entered data on navigation away;
- submit shows progress and cannot be sent twice;
- on success, the user lands where the result is visible, with confirmation.

Anti-patterns: errors shown only above the form; a placeholder standing in for
a label; edit and create as two different layouts for the same item.

Catalogue: a form layout with field, error and button components.

## Settings

Standard parts:

- sections a user can find by name, with a navigation between them when there
  are several;
- each setting labelled with what it changes, and its current value visible;
- an explicit save per section, or immediate save with confirmation; one of
  the two, used throughout;
- dangerous settings separated and confirmed.

Anti-patterns: a setting that exposes an internal parameter; mixed save
behaviour on one page.

Catalogue: a settings layout with section navigation, toggles and a danger
zone.

## Member management

Standard parts:

- a list of members with name, role and status, searchable;
- invite by address, with the role chosen at invite time, and a pending state
  that can be resent or revoked;
- change a member's role, and remove a member, each confirmed;
- the rule that keeps at least one owner or administrator, stated where it
  blocks an action.

Anti-patterns: removing the last administrator; a role name with no
description of what it allows.

Catalogue: a list with avatars and role selectors, an invite dialog.

## Dashboard

Standard parts:

- the one question the screen answers: what needs this user's attention now;
- a few figures, each with its period and its comparison;
- the items waiting on the user, each a link to where it is handled;
- recent activity, when users come back to see what changed;
- an empty state for a new account that names the first thing to set up.

Anti-patterns: a chart nobody acts on; figures with no period; a dashboard
that repeats the navigation as tiles.

Catalogue: stat cards, a task list, an activity feed.

## Using this reference

- **Writing a UI contract.** For each screen, name its type here, then write
  in the contract the parts this screen needs, and the reason for a part it
  leaves out.
- **Implementing.** Build what the contract names. A part of the screen's type
  that the contract neither names nor excludes with a reason is drift: raise
  it to the contract stage under `.qfai/assistant/rule/drift-protocol.md`
  instead of building it.
- **Reviewing a screen.** A part of its type that is missing with no recorded
  reason is a finding against the screen, named with the part and the type.

A screen that fits no type here still gets the parts under "Every screen".
