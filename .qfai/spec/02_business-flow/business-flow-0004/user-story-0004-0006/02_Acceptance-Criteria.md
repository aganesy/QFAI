# Acceptance Criteria

## Criteria

```gherkin
Feature: Move policy and catalog content into the merged files once
  # AC-0004-0006-01
  Scenario: Every section lands in one destination, and no fact is stated twice
    Given a project on the spec-pack layout with the policy files and the adopter-owned catalog files
    When step 3 runs
    Then every section except those in the retired slice policy is in the destination the source map gives it, or, when it does not fit a section of the template of a policy file or of `tech.md`, is listed under For a person
    And each policy file and `tech.md` has its template's sections in the template's order
    And the complete original `_policies/11_Slice-Policy.md` is retired without copying a section into `principle.md`
    And no paragraph appears twice in a destination
    And the consumed source files are gone

  # AC-0004-0006-02
  Scenario: A manifest entry that equals a shipped default is not carried, and a changed entry is listed
    Given a project whose agent manifests hold entries changed from the package default and entries equal to it
    When step 3 runs
    Then qfai.config.yaml holds an override for each changed entry only
    And each changed routing entry is listed under For a person with a warning that a copied 1.x entry hides roles the 2.x skills declare

  # AC-0004-0006-03
  Scenario: An overlay moves beside its rule, or is retired for a person
    Given `.local.md` overlays under the constitution and catalog directories, one whose rule is under `rule/` and one whose rule is not
    When step 3 runs
    Then the first is at `rule/<name>.local.md`
    And the second is retired and listed under For a person
    And an overlay whose destination already holds a file stays where it is, leaving that file unchanged, and is listed under For a person
    And when overlays of one name under both directories could take the same place, step 3 writes nothing and lists both under For a person

  # AC-0004-0006-04
  Scenario: Every 1.x contract takes a contract ID, a name to match and a row in the contract index
    Given contract files under the contract kind directories that declare old `CON-*` IDs or none, and the old contract index
    When step 3 runs
    Then each contract has a new contract ID, unique across kinds, a file name that carries it and a declaration of it
    And the contract map records each old path and old ID against the new ones
    And `contracts.md` lists every contract in the index table, and what it cannot hold is listed under For a person
    And every old `CON-*` ID the contract map translates, in a contract file step 3 wrote, is its new ID there

  # AC-0004-0006-05
  Scenario: A Markdown CLI contract takes its template's shape, and what does not fit goes to a person
    Given a Markdown contract under `cli/` with text and sections the CLI contract template has no place for
    When step 3 runs
    Then the contract holds only its heading, `## Ownership boundary` and `## Business rules`
    And every part left out is listed under For a person with the old file
    And once step 7 has written its rules the contract passes the CLI contract schema

  # AC-0004-0006-06
  Scenario: A 1.x file that is no contract is retired for a person
    Given a Markdown file under `api/`, `db/` or `ui/`, and files under `design/`
    When step 3 runs
    Then none of them takes a contract ID or is written to the contract tree
    And each is retired as a source with no destination
    And each is listed under For a person with why it is no contract

  # AC-0004-0006-07
  Scenario: The primary spec becomes the primary UI contract, or goes to a person
    Given a qfai.config.yaml holding prototyping.primarySpecId, and contract files whose IDs step 3 renumbers
    When step 3 runs
    Then prototyping.primaryUiContract names the new ID of the one UI contract the named spec's rules cite, and the old key is gone
    And where no single UI contract can be tied to that spec, the old key stays and is listed under For a person with its value
    And the steps after step 3 refuse, naming the key, while it remains

  # AC-0004-0006-08
  Scenario: Step 3 lists what a person decides apart from what only renames an ID
    Given a project on the spec-pack layout where step 3 leaves content for a person and changes constraint IDs
    When step 3 runs
    Then For a person lists the content items first, under Content
    And the items that only pair an old ID with its new one follow, under Identifiers
```
