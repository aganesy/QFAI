# Test layers to CI lanes

A crosswalk between the test layers in [`test-layers.md`](./test-layers.md) and the CI lanes
the shipped workflows run. It exists so that "which job runs my L3 tests" has one answer a
reader can find, instead of being rediscovered from a workflow file each time.

**The layer policy loader does not read this file.** (Written without a hyphen on purpose: the
loader extracts anything matching `layer-<word>` from the file it parses, and while it does not
parse this one, a catalog-directory file carrying such a token is a hazard waiting for the day
someone widens the loader to scan the directory.) It resolves `catalog/test-layers.md` by
exact path and reads nothing else in this directory, so nothing written here can widen or
narrow the layer vocabulary. That is deliberate: this document is a map, and a map that could
change the territory would be a second source of truth for something that already has one. If
you need to change what layers exist, change `test-layers.md` — this file follows.

## The mapping

| Layer          | What it exercises                             | Shipped CI lane |
| -------------- | --------------------------------------------- | --------------- |
| L1 Unit        | one module, no I/O                            | `unit`          |
| L2 Component   | one component and its immediate collaborators | `component`     |
| L3 Integration | several modules across a real boundary        | `integration`   |
| L4 API         | a running interface, contract-first           | `api`           |
| L5 E2E         | the product as a user reaches it              | `e2e`           |

Two lanes in the shipped workflow are not layers and have no row above:

- **`detection`** decides which of the lanes above need to run for a given change, and
  publishes that decision as job outputs. It is infrastructure, not a test level.
- **`verdict`** aggregates the lanes into the single status a branch-protection rule can name.
  It runs unconditionally so that a run where every lane was skipped is still distinguishable
  from a run where nothing was verified.

## Lane names are a project's choice

The names in the third column are the ones the shipped workflow uses. They are not a contract:
a project that calls its integration lane `service-tests` is not violating anything, and this
table is not a rename list. What matters is that each layer a project uses has some lane that
runs it, and that the lane's name stays put once branch protection refers to it — a check name
is a repository setting, and renaming one silently makes a required check unsatisfiable.

## Per-level routing is not enforced

`test-layers.md` marks per-level annotation routing as a target state and says plainly: not
enforced, do not follow yet. This document does not change that and does not activate it. The
live traceability gate reads one directory for annotations, and it is the gate — not this
table — that decides where an annotation counts.

So: read this file to find out which lane runs a layer. Do not read it as instructions about
where anything belongs in the tree. That question is settled by the gate's own scope, and by
`test-layers.md` for the vocabulary.

## Keeping this file honest

- Every layer code here also appears in `test-layers.md`'s crosswalk. If you add a layer there
  and not here, this table is incomplete; if you add one here and not there, you have invented
  a layer nothing enforces.
- The lane column describes the shipped workflow. If the shipped workflow's job set changes,
  this table is stale, and stale is worse than absent for a document whose only job is to save
  someone a lookup.
