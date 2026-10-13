# US-0001-0233: Report acceptance scaffold evidence and follow-up

## User Story

As an adopter maintainer, I want a human-readable report to distinguish acceptance annotations, empty bodies and actual behavioral evidence when the scope includes scaffolds or unfinished acceptance bodies, so that I can assign the remaining BF/AC bodies and their completion criteria without mistaking passing scaffolds for verified behavior.

## Non-goals

- Removing the existing exemption for legitimate empty test bodies or changing acceptance-writing completion rules.
- Adding a runtime counter, JSON field, result status, gate, route or scope.
- Requiring the report for a lint-only scope without acceptance scaffolds or unfinished BF/AC bodies.
