---
name: implement-refactor
owner: qfai-implement
purpose: "Move code into a better structure while every test stays green, adding no example and changing no behaviour."
requires:
  - common-gate-run
---

# implement-refactor

Outside the `rename-concept` route, the request changes how the code is
arranged, not what it does. Nothing in the story tree changes, so the step
adds no example and runs no RED. In that route,
[Renaming a concept](#renaming-a-concept) says what changes.

## Reads

- The request, or the work order.
- `.agents/rules/minimal-implementation.md`.
- The commands of `common-gate-run`.

## Procedure

1. Run the relevant suite before touching anything. It passes. When it does
   not, stop and report the failing tests: a refactor cannot show it kept
   behaviour that was already broken.
2. Move in small steps: rename, extract, inline, move a file. Run the suite
   after each one.
3. Outside the `rename-concept` route, a test may change only where it names
   something that moved, such as an import path. What a test asserts does not
   change. In that route, [Renaming a concept](#renaming-a-concept) says how a
   test changes.
4. Delete code nothing calls and nothing declares.

## Renaming a concept

In the `rename-concept` route, the user asked to rename a concept across the
project, and the specification stage before this step already renamed it in
the glossary, business-flow documents, stories, examples and contract rules,
keeping every ID. This step renames
it to match everywhere else: code identifiers, file names, user-visible text,
configuration and documents, in the small steps of the procedure. A test
changes only where it names the concept: an identifier, an import, a test
title or an expected string that carries the old name takes the new name, and
nothing else in it changes. No test is added or deleted, and no example
annotation changes. A name the specification did not rename keeps its old
name. When the rename would change anything beyond the name, stop as
[When behaviour has to change](#when-behaviour-has-to-change) says.

## When behaviour has to change

When finishing the move would change what the code does, stop before
changing it and report a branch:

- `branch: { outcome: "behaviour-change", route: "add-feature" }` when the
  change adds behaviour and nobody relies on the old;
- `branch: { outcome: "behaviour-change", route: "change-compatibility" }`
  when callers or users rely on what would change.

## What it writes

- The changed, moved or deleted file paths for the code and any test reference
  to a moved name, listed in the stage report.
- A record of each move and each suite run, in the stage report.

## Gate

The step is done when the suite passed before and after every move, no
assertion changed except to carry a renamed concept's new name in the
`rename-concept` route.
