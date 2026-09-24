# 02 User Stories

## US Catalog

- US-0018-0001: Run any migration step without risk to the project
- US-0018-0002: Move the QFAI directories to their singular names
- US-0018-0003: Merge every record into the two project tables
- US-0018-0004: Move policy and catalog content into the merged files once
- US-0018-0005: Build the flows and stories from the plan
- US-0018-0006: Keep every test case as an example
- US-0018-0007: Write the business rules into their contracts
- US-0018-0008: Rewrite the test annotations to the new IDs
- US-0018-0009: Repoint the host links and the ignore rules
- US-0018-0010: Migrate a project with the skill

## US-0018-0001: Run any migration step without risk to the project

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter on the spec-pack layout I want every step script to
  refuse a bad start before it writes, show me what it will do, and finish when
  I run it again, so that I can preview, stop and resume a migration without
  damaging the project.
- Non-goals: requiring a clean working tree; a progress file recording which
  steps ran; a `qfai` subcommand.
- Notes: covers the invocation, dry run, idempotency, write set, exit codes
  and report sections of `.qfai/contracts/cli/qfai-migration-spec-to-story.md`,
  and what happens to a source once a step has consumed it.

## US-0018-0002: Move the QFAI directories to their singular names

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 1 to rename every QFAI-owned directory to its
  singular name and update the configured paths, so that the rest of the
  migration and the new validators find the project where they look.
- Non-goals: renaming a directory the project configured away from its
  default; renaming host-defined or skill-internal names; deleting anything
  already at a destination.
- Notes: the renames are the ones discussion requirement REQ-0018 lists, plus
  `.qfai/contracts` into the spec tree and `skills.local` to `skill.local`.

## US-0018-0003: Merge every record into the two project tables

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 2 to turn every decision record, decision
  log entry, triage record, change request and open question into a row of
  `decisions.md` or `open-questions.md`, so that no record is lost and each
  keeps its standing.
- Non-goals: rewriting what a record says; judging whether a record still
  holds.

## US-0018-0004: Move policy and catalog content into the merged files once

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 3 to move the policy files, the catalog
  files I own and the agent manifests into the policy layer, the contract
  layer and `qfai.config.yaml`, with each fact stated once, so that no two
  files can disagree about it.
- Non-goals: carrying a setting that equals the package's built-in default;
  moving shipped catalog content the package writes itself.
- Notes: the five merged files are `01_policy/objective.md`,
  `01_policy/initiative.md`, `01_policy/principle.md`,
  `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md`
  (discussion requirement REQ-0023).

## US-0018-0005: Build the flows and stories from the plan

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 4 to give every story, criterion, example
  and rule its new ID from the plan and write each into its place in the story
  tree, so that the judgment the AI made about flows is applied mechanically
  and can be reviewed.
- Non-goals: deciding which flow a story joins; renumbering after a flow is
  later split or reordered.

## US-0018-0006: Keep every test case as an example

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want steps 5 and 6 to turn every test case with no
  example into an example under the criterion it cites, and to give every
  example the criterion its test cases point at, so that no case my old spec
  recorded disappears with `06_Test-Cases`.
- Non-goals: guessing a criterion for a case that cites none or several.

## US-0018-0007: Write the business rules into their contracts

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 7 to write each business rule into the
  contract the plan names, citing the examples that used to cite it, so that
  every rule lives beside what enforces it.
- Non-goals: creating a contract file the plan names but the project lacks;
  adding a non-functional-requirement field to contracts.

## US-0018-0008: Rewrite the test annotations to the new IDs

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want step 8 to rewrite my tests' annotations to the new
  IDs, and to tell me about every annotation it left alone, so that coverage
  carries over and nothing is silently orphaned.
- Non-goals: rewriting annotations that have no new counterpart; editing any
  test line other than an annotation.

## US-0018-0009: Repoint the host links and the ignore rules

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want steps 9 and 10 to point my host integration links
  at the renamed skill and agent directories and keep my decision records
  tracked, so that my AI host and git see the migrated project correctly.
- Non-goals: rerunning `qfai init --force`; editing `.gitignore` outside its
  managed block.

## US-0018-0010: Migrate a project with the skill

- Parent: CAP-0018
- Source: discussion-20260923063306456#DUS-006
- Goal: As an adopter I want to run `/qfai-migration-spec-to-story` and have an
  AI plan the migration, run every step with a dry run first, and show me what
  is left for a person, so that the whole move is repeatable and reviewable.
- Non-goals: an AI settling what a step listed for a person.
- Notes: the guide a person reads first ships with the skill.
