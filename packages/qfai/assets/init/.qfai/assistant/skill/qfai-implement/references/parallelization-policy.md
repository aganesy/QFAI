# Parallelization Policy

## Default

Process one open EX at a time in ascending ID order within the selected BF flow. Parallel item work requires explicit user approval and a delivery-planner PASS on concrete independence. Parallel role review of one item does not require parallel item authorization.

## Independence gate

For each candidate item, name its production files, test files, contracts, fixtures, schema or database objects, and shared resources such as ports. Disjoint filenames alone are insufficient: compare read and write sets, imports, shared fixtures, persistence, generated assets, and external process state. If any dependency is uncertain, use serial execution.

Deny parallel dispatch when two items write the same shared fixture or mock file, or mutate the same fixture instance. A shared fixture module that both items only read as-is does not by itself deny parallel dispatch.

Give each worker a separate worktree and an exact file ownership list. Workers do not change another worker's files or the story tree. The orchestrator integrates their results and resolves every overlap before judging either item complete.

## Integration gate

After integration, rerun every item selector on the merged tree, the relevant suites, and qfai validate --profile tdd --fail-on error --flow BF-NNNN. Retake evidence whose source revision changed and request the required reviews on that revision. A worker's isolated PASS is not an integrated PASS.

On an integration failure, assign the defect to the owning item when the dependency is known. When the combination itself causes the failure, stop parallel dispatch and repair serially. Record the decision and results in the flow evidence.
