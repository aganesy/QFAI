---
name: verify-change-note
owner: qfai-verify
purpose: "Write the changelog entry, the migration steps and the breaking changes a user needs for this change, or show that none is needed."
requires: []
roles: [orchestrator, doc-steward]
routing-profile: default
---

# verify-change-note

The first step of the verify block. It records what the change means for the
people who use the project, before the gates run over it.

## Reads

- The change: the files the run changed, or the diff the invocation names.
- The project's changelog, where it keeps one, and its convention: the section
  unreleased changes go under and how entries are grouped and marked.
- The upgrade or migration notes the project keeps, where it has them.
- `.agents/rules/version-discipline.md`, before writing anything.

## Writes

- An entry under the changelog's unreleased section, in the project's own
  format, for each change a user sees.
- Migration steps, where a user must act to keep working: what to change, in
  order.
- Each breaking change, marked the way the changelog marks one, naming what
  breaks and the migration step that answers it.
- In the stage report: what was read, and the entries written or the pass.

It never names a version, adds a release heading or renames the unreleased
section. Which version ships is the user's decision.

## Procedure

1. This step runs before `verify-context`.
2. List what a user of the project sees change: a command, an option, an
   output, a file format, an API, a default, a message, documented behaviour.
   A refactor, a test, a CI change or a story-tree edit is on the list only
   when it changes one of those.
3. When the list is empty, or the project keeps no changelog, pass (below).
4. Otherwise write one entry per item, in the changelog's own style.
5. Where a user must act, write the migration steps and mark the breaking
   change.

## Passes when

Read first: the change and the changelog. The step passes when one of these
holds, and the pass names which one and what was read to show it:

- nothing a user sees changed;
- the project keeps no changelog;
- the route changes compatibility and no user has anything to migrate: nothing
  a user must change to keep working, and nothing that breaks.

On a route that changes compatibility, the first two hold the pass only while no
user has anything to migrate. Where one has, the step does not pass: the
migration steps and the breaking change are what that route owes. Where that
project keeps no changelog, write them where its user documentation describes
the changed behaviour.

## Gate

- Every change a user sees has an entry, or the pass names why none is needed.
- Every breaking change names its migration step.
- No version, release heading or tag was written.
- The code review checked the entries against the change.
