# Distributed Surface Discipline

The files this repository publishes to its users form its **distributed
surface**: an npm tarball, a container image, a released bundle. Internal
identifiers must not appear there.

When in doubt, ask: can this file end up on a user's machine? If yes, leave
the internal identifier out.

## Declaring the surface

Declare the surface once, in the packaging manifest. For an npm package that
is the `"files"` field of `package.json`; elsewhere it is the equivalent
include list. Never keep a second hand-written list of shipped paths beside
it. The two drift.

The include list is a declaration, not the final packlist. A packer adds files
of its own (npm always ships the manifest, the README, the LICENSE, and what
`main` and `bin` point at), and an ignore file can drop entries the include
list named. When a check has to enumerate what ships, ask the packer:
`npm pack --dry-run --json` for npm, the equivalent dry run elsewhere.

## Forbidden in the distributed surface

| Category                        | Why it must not ship                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Internal spec and ticket IDs    | Meaningless outside this repository, and they look like a contract to the consumer.                                      |
| Internal decision and trace IDs | They point at documents the consumer cannot open.                                                                        |
| Private version markers         | A version counter this project invented for itself is a second, unmaintained versioning scheme next to the released one. |
| Private schema markers          | A schema field of this project's own making, in a shipped artifact, becomes a compatibility promise nobody agreed to.    |
| Absolute local paths            | They leak the author's machine layout and never resolve for the consumer.                                                |

Version numbers that belong to something else are not covered and must never
be stripped: dependency ranges and engine constraints in the shipped manifest,
the language, runtime and tool versions the shipped docs name, and the version
of a third-party API, protocol or specification this project implements. Only
a version marker this project minted for itself is forbidden.

## Canonical version source

The only version of this project a shipped file may present as current is the
released version in the packaging manifest. Do not add a private
schema-version or format-version counter beside it, and do not let a shipped
artifact carry one as a field. Express a breaking change by raising the
released version.

Naming this project's past releases is not a marker. Migration guides,
deprecation notices, compatibility shims and the documented history of a
public API all have to say which release they are about. Removing those
numbers destroys the information.

## Where internal IDs are fine

Traceability inside the repository still needs internal IDs. Use them in
`.qfai/specs/`, `.qfai/contracts/`, `.qfai/discussion/`, `CHANGELOG.md`,
developer documentation that is not packaged, commit messages, and pull
request descriptions. Keep them out of doc comments in shipped source: type
declarations generated from those comments are usually packaged.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
