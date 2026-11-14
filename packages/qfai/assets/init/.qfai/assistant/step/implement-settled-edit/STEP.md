---
name: implement-settled-edit
owner: qfai-implement
purpose: "Make the literal edit a settled instruction names, with the exact values it gives and in the files and fields it names, adding no example and no test, and report each file and field changed."
requires: []
---

# implement-settled-edit

Some settled work states no behaviour: a delegated release's version, set in
the files and fields the project's release documents name, is one. No example
states it and no test proves it, so the steps that work from a flow's examples
cannot make it. This step makes that edit and nothing else, and the route's
code review and gates read it like any other change.

## Passes when

Read first: the work order's request. The step passes when the request names
no settled literal edit: it quotes no instruction that gives exact values for
named files and fields. The pass names the request it read.

## Reads

- The work order's request: the instruction quoted word for word with its
  source, each exact value it names, and the files and fields the edit goes
  in. For a delegated release, these are the quoted release instruction, the
  version the user named, and the files and fields the project's release
  documents name for the version edit.
- The documents the request cites for those files and fields, such as the
  release documents.
- Each named file, as it stands.

## Procedure

1. Confirm that the request gives every value the edit needs, word for word.
   A value the request leaves to judgement, such as "the next version", or a
   value the quoted instruction does not name, stops the step: change nothing,
   and report the value that is missing.
2. Find each file and field as the documents name them. A file that does not
   exist, or a field the file does not hold as the documents name it, stops
   the step: change nothing, and report each file and field that is missing.
3. Set each named field to its named value. Change nothing else: no other
   field, line, formatting or file, and no value a tool would derive from the
   one named.
4. Add no example and no test, and edit no story or contract. The instruction
   already settled the value; the route's code review and its gates check the
   edit.

## What it writes

- Each named field, set to its named value.
- In the stage report, each file and field changed, with its old and its new
  value, and the quoted instruction and its source.

## Gate

The step is done when each named field holds its named value, nothing else in
any file changed, and the stage report names each file and field it changed.
