# US-0002-0022: The assistant-tree mirror follows the renamed tree

## User Story

As a QFAI maintainer, I want `pnpm sync:ssot` to link the repository-root assistant tree to the packaged assets under their singular names (`rule/`, `skill/`, `agent/` and `prompt/`) and `link-assistant-tree --check` to report any retired name left behind, so that the tree this repository's agents read stays the tree `qfai init` ships and `pnpm ci:gate:ssot` stays green.

## Non-goals

- Keeping the plural directories as a second route to the same files.
- A window in which both names are accepted.
- Changing what the sync writes for any directory the rename leaves alone.
- Renaming host-defined integration directories.
