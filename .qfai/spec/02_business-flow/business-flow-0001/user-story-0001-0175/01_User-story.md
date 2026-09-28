# US-0001-0175: SKILL.md `## Default Autopilot Policy` section

## User Story

As a QFAI operator, I want every `qfai-*` skill to work under the three named buckets auto-decide, ask-user and hard-required that the shared operating baseline states, with a skill's own `## Default Autopilot Policy` section listing only what it adds, and a Reviewer Gate that emits `R-AUTOPILOT-POLICY-MISSING` at severity error when the baseline loses that section or a bucket, or a skill drops an input declared for it, so that avoidable per-session `AskUserQuestion` prompts drop to zero or one while approval-required governance operations, destructive operations, version-pin changes, scope expansions and, for a skill whose own operation is the interview, a decision a declared grilling session puts to the user still require human authorization, and no skill adds an entry outside those categories.
