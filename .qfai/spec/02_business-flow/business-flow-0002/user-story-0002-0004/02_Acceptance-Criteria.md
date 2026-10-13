# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped change detection and a green-on-skip verdict
  # AC-0002-0004-01
  Scenario: Shipped detection fails open and the verdict goes green on skip
    Given the detection job and the verdict job of the shipped orchestrator
    When detection runs on four inputs, a Markdown-only diff, a source diff, a diff of an unrecognised path and a shallow clone, and the verdict is then evaluated on an empty selection
    Then the selected lane sets are minimal / full / full / full, and detection uses a name-only diff filtered as JSON without a third-party action. Full history is requested only by the detection job, document scope job and pull-request validation job. On diff failure or shallow clone, detection emits a warning annotation and fails open to the full set. The verdict job is in the same file, has empty permissions and an always-run condition, and does not start when the selection is explicitly empty

  # AC-0002-0004-02
  Scenario: An event with nothing to run starts one job per workflow
    Given the shipped workflow set, and an event that selects no test lane or reaches no document check, or a push under each value of the push policy
    When the condition of each job is evaluated against the outputs of the jobs it reads
    Then the test workflow starts its detection job alone and says in a notice annotation why no lane ran, because the verdict declines an explicitly empty selection and starts for a missing one
    And the document workflow starts its scope job alone and says in a notice annotation why it skipped the checks, because the aggregate declines a scope that answered `false` and starts for a missing answer
    And the validation job declines a default-branch push only where the push policy is `none`, so `protected` keeps the post-merge check

  # AC-0002-0004-03
  Scenario: A manifest or input detection cannot read stops it instead of selecting no lane
    Given the script probe and the lane selection of the shipped detection job
    When the probe reads a package.json that is not valid JSON, is not an object, has a scripts field that is not an object or declares a layer-named script that is not a string, and the selection reads a script list or a lane list that is unset, is not a JSON array or names something other than the five layers
    Then each step exits non-zero with an error annotation and publishes no output, so the verdict is red
    And a repository without a package.json, a package.json without scripts and a scripts object without a layer-named script are valid empty sets that publish an empty selection
```
