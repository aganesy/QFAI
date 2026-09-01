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

## Vendored rules and the overlay

`constitution/` and `catalog/` are QFAI's own normative rules, copied here by
`npx qfai init`. They are the toolkit's, not the project's: `npx qfai init`
records each file's sha256 in `.assets.lock.json`, `npx qfai validate` reports a
copy that has gone stale (`QFAI-ASSETS-003`), been edited locally
(`QFAI-ASSETS-004`) or been deleted (`QFAI-ASSETS-006`), and
`npx qfai init --force` refreshes — and retires — only the files that still
match the record. If the comparison itself is impossible — an incomplete
install, or one of these directories left as a symlink — `validate` says so
(`QFAI-ASSETS-007`) rather than reporting a clean tree.

To add a project rule, create a `*.local.md` overlay beside the file instead of
editing it — for example `catalog/test-layers.local.md`. Overlays are never
written by `init`, never reported by `validate`, and never overwritten. See
`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`.

`manifest/` is different: it is project configuration, edited through
`/qfai-configure`, and is not covered by the record.

## Validation

`npx qfai validate` checks that the wrappers still resolve to the documents above.
It reads this file to tell "init has run here and the surface was deleted" from
"init has never run here" — the two look identical from the integration
directories alone once every wrapper is gone, and only one of them is a
problem. Leave it in place.
