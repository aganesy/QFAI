# Catalogue Compatibility

Read when choosing a component catalogue or an item from one, as
`.qfai/assistant/rule/ui-procurement.md` § Choosing a catalogue says.

Each row records a catalogue item that broke a constraint a project had fixed,
such as a content security policy, server rendering or behaviour without
script. A project records the same failure in its own procurement record; this
table carries it to the next project that adopts the catalogue, which is a
different repository and cannot read that record.

A row is a hint to verify, not a verdict. Catalogues change: check the row
against the version the project installs, as the research protocol's Version
Rule says, and test the item under the project's own constraints before
installing it. A row whose version is older than the installed one says only
where to look.

## Known incompatibilities

| Catalogue | Item | Constraint it breaks | How it breaks | Version checked | Checked on | Source |
| --------- | ---- | -------------------- | ------------- | --------------- | ---------- | ------ |

The table is empty until a row is confirmed. A failure whose report does not
name the catalogue and its version is not recorded here: such a row could not
be checked against an installed version.

## Adding a row

- Name the catalogue and the item exactly as its registry does, and the version
  the failure was observed on.
- Name the constraint as `01_policy/constraint.md` states it, and how the item
  breaks it, such as inline `style` attributes rendered on the server under a
  nonce-based policy.
- Give the date it was checked and a source a reader can open: the report filed
  with the catalogue's maintainers where one exists.
- Remove the row once the catalogue's maintainers fix the item, naming the
  version that fixed it in the change that removes it.
