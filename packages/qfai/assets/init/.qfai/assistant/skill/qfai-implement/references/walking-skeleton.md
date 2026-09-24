# Walking Skeleton

## Entry points

Read the Key packages / entrypoints section of <paths.contractsDir>/structure.md. Resolve paths.contractsDir from qfai.config.yaml. If that optional section is absent, use its Entry points section. Treat each entrypoint as a separate proof target.

For each entrypoint, identify an existing smoke test that reaches it. Use the Skeleton command in the Standard commands section of <paths.contractsDir>/tech.md. If it is absent or still a placeholder, use that section's Test command with a smoke selector declared there or supported by the checked-in test runner configuration. If no smoke test exists, add the smallest test that exercises the entrypoint and one observable response. When neither command can run that test, resolve the missing command in tech.md before claiming proof. Do not infer a command from package scripts.

## Proof

Run the declared command from a fresh project context and record its command, exit code, output, entrypoint, and source revision in .qfai/evidence/implement-BF-NNNN.md. The smoke assertion must exercise the entrypoint and one observable response. A process that merely starts is not a passing skeleton.

Create only the seam needed to make the entrypoint reachable. Keep domain predicates and later flow behavior for their own example cycles. Record a temporary seam with its ceiling and the condition that lifts it under the minimal-implementation rule.

The skeleton is proven before the first example that depends on that entrypoint. Re-run its command at the flow checkpoint after implementation changes. When a project declares no runnable entrypoint, record the scope evidence and proceed with the example tests that exist.
