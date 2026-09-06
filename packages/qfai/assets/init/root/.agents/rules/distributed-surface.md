# Distributed Surface Discipline

The files this repository publishes to its users — an npm tarball, a container
image, a released bundle — are its **distributed surface**. Internal
identifiers must not appear there.

## Distributed Surface (SSOT)

Declare the surface once, in the packaging manifest — for an npm package the
`"files"` field of `package.json`, elsewhere the equivalent include list — and
never keep a second hand-written list of shipped paths beside it; the two
drift.

That include list is a declaration, not the finished packlist. A packer adds
files of its own (npm always ships the manifest, the README, the LICENSE, and
whatever `main` and `bin` point at) and an ignore file can drop entries the
include list named. So when a check has to enumerate what actually ships, ask
the packer: `npm pack --dry-run --json` for npm, the equivalent dry run
elsewhere. Scanning the include list alone misses published files.

## Forbidden in the Distributed Surface

| Category                      | Why it must not ship                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Internal spec / ticket IDs    | Meaningless outside this repository; they look like a contract to the consumer.                                               |
| Internal decision / trace IDs | Same — they point at documents the consumer cannot open.                                                                      |
| Private version markers       | A version counter this project invented for itself, next to the released one, is a second and unmaintained versioning scheme. |
| Private schema markers        | A schema field of this project's own making, in a shipped artifact, becomes a compatibility promise nobody agreed to.         |
| Absolute local paths          | They leak the author's machine layout and never resolve for the consumer.                                                     |

**Version numbers that belong to something else are not covered by this rule
and must never be stripped.** Dependency ranges and engine constraints in the
shipped manifest, the language / runtime / tool versions the shipped docs name,
and the version of a third-party API, protocol or published specification this
project implements are all legitimate metadata about that other thing. Only a
version marker this project minted for itself is forbidden.

## Canonical Version Source

The only version _of this project_ a shipped file may present as current is
the released version recorded in the packaging manifest. Do not invent a
private schema-version or format-version counter alongside it, and do not let
a shipped artifact carry one as a field. Express a breaking change by raising
the released version, not by adding a marker.

Naming this project's **past** releases is not a marker and must not be
stripped. Migration guides, deprecation notices, compatibility shims and the
documented history of a public API all have to say which release they are
about, and removing those numbers destroys the information. What this rule
forbids is a parallel counter this project minted for itself — not a factual
reference to a release that happened.

## Where Internal IDs Are Fine

Traceability inside the repository still needs internal IDs. Use them in
`.qfai/specs/`, `.qfai/contracts/`, `.qfai/discussion/`, `CHANGELOG.md`,
developer documentation that is not packaged, commit messages, and pull request
descriptions. Avoid them in doc comments inside shipped source: type
declarations generated from those comments usually are packaged.

When in doubt, ask: _can this file end up on a user's machine?_ If yes, leave
the internal identifier out.

## Scope

This file is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
