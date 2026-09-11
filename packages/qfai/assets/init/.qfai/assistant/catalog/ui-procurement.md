# UI Procurement

Where a screen's components and layouts come from. Authoring one is the last
answer, not the first.

Skip this file for a project with no user interface.

## Taste is adopted, not invented

The theme comes from a published theme. An agent choosing twelve colours
produces a palette nobody designed; adopting one produces a palette someone
did, and the brand accent is what departs from it.

`.qfai/assistant/catalog/tech.md` names the CSS framework, the catalogue and
the adopted theme. `qfai.config.yaml` carries `uiux.registries`, the
name-to-URL map a tool resolves a component name against.

## The ladder

Per screen region, stop at the first rung that holds.

1. **Does this region need to exist at all?** Once a screen contract names it, that question is a Change Request rather than a choice made here.
2. **Does the project's installed design system already have it?**
3. **Does a catalogue have it?** Prefer whole over parts: a page, then a block, then a component.
4. **Can it be composed from primitives already present?**
5. **Only then author it**, and record why.

## What the prototype does not answer

Responsive behaviour, dark mode, focus and hover states, keyboard order, the
detail of an empty or error state. A static capture shows none of them.

Take the adopted system's default. A design system has already answered each
one, and its answers agree with each other in a way per-screen invention does
not.

## Choosing a catalogue

Two things decide it, and neither is taste:

- **Can an agent procure from it unattended?** A registry that resolves a
  component name from a URL template can be read by a tool. A gallery that
  has to be copied by hand cannot.
- **Is the licence open?** A paid catalogue is usable only where the project
  holds the licence, and an agent cannot check that.

A registry entry is a name pointing at a URL template carrying `{name}`,
which is where the component name goes. That shape is not owned by any
language: a project on any framework names whichever catalogue its framework
has, in the same field.

## Recording what was procured

Each screen region names what realises it: a catalogue item, a component the
project already has, or authored code with the reason. An implementer then
installs rather than reconstructs, and a reviewer has something to check
instead of a resemblance to judge.

## Related

- The same principle for logic, and the ladder it uses: `.agents/rules/minimal-implementation.md`
- What may appear on the screen once it is built: `.agents/rules/interface-clarity.md`
- Where a screen's definition is read from: `ui-definition-protocol.md`
