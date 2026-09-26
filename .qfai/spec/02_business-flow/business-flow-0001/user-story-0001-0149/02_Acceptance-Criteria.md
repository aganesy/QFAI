# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0149-01
# Parent: US-0001-0149
Scenario: `prototyping.mode` discriminator + `--mode` override (DR-0263)
  Given `qfai.config.yaml#prototyping.mode` and the `qfai prototyping iterate --mode <convergence|exploration>` flag,
  When iterate resolves the effective mode,
  Then `--mode` MUST override the config value; absence of both MUST default to `convergence` (backwards-compatible).
  And `prototyping.json#mode` MUST record the per-iteration mode.
  And under `mode: exploration`, `QFAI-CRIT-008` (convergence) AND the design-compliance error MUST downgrade error → warning while structural / schema / path / license (exit 66) gates remain hard error (medium relaxation per DR-0263).

# AC-0001-0149-02
# Parent: US-0001-0149
Scenario: Certify rejects exploration-mode iterations (DR-0263)
  Given a loop where one or more iterations were produced under `mode: exploration`,
  When `qfai prototyping certify` runs,
  Then certify MUST reject sealing with `R-EXPLORATION-CERTIFY-ATTEMPT` AND `acceptedIterationIndex` MUST reference a convergence-mode iteration only.
```
