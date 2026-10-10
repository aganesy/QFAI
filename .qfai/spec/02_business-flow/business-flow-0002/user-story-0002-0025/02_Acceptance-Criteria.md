# Acceptance Criteria

## Criteria

```gherkin
Feature: Safe branch catch-up with CI pin resealing
  # AC-0002-0025-01
  Scenario: Catch-up starts only from a prepared current branch
    Given the helper is invoked in this repository's current checkout
    When it inspects the invocation and Git state before any mutating fetch
    Then only the default invocation and its explicit push option are accepted
    And the current branch is attached and differs from the live origin default branch resolved through Git
    And the worktree, index and non-ignored untracked set are clean with no ongoing Git operation
    And the upstream is the same branch name on origin
    And dependencies are already installed in this checkout
    And a failed precondition stops without mutation, dependency installation or a GitHub API fallback

  # AC-0002-0025-02
  Scenario: Catch-up merges instead of rebasing
    Given preflight succeeds
    When the helper fetches and merges the remote default branch
    Then it uses a non-rebase merge with no automatic commit and no fast-forward
    And a conflict-free merge remains available for resealing before the final commit
    And an up-to-date branch with no staged changes produces no empty commit

  # AC-0002-0025-03
  Scenario: Only proven digest conflicts are resolved automatically
    Given a catch-up merge has conflicts
    When the helper classifies every conflicted file before resolving any
    Then eligible conflicts contain only existing digest slots in the pinned-byte list, status-context declaration or CI workflow
    And pinned-list paths, order and comments agree
    And each declaration candidate first parses with JSON.parse
    And removing only whitespace outside quoted JSON strings makes its compact raw text equal JSON.stringify of the parsed value
    And duplicate keys and noncanonical values are rejected while formatter whitespace alone is allowed
    And normalizing only known contexts[i].pinnedBytes 64-lowercase-hex and contexts[i].verificationBodies 16-lowercase-hex values leaves the full JSON values equal
    And declaration keys, structure, context and map membership remain unchanged
    And resolution preserves common bytes outside conflict regions without selecting a whole merge side
    And workflow differences are only the four existing PINNED_INPUTS target digests
    And a malformed, ambiguous, membership-changing, foreign, semantic or other-file conflict stops the helper
    And rejected conflicts retain the pending merge without partial automatic resolution, abort or reset

  # AC-0002-0025-04
  Scenario: Resealing commits the complete merge or preserves a failure
    Given the merge is conflict-free or all its conflicts are proven digest conflicts
    When the existing guard-byte resealer runs before the existing verification-body resealer
    Then writer changes are confined to the pinned-byte list, status-context declaration, CI workflow and lifecycle-manifest list
    And those paths are staged explicitly while all staged merge changes remain in the final commit
    And a writer failure or unexpected writer change retains the partial state without committing or pushing
    And no install, build, test or CI wait is run implicitly
    And existing gates and runtime hash verification remain intact

  # AC-0002-0025-05
  Scenario: Publication is explicit and retry preserves the completed commit
    Given merge, resealing and commit have succeeded
    When the helper reaches publication
    Then the default invocation does not push
    And only the explicit push option sends current HEAD to the same branch on origin without force
    And push failure preserves the completed commit and reports the explicit push invocation for retry
    And an up-to-date retry creates no empty commit
    And resealing is not reported as test execution or a shorter CI review wait

  # AC-0002-0025-06
  Scenario: Each mutation boundary checks the accepted state
    Given the helper has recorded the accepted HEAD, index, conflict state and target-file bytes
    When it reaches each conflict-resolution write, each reseal writer, staging, commit or push
    Then it rechecks those observations before proceeding
    And expected writes by the helper advance the recorded observations
    And an unexpected observed difference stops further mutation, completion commit and push
    And concurrent edits and the current merge state are preserved without abort or reset
    And these checks promise neither an atomic snapshot nor detection of every race
```
