# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0135-01
# Parent: US-0001-0135
Scenario: `iterate --auto-serve` opt-in flag with foreign-process protection
  Given `qfai prototyping iterate` invoked WITHOUT `--auto-serve`,
  When the loop runs,
  Then no HTTP server MUST be spawned (DR-0012-0029 default posture preserved; amendment pinned by `DR-0012-0031`).
  And when invoked WITH `--auto-serve`, iterate MUST call the server runner once, invoke the teardown it returns at cycle end and on SIGINT, continue when the runner reports a recovered prior owner, and exit 2 reporting the runner's reason when the runner refuses.
  And the default runner, used when no runner is injected, MUST serve in-process and MUST refuse a port another process holds, naming the port, rather than pick another one.
```
