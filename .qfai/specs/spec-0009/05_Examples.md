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
