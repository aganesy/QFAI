# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion hands its record to qfai-sdd
  # AC-0001-0300-01
  Scenario: Discussion writes its record and its open questions only
    Given a discussion stage that interviewed the user
    When it ends
    Then it has written the run's deliberation record and one `open-questions.md` row for each question it left open
    And it has written no other story-tree file and no root `DESIGN.md`
    And a brand theme the user chose is an Interview row

  # AC-0001-0300-02
  Scenario: qfai-sdd places each answer where the story tree keeps it
    Given the deliberation record `/qfai-sdd` consumes
    When it writes the story tree
    Then each answer goes to the one file that owns it: purpose, background, users and success to `objective.md`; assumptions, dependencies, milestones, size and what the work takes to `initiative.md`; risks to `initiative.md` `## Risks`; trade-off priorities to `principle.md`; terms to `glossary.md`; limits to `constraint.md`, product-wide quality targets to its `## Quality targets` and legal and compliance limits to its `## Legal and Compliance Constraints`; the target surfaces to the `tech.md` `Surface` row; stories and examples to the business flows; screens and their behaviour obligations to `03_contract/ui/`; the brand direction and the design inputs to root `DESIGN.md`; and an open question to `open-questions.md`
```
