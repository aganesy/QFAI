# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0125-01
# Parent: US-0001-0125
Scenario: Spec set frozen at cycle 0; mid-run additions deferred
  Given the cycle-0 frozen spec set is persisted in cycle-0 evidence,
  When a new UI-bearing spec is added to disk after cycle 0 starts,
  Then `/qfai-prototyping` MUST detect the change, MUST NOT restart cycle 0, MUST defer the new spec to the next invocation, AND the cycle ≥ 1 drift gate reads the cycle-0 frozen UI-bearing UNION snapshot — `prototyping.json#frozenSurfaceUnion` — as its baseline and compares it set-equal against the live `resolveSurfaceUnion(root, config)` result (not live FS). The legacy single-spec `specsCovered` / `frozenSpecsCovered` fields are NOT the drift baseline; they remain as the primary-spec scope under review and shallow-equal compared to the currently-resolved primary, but are unrelated to multi-spec drift detection. A missing or malformed `frozenSurfaceUnion` snapshot on cycle ≥ 1 is itself a hard-stop and instructs the operator to re-seed via `--cycle 0`.
  And On the story tree the frozen set is `uiContractsCovered[]`, a UI-bearing UI contract added mid-run is deferred the same way, and the drift gate compares the live union of UI-bearing UI contracts set-equal against `frozenSurfaceUnion`, which holds `CON-UI-NNNN` IDs. The shallow-equal check reads `uiContractsCovered` in place of the two legacy fields.

# AC-0001-0125-02
# Parent: US-0001-0125
Scenario: Cycle-0 freezes the UI contract set
  Given cycle 0 runs,
  When it completes,
  Then cycle-0 evidence persists the resolved UI contract set in `uiContractsCovered[]` on the story tree
  And every subsequent cycle reads that frozen set as the resolver and aggregator baseline

# AC-0001-0125-03
# Parent: US-0001-0125
Scenario: `show-spec` JSON payload contract (operator drift-analysis surface)
  Given any seeded `prototyping.json` record,
  When `qfai prototyping show-spec` runs,
  Then it emits a JSON payload that carries (a) `frozenSpecsCovered: string[]` (cycle-0 frozen primary spec ids), (b) `frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered"` discriminant so operators can detect legacy seed records without re-reading the file, (c) `frozenSurfaceUnion: string[] | null` (cycle-0 multi-spec UI-bearing UNION snapshot or `null` on legacy records), (d) `liveUiBearing: string[]` of bare spec IDs resolved by the same `resolveSurfaceUnion()` the cycle ≥ 1 drift gate consumes so the live scope is apples-to-apples with iterate's enforcement, and (e) an optional `primary?: {specId, specMdPath, source}` block present iff a primary spec resolves.
  And operator tooling that grepped the previous top-level keys (`.specId` / `.specMdPath` / `.source`) MUST migrate to the `primary` block (or to `liveUiBearing[]` for the bare ID list); the BREAKING migration is documented in the v1.8.10 CHANGELOG.
  And On the story tree the command is `qfai prototyping show-ui-contract`. Its payload carries `uiContractsCovered: string[]`, `frozenSurfaceUnion: string[]` of `CON-UI-NNNN` IDs, `liveUiBearing: string[]` from the resolver the cycle ≥ 1 drift gate uses, and an optional `primary?: {uiContractId, contractPath, source}` block, present iff a primary UI contract resolves, whose `source` is `config` or `contract-scan` and whose `contractPath` is repo-root-relative POSIX. `frozenSpecsCoveredSource` is not emitted. A malformed `uiContractsCovered` is exit `2` with the same "present but malformed" diagnostic, and the exit codes are unchanged.
```
