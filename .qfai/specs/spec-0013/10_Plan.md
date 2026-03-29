# 10 Implementation Plan — spec-0013 (QFAI v1.5.7 UI/UX Definition & Review Framework)

> **How-only.** What and Why live in 01_Spec.md. This file is the single source of truth for implementation decisions.

---

## 1. Implementation Strategy

### 1.1 Module decomposition

All new TypeScript modules are created under `packages/qfai/src/core/` following existing conventions (pure async functions returning `Issue[]`, no side effects).

#### New validator modules (`packages/qfai/src/core/validators/`)

| Module file                  | Responsibility                                                                                                                                                                                                      | REQ coverage                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `designToken.ts`             | Design Token YAML schema validation (DTCG, primitive→semantic reference resolution, circular ref detection, platform enum check)                                                                                    | REQ-0001, REQ-0002, REQ-0003 |
| `htmlMock.ts`                | HTML+CSS Visual Mock validation (external dep check, CSS fallback, token comment, state/responsive variant, contrast ratio, touch target, HTML syntax, XSS script tag)                                              | REQ-0004, REQ-0005, REQ-0006 |
| `mermaidScreenFlow.ts`       | Mermaid screen flow validation (stateDiagram-v2 syntax, flowchart syntax, unlabeled transition warning, fence enforcement, v1→v2 migration warning)                                                                 | REQ-0007, REQ-0008           |
| `bpApDb.ts`                  | Best practice / anti-pattern DB structure validation (ID format, required fields, platform layer, duplicate ID detection)                                                                                           | REQ-0009, REQ-0010           |
| `platformDetection.ts`       | Platform detection and rule set selection (priority: CLI arg → config file → inference from project files → common fallback; cross-platform merge for Electron)                                                     | REQ-0013, REQ-0002           |
| `uiDefinitionConsistency.ts` | Cross-definition consistency checker (Token↔HTML Mock fallback value mismatch, UI Contract↔HTML Mock screen ID alignment, consumption protocol order enforcement)                                                   | REQ-0015, REQ-0014           |
| `researchSummary.ts`         | Research Summary schema validation (source citation rate, freshness ≥80% within 2 years, reflection apply presence, auto-overwrite prohibition check)                                                               | REQ-0017, REQ-0023           |
| `agentDefinition.ts`         | Expert sub-agent definition file structure check (6 required sections, Phase Activities 4-phase completeness, Collaboration Rules soft-separation statement, review-roster entry structure for Integrated Reviewer) | REQ-0019–REQ-0025            |

#### New parser/shared modules (`packages/qfai/src/core/`)

| Module file              | Responsibility                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse/designToken.ts`   | Parse and resolve Design Token YAML into a flat value map; expose `resolveTokenRef(yaml, path): string \| Error`                                    |
| `uiux/platformRules.ts`  | Load and merge platform-specific BP/AP rule sets from `.qfai/contracts/design/`; expose `getRulesForPlatform(platform): RuleSet`                    |
| `uiux/contrastRatio.ts`  | Pure function: `computeContrastRatio(fg: string, bg: string): number`; no external DOM dependency                                                   |
| `uiux/htmlMockParser.ts` | jsdom-based parser wrapper: extract inline styles, `var()` usages, element dimensions, `data-state` / `data-breakpoint` attributes from HTML string |

#### New documentation/config artifacts (not TypeScript code)

| File path                                            | Purpose                                                                 | REQ coverage |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------ |
| `.qfai/contracts/design/design-tokens.schema.yaml`   | W3C DTCG-compliant schema template with 3-layer structure               | REQ-0001     |
| `.qfai/contracts/design/best-practices.schema.yaml`  | BP DB schema with 2-layer (common + platform-specific) structure        | REQ-0009     |
| `.qfai/contracts/design/anti-patterns.schema.yaml`   | AP DB schema with severity enum and detection_method field              | REQ-0010     |
| `.qfai/assistant/agents/uiux-expert.md`              | UI/UX Expert sub-agent definition                                       | REQ-0019     |
| `.qfai/assistant/agents/design-expert.md`            | Design Expert sub-agent definition                                      | REQ-0020     |
| `.qfai/assistant/agents/screen-transition-expert.md` | Screen Transition Expert sub-agent definition                           | REQ-0021     |
| `.qfai/assistant/agents/navigation-expert.md`        | Navigation Expert sub-agent definition                                  | REQ-0022     |
| `.qfai/assistant/agents/integrated-uiux-reviewer.md` | Integrated UI/UX Reviewer sub-agent definition (review-roster entry 13) | REQ-0024     |

### 1.2 Integration points with existing code

- **`packages/qfai/src/core/validate.ts`**: Add calls to all new validator functions in `validateProject()`. New validators append to the `findings` array using the same `Issue[]` return contract. UI/UX validators are grouped after `validateContracts()`. Add `--platform` option passthrough from CLI to
  `ValidationOptions`.

- **`packages/qfai/src/core/validators/index.ts`**: Export all new validator functions.

- **`packages/qfai/src/core/config.ts`**: Add optional `uiux` section to `QfaiConfig` to hold `platform` override, `designTokensDir` (default: `.qfai/contracts/design/`), and `htmlMockTimeout` (default: 2000ms). All fields optional for backward compatibility (NFR-0001).

- **`packages/qfai/src/cli/commands/validate.ts`**: Add `--platform <web|windows|mobile-ios|mobile-android>` CLI option. Pass value into `ValidationOptions`.

- **`packages/qfai/src/core/validators/discussionVisuals.ts`**: Extend to call `validateHtmlMock()` from `htmlMock.ts` when a Screen Mock section is detected, replacing the current presence-only check with structural validation.

- **`packages/qfai/src/core/validators/assistantAssets.ts`**: Extend to call `validateAgentDefinition()` for the four new expert agent files plus `integrated-uiux-reviewer.md` in `.qfai/assistant/agents/`.

- **`.qfai/assistant/agents/ui-ux-reviewer.md`**: Extend the existing file with the new spec-0013 checklist sections (auto/manual split, platform-specific items). The existing guardrail checklist is preserved; new sections are appended.

- **review-roster** (location to be confirmed by `qfai validate` run): Add `integrated-uiux-reviewer` as entry 13 per AC-0013-0026 and BR-0013-0044.

### 1.3 Dependency additions

| Package       | Version constraint | Reason | Notes                                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| None required | —                  | —      | All validation uses existing `jsdom ^26.1.0` for HTML parsing and `yaml ^2.5.1` for YAML parsing, both already in dependencies. Contrast ratio computation is a pure math function with no additional library. Mermaid syntax parsing uses regex extraction from existing `mermaidUtils.ts` patterns. |

No new runtime npm packages are required. jsdom CSS layout limitations are addressed by extracting `width`/`height` from inline `style` attributes rather than relying on computed layout (see Risk 4 in section 4).

---

## 2. Implementation Phases

Phases are ordered by technical dependency. A phase must not begin until all phases it depends on have shipped to the working branch.

### Phase A: Design Token parser & validator

**Covers**: REQ-0001, REQ-0002, REQ-0003, REQ-0016
**ACs**: AC-0013-0001, AC-0013-0002, AC-0013-0003
**BRs**: BR-0013-0001–BR-0013-0007, BR-0013-0046
**TCs**: TC-0013-0001–TC-0013-0010

**Steps**:

1. Create `packages/qfai/src/core/parse/designToken.ts`.
   - Export `parseDesignToken(yaml: string): DesignTokenParseResult` — returns flat primitive map and semantic resolution map.
   - Implement `{primitive.xxx.yyy}` reference format validation (BR-0013-0004).
   - Implement circular reference detection via DFS with max depth 10 (BR-0013-0006).
   - Emit friendly YAML parse error with line/column (BR-0013-0046).
2. Create `packages/qfai/src/core/validators/designToken.ts`.
   - Export `validateDesignToken(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Glob `.qfai/contracts/design/design-tokens.yaml` (and any `design-tokens.*.yaml` variants).
   - Validate required sections (BR-0013-0001), type enum (BR-0013-0002), non-empty value (BR-0013-0003).
   - Validate platform enum `web|windows|mobile-ios|mobile-android`, emit warning for unknown values (BR-0013-0007).
   - Resolve all `{...}` references; report `Unresolved token reference: {path} at {source}` (BR-0013-0005).
3. Register in `validate.ts` and `validators/index.ts`.
4. Create schema template `.qfai/contracts/design/design-tokens.schema.yaml` with 3-layer annotation comments.

**Depends on**: nothing (first phase).

---

### Phase B: HTML+CSS Mock validator

**Covers**: REQ-0004, REQ-0005, REQ-0006
**ACs**: AC-0013-0004, AC-0013-0005, AC-0013-0006, AC-0013-0013 (partial)
**BRs**: BR-0013-0008–BR-0013-0013, BR-0013-0025, BR-0013-0026, BR-0013-0027, BR-0013-0045, BR-0013-0048
**TCs**: TC-0013-0011–TC-0013-0017, TC-0013-0028–TC-0013-0032

**Steps**:

1. Create `packages/qfai/src/core/uiux/htmlMockParser.ts`.
   - Accept HTML string; use jsdom for DOM parsing.
   - Extract: external URL references (link/script/img src), inline `var()` usages, `data-state`/`data-breakpoint` attributes, inline style width/height values, color/background-color values.
   - Return structured `HtmlMockParseResult`; never throws (catches jsdom errors, surfaces as `Issue`).
2. Create `packages/qfai/src/core/uiux/contrastRatio.ts`.
   - Pure function `computeContrastRatio(fg: string, bg: string): number` implementing WCAG relative luminance formula.
   - Accepts hex `#rrggbb` and `rgb(r,g,b)` formats only (CSS custom properties are not resolvable at this layer).
3. Create `packages/qfai/src/core/validators/htmlMock.ts`.
   - Export `validateHtmlMock(root: string, platform: string, config: QfaiConfig): Promise<Issue[]>`.
   - Discover HTML Mock blocks inside `.qfai/discussion/**/*.md` and `.qfai/specs/**/*.md` via the `Screen Mock (HTML+CSS)` heading pattern (reuses regex from existing `discussionVisuals.ts`).
   - Enforce: no external URL references (BR-0013-0008, error), CSS fallback required (BR-0013-0009, error), token comment annotation (BR-0013-0010, warning), no `<script>` tags (TC-0013-0014, error).
   - Enforce state variant identifiers: `data-state` or comment format (BR-0013-0011); require at minimum `default` + `error` variants (BR-0013-0012, warning for missing `error`).
   - Enforce responsive breakpoint identifiers when all three breakpoints are present (BR-0013-0013).
   - Run contrast ratio check using `contrastRatio.ts` on extracted color pairs (BR-0013-0026, warning).
   - Run touch target check: mobile platforms emit error for `<44px`, others emit warning (BR-0013-0027).
   - Run HTML syntax error check via jsdom parse errors (BR-0013-0045).
   - Enforce idempotency: no timestamp or random values in output (BR-0013-0048).
   - Performance: accumulate total elapsed time; emit warning if >2000ms with partial results (BR-0013-0025).
4. Register in `validate.ts` and `validators/index.ts`.

**Depends on**: Phase A (platform attribute from design token informs platform-specific rules in htmlMock).

---

### Phase C: Mermaid screen flow integration

**Covers**: REQ-0007, REQ-0008
**ACs**: AC-0013-0007, AC-0013-0008, AC-0013-0009
**BRs**: BR-0013-0014–BR-0013-0017, BR-0013-0047
**TCs**: TC-0013-0018–TC-0013-0022

**Steps**:

1. Create `packages/qfai/src/core/validators/mermaidScreenFlow.ts`.
   - Export `validateMermaidScreenFlow(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Reuse `extractFencedCodeBlocks()` and `containsMermaidSyntax()` from existing `mermaidUtils.ts`.
   - Enforce `stateDiagram-v2` as first line for transition diagrams; emit migration warning for `stateDiagram` v1 (BR-0013-0015).
   - Enforce `flowchart TD` or `flowchart LR` for navigation diagrams (BR-0013-0016).
   - Detect Mermaid content outside fences (TC-0013-0019); emit warning, continue validation (BR-0013-0047).
   - Parse `-->` transitions in `stateDiagram-v2` blocks; emit `Unlabeled transition: StateA --> StateB` warning for edges missing `: <condition>` label (BR-0013-0017, AC-0013-0009).
   - On Mermaid syntax error: emit error with line reference, do not abort document-level validation (BR-0013-0047).
   - This validator supplements (not replaces) existing `validateMermaidEnforcement()` and `validateDiscussionMermaid()`.
2. Register in `validate.ts` and `validators/index.ts`.

**Depends on**: Phase A (none direct), but logically grouped after Phase B to share file-scanning infrastructure patterns.

---

### Phase D: Best practice / anti-pattern DB engine

**Covers**: REQ-0009, REQ-0010
**ACs**: AC-0013-0010, AC-0013-0011, AC-0013-0012
**BRs**: BR-0013-0018–BR-0013-0024
**TCs**: TC-0013-0023–TC-0013-0027, TC-0013-0056, TC-0013-0057

**Steps**:

1. Create schema files `.qfai/contracts/design/best-practices.schema.yaml` and `.qfai/contracts/design/anti-patterns.schema.yaml`.
   - BP required fields: `id` (BP-XXXX), `category`, `title`, `description`, `severity` (critical|major|minor), `auto_check` (boolean), `validation_method`, `platform` (common|web|windows|mobile-ios|mobile-android).
   - AP required fields: `id` (AP-XXXX), `category`, `title`, `description`, `severity` (critical|major|minor), `detection_method` (auto|manual), `fix_guidance`, `platform`.
2. Create `packages/qfai/src/core/uiux/platformRules.ts`.
   - Export `loadRuleSet(contractsDir: string, platform: string): Promise<RuleSet>`.
   - Glob `best-practices.*.yaml` and `anti-patterns.*.yaml` under `.qfai/contracts/design/`.
   - Merge `platform: common` rules with `platform: <detected>` rules; exclude other platform rules (BR-0013-0024).
   - Zero core changes for new platform support: file discovery is glob-based, no hardcoded platform list in engine (NFR-0002, TC-0013-0057).
3. Create `packages/qfai/src/core/validators/bpApDb.ts`.
   - Export `validateBpApDb(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Validate ID format regex `^BP-\d{4}$` / `^AP-\d{4}$`; duplicate IDs are errors (BR-0013-0018, BR-0013-0021).
   - Validate required fields presence and enum values (BR-0013-0019, BR-0013-0022).
   - Validate 2-layer structure (common + platform-specific) is coherent (BR-0013-0020, BR-0013-0023).
   - Performance test fixture (TC-0013-0056): 500-entry DB must complete under 2s total validate budget.
4. Register in `validate.ts` and `validators/index.ts`.

**Depends on**: Phase A (yaml parsing pattern). Phase E depends on this phase for rule loading.

---

### Phase E: Platform detection & adaptation

**Covers**: REQ-0013, REQ-0002
**ACs**: AC-0013-0003, AC-0013-0012, AC-0013-0015, AC-0013-0016
**BRs**: BR-0013-0007, BR-0013-0020, BR-0013-0023, BR-0013-0024, BR-0013-0030, BR-0013-0031
**TCs**: TC-0013-0010, TC-0013-0027, TC-0013-0035, TC-0013-0036, TC-0013-0054, TC-0013-0057, TC-0013-0058

**Steps**:

1. Create `packages/qfai/src/core/validators/platformDetection.ts`.
   - Export `detectPlatform(root: string, config: QfaiConfig, cliPlatform?: string): Promise<PlatformDetectionResult>`.
   - Priority order (BR-0013-0030): CLI arg → `qfai.config.yaml` `uiux.platform` field → project file inference → common fallback.
   - Inference heuristics: presence of `pubspec.yaml` → `mobile` family; `react-native` in `package.json` dependencies → `mobile`; Electron dependency → cross-platform merge (TC-0013-0058); default → `web`.
   - Unknown platform: emit `warning` with message `Unknown platform: <X>. Falling back to common rules.` (BR-0013-0031, AC-0013-0016).
   - Cross-platform (Electron): emit `warning: Cross-platform project detected.`, merge common + web + windows rules (TC-0013-0058).
2. Expose `PlatformDetectionResult` type in `types.ts` (or inline in `platformDetection.ts`).
3. Thread `platform` result through `validateProject()` → all validators that need platform context (`htmlMock`, `bpApDb`, `designToken`).

**Depends on**: Phase D (rule loading uses platform value).

---

### Phase F: UI definition consistency checker

**Covers**: REQ-0015
**ACs**: AC-0013-0017, AC-0013-0018
**BRs**: BR-0013-0032–BR-0013-0035
**TCs**: TC-0013-0037–TC-0013-0040, TC-0013-0055

**Steps**:

1. Create `packages/qfai/src/core/validators/uiDefinitionConsistency.ts`.
   - Export `validateUiDefinitionConsistency(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Load resolved Design Token map from `parse/designToken.ts`.
   - Load UI Contract YAML files from `.qfai/contracts/ui/` (existing location); extract `screens[].id` entries.
   - Load HTML Mock blocks from spec/discussion packs.
   - Check 1 — Token↔Mock fallback mismatch: for each `var(--token-name, fallback)` + `/* token: {semantic.xxx} */` pair, resolve the token to its current value and compare to fallback. Emit
     `warning: Fallback value mismatch: <fallback> != resolved token value <resolved>`
     (BR-0013-0034, AC-0013-0018, TC-0013-0039).
   - Check 2 — Contract↔Mock screen alignment: for each `screen:` ID in UI Contract YAML, verify a corresponding HTML Mock section exists. Emit `warning: HTML Mock missing for screen: <id>` for orphans (BR-0013-0035, TC-0013-0040).
   - Check 3 — Consumption protocol order: validate that downstream skill invocations (if captured in evidence) follow `Design Token → UI Contract → HTML Mock → Mermaid Flow` order. Emit warning for non-standard order (BR-0013-0032, TC-0013-0037).
2. Register in `validate.ts` and `validators/index.ts`.

**Depends on**: Phase A (token resolution), Phase B (HTML Mock parsing).

---

### Phase G: Downstream skill protocol

**Covers**: REQ-0014
**ACs**: AC-0013-0017
**BRs**: BR-0013-0032, BR-0013-0033
**TCs**: TC-0013-0037, TC-0013-0038

**Steps**:

1. Document the consumption protocol in `.qfai/assistant/steering/ui-definition-protocol.md` (new steering doc).
   - Section: Reading order (1. Design Token → 2. UI Contract → 3. HTML Mock → 4. Mermaid Flow).
   - Section: Fallback rules when a definition file is missing (BR-0013-0033): warn + continue for 1–3 missing; error only when all 4 are absent.
   - Section: Priority and override semantics (later definitions supplement, not override, earlier ones).
2. The `uiDefinitionConsistency.ts` validator (Phase F) enforces the structural side of this protocol automatically. Phase G adds the human-readable protocol document that skills must read.
3. No new TypeScript module required; the protocol is enforced via Phase F.

**Depends on**: Phase F (consistency checker implements the machine-enforceable side).

---

### Phase H: `qfai validate` rule additions

**Covers**: REQ-0011
**ACs**: AC-0013-0013, AC-0013-0014
**BRs**: BR-0013-0025, BR-0013-0026, BR-0013-0027, BR-0013-0028, BR-0013-0029, BR-0013-0045, BR-0013-0048
**TCs**: TC-0013-0028–TC-0013-0034

**Steps**:

1. Integrate all Phase A–F validators into `validateProject()` in `validate.ts` under a timed wrapper.
   - Accumulate total elapsed time for UI/UX validation block; emit warning if over 2000ms budget (NFR-0006, BR-0013-0025).
   - Use `performance.now()` (Node.js built-in) — no external timer library.
2. Implement `auto_check` flag split in validator output:
   - `bpApDb.ts` and `htmlMock.ts` emit issues with `rule` field set to the BP/AP entry's `id` when `auto_check: true`.
   - The `ui-ux-reviewer.md` agent definition references only `auto_check: false` rules in its manual checklist section.
3. Enforce idempotency: no `Date.now()` or random values in Issue messages (BR-0013-0048). Achieved by keeping all messages purely derived from input content.
4. Add `## Auto Check Results` and `## Manual Review Results` section markers to the relevant evidence template (BR-0013-0029).

**Depends on**: Phases A–F (all validators must exist before wiring).

---

### Phase I: `ui-ux-reviewer` enhancement

**Covers**: REQ-0012
**ACs**: AC-0013-0013, AC-0013-0014
**BRs**: BR-0013-0028, BR-0013-0029
**TCs**: TC-0013-0033, TC-0013-0034

**Steps**:

1. Edit `.qfai/assistant/agents/ui-ux-reviewer.md`.
   - Add section `## Auto-check scope (qfai validate)` listing rule IDs with `auto_check: true`. These are excluded from manual checklist.
   - Add section `## Manual review checklist (spec-0013)` listing rule IDs with `auto_check: false`.
   - Add section `## Output sections` specifying that results must be written under `## Auto Check Results` (reference only, owned by `qfai validate`) and `## Manual Review Results` (owned by reviewer).
   - Preserve all existing content (guardrail checklist, Stop conditions, Sign-off checklist, etc.).
2. Validate that the extended agent definition still passes `validateAgentDefinition()` (Phase J).

**Depends on**: Phase D (BP/AP DB defines which rules are auto vs. manual).

---

### Phase J: Expert sub-agent definitions

**Covers**: REQ-0019, REQ-0020, REQ-0021, REQ-0022, REQ-0024, REQ-0025
**ACs**: AC-0013-0021, AC-0013-0022, AC-0013-0023, AC-0013-0024, AC-0013-0025, AC-0013-0026
**BRs**: BR-0013-0040–BR-0013-0044
**TCs**: TC-0013-0045–TC-0013-0051

**Steps**:

1. Create five agent definition Markdown files in `.qfai/assistant/agents/`:
   - `uiux-expert.md` (REQ-0019): Role = UI/UX usability and user journey design.
   - `design-expert.md` (REQ-0020): Role = Visual design, typography, color, Design Token governance.
   - `screen-transition-expert.md` (REQ-0021): Role = Mermaid screen flow, state transitions, edge condition labeling.
   - `navigation-expert.md` (REQ-0022): Role = Navigation structure (flowchart), IA, breadcrumbs, tabs.
   - `integrated-uiux-reviewer.md` (REQ-0024): Role = Cross-specialist integration review with service-wide UX coherence.
   - Each file must contain exactly these 6 sections (BR-0013-0040): `## Role`, `## Responsibilities` (≥3 items), `## Research-First Protocol`, `## Phase Activities`, `## Output Schema`, `## Collaboration Rules`.
2. `## Phase Activities` in each file must contain subsections for `discussion`, `SDD`, `prototyping`, `ATDD` with ≥1 bullet each (BR-0013-0041, AC-0013-0023).
3. `## Collaboration Rules` in each file must state: overlapping domains are handled collaboratively with final arbitration by Integrated UI/UX Reviewer (BR-0013-0042, AC-0013-0024).
4. `## Research-First Protocol` must reference the shared protocol schema from
   Phase L (sources.id required, published within 2 years ≥80%, reflection.apply
   ≥1 entry) (BR-0013-0037, BR-0013-0038, AC-0013-0022).
5. `integrated-uiux-reviewer.md` `## Output Schema` must include a
   `service_wide_impact` field on each review item (BR-0013-0043,
   AC-0013-0025).
6. Add `integrated-uiux-reviewer` to `review-roster.yml` as entry 13 with
   fields: `id: integrated-uiux-reviewer`, `scope: [discuss, require, sdd]`,
   `must_check` ≥3 items including cross-specialist consistency and overall
   service usability, `can_be_na: true`,
   `na_rule: "UI/UX 変更がない場合のみ N/A 可"` (BR-0013-0044, AC-0013-0026).
7. Create `packages/qfai/src/core/validators/agentDefinition.ts`.
   - Export `validateAgentDefinition(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Validate presence of all five new agent files (AC-0013-0021).
   - Validate 6-section structure in each file (BR-0013-0040).
   - Validate 4-phase completeness in `Phase Activities` (BR-0013-0041).
   - Validate `Collaboration Rules` soft-separation statement (BR-0013-0042).
   - Validate `review-roster.yml` entry for `integrated-uiux-reviewer` (BR-0013-0044).
8. Register `validateAgentDefinition` in `validate.ts` and `validators/index.ts`. Extend existing `validateAssistantAssets()` or call as a peer.

**Depends on**: Phase L (Research-First Protocol schema referenced in Phase Activities).

---

### Phase K: CLI UX guidelines

**Covers**: REQ-0018
**ACs**: AC-0013-0005 (referenced in US-0013-0005)
**TCs**: (AC-0013-0014 covers output format separation)

**Steps**:

1. Create `.qfai/assistant/steering/cli-ux-guidelines.md` (new steering doc).
   - Section: Output format (structured text, no timestamps in Issue messages, `## Auto Check Results` / `## Manual Review Results` section naming).
   - Section: Error message format (`<CODE>: <message> [at <file>:<line>]`).
   - Section: Warning vs. error severity decision matrix for UI/UX rules.
   - Section: `--platform` option semantics and accepted values.
2. No TypeScript changes required. The guidelines are enforced through the validators already implemented in Phases A–H.

**Depends on**: Phase H (all validators must be defined to document their output format).

---

### Phase L: Research-First Protocol

**Covers**: REQ-0017, REQ-0023
**ACs**: AC-0013-0019, AC-0013-0020, AC-0013-0022
**BRs**: BR-0013-0036–BR-0013-0039
**TCs**: TC-0013-0041–TC-0013-0044, TC-0013-0046

**Steps**:

1. Create `.qfai/assistant/steering/research-first-protocol.md` (new steering doc).
   - Section: Trigger — `/qfai-discussion` command execution (BR-0013-0036).
   - Section: Output schema for `research_summary` (fields: `sources[]` with `id`, `title`, `url`, `published`; `best_practices[]`; `anti_patterns[]`; `reflection[]` with `action: apply|reject|defer`).
   - Section: Freshness rule — published within 2 years ≥80%, else emit freshness warning (BR-0013-0038).
   - Section: Source citation rule — all entries must have `id`, `title`, `url`, `published` (BR-0013-0037).
   - Section: Conflict protocol — if new research contradicts an existing BP/AP rule, record `action: reject` or `action: defer` in `reflection`; never auto-overwrite (BR-0013-0039, AC-0013-0020).
   - Section: Storage — research_summary goes into the current discussion-pack under `## Research Summary`; not persisted globally.
2. Extend `packages/qfai/src/core/validators/researchSummary.ts` (already planned in section 1.1).
   - Glob `## Research Summary` sections in `.qfai/discussion/**/*.md` packs.
   - Validate `sources[].id`, `sources[].published` completeness (BR-0013-0037).
   - Compute freshness ratio; emit `Research freshness below threshold (≥80% within 2 years)` warning when <80% (BR-0013-0038).
   - Detect `reflection` entries with only `action: defer/reject` and no `action: apply` entries — emit warning (TC-0013-0042).
   - Verify no auto-overwrite occurred: detect if an existing BP/AP ID changed without a `reflection` entry (BR-0013-0039).
3. Register in `validate.ts` and `validators/index.ts`.

**Note**: Phase L is listed last but can run in parallel with Phase J. Phase J agent definitions reference the protocol schema, so the written document (step 1) should be ready before agent files are authored (Phase J step 4).

**Depends on**: Phase D (BP/AP ID registry needed for auto-overwrite detection).

---

## 3. Test Strategy

### 3.1 Layer assignment

- **L3 Integration** (`packages/qfai/tests/core/`): all TC-0013-0001–TC-0013-0051, TC-0013-0056–TC-0013-0058 — 55 tests total.
- **L5 E2E** (location TBD per test-layers.md `tests/e2e/**`): TC-0013-0052–TC-0013-0055 — 4 tests, covering US-0013-0001–US-0013-0010.
- **L4 API**: not applicable (QFAI has no HTTP API).

### 3.2 Annotation schema

All test files must carry `QFAI:SPEC-0013:TC-XXXX` annotations (L3) or `QFAI:SPEC-0013:US-XXXX` annotations (L5) as required by `test-layers.md`.

Each integration test file annotates the TC IDs it covers. Multiple TC annotations per file are allowed.

Example L3 annotation pattern (matching existing codebase style):

```typescript
// QFAI:SPEC-0013:TC-0013-0001
// QFAI:SPEC-0013:TC-0013-0002
describe("validateDesignToken — schema validation", () => { ... });
```

Example L5 annotation pattern:

```typescript
// QFAI:SPEC-0013:US-0013-0001
// QFAI:SPEC-0013:US-0013-0007
describe("E2E: full discussion-pack to prototyping workflow", () => { ... });
```

### 3.3 L3 Integration test file mapping

| Test file (`tests/core/`)         | TCs covered                                            | Validator under test                                             |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `designToken.test.ts`             | TC-0013-0001–TC-0013-0010                              | `designToken.ts`, `parse/designToken.ts`                         |
| `htmlMock.test.ts`                | TC-0013-0011–TC-0013-0017, TC-0013-0028–TC-0013-0032   | `htmlMock.ts`, `uiux/htmlMockParser.ts`, `uiux/contrastRatio.ts` |
| `mermaidScreenFlow.test.ts`       | TC-0013-0018–TC-0013-0022                              | `mermaidScreenFlow.ts`                                           |
| `bpApDb.test.ts`                  | TC-0013-0023–TC-0013-0027, TC-0013-0056, TC-0013-0057  | `bpApDb.ts`, `uiux/platformRules.ts`                             |
| `platformDetection.test.ts`       | TC-0013-0035, TC-0013-0036, TC-0013-0054, TC-0013-0058 | `platformDetection.ts`                                           |
| `uiDefinitionConsistency.test.ts` | TC-0013-0037–TC-0013-0040, TC-0013-0055                | `uiDefinitionConsistency.ts`                                     |
| `researchSummary.test.ts`         | TC-0013-0041–TC-0013-0044, TC-0013-0046                | `researchSummary.ts`                                             |
| `agentDefinition.test.ts`         | TC-0013-0045, TC-0013-0047–TC-0013-0051                | `agentDefinition.ts`                                             |
| `uiuxHybridReview.test.ts`        | TC-0013-0033, TC-0013-0034                             | `bpApDb.ts` (auto_check split) + `ui-ux-reviewer.md` structure   |

### 3.4 L5 E2E test file mapping

| Test file (`tests/e2e/`)         | TCs covered  | US covered                                             |
| -------------------------------- | ------------ | ------------------------------------------------------ |
| `uiuxFullWorkflow.test.ts`       | TC-0013-0052 | US-0013-0001, US-0013-0002, US-0013-0003, US-0013-0007 |
| `expertAgentCycle.test.ts`       | TC-0013-0053 | US-0013-0008, US-0013-0009, US-0013-0010               |
| `platformAdaptation.test.ts`     | TC-0013-0054 | US-0013-0006                                           |
| `tokenChangePropagation.test.ts` | TC-0013-0055 | US-0013-0001, US-0013-0007                             |

US-0013-0004 and US-0013-0005 are covered indirectly through `uiuxFullWorkflow.test.ts` (BP/AP DB is loaded in the full workflow). Direct US annotation coverage for US-0013-0004 is achieved in `expertAgentCycle.test.ts` which exercises the research and review cycle.

### 3.5 Coverage obligations (test-layers.md)

- Every TC-0013-0001–TC-0013-0058 (58 TCs; TC-0013-0059 not declared) must appear in at least one `tests/integration/**` file. Unknown TC references are validation errors per `test-layers.md`.
- Every US-0013-0001–US-0013-0010 must appear in at least one `tests/e2e/**` file.
- `tests/e2e/**` files must not contain `QFAI:SPEC-0013:TC-XXXX` annotations.
- `tests/integration/**` is the correct location for all L3 tests; `tests/core/` is the current convention in this repo — confirm alignment with `test-layers.md` location rule `tests/integration/**` before creating files. If `tests/core/` is the established integration test location, file accordingly.

### 3.6 Fixture strategy

- Each new test file creates a temporary directory via `mkdtemp` in `os.tmpdir()` (matching the existing `withTempRoot` helper pattern in `discussionVisuals.test.ts`).
- Design Token YAML fixtures, HTML Mock strings, Mermaid block strings, BP/AP YAML, and agent definition Markdown fragments are inlined as strings in test files — no external binary fixture files (NFR-0009).
- Performance tests (TC-0013-0028, TC-0013-0056) generate fixture data programmatically (loop to create 50-screen / 500-entry datasets) rather than committing large fixture files.

---

## 4. Risk Mitigation

### Risk 1: Backward compatibility with existing UI Contract YAML (NFR-0001)

**Risk**: New validators reject existing `.qfai/contracts/ui/CON-UI-XXXX.yaml` files because they lack the new `design_token_ref` fields required by REQ-0016.

**Mitigation**: All new Design Token reference fields in UI Contract YAML are
`optional` in the validator schema. The `uiDefinitionConsistency.ts` checker only
emits `warning` (not `error`) for missing token references in existing contracts.
The existing `validateContracts()` path is not modified. Run `qfai validate`
against the current repository before merging Phase F to confirm zero new errors.

### Risk 2: Performance budget for `qfai validate` (<2s additional, NFR-0006, BR-0013-0025)

**Risk**: Parsing large HTML Mock blocks with jsdom and running contrast ratio checks across many screens exceeds the 2s additional budget.

**Mitigation**:

- `htmlMockParser.ts` extracts only inline `style` attributes (no full CSS cascade); jsdom is used in minimal mode (no script execution, no resource loading).
- Contrast ratio computation is O(1) pure math per color pair.
- Design Token resolution is a DAG traversal capped at depth 10 (BR-0013-0006).
- Implement a `PerformanceBudget` wrapper in `validate.ts` that starts a timer at the beginning of the UI/UX validator block and emits a `warning` with partial results if 2000ms is exceeded, without throwing.
- TC-0013-0028 and TC-0013-0056 act as performance regression guards in CI.

### Risk 3: jsdom limitations for CSS layout (TC-04 constraint)

**Risk**: jsdom v26+ does not support CSS layout (computed dimensions), making it impossible to reliably check touch target sizes from CSS class-based styles.

**Mitigation**: Touch target checks (BR-0013-0027) only inspect _inline_ `style`
attributes (`style="width:30px; height:30px"`) and _inline_ CSS `width`/`height`
properties. Class-based or stylesheet-based sizing is not checked; the check emits
`info: Touch target size not verifiable (no inline dimensions)` rather than a
false positive. This is documented in `cli-ux-guidelines.md` (Phase K) as a known
limitation.

### Risk 4: Mermaid v1 migration warning noise (BR-0013-0015)

**Risk**: Existing `stateDiagram` (v1) diagrams in discussion packs trigger migration warnings on every `qfai validate` run, creating warning fatigue.

**Mitigation**: The migration warning uses severity `warning` (not `error`) and includes a `suggested_action` field pointing to the v1→v2 migration. Users can suppress it with a waiver entry in `qfai.config.yaml` using the existing `waivers` mechanism. Document this waiver in `cli-ux-guidelines.md`.

### Risk 5: Review-roster entry number conflict

**Risk**: By the time spec-0013 ships, `review-roster.yml` may already have a 13th entry from another spec, causing a conflict for the `integrated-uiux-reviewer` positioning.

**Mitigation**: `agentDefinition.ts` validates the presence of the
`id: integrated-uiux-reviewer` entry and its required fields, but does not enforce
its ordinal position in the file. AC-0013-0026 says "13番目として登録" which is
interpreted as "append as a new entry" rather than enforcing a fixed YAML array
index. Confirm actual roster length at implementation time.

---

## 5. Dependencies & Prerequisites

### 5.1 Existing modules to extend

| Module                                                   | Change type                                                                       | Phase |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| `packages/qfai/src/core/validate.ts`                     | Add UI/UX validator calls + performance timer wrapper + `--platform` pass-through | H     |
| `packages/qfai/src/core/validators/index.ts`             | Export all new validators                                                         | H     |
| `packages/qfai/src/core/config.ts`                       | Add optional `uiux` section (`platform?`, `designTokensDir?`, `htmlMockTimeout?`) | E     |
| `packages/qfai/src/cli/commands/validate.ts`             | Add `--platform` CLI option                                                       | E     |
| `packages/qfai/src/core/validators/discussionVisuals.ts` | Delegate to `htmlMock.ts` when Screen Mock section detected                       | B     |
| `packages/qfai/src/core/validators/assistantAssets.ts`   | Add checks for the five new agent definition files                                | J     |
| `.qfai/assistant/agents/ui-ux-reviewer.md`               | Append auto/manual split sections; preserve existing content                      | I     |
| `review-roster.yml` (location TBD)                       | Add `integrated-uiux-reviewer` entry                                              | J     |

### 5.2 New npm packages

None. All new functionality uses:

- `yaml ^2.5.1` — already in runtime dependencies (YAML parsing for Design Token, BP/AP DB).
- `jsdom ^26.1.0` — already in runtime dependencies (HTML Mock parsing).
- Node.js built-in `performance.now()` — for performance budget timing.

### 5.3 Configuration changes (`qfai.config.yaml`)

Add optional `uiux` section. When absent, all defaults apply (backward compatible):

```yaml
# qfai.config.yaml — new optional section (spec-0013)
uiux:
  platform: web # web | windows | mobile-ios | mobile-android
  designTokensDir: .qfai/contracts/design/ # default
  htmlMockTimeout: 2000 # ms; default 2000
```

No existing config keys are removed or renamed. All new keys are optional. Existing `qfai.config.yaml` files without the `uiux` section continue to validate without errors (NFR-0001).

### 5.4 New directory structure

```text
.qfai/
  contracts/
    design/                              # NEW: Design Token & rule storage
      design-tokens.schema.yaml          # NEW: DTCG schema template
      best-practices.schema.yaml         # NEW: BP DB schema
      anti-patterns.schema.yaml          # NEW: AP DB schema
  assistant/
    agents/
      uiux-expert.md                     # NEW: REQ-0019
      design-expert.md                   # NEW: REQ-0020
      screen-transition-expert.md        # NEW: REQ-0021
      navigation-expert.md               # NEW: REQ-0022
      integrated-uiux-reviewer.md        # NEW: REQ-0024
    steering/
      ui-definition-protocol.md          # NEW: REQ-0014 consumption protocol
      research-first-protocol.md         # NEW: REQ-0017, REQ-0023
      cli-ux-guidelines.md               # NEW: REQ-0018

packages/qfai/src/core/
  parse/
    designToken.ts                       # NEW
  uiux/
    platformRules.ts                     # NEW
    contrastRatio.ts                     # NEW
    htmlMockParser.ts                    # NEW
  validators/
    designToken.ts                       # NEW
    htmlMock.ts                          # NEW
    mermaidScreenFlow.ts                 # NEW
    bpApDb.ts                            # NEW
    platformDetection.ts                 # NEW
    uiDefinitionConsistency.ts           # NEW
    researchSummary.ts                   # NEW
    agentDefinition.ts                   # NEW

packages/qfai/tests/core/
  designToken.test.ts                    # NEW: L3, TC-0013-0001–TC-0013-0010
  htmlMock.test.ts                       # NEW: L3, TC-0013-0011–TC-0013-0017, TC-0013-0028–TC-0013-0032
  mermaidScreenFlow.test.ts              # NEW: L3, TC-0013-0018–TC-0013-0022
  bpApDb.test.ts                         # NEW: L3, TC-0013-0023–TC-0013-0027, TC-0013-0056–TC-0013-0057
  platformDetection.test.ts             # NEW: L3, TC-0013-0035, TC-0013-0036, TC-0013-0054, TC-0013-0058
  uiDefinitionConsistency.test.ts       # NEW: L3, TC-0013-0037–TC-0013-0040, TC-0013-0055
  researchSummary.test.ts               # NEW: L3, TC-0013-0041–TC-0013-0044, TC-0013-0046
  agentDefinition.test.ts               # NEW: L3, TC-0013-0045, TC-0013-0047–TC-0013-0051
  uiuxHybridReview.test.ts              # NEW: L3, TC-0013-0033, TC-0013-0034

packages/qfai/tests/e2e/               # directory may need creation
  uiuxFullWorkflow.test.ts              # NEW: L5, TC-0013-0052, US-0013-0001–US-0013-0003, US-0013-0007
  expertAgentCycle.test.ts              # NEW: L5, TC-0013-0053, US-0013-0004, US-0013-0008–US-0013-0010
  platformAdaptation.test.ts           # NEW: L5, TC-0013-0054, US-0013-0006
  tokenChangePropagation.test.ts       # NEW: L5, TC-0013-0055, US-0013-0001, US-0013-0005, US-0013-0007
```

---

## 6. Remediation Phase M: Screen Contract Schema Upgrade (v1.7.7)

> Source: discussion-20260329195516830 REQ-0006 — remediation pass added 2026-03-30.

**Covers**: REQ-0006-REM (US-0013-0011)
**ACs**: AC-0013-0027, AC-0013-0028, AC-0013-0029, AC-0013-0030, AC-0013-0031, AC-0013-0032
**BRs**: BR-0013-0049, BR-0013-0050, BR-0013-0051, BR-0013-0052, BR-0013-0053
**TCs**: TC-0013-0061–TC-0013-0066

### Deliverable

Extend `packages/qfai/src/core/validators/uiDefinitionConsistency.ts` to validate
the rich screen contract schema on each screen entry in UI Contract YAML
(`.qfai/contracts/ui/CON-UI-XXXX.yaml`).

### Steps

1. **Schema definition**: Add a `ScreenContractSchema` TypeScript interface with
   fields: `route` (string, required for UI surface), `screenId` (string, required for
   UI surface), `actor` (string, required always), `purpose` (string, required always),
   `primaryTasks` (string[], min 1, required), `requiredStates` (string[], required),
   `transitions` (string[], required), `observableOutcomes` (string[], min 1, required),
   `multiScreen` (optional, defaults to `{ type: "single" }` when absent).

2. **Validation function**: Export
   `validateScreenContractSchema(root: string, config: QfaiConfig): Promise<Issue[]>`.
   - Read each `CON-UI-XXXX.yaml` under `.qfai/contracts/ui/`.
   - For each screen entry, check required fields per BR-0013-0049.
   - If `multiScreen` is absent, treat as `{ type: "single" }` with no error
     (BR-0013-0050).
   - For `surfaceType: non-ui` entries, skip `route`/`screenId` checks but enforce
     `purpose` and `observableOutcomes` (BR-0013-0051).
   - If legacy fields are absent, apply migration defaults and emit warnings
     (BR-0013-0052).
   - All errors use the 3-part format: field name + reason + remediation guidance.

3. **Migration defaults constant**: Define
   `SCREEN_CONTRACT_MIGRATION_DEFAULTS = { actor: "unknown", purpose: "", observableOutcomes: [] }`.
   Emit `warning: "Migration defaults applied: <fields>"` per missing field
   (BR-0013-0052).

4. **Determinism**: Ensure no timestamps or non-deterministic tokens are embedded
   in Issue messages (BR-0013-0053, NFR-0010).

5. **Register** `validateScreenContractSchema` in `validate.ts` findings array and
   `validators/index.ts` export.

6. **Tests**: Add TC-0013-0061–TC-0013-0066 to `uiDefinitionConsistency.test.ts`.
   - TC-0013-0061: happy path full schema
   - TC-0013-0062: missing `actor` field → error with 3-part message
   - TC-0013-0063: absent `multiScreen` → defaults to single, no error
   - TC-0013-0064: `surfaceType: non-ui` without route/screenId → PASS
   - TC-0013-0065: legacy v1.7.5 contract → migration warning + PASS
   - TC-0013-0066: idempotency — 2 runs produce identical results

### Backward-compatibility note

All new required fields are enforced with migration defaults for any contract that
predates v1.7.7 (BR-0013-0052). No existing CON-UI-XXXX contract will receive a
new `error` on first run — only warnings identifying fields to populate. This
upholds NFR-0001.
