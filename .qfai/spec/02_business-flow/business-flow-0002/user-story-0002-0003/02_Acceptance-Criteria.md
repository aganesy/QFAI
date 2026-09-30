# Acceptance Criteria

## Criteria

```gherkin
Feature: A layer-separated, credential-free shipped workflow set
  # AC-0002-0003-01
  Scenario: The shipped set is named and laid out as one reserved set
    Given the shipped `.github/` tree
    When its top-level entries, each entry of the workflows directory and the references between shipped files are inspected
    Then the only top-level child of `.github/` is `workflows`, and pack verification throws when `actions/` is planted
    And every entry under workflows matches `^qfai-[a-z0-9-]+\.yml$`, and the set has two or more files
    And no shipped file references another, and layer separation is expressed as jobs or matrix legs inside the orchestrator file
    And the naming pattern is a reservation notice that lets an adopter foresee a collision from the documentation, and is never used as a selector for writing or removal

  # AC-0002-0003-02
  Scenario: The shipped set is inert and holds no secret
    Given a new adopter project that declares none of the optional layer-named test scripts
    When `qfai init` runs into a temporary directory and the shipped workflow set is evaluated statically
    Then no test lane executes: each is declared, and each skips on the false condition of an absent script. Exactly three shipped jobs declare a dependency install — the document-check job, the test lane and the validation job. Every other job installs nothing: change detection, the document scope and each file's aggregate. Counted as job instances after matrix expansion, with the test lane at its bound of five layer legs, the installs run nine times on a pull request and eight times on a push. Across the whole set there is no secret declaration, no secret-context reference and no `secrets: inherit`

  # AC-0002-0003-03
  Scenario: Independent shipped checks and a complete aggregate verdict
    Given the workflow set `qfai init` delivers into a fresh adopter project
    When the delivered document and validation workflows are evaluated statically for a pull request and for a push, and each aggregate job's body is evaluated against every result its dependency can conclude with
    Then the independent checks of each file are declared as matrix legs of one job carrying `fail-fast: false`, so a failing leg cancels no other leg. Each checker command and each validation profile is unchanged and appears in exactly one leg, and the drift profile is selected on pull requests only. Each file's existing external check name belongs to a job that runs whatever its dependency concluded and succeeds only when that dependency's rolled-up result is `success`; a failed, cancelled, skipped or missing result fails it

  # AC-0002-0003-04
  Scenario: The document lane installs its checkers outside the project's dependency tree
    Given a project whose dependencies a package manager other than npm installed
    When the delivered document lane installs the checkers it runs
    Then they go into a directory of its own under `tmp/` through `npm install --prefix`, at exact pinned versions, and npm installs nothing into the project's own `node_modules`
    And a project that depends on QFAI keeps the copy it installed, which supplies the schemas, and a project that does not gets QFAI in that same directory by the same install
    And the install runs no package's install script, because the schema checker's platform binary arrives as an optional dependency
    And each checker script takes the directory as `--tools` and resolves its tools from it first, then the way it resolved them before
```
