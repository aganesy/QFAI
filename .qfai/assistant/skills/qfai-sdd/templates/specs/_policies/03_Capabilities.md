# 03 Capabilities

## Capability order rule

- Capabilities are listed in execution order.
- Spec directories are generated from this order (`spec-0001`, `spec-0002`, ...).
- Row position is the mapping: inserting or reordering a row re-points every spec
  directory below it, so a reorder renames each of those directories and updates the
  matching `Spec:` line in its `01_Spec.md` and the `Spec` column below.
- Insert or reorder only while no spec directory exists at or below the row you are
  moving — `ls` the specs directory, that is the whole test. Once one exists, append
  the new capability as the last row instead: renaming an existing directory is a
  RENUMBER, which `11_Slice-Policy.md` routes through SUPERSEDE (approval, delta,
  `Superseded-by:`, old ID kept) rather than a rename, and the mapping counts the
  retained directory too.
- A renumber is not local to the spec: grep the whole pack for the old spec ID and
  re-point every inbound reference to it (`Superseded-by:` in another `01_Spec.md`,
  links, plan and delta entries). Left alone, the old ID now names the spec that took
  over that position, so it still exists and validates while pointing at the wrong
  capability.
- `Parent: CAP-*` travels with its capability, so it stays as written — rewriting it
  during a reorder re-attaches the spec to a different capability.
- An approved DELETE (`11_Slice-Policy.md`) removes the spec directory and leaves its
  number unused. Keep the row and mark its CAP cell `CAP-0002 (deleted)`: the tombstone
  goes on holding that position, so no capability below it is renumbered, and its `Spec`
  cell still restates the position so the gap is visible and diffable. Dropping the row
  instead pulls every later capability up one slot — that is a renumber, not a delete.
- A tombstone maps to no spec: its directory must be gone (one left behind is reported
  as unmapped), it is not counted against the spec total, and its CAP ID is retired for
  good — never reuse it for a new capability.
- Keep IDs stable once published.

## CAP Catalog

`Spec` restates the row position (`spec-<row index, 4 digits>`) so the mapping is
visible and diffable. Validation compares it against the position and reports a
mismatch on the row (`QFAI-SPLIT-106`); position stays the truth.

| CAP ID   | Statement (what)         | Success metrics (optional) | Notes (optional) | Spec      |
| -------- | ------------------------ | -------------------------- | ---------------- | --------- |
| CAP-0001 | <what capability solves> | <metric>                   | <note>           | spec-0001 |
| CAP-0002 | <what capability solves> | <metric>                   | <note>           | spec-0002 |

## Authoring rules

- This file is the policy-layer SSOT for capability mapping across all specs.
- Do not copy spec-level details (US/AC/BR/EX/TC) into this file.
