# A project with an older routing override

QFAI reads step routing and review profiles from the installed package.
`qfai.config.yaml` may replace a step's entry as a whole. A project that
retains an older override can therefore retain a phase or reviewer contract
that no longer matches the shipped step.

Before routing a step's phase, resolve the package default and its project
override as `.qfai/assistant/rule/agent-selection.md` requires. If the
override omits a mandatory role, phase, or rerun policy, stop and bring that
override forward through `/qfai-configure`. Do not treat a missing phase as
permission to skip its gate.

Each card in `.qfai/assistant/agent/` defines its role. Read the card; there
is no agent catalog copy to reconcile. A missing or stale card is an init
problem to repair before using the role.
