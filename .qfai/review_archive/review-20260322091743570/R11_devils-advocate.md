# R11_devils-advocate

## Reviewer

- ID: devils-advocate
- Name: Devil's Advocate

## Scope

discussion-20260322091309602

## Challenges

### Challenge 1: create-only without ANY force override creates an update dead-end

- Attack: REQ-0003 mandates that `--force` is completely disabled for instructions files. This means there is **zero upgrade path** for QFAI-distributed instructions. When QFAI v1.7 ships improved review instructions (better severity definitions, new checklist items, Copilot API changes), users who ran `qfai init` on v1.6.3 are permanently stuck with the v1.6.3 template. They must manually diff and merge updates. This is worse than most package managers (e.g., `npm init` overwrites, `eslint --init` overwrites, Angular schematics offer merge strategies). The discussion pack acknowledges "安全性 vs 自動更新" as a tradeoff (02_Inception-Deck #9) but provides no migration story whatsoever.
- Alternative: Implement a tiered force model: `--force` skips instructions (current proposal), but introduce `--force-instructions` (or `--update-instructions`) that overwrites instructions only. Additionally, embed a `# qfai-template-version: 1.6.3` comment in the generated file header so a future `qfai update` command can detect staleness and offer a three-way merge or a diff-based upgrade prompt.
- Assessment: **Defensible for v1.6.3 as a minimum viable safety guarantee**, but the discussion pack should explicitly acknowledge the upgrade debt in 13_Deferred.md rather than leaving it implicit. The absence of any deferred item for "instructions update mechanism" is an oversight.

### Challenge 2: Generic instructions without language-specific rules deliver marginal initial value

- Attack: The two generic templates strip all language-specific checks (TypeScript checks removed per SRC-0001 汎用化). What remains is a set of universal platitudes: "check SOLID", "check DRY", "use severity prefixes". GitHub Copilot already performs generic code review without instructions. The incremental value of telling Copilot "follow SOLID principles" without concrete language-specific examples (e.g., "prefer `readonly` over mutable fields in TypeScript") is questionable. Users may perceive the generated files as boilerplate noise rather than actionable guidance. The SDD追記 mechanism to add language rules is explicitly out of scope (05_Scope) and does not even have a spec yet.
- Alternative: Ship the generic templates AND include a prominent `<!-- TODO: Add language-specific rules. Run /qfai-sdd to generate rules for your tech stack. -->` placeholder section at the end of each template. This makes the incompleteness visible and actionable rather than silently generic. Additionally, consider shipping one exemplar language pack (e.g., TypeScript, since SRC-0001 already has it) as a reference in `assets/init/.github/instructions/examples/` that users can copy, rather than deferring ALL specificity.
- Assessment: **Defensible as a deliberate scope cut**, but the templates themselves should self-document their limitations. The current design risks users thinking the generic instructions are the complete product.

### Challenge 3: Why regular files instead of symlinks? Skills use symlinks for auto-update.

- Attack: QFAI already has a symlink-based distribution pattern for skills (init.ts line 49: `copyTemplatePaths` with force, plus `syncIntegrationWrappers` creates symlinks). Skills auto-update on `qfai init --force` because they are symlinked to the package's assets. Instructions are deliberately made regular files (CON-T04), meaning they immediately diverge from the canonical template. This is inconsistent: skills are "QFAI-managed, auto-updated" while instructions are "QFAI-seeded, user-owned". The discussion justifies this as "ユーザーが直接編集・カスタマイズすることを想定" but skills can also be customized (via skills.local). The asymmetry is not well-justified.
- Alternative: (a) Acknowledge explicitly in the discussion pack that instructions are a "seed" pattern (like specs/contracts) not a "managed" pattern (like skills), and document which pattern each init artifact follows. (b) Consider a hybrid: symlink by default, with `qfai eject-instructions` to convert to regular files when users want to customize. This mirrors the Create React App `eject` pattern.
- Assessment: **Defensible.** Instructions are inherently project-specific (teams customize severity definitions, add domain-specific checks). The regular-file decision is correct, but the reasoning in CON-T04 is too terse. One sentence ("ユーザーが直接編集・カスタマイズすることを想定") does not adequately explain why this differs from skills. The discussion should articulate the seed-vs-managed taxonomy.

### Challenge 4: Without copilot-review.yml, the instructions files are partially inert

- Attack: The instructions files use `applyTo: "**/*"` and `excludeAgent: coding-agent` frontmatter. These are consumed by GitHub Copilot's code review feature. However, Copilot code review requires either: (a) manual trigger via `@github-copilot review` in PR comments, or (b) automated trigger via a workflow like `copilot-review.yml` (SRC-0009, explicitly excluded in 05_Scope). Without the workflow, the instructions only activate when users manually request Copilot review. The discussion pack does not document this activation prerequisite anywhere. A user running `qfai init` may see the files, expect automated reviews, and get nothing.
- Alternative: Add a post-init guidance message (printed to stdout) that says: "Copilot review instructions have been placed in .github/instructions/. To enable automated Copilot reviews on PRs, configure a GitHub Actions workflow or use @github-copilot review in PR comments. See: https://docs.github.com/...". This costs zero implementation complexity and prevents user confusion. Additionally, 01_Context or 08_Glossary should define the activation mechanism.
- Assessment: **Defensible to exclude the workflow from distribution** (secret dependencies are real), but **not defensible to omit activation guidance entirely**. This is a gap in the user experience design that should be addressed in REQ or at minimum in the template files themselves as a comment.

### Challenge 5: OQ-0002 chose assets/ but rootAssets copyTemplateTree would be simpler

- Attack: OQ-0002 resolved to place templates in `assets/init/.github/instructions/`. But looking at init.ts, `rootAssets` (line 22) already points to `assets/init/root/` and is copied to `destRoot` via `copyTemplateTree` with `force: false, conflictPolicy: "skip"` -- which is EXACTLY the create-only behavior REQ-0003 requires. If the instructions templates were placed at `assets/init/root/.github/instructions/`, they would be automatically copied by the existing `rootResult = await copyTemplateTree(rootAssets, destRoot, ...)` call with zero code changes to init.ts. The discussion chose to add them to `syncIntegrationWrappers` instead (OQ-0001), which requires new code in a function that deals with symlinks, README generation, and copilot-instructions.md generation -- a more complex integration point.
- Alternative: Place templates at `assets/init/root/.github/instructions/code-review.instructions.md` and `assets/init/root/.github/instructions/principles.instructions.md`. The existing `copyTemplateTree(rootAssets, destRoot, { force: false, conflictPolicy: "skip" })` handles everything: directory creation, create-only semantics, skip reporting. Zero lines of init.ts logic change needed. `syncIntegrationWrappers` remains untouched.
- Assessment: **This is the strongest challenge.** The rootAssets path achieves identical behavior with zero code changes. The OQ-0002 resolution chose the more complex path. However, there is a subtle counter-argument: `syncIntegrationWrappers` handles all `.github/` content generation (symlinks, README, copilot-instructions.md), so placing instructions there maintains the invariant that "all .github/ mutations happen in one function." If instructions were in rootAssets, `.github/` would be mutated by two separate code paths. This architectural argument is valid but was not articulated in OQ-0001/OQ-0002 resolution logs.

### Challenge 6: No schema validation for instructions frontmatter

- Attack: NFR-0003 requires GitHub Copilot Instructions specification compliance, and the measurement criterion is "frontmatter の applyTo と excludeAgent フィールドが有効な形式." However, the quality policy (10_Policy) says validation is "手動検証" (manual verification). There is no automated test that the template frontmatter is valid YAML, that `applyTo` contains a valid glob, or that `excludeAgent` is a recognized agent name. If a future edit introduces a YAML syntax error in the template, it ships silently.
- Alternative: Add a unit test that parses each instructions template's frontmatter as YAML and asserts the presence and type of `applyTo` (string, valid glob pattern) and `excludeAgent` (string or string[]). This is 10-15 lines of test code and catches regressions permanently.
- Assessment: **Defensible for v1.6.3 scope** (two static files that are manually verified once), but the absence of automated validation is a quality risk for future template modifications. Should be noted as a recommended test addition.

### Challenge 7: Glossary defines "SDD追記" but no REQ or scope item covers its interface contract

- Attack: The glossary (08_Glossary) defines "SDD追記" as a mechanism where `/qfai-sdd` appends language-specific rules to instructions files. OQ-0003 resolved that this is a separate spec. However, the current instructions template design must be forward-compatible with SDD追記 -- there needs to be a marker, section header, or append point that `/qfai-sdd` can target. If the template has no designated insertion point, the SDD spec will need to parse and modify arbitrary Markdown, which is fragile. This interface contract is not captured anywhere.
- Alternative: Add a REQ or NFR that the templates include a designated insertion marker (e.g., `<!-- qfai:language-rules -->`) that the future SDD追記 feature can reliably target. This costs one line per template and de-risks the SDD spec.
- Assessment: **Partially defensible.** The SDD spec is separate and could define its own insertion strategy. But designing the template without considering the known future consumer is a mild violation of forward-compatibility principles. A single marker comment is cheap insurance.

## Verdict

PASS

## Notes

The discussion pack is well-structured with clear scope boundaries, resolved OQs, and appropriate safety guarantees. However, the Devil's Advocate review identifies several areas where the design is defensible but insufficiently documented or forward-looking:

1. **Critical gap**: No upgrade/migration path for instructions templates is documented or deferred (Challenge 1). Add to 13_Deferred.md.
2. **Strongest technical challenge**: The rootAssets `copyTemplateTree` path (Challenge 5) achieves identical create-only behavior with zero code changes. The architectural counter-argument (`.github/` mutation consolidation) is valid but must be explicitly documented in OQ-0001/OQ-0002 resolution rationale.
3. **User experience gap**: No activation guidance for Copilot review is provided (Challenge 4). A post-init stdout message should be added.
4. **Forward-compatibility**: Templates should include an SDD insertion marker (Challenge 7) to de-risk the deferred `/qfai-sdd` spec.
5. **Minor quality improvement**: Automated frontmatter validation test recommended (Challenge 6).

Despite these advisory notes, none of the challenges are individually or collectively severe enough to warrant FAIL. The core design decisions (create-only, generic templates, regular files, syncIntegrationWrappers integration) are defensible when properly justified.
