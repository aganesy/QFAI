---
name: implement-acceptance
owner: qfai-implement
purpose: "Write the bodies of a business flow's empty acceptance tests, keeping each test's annotation and file."
requires: [common-gate-run]
roles:
  - acceptance-test-engineer
  - devops-ci-engineer
routing-profile: default
---

# implement-acceptance

The quality phase of acceptance testing. `implement-scaffold` left an E2E test
for each business flow and an integration or API test for each acceptance
criterion, each with an empty body. Once the system's shape has settled, this
step writes the assertions those bodies owe.

## Reads

- The flow's acceptance tests whose bodies are empty.
- The BF or AC each test annotates, and its owning contracts, under
  `paths.specsDir`.
- The worker session setup `implement-credentials` wrote, when a test needs an
  authenticated actor.

## Writes

- The body of each empty acceptance test in scope.

## Ownership and annotation

| ID                   | Test home              | Annotation             |
| -------------------- | ---------------------- | ---------------------- |
| Business flow        | E2E                    | `QFAI:BF-NNNN`         |
| Acceptance criterion | Integration or API     | `QFAI:AC-NNNN-NNNN-NN` |
| Example              | Every other test layer | `QFAI:EX-NNNN-NNNN-NN` |

Each test keeps its annotation and its file. No annotation is added, moved or
removed. Contract references and business rules define assertions, but
contract IDs are not coverage annotations.

## Procedure

1. Write the assertions the test's BF or AC states, against observable
   behaviour.
2. Run each test with the Test command `common-gate-run` names, and confirm it
   passes.
3. The behaviour already exists, so prove each assertion can fail: change the
   production predicate it checks, observe that assertion fail, restore the
   predicate, and observe the test pass again. Report the command, the
   mutation and both results. A
   syntax error, a deleted export or a bare throw is not a discriminating
   mutation.
4. A test that fails because the product is wrong is not repaired here: report
   it as a defect for `implement-tdd` or a fix route. A test that cannot be
   written because the story or contract is wrong is a change request under
   `.qfai/assistant/rule/drift-protocol.md`.

## Gate

PASS when every test in scope has a body that asserts its BF or AC, keeps its
annotation and file, passes, and
`npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
error owned by this flow.
