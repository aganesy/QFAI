# UI Procurement

Where a screen's components and layouts come from. Authoring one is the last
answer, not the first.

Skip this file for a project with no user interface.

## Taste is adopted, not invented

The theme comes from a published theme. An agent choosing twelve colours
produces a palette nobody designed; adopting one produces a palette someone
did, and the brand accent is what departs from it.

The `CSS framework` and `Component catalogue` rows of
`<paths.contractsDir>/tech.md#stack` name the CSS framework and the primary
catalogue. Root `DESIGN.md` owns the adopted theme. `qfai.config.yaml` carries
`uiux.registries`, the name-to-URL map a tool resolves a component name against.
The constraints a component must meet are rows of `01_policy/constraint.md`.

## The ladder

The ladder decides where a region comes from, not whether it exists. A region
the screen contract names is in scope, and so is a region its pattern implies,
as `.agents/rules/interface-clarity.md#what-a-business-screen-always-has`
lists them for an application screen and
`.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has` for a
marketing screen. Leaving an implied region out needs the reason in the screen's UI
contract. Dropping a region the contract names is a specification change for
its owner rather than a choice made here.

Per screen region, stop at the first rung that holds.

1. **Does the project already have a component for it?** Reuse it. The
   component catalogue lists what exists
   (`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#component-catalogue`). When the
   same region appears on a second screen and no shared component realises it,
   extract one, wrapping whatever rung 2, 3 or 4 supplied, and use it on both,
   rather than authoring the region again.
2. **Does a native platform element do it?** Examples on the web are
   `details` and `summary`, `dialog`, and form validation attributes. A native
   element brings no script, styling or policy cost of its own.
3. **Does the project's installed design system already have it?**
4. **Does a catalogue have it?** Prefer whole over parts: a page, then a block, then a component.
5. **Can it be composed from primitives already present?**
6. **Only then author it**, and record why.

## Widgets that are not hand-authored

An interactive widget is correct only with its focus handling, keyboard
behaviour, `aria-*` state, dismissal and scroll locking, and a hand-written one
usually misses some of them. When a catalogue or a headless library is
available, these widgets come from it and skip rung 5, composing from
primitives. Each is named with its WAI-ARIA Authoring Practices (APG) pattern.

| Widget                    | APG pattern                       |
| ------------------------- | --------------------------------- |
| Dialog                    | Dialog (Modal)                    |
| Alert dialog              | Alert and Message Dialogs         |
| Drawer or sheet           | Dialog (Modal)                    |
| Menu and menu button      | Menu and Menubar, Menu Button     |
| Tabs                      | Tabs                              |
| Combobox and autocomplete | Combobox                          |
| Listbox and select        | Listbox, Select-Only Combobox     |
| Tooltip                   | Tooltip                           |
| Popover                   | Disclosure (Show/Hide)            |
| Toast                     | Alert                             |
| Date picker               | Date Picker Dialog                |
| Disclosure and accordion  | Disclosure (Show/Hide), Accordion |

A native element that does the whole job, such as `dialog` or `details`, is
still rung 2. When none of the rungs before 6 serves and such a widget must be
authored, its component's `@a11y` tag in the component catalogue records the
APG pattern and the keyboard behaviour it implements, and a test covers that
behaviour.

A project has a catalogue installed when `uiux.registries` in
`qfai.config.yaml` declares an entry, or when a component's `@source` names a
catalogue item rather than `authored`. There `npx qfai validate` warns about a
hand-written `role="dialog"`, `role="menu"`, `role="tablist"` or `aria-modal`,
except in the file of a component procured from a catalogue or of an authored
widget whose `@pattern` and `@a11y` are recorded. It also warns about a
catalogued component whose `@pattern` is one of these widgets with no
`@a11y`. The pattern names it reads are listed in
`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#component-catalogue`.

## What the prototype does not answer

Responsive behaviour, dark mode, focus and hover states, keyboard order, the
detail of an empty or error state. A static capture shows none of them.

Take the adopted system's default. A design system has already answered each
one, and its answers agree with each other in a way per-screen invention does
not.

## Every state exists

The adopted system answers how a state looks, not whether the screen has it.
Each region that loads data or accepts input lists its states (default,
empty, loading, error and success) and what realises each one, recorded with
the region as "Recording what was procured" describes. A state the region cannot reach is
listed as not applicable, with the reason. One fallback shared by the whole
app does not realise a region's loading or error state.

## Choosing a catalogue

Three things decide it, and none is taste:

- **Can an agent procure from it unattended?** A registry that resolves a
  component name from a URL template can be read by a tool. A gallery that
  has to be copied by hand cannot.
- **Is the licence open?** A paid catalogue is usable only where the project
  holds the licence, and an agent cannot check that.
- **Does it meet the constraints the project has fixed?** The
  `## Technical Constraints` and `## Quality targets` rows of
  `01_policy/constraint.md` name them, such as a content security policy,
  server rendering, behaviour without script and an accessibility target. A
  catalogue whose components break one is not adopted for the regions they
  would serve. Where those sections name none of these, there is nothing to
  check, and the procurement record says so.

The same check applies to each item procured from the catalogue. An item that
breaks a constraint is not installed, and the ladder moves to its next rung.
The region's procurement record names the item and the constraint it breaks, so
the next procurement for that region does not try it again.

A registry entry is a name pointing at a URL template carrying `{name}`,
which is where the component name goes. That shape is not owned by any
language: a project on any framework names whichever catalogue its framework
has, in the same field.

## Recording what was procured

Each screen region names what realises it: a native element, a catalogue item,
a component the project already has, or authored code with the reason. A
catalogue item also names the constraints it was checked against. An authored
widget from "Widgets that are not hand-authored" also names its APG pattern and
the keyboard behaviour it implements, in its `@a11y` tag, and the test that
covers that behaviour. An
implementer then installs rather than reconstructs, and a reviewer has
something to check instead of a resemblance to judge.

## Related

- The same principle for logic, and the ladder it uses: `.agents/rules/minimal-implementation.md`
- What may appear on the screen once it is built: `.agents/rules/interface-clarity.md`
- Where a screen's definition is read from: `ui-definition-protocol.md`
