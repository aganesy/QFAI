# QFAI assistant tree

This directory is the canonical source for QFAI's skills, agents, constitution,
manifest and catalog. `npx qfai init` writes it once and never removes it, and the
tool-specific integration directories are built from it.

## Canonical entrypoint

Every tool integration resolves through symlinks that point back here:

- .qfai/assistant/skills/ — skill documents
- .qfai/assistant/agents/ — agent definitions

These documents are the SSOT. Edit them here, not through the symlinks under
`.claude/`, `.agents/`, `.codex/` or `.github/`.

## Integration surface

`npx qfai init` creates the wrappers under those four directories. They are
generated, so re-running `npx qfai init` restores any that a checkout flattened or
a cleanup removed; nothing there needs to be edited by hand.

`npx qfai validate` checks that the wrappers still resolve to the documents above.
It reads this file to tell "init has run here and the surface was deleted" from
"init has never run here" — the two look identical from the integration
directories alone once every wrapper is gone, and only one of them is a
problem. Leave it in place.
