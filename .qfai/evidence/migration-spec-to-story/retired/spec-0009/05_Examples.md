# 05 Examples

## EX-0009-0001: Typical Node.js Project Globs

- BR-Ref: BR-0009-0001, BR-0009-0002
- Given a Node.js project with `packages/qfai/tests/**/*.test.ts` and `src/**/*.spec.ts`
- When configure analyzes the project
- Then proposed globs include `packages/qfai/tests/**/*.test.ts` and `src/**/*.spec.ts`

## EX-0009-0002: Zero Match Warning

- BR-Ref: BR-0009-0005
- Given proposed glob `tests/**/*.spec.py` in a TypeScript-only project
- When evidence sampling runs
- Then zero matches are found and the skill stops to ask the user

## EX-0009-0003: Steering Population from package.json

- BR-Ref: BR-0009-0004
- Given `package.json` with `"vitest": "^3.0.0"` and `"node": ">=22"`
- When steering/tech.md is populated
- Then it records `Test runner: vitest 3.x`, `Runtime: Node.js >= 22`

## EX-0009-0004: Minimal Config Diff

- BR-Ref: BR-0009-0001
- Given `qfai.config.yaml` with no `testFileGlobs`
- When configure updates the config
- Then only `validation.traceability.testFileGlobs` is added (no other keys changed)

## EX-0009-0005: Coverage Placeholder for BR-0009-0003

- BR-Ref: BR-0009-0003
- Given the consolidated rule BR-0009-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0009-0003

## EX-0009-0006: Story-Tree Specs Directory Written Only When Absent

- BR-Ref: BR-0009-0006
- Given two projects on the story tree: one whose `qfai.config.yaml` has no `paths.specsDir`, and one whose config sets `paths.specsDir: docs/spec`
- When `/qfai-configure` updates each config
- Then the first gains `paths.specsDir: .qfai/spec`, the second keeps `docs/spec`, and neither config is given `.qfai/specs`

## EX-0009-0007: One Changed Routing Assignment Becomes One Override

- BR-Ref: BR-0009-0007
- Given a project with the `rule/ skill/ agent/ prompt/` assistant tree, and a user who asks to change one agent in the `qfai-sdd` routing and nothing else
- When `/qfai-configure` records the change
- Then `qfai.config.yaml` gains one `routing:` entry keyed by `qfai-sdd` that holds the whole entry, no other default routing entry or review profile is copied into the config, and no routing file or review-profile file is written into the project

## EX-0009-0008: Gate Commands Stated Once in the Merged Files

- BR-Ref: BR-0009-0008, BR-0009-0001, BR-0009-0004
- Given a project on the story tree with the default `paths.contractsDir`, `.qfai/spec/03_contract`, whose `package.json` declares `lint`, `typecheck` and `test` scripts, and whose deployment target no file in the repository states
- When `/qfai-configure` populates the five merged files
- Then the three gate commands appear only in the Standard commands section of `.qfai/spec/03_contract/tech.md`, and in neither `qfai.config.yaml` nor any other of the five files; the deployment target is written as `TBD` with the missing evidence recorded; and nothing is written under `.qfai/assistant/catalog/`
