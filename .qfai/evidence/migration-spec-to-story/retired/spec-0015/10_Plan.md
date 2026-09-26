# 10 Plan

## Implementation approach

1. Agent cards: document 19 agents with standard contract structure and frontmatter in `.qfai/assistant/agent/*.md`
2. Orchestrator Protocol: define delegation rules, phase gates, and review handoff rules
3. Work Orders schema: define table format used across all skills
4. Review profiles: keep devils-advocate and pattern-doubler optional and advisory; require rationale for concrete pattern proposals without a numeric target
5. Agent routing: define mandatory, conditional, blocking, and parallel agents per skill phase
6. Skill integration: update all SKILL.md files to reference routing-driven delegation
7. RCP footer: update skill-specific footers for targeted rerun policy
8. Gate rules: retain routing-based gates and bound pattern proposals to business-flow, US, AC, EX and TC coverage

Use the routing and review-profile defaults in `packages/qfai/assets/defaults/` through the runtime reader described below. Empty and abstract-only artifacts return N/A, but missing mandatory pairings, independently required gates and product obligations, and the whole safety floor in `.agents/rules/minimal-implementation.md` § 2 remain required.

### Story-tree layout

The routing and review-profile defaults have one runtime reader. The work
runs in this order.

**P5 — the migration skill's routing entry.**

- `packages/qfai/assets/init/.qfai/assistant/manifest/agent-routing.yml`, where
  routing still lives at P5, gains the `qfai-migration-spec-to-story` entry:
  `plan`, `execution` and `review` in that order, with the mandatory and
  blocking agents BR-0015-0021 lists, and review profile `architecture-heavy`
  (EX-0015-0022).
- The skill's `roles:` and `routing-profile:` land with the skill itself, which
  spec-0018 owns.

**P6 — with the assistant-tree rename.**

1. **Defaults become package data.** `agent-routing.yml` and
   `review-profiles.yml` move from
   `packages/qfai/assets/init/.qfai/assistant/manifest/` to
   `packages/qfai/assets/defaults/`. That directory sits outside the tree
   `qfai init` copies, so no project receives either file (BR-0015-0019).
   `assets` is already in `package.json#files`, so it ships with no manifest
   change.
2. **One way to find them.** Code locates `assets/defaults/` as the sibling of
   the directory `getInitAssetsDir()` in `packages/qfai/src/shared/assets.ts`
   returns. No second resolver is written.
3. **Merge and resolve in one module.**
   `packages/qfai/src/core/validators/agentDefinition.ts` reads the two
   defaults and the `routing:` and `reviewProfiles:` values of the loaded
   config, then applies the overrides:
   - an override with a default's key replaces that entry whole;
   - an override with no matching key is added (BR-0015-0020, EX-0015-0020).

   The existing parse and shape checks run on the merged result, so an override
   naming an agent with no card is `QFAI-AGENT-008` as today (EX-0015-0021).
   `skillRoles.ts` keeps receiving the parsed routing from this module. Its
   lookups of the three project manifest files go, because none is read from a
   project. An unreadable default file is a packaging defect and propagates as
   an error.

4. **Config declares the keys, nothing more.**
   `packages/qfai/src/core/config.ts` parses `routing:` as a list and
   `reviewProfiles:` as a map, and declares no key for `devils-advocate` or
   `pattern-doubler`.
5. **The card is the only definition.**
   - The 19 cards under `agent/` carry `kind`, `domain`, `mission` as its own
     key, `replaces`, `owned_artifacts`, `tool_profile`, `permission_profile`
     and `specialization_tags` (BR-0015-0018, EX-0015-0019).
   - `packages/qfai/src/core/agentFrontmatter.ts` reads them, and
     `packages/qfai/src/core/codexAgentToml.ts` reads `kind` from the card.
   - `parseAgentFrontmatter` rejects a card with no `mission` key, so
     `qfai validate` reports it as `QFAI-AGENT-011` naming the card, as it
     reports a missing `description` today (TC-0015-0038).
   - `scripts/gen-codex-agents.mjs` generates each Codex agent TOML from its
     card.
   - `agent-catalog.yml` and `scripts/gen-agent-catalog.mjs` are removed, and
     with them the `developer_instructions` drift check in
     `agentDefinition.ts`.
6. **Text readers read one rule.** `rule/agent-selection.md` states once where
   the defaults are read: the installed package's `assets/defaults/`, with the
   `qfai.config.yaml` `routing:` and `reviewProfiles:` values applied over it.
   Every shipped card, skill and rule that names `agent-routing.yml` or
   `review-profiles.yml` — 47 files today — cites that rule instead and does
   not restate the path.
   - The same rule states that a local install of the package is a
     precondition: running through `npx qfai@latest` alone leaves no
     `assets/defaults/` to read. An agent that cannot find the installed
     package stops and names the install command rather than routing without
     the defaults (user answer U3). The init contract states the same in
     `.qfai/contracts/cli/qfai-init.md#configuration`.
   - `README.md` and `packages/qfai/README.md` stop presenting
     `npx qfai@latest <command>` as a way to run QFAI without installing it,
     and name the local install instead. `scripts/check-readme-alignment.mjs`
     holds the two copies line for line, so both change in the same commit.
7. **The shipping lint follows the files.**
   `packages/qfai/scripts/lint-shipping.ts` adds `assets/defaults` to its scan
   roots in the same change. The two files leave `assets/init/**`, the only
   asset root it scans today, and spec-0003's NFR-C0005 keeps the guard's
   breadth from shrinking. The scan list stated in
   `.agents/rules/distributed-surface.local.md` changes with it. The
   post-build guard already covers the directory through
   `npm pack --dry-run`.
8. **Everything else in the move.**
   - The constitution files and the shared baselines move to `rule/`.
   - `scripts/check-review-profile-consistency.mjs` reads
     `packages/qfai/assets/defaults/`.
   - Decision records move to `.qfai/evidence/decision/`:
     `packages/qfai/src/core/decisionRecord.ts` writes there,
     `packages/qfai/src/cli/commands/auditLog.ts` lists it, the `audit log`
     help line in `packages/qfai/src/cli/main.ts` names it, and the managed
     block in `packages/qfai/src/core/gitignore.ts` keeps it tracked.
   - The approved REMOVE row takes `catalog/review-gate.rules.yml` and the
     handling of an adopter's `review-profiles.yml`.

**P7 — with the cutover.** Approval references in the cards and skills point
to `decisions.md` rows.

**No architectural element.** The override merge has one code consumer,
`agentDefinition.ts`: `skillRoles.ts` is fed by it, and the add-only routing
merge in `packages/qfai/src/core/manifest/routingPhaseMerge.ts` retires at P6.
So the merge stays inside that module. `assets/defaults/` is data, not code.

**Alternatives rejected:**

- Merging an override field by field. BR-0015-0020 replaces entries whole.
- Defaults as TypeScript constants. A card or skill cannot read them.
- A default entry in each skill's frontmatter. The profiles would still need a
  file, and one table would be split across every skill.
- Keeping the defaults under `assets/init/`. Init would copy them into every
  project, which BR-0015-0019 forbids.

## Test approach

- Unit tests: agent contract structure validation, routing/profile integrity, gate rule parsing
- Integration tests: skill-agent integration, RCP footer consistency, Codex TOML parity
- Concrete-pattern integration: reuse `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts` for rationale, concrete scope, N/A and catalog authority; real init must preserve legacy profile bytes without force and with force
- Asset tests: required/forbidden phrase guardrails across docs, wrappers, and skill files

### Story-tree layout

- **L1 unit.**
  - TC-0015-0040 calls the merge function in `agentDefinition.ts`, exported
    from that module for the test and not from the package entry.
  - TC-0015-0042 reads the schema in `config.ts`.
- **L3 integration.**
  - TC-0015-0039 runs `qfai validate` on a fixture project with no override
    and no manifest file.
  - TC-0015-0041 runs it with a `routing:` override naming an agent that has
    no card.
  - TC-0015-0037 reads the 19 cards and the generated Codex TOML.
  - TC-0015-0038 plants each violation in a copied tree. `qfai validate`
    catches the card with no `mission` key as `QFAI-AGENT-011`. The other
    three have no validator family, so the test's own oracle reads the product
    artifacts (Phase 3 node P3-D11): the card frontmatter, the shipped asset
    tree and the `qfai init` tree, and each Codex TOML against the
    `renderCodexAgentToml` output for its card.
  - TC-0015-0043 reads the shipped routing defaults and the migration skill's
    frontmatter.
- The integration legs run against the built `dist/`, so the defaults are
  located from the package's public entry as well as from `src/`.
- Cases that must not share one:
  - An override that omits a field its default carries. It proves the entry
    is replaced whole, which a full override cannot tell from a field merge.
  - The same for a `reviewProfiles:` entry. Routing is a list keyed by skill
    and profiles a map keyed by name, so one case cannot cover both.
  - An override whose key matches no default, which is added beside the
    defaults.
  - Each planted violation of TC-0015-0038 on its own ledger row: no
    `mission` key (TDD-0055), a mission equal to its `description`
    (TDD-0061), an `agent-catalog.yml` in the tree (TDD-0062), and a Codex
    TOML that differs from its generated output (TDD-0063).
- Integration cases go in
  `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts` unless
  `/qfai-atdd` records another file in the ledger.

## NFR approach

- NFR-0003 (the first delegation failure hard-stops the stage) is met by the
  hard stop in the shared delegation baseline. A breach shows as a stage that
  continues after its first required delegation failed.

### Story-tree layout

- NFR-0001 (routing stays centralised) is met by one defaults source plus
  overrides. A breach shows as any of:
  - an `agent-routing.yml` or `review-profiles.yml` in a fresh `qfai init`
    tree (TC-0015-0039);
  - a routing entry in the shipped tree outside `packages/qfai/assets/defaults/`;
  - a shipped card, skill or rule naming either file rather than citing
    `rule/agent-selection.md`, counted by `skillDocReferences.ts`.
- NFR-0002 (specialist responsibilities stay explicit) is met by the eight
  frontmatter fields on every card. A breach shows as TC-0015-0037 or
  TC-0015-0038 failing, or as a Codex agent TOML that differs from the output
  generated from its card.
- NFR-0003 is unchanged by the move. The baseline moves to `rule/` word for
  word, and a breach shows as one of its existing tests failing once they read
  the new path.
- The distributed-surface guard keeps its breadth over the moved defaults
  (spec-0003 NFR-C0005). A breach shows as an internal ID planted in
  `packages/qfai/assets/defaults/agent-routing.yml` passing
  `pnpm -C packages/qfai lint:shipping`.

## Dependencies

- Requires: QFAI skill framework (SKILL.md structure)
- Consumed by: all QFAI skills reference this framework

### Story-tree layout

- Requires `getInitAssetsDir()` in `packages/qfai/src/shared/assets.ts`, which
  locates the package's assets from `src/`, `dist/` and the built entry.
- Requires spec-0003's P6 init to stop writing `manifest/`. A project that
  edited its manifest files reaches `qfai.config.yaml` through migration step 3
  (spec-0018).
- Consumed by `/qfai-configure` (spec-0009), which writes the overrides this
  spec resolves.

## Risk mitigation

- Routing drift between SKILL.md and steering SSOT can break delegation
- Mitigation: central routing files become the only dispatch SSOT; tests validate Codex/init parity
- Adoption: preserved numeric targets are ineffective once the current catalog is adopted. Init's manifest-preservation behavior is unchanged; a project retaining an older catalog still needs the current catalog to receive this bound.
- Execution: reset only the two approved changed ledger rows and preserve their old evidence as history. Newly seeded rows remain todo until the executing owner supplies actual test identities and evidence; package regression success is not whole-workflow completion.

### Story-tree layout

| Risk                                                                                                                                                                                         | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                                       | Trigger to act                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cards and skills lose the routing once no project holds a routing file                                                                                                                       | med / high          | `rule/agent-selection.md` states the defaults path once, and every text reader cites it                                                                                                                                                                                          | A shipped card or skill naming `manifest/agent-routing.yml` or `manifest/review-profiles.yml` after the P6 change                                          |
| Under Yarn Plug'n'Play there is no `node_modules/qfai/` directory, so the path the rule names does not exist for an agent reading files; code still resolves it through `getInitAssetsDir()` | low / med           | The path lives in one rule, so another install layout is one edit; no code reader depends on the text path                                                                                                                                                                       | An agent failing to read the defaults in a project that has `.pnp.cjs` and no `node_modules/qfai/`                                                         |
| The defaults leave the only asset root the pre-build lint scans, so an internal ID in them ships past that lint                                                                              | med / med           | `lint-shipping.ts` gains the `assets/defaults` root in the same change; the post-build guard covers it through `npm pack --dry-run`                                                                                                                                              | A change that adds a file under `packages/qfai/assets/defaults/` while `lint-shipping.ts` does not scan that root                                          |
| The override merge copies fields from the default into a replaced entry                                                                                                                      | low / high          | TC-0015-0040 has a case whose override omits a field the default carries                                                                                                                                                                                                         | TC-0015-0040 finding a default field in a replaced entry                                                                                                   |
| A project that runs QFAI only through `npx qfai@latest` has no installed package, so an agent reading files finds no routing defaults                                                        | med / high          | `rule/agent-selection.md` and `.qfai/contracts/cli/qfai-init.md#configuration` state the local install as a precondition; an agent that cannot find the package stops and names the install command; both READMEs drop the no-install guidance in the P6 commit (user answer U3) | An agent routing without the defaults, or either README still offering `npx qfai@latest <command>` as a way to run without installing, after the P6 commit |
| 13 `Owning module` cells name `agents/`, `constitution/`, `catalog/` or `manifest/` paths that P6 renames or removes                                                                         | high / low          | The P6 change repoints them in the same commit: TDD-0006 to `packages/qfai/assets/defaults/`, the rest to `agent/` and `rule/`; TDD-0007 follows the approved REMOVE row. TDD-0060 already names `packages/qfai/assets/defaults/agent-routing.yml`                               | A ledger cell naming a removed path after the rename commit                                                                                                |

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0015-0013..0014 per AC-0015-0013..0014:
  1. Reviewer-Gate adds `R-CERTIFY-VERIFY-CIRCULAR` (severity error) structural check: if a future PR wires `certify` to read a validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, the gate fires with a 3-part justification (offending certify code path, offending validator-output file/profile, option-B contract clause violated).
  2. Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with the 3-part justification SSOT shared with spec-0004's validate ingestion (one contract, two enforcers).
- Pair with spec-0004 wave: the validate-ingestion gate in spec-0004 is the rejector; this spec defines the emitter shape.

## CHG-006 (2026-05-27) — second-wave agent-collective + cross-skill governance

- Implement REQ-0158 / 0160 / 0161 / 0168 / 0171 / 0172 / 0173 per AC-0015-0015..0021:
  1. Add a `R-AUTOPILOT-POLICY-MISSING` Reviewer-Gate check that asserts every SKILL.md carries the `## Default Autopilot Policy` section with the three DR-0269 buckets (auto-decide / ask-user / hard-required); fail at severity error with a non-empty justification when the section is absent OR is present but missing one or more required buckets (heading-only / partial population — the `justification:` MUST name the missing bucket(s)).
  2. In the skill body, write an envelope-deviation decision record to `.qfai/evidence/decision/<ISO8601-ts>.json` when an `AskUserQuestion` names one of the four DR-0270 contexts; keep the path tracked in version control by negating it in the managed `.gitignore` block (unlike the regenerable `.qfai/evidence/prototyping/`).
  3. Reference the canonical CLI-HANDOFF schema (`packages/qfai/src/core/schemas/handoff.ts`, doc `references/handoff.md`) from every handoff writer; add the `R-HANDOFF-SCHEMA-DRIFT` check covering non-conforming writes and asymmetric SSOT-sync Pair IV edits; accept legacy files with `D-HANDOFF-LEGACY-FORMAT` during the window.
  4. Register the eight-code catalog (BR-0015-0013) as membership only — the catalog declares no per-code severity column, each code keeping the severity its own detector emits (`R-DESIGN-MD-PATCH-OUT-OF-ZONE` stays warning per REQ-0151) — with a mandatory non-empty `justification:` on every entry; rely on the shared `qfai validate` advisory-failing ingestion, which rejects an empty / whitespace-only value at severity error for every one of the eight. Do not touch the OQ-0119-deferred prompt-augmentation timing.
  5. Wire `qfai audit log` (CLI-AUDIT) per DR-0271 filters + `--format table|json`; wire `qfai handoff upgrade` to emit a conforming handoff preserving originals under `legacy:`.
  6. Realign `references/*.md` + each SKILL.md in the same atomic PR as the OQ-0152..0157 implementation; rely on `qfai validate --report` for the zero-stale-reference obligation (a warning per stale reference).
- Cross-spec: the new finding-code catalog severity/justification SSOT and the doc-realignment rule are recorded in `_policies` (REQ-0168 / REQ-0173); spec-0015 owns the cross-skill governance surface. CLI surfaces (`qfai-audit.md`, `references/handoff.md`) and the handoff TS-module SSOT live under authoring zones (not distributed).
