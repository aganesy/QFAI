# Shipped CI dispositions

What a change to this repository's CI decided about the workflow templates
under `packages/qfai/assets/init/root/.github/workflows/`, for the files that
cannot carry the decision themselves.

Two kinds of file reach this ledger: the root `package.json`, whose `ci:*`
entries are single JSON strings with nowhere to put a comment, and a watched
file a change deletes, which has no line left to write on. Every other file
carries its disposition in the lines the change adds to it.

An entry names the file it is about, the disposition, and the reason:

```text
- SHIPPED-CI: not-applicable for package.json
  Because: <why the shipped templates do not take this change>
```

The disposition is one of `transferred`, `not-applicable` or `deferred`.
`.agents/rules/shipped-ci-parity.md` states the rule and
`scripts/check-shipped-ci-parity.mjs` holds it.

Entries are appended, never edited. A past decision is what a reader compares
the next one against.

## Entries

- SHIPPED-CI: not-applicable for package.json
  Because: the lane this entry adds compares this repository's CI with the templates it ships, and an adopter's repository ships nothing, so there is no counterpart lane for the shipped set to gain.
- SHIPPED-CI: not-applicable for package.json
  Because: the lane lints `packages/qfai/assets/`, which exists only in the repository that builds the package, so an adopter has no such tree to lint.
- SHIPPED-CI: not-applicable for package.json
  Because: the lane this entry adds reads which paths this repository links, and an adopter's tree links none of them.
- SHIPPED-CI: not-applicable for package.json
  Because: the lane this entry adds verifies links into this package's own assets, which an adopter's tree does not have.
- SHIPPED-CI: not-applicable for package.json
  Because: the lane this entry adds names the two pages this repository publishes, and an adopter publishes their own.
