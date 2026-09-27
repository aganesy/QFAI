# Acceptance Criteria

## Criteria

```gherkin
Feature: Move policy and catalog content into the merged files once

# AC-0004-0006-01
# Parent: US-0004-0006
Scenario: Every section lands in one destination, and no fact is stated twice
  Given a project on the spec-pack layout with the policy files and the adopter-owned catalog files
  When step 3 runs
  Then every section except those in the retired slice policy is in the destination the source map gives it, or, when it does not fit a section of the template of a policy file or of `tech.md`, is listed under For a person
  And each policy file and `tech.md` has its template's sections in the template's order
  And the complete original `_policies/11_Slice-Policy.md` is archived without copying a section into `principle.md`
  And no paragraph appears twice in a destination
  And the consumed source files are gone

# AC-0004-0006-02
# Parent: US-0004-0006
Scenario: A manifest entry that equals the built-in default is not carried
  Given a project whose agent manifests hold one entry changed from the package default and one equal to it
  When step 3 runs
  Then qfai.config.yaml holds an override for the changed entry only

# AC-0004-0006-03
# Parent: US-0004-0006
Scenario: An overlay moves beside its rule, or is archived for a person
  Given `.local.md` overlays under the constitution and catalog directories, one whose rule is under `rule/` and one whose rule is not
  When step 3 runs
  Then the first is at `rule/<name>.local.md`
  And the second is under the migration's retired archive and listed under For a person
  And an overlay whose destination already holds a file is archived, leaving that file unchanged, and listed under For a person
  And when overlays of one name under both directories could take the same place, step 3 writes nothing and lists both under For a person

# AC-0004-0006-04
# Parent: US-0004-0006
Scenario: Every 1.x contract takes a contract ID, a name to match and a row in the contract index
  Given contract files under the contract kind directories that declare old `CON-*` IDs or none, and the old contract index
  When step 3 runs
  Then each contract has a new contract ID, unique across kinds, a file name that carries it and a declaration of it
  And the contract map records each old path and old ID against the new ones
  And `contracts.md` lists every contract in the index table, and what it cannot hold is listed under For a person
```
