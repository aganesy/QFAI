# US-0001-0175: SKILL.md `## Default Autopilot Policy` section

## User Story

As a QFAI operator, I want every SKILL.md to carry a `## Default Autopilot Policy` section with the three named buckets auto-decide, ask-user and hard-required, and a Reviewer Gate that emits `R-AUTOPILOT-POLICY-MISSING` at severity error when the section or a required bucket is missing, so that avoidable per-session `AskUserQuestion` prompts drop to zero or one while approval-required governance operations, destructive operations, version-pin changes, scope expansions and, for a skill whose own operation is the interview, a decision a declared grilling session puts to the user still require human authorization, each skill narrowing a bucket to what it can reach without adding an entry outside those categories.
