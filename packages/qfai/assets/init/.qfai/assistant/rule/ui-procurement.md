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

Derive screen regions from the UI contract's responsibility, inputs, outcomes and
business rules. Use the screen pattern to choose regions in the prototype or
implementation. The application and marketing patterns are described in
`.agents/rules/interface-clarity.md#what-a-business-screen-always-has` and
`.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has`.
If an expected region is omitted, explain the choice in the prototype handoff
or the implementation review. A change to required behaviour belongs to the
contract owner.

Per screen region, stop at the first rung that holds.

1. **Does the project already have a component for it?** Reuse it. The
   component catalogue lists what exists
   (`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#component-catalogue`). When
   two or more screens need the same region, extract a shared component at
   the region's first use. When a region later appears on a second screen
   and no shared component serves it, extract one then. Either
   way, wrap whatever rung 2, 3 or 4 supplied and use it on every screen,
   rather than authoring the region again.
2. **Does a native platform element do it?** Examples on the web are
   `details` and `summary`, `dialog`, and form validation attributes. A native
   element brings no script, styling or policy cost of its own.
3. **Does the project's installed design system already have it?**
4. **Does a catalogue have it?** Prefer whole over parts: a page, then a block, then a component.
5. **Can it be composed from primitives already present?**
6. **Only then author it**, and record why.

## Platform features and the browser-support target

The browser-support target is the Baseline level a project's UI code may rely
on without a fallback. A `## Technical Constraints` row of
`01_policy/constraint.md` states it, such as `Browser support target: Baseline
2024` or `Baseline Widely available`. A project that states none is held to
Baseline Widely available: features every core browser has supported for at
least 30 months. The row is prose that agents and reviewers read; no check
parses it.

Read the target before choosing a platform feature: a native element on rung 2,
a CSS property or selector, or a script API.

- A feature within the target is used as it is.
- A feature newer than the target is used only with a fallback that keeps the
  screen working where the feature is missing (progressive enhancement), such
  as an `@supports` block or a polyfill loaded only where the feature is
  absent. `.qfai/assistant/rule/references/locale/ja.md` does this for
  `word-break: auto-phrase`.
- A feature newer than the target with no such fallback is not used.

Consult the project catalogue and check current support in MDN, web.dev or the web-features data. QFAI ships no list of its own. Only a feature beyond the browser-support target needs a selection record. Record why it is needed and the fallback that preserves the user task. Check that fallback in the affected environment.

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
  check, and the procurement record says so. The browser-support target is
  checked even then: a component that relies without a fallback on a feature
  newer than the target breaks it, as "Platform features and the
  browser-support target" says.

The same check applies to each item procured from the catalogue. An item that
breaks a constraint is not installed, and the ladder moves to its next rung.
The region's procurement record names the item and the constraint it breaks, so
the next procurement for that region does not try it again. Before installing an
item, read `.qfai/assistant/rule/references/catalogue-compatibility.md`: a row
naming the item is checked against the installed version before the item is
tried. A new incompatibility goes in the region's procurement record with a link to
the report filed with the catalogue's maintainers, and is reported to QFAI so a
later release adds it to that table. The shipped table is not edited in the
project: `npx qfai init` replaces it.

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
covers that behaviour. For a browser-support exception, keep the reason and fallback with the selected implementation or its prototype handoff. Ordinary catalogue use needs no platform selection record.

## Related

- The same principle for logic, and the ladder it uses: `.agents/rules/minimal-implementation.md`
- What may appear on the screen once it is built: `.agents/rules/interface-clarity.md`
- Where a screen's definition is read from: `ui-definition-protocol.md`
