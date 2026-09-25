# Acceptance Criteria

## Criteria

```gherkin
Feature: A workflow-hygiene lint lane that pull requests actually run

# AC-0002-0018-01
# Parent: US-0002-0018
Scenario: One repository script asserts the whole hygiene rule set
  Given a repository script scans every file under the own workflows tree
  When it runs against the hardened tree
  Then it asserts that every job declares permissions and timeout-minutes
  And that every checkout refuses to persist credentials
  And that every action reference is SHA-pinned
  And that every matrix disables fail-fast
  And that secret inheritance appears nowhere
  And it exits 0

# AC-0002-0018-02
# Parent: US-0002-0018
Scenario: A green result is legible as a list of checks, not as a blanket assurance
  Given the hygiene lane has just exited 0
  When a reviewer reads its output
  Then the output enumerates each rule the script evaluated
  And a rule that was not evaluated is absent from that list rather than implied by the green result

# AC-0002-0018-03
# Parent: US-0002-0018
Scenario: Every rule is independently falsifiable
  Given a positive and a negative fixture exist for each hygiene rule
  When any single rule's violation is planted into a fixture workflow
  Then the lane exits 1
  And the failure names the offending file, the offending job and the rule identifier
  And removing the planted violation returns the lane to exit 0

# AC-0002-0018-04
# Parent: US-0002-0018
Scenario: Shipped templates are enforceable from inside QFAI's own CI
  Given the shipped workflows tree is scanned either by copying it into the workflows directory inside the CI checkout or by pointing the script at both trees
  When a violation is planted in a shipped file only
  Then the lane exits 1 and names the shipped path rather than an own-CI path
  And the shipped-tree coverage lands in the same change as the shipped hardening, never before it
  And the shipped files themselves remain owned by the init capability, not by this lane

# AC-0002-0018-05
# Parent: US-0002-0018
Scenario: The one sanctioned third-party action must not turn the lane red
  Given the shipped set legitimately keeps exactly one third-party action, the package-manager setup action
  When the lane asserts the shipped third-party rule
  Then it asserts membership in a closed sanctioned set
  And the sanctioned entry passes
  And an unsanctioned third-party reference exits 1
  And a rule expressed as a count of zero is rejected, because it would fail the lane on the sanctioned entry

# AC-0002-0018-06
# Parent: US-0002-0018
Scenario: Gate placement is effective rather than nominal
  Given the release gate aggregate is invoked only by the release workflow and never by own CI
  When the hygiene lane is registered
  Then its invocation appears in the lint aggregate or in a runner project the test matrix drives
  And a planted violation turns a pull request red
  And placing it in the release-only gate aggregate is rejected, because it would block no pull request

# AC-0002-0018-07
# Parent: US-0002-0018
Scenario: The required-status-check obligation is enforced from a pull request, not from live settings
  Given a checked-in declaration names the job expected to carry the required status context
  And which checks branch protection requires is not inspectable from the working tree
  When the hygiene script parses every workflow
  Then it asserts that the declared context resolves to an existing job
  And that the job is not skippable, counting a condition on any job it depends on
  And that its enumerated verification set is intact
  And it exits 1 when any of the three properties is violated
```
