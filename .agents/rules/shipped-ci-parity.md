# Shipped CI Parity

A change to this repository's CI says what the shipped workflow templates do
with it.

`packages/qfai/assets/init/root/.github/workflows/` is the CI `qfai init`
writes into a consuming project. This repository's own CI is not. The two drift
apart quietly, because an improvement to one is complete on its own terms: the
lane is faster, the gate is tighter, nothing is red, and nobody is asked
whether the same improvement belongs in the set adopters receive.

Most changes do not belong there. This rule does not say they do. It says the
answer is written down.

## Scope

| Target                                        | Applies                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `.github/workflows/**`                        | Every change that moves a line carrying meaning      |
| `.github/actions/**`                          | The same                                             |
| `scripts/run-lint-checks.sh`                  | The same — the lane grouping lives there             |
| The `ci:*` entries of the root `package.json` | When an entry's command list changes                 |
| `packages/qfai/assets/init/root/.github/**`   | Not watched — changing it is the answer, not the ask |

Three kinds of edit are outside it, because none of them is a decision anyone
makes: a blank line, a comment, and a derived value. Derived means a
`<sha256>  <path>` pin a resealing tool rewrites, and a `uses:` reference whose
target the file already carried, which is a version bump the dependency bot
opens by itself.

## The marker

A disposition and a reason, on a line the change adds, in the file it is about.

```yaml
# SHIPPED-CI: not-applicable
# Because: this step verifies digests of files only this repository has.
```

| Disposition      | Means                                                           |
| ---------------- | --------------------------------------------------------------- |
| `transferred`    | The shipped set took the same change                            |
| `not-applicable` | The shipped set cannot take it, and the reason says why         |
| `deferred`       | It should transfer, has not yet, and the reason says what waits |

**The reason is mandatory, the way a lifting condition is.** A disposition on
its own cannot be told from a shrug, and an exemption nobody justified becomes
the default with nobody deciding it should. A placeholder is refused for the
same reason.

Changing the shipped templates in the same change answers the question outright
and needs no marker.

## Two files that cannot carry one

The root manifest's `ci:*` entries are single JSON strings, and a file the
change deletes has no line left to write on. Both record their disposition in
`.github/shipped-ci-dispositions.md` instead, in an entry naming the file:
`SHIPPED-CI: not-applicable for package.json`, and `Because:` under it.

That ledger is the second place, and the only one. A marker anywhere else does
not count, so an exemption cannot be parked where no reviewer of the change
would look.

## Held by

`scripts/check-shipped-ci-parity.mjs`, in the `ci:lint:scans` lane, on every
pull request. It prints every disposition it finds on a green run: an exemption
nobody sees is one nobody reviews.

An unresolvable base warns and passes. A push to the default branch compares
against the previous head rather than against the branch itself, which would be
empty and green forever.

## Related

- The shape the shipped set is held to: `.qfai/contracts/cli/shipped-workflows.md`
- What may not appear in a shipped file: `distributed-surface.md`
- The same two-part marker for a deliberate shortcut: `minimal-implementation.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository. It
governs this repository alone: an adopter ships no workflow templates, so
`packages/qfai/assets/init/root/.agents/rules/` does not carry it.
