# Findings outside the active flow

The scoped gate selects one BF. A repository-wide contract or test finding
may still appear in its output. Read each finding's ID and path to identify
the flow that owns it. An unattributed finding is unresolved; do not label it
as a sibling's work merely because it is outside the current directory.

Record a finding owned by another flow with its code, path, obligation ID,
owning flow and the run that observed it. Do not edit that flow's tests or
decision rows without its owner. A finding owned by the active flow remains
a blocker, even when the same contract is used by several flows.

A current-flow PASS with named external findings is a scoped result only.
Repository-wide PASS requires `/qfai-verify` and its full scan. Contract
references still guide assertions, but their IDs are not coverage annotations.
