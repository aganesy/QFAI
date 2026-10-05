# US-0001-0206: Seed a diagnosed missing example under an existing criterion

## User Story

As an operator fixing a bug the stories already describe in general but no example states, I want the case the diagnosis found to be added as one example under the criterion it matched, cited by the rule that enforces that criterion's examples, so that the defect is fixed against the existing specification without changing a criterion or a rule statement.

## Non-goals

- Changing a story, a criterion or a rule statement
- Seeding when an example already states the case
- Writing the test, which the same stage does next
- Asking the user, except for an example that would contradict the specification
