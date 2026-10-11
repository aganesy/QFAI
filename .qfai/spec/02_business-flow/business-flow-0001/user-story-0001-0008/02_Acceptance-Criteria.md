# Acceptance Criteria

## Criteria

```gherkin
Feature: ID grammar
  # AC-0001-0008-01
  Scenario: Each ID has one of seven shapes and is declared once
    Given a project on the story tree
    When every declared ID is collected
    Then each has one of the shapes `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-<contract number>-NNNN`, `DEC-NNNN` or `OQ-NNNN`
    And no ID is declared twice in the tree

  # AC-0001-0008-02
  Scenario: An ID carries the number of the directory it sits in
    Given a story directory inside a flow directory on the story tree
    When the IDs it declares are read
    Then the story ID starts with the flow's number
    And every AC and EX ID starts with the story ID
    And each directory name matches the ID it holds

  # AC-0001-0008-03
  Scenario: The next ID is the highest plus one
    Given a project on the story tree
    When the next ID of a shape is chosen
    Then it is the highest ID of that shape the tree names under the same parent (the flow for a US, the story for an AC or EX), `decisions.md` rows included, plus one
    And a gap is never filled and a retired ID is never reissued

  # AC-0001-0008-04
  Scenario: A contract numbers its own business rules
    Given a contract under a kind directory of `paths.contractsDir` on the story tree, declaring a contract ID `<KIND>-NNNN`
    When the business rules it declares are read, or its next rule ID is chosen
    Then a rule takes the ID `BR-<contract number>-NNNN`, and one whose first segment is not the number of the contract that declares it is an error
    And the next rule ID of that contract is the highest `BR-<contract number>-NNNN` the tree names, `decisions.md` rows included, plus one

  # AC-0001-0008-05
  Scenario: A branch-added decision has an explicit preview and apply command
    Given a unique valid DEC row in the current tree, absent from the common ancestor of HEAD and an explicit local base ref
    When `qfai sdd renumber-decision --from <DEC-ID> --to <DEC-ID> --base <local-ref>` runs
    Then the command fixes HEAD and the base to commit SHAs and requires exactly one common ancestor
    And each invocation builds a complete plan; the default previews without writing, while `--apply` rechecks its own fixed refs and original bytes before writing
    And a later apply invocation may recompute the plan if HEAD or the base changed after a preview
    And concise English text reports the fixed base and HEAD SHAs, source and destination IDs, relative paths and replacement lines or counts, and whether anything was written, without dumping original lines or full files
    And preflight-only `--format`, `--fail-on`, `--import` and `--assume` options are rejected rather than ignored
    And a base row may already use the source ID, but a duplicate source row in the current tree is rejected
    And the destination is unused in the current and base story trees and above their highest DEC number, including references to retired IDs
    And both IDs use the existing four-digit DEC grammar; a destination above 9999 or filling an existing gap is rejected
    And the command reserves no ID, allocates no final ID automatically and makes no remote request

  # AC-0001-0008-06
  Scenario: Only references owned by the incoming branch are changed
    Given an eligible branch-added DEC and its exact separate-token references in tracked files
    When the command constructs its preview or apply plan
    Then it changes that row's ID and only reference occurrences provably added by the current branch since the common ancestor
    And inherited reference occurrences and inherited rows' ID, Content and Approach remain unchanged
    And a token inside a larger identifier is not replaced
    And ambiguous reference ownership is rejected before any write

  # AC-0001-0008-07
  Scenario: Unsafe or incomplete candidates reject the entire plan
    Given a renumber request with an inherited or duplicate source, invalid ID or Git ref, non-unique common ancestor, used or out-of-range destination, dirty candidate, unsupported token-bearing file, linked candidate or failed read
    When the command runs in preview or apply mode
    Then it reports the reason and writes nothing
    And every candidate is an in-repository, tracked regular UTF-8 text file, clean in both the index and worktree, with every path component unlinked
    And supported suffixes are `.md`, `.mdx`, `.txt`, `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.jsonc`, `.yaml`, `.yml` and `.sql`
    And a candidate larger than 16 MiB is rejected explicitly; content reads support the full 16 MiB rather than Git's default 1 MiB buffer
    And unrelated dirty files or symbolic links with no candidate occurrence do not prevent the command

  # AC-0001-0008-08
  Scenario: Apply precomputes every patch and reports failed rollback
    Given a complete eligible renumber plan
    When `--apply` runs
    Then every original and replacement is prepared and checked before the first write, including unchanged HEAD and base SHAs and candidate bytes
    And original bytes are checked again before each write; a mismatch stops further writes and triggers rollback of any earlier writes
    And a multi-file write failure triggers a best-effort restore of files already changed
    And rollback restores only files whose current bytes still match this invocation's replacement; it preserves concurrent changes and reports every unrestored path
    And the command guarantees neither atomic concurrency nor power-loss safety and never reports a partial apply as success
```
