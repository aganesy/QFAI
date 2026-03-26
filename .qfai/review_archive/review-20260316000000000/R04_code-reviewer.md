# R04: Code Reviewer

## Verdict: FAIL

## Checklist

- [x] Maintainability signals reviewed: REQ-0019~REQ-0025 introduce 5 new sub-agent definitions. The maintainability of these definitions depends on how they will be implemented as files, but no file-path or artifact schema has been specified for any of the 5 agents. This creates a concrete downstream coding gap.
- [x] Implementation-risk signals identified: Research-First Protocol (REQ-0023) mandates that agents perform live research "every time" with no caching or fallback schema defined. This is an unbounded side-effect at the protocol level that will manifest as non-determinism in downstream skill invocations.
- [x] Design intent actionable for downstream coding: Partially. REQ-0024 (Integrated UI/UX Reviewer) states "review-roster 13番目として登録" but no registration schema, no agent file template, and no mechanism for roster-driven dispatch exists in the pack. The SDD implementor has insufficient specification to act.
- [x] Extensibility / file-format decisions: NFR-0011 requires "direct 2 years or more recent sources cited at 100% rate" in live research output. There is no data structure defined for recording and validating research provenance inside a discussion-pack or spec-pack artifact. Without a schema, this NFR cannot be tested or enforced by `qfai validate`.
- [x] Backward compatibility: REQ-0025 mandates defining sub-agent responsibilities per phase (discussion/SDD/prototyping/ATDD) but no existing phase-dispatch protocol or hook points are referenced. It is unclear whether this extends or replaces the current Orchestrator-driven invocation model.

## Findings

### Finding 1 (FAIL-trigger): Sub-agent artifact schema is entirely absent

REQ-0019~REQ-0022 each say "サブエージェントを定義する" without specifying:

- The file format (Markdown agent file, YAML config, inline skill block?)
- The file path pattern (e.g., `.qfai/assistant/agents/<name>.md`)
- The mandatory fields an agent definition must contain
- Whether any of the 4 new agents inherit from or extend an existing agent template

The review pack shows that the Integrated UI/UX Reviewer (REQ-0024) is assigned as "review-roster #13", but the roster is a YAML file at `.qfai/assistant/steering/review-roster.yml`. No addition to that file is specified or drafted in this pack. The SDD implementor will face a blank-slate decision that should have been resolved here.

**Concrete alternative**: Add to 06_REQ or 05_Scope a table or stub that specifies:

1. Agent file path pattern: `.qfai/assistant/agents/<role-id>.md`
2. Mandatory sections per agent file (Role, Responsibilities, Research-First Protocol steps, Output schema)
3. A draft `review-roster.yml` entry snippet for the Integrated UI/UX Reviewer (id, name, scope, must_check, can_be_na, na_rule)

This does not require finalizing all content -- a structural template is sufficient for the discussion gate. Without it, REQ-0019~REQ-0024 are intentions, not actionable specifications.

---

### Finding 2 (FAIL-trigger): Research-First Protocol has no output schema, making NFR-0011 unenforceable

REQ-0023 defines Research-First Protocol as requiring "対象プラットフォーム・ドメイン特化のリサーチ項目、出力フォーマット、リサーチ結果の作業への反映方法". NFR-0011 requires 100% source citation and ≥80% recency from last 2 years. However:

- No output format/schema is provided anywhere in the pack for what research output looks like
- "Reflection into work" (反映方法) is stated but not structured -- there is no field, section, or marker in discussion-pack templates where research results are recorded
- `qfai validate` cannot check NFR-0011 without a machine-readable structure to parse

This is a closed-loop risk: agents are told to research, but the output is ephemeral (exists only in the agent's working memory during execution) unless a persistent schema is defined.

**Concrete alternative**: Define a `Research-First` output block schema -- either as a YAML frontmatter section or a dedicated Markdown section `## Research Summary` with required fields:

```yaml
# Proposed schema (to add to 06_REQ or as a new appendix section)
research_summary:
  agent: <role-id>
  platform: <platform-id>
  timestamp: <ISO-8601>
  sources:
    - id: <SRC-XXXX or inline>
      title: <string>
      url: <string>
      published: <YYYY-MM-DD>
      relevance: <string>
  best_practices:
    - rule_id: <string>
      summary: <string>
      source_id: <string>
  anti_patterns:
    - pattern_id: <string>
      summary: <string>
      source_id: <string>
```

This schema can be validated by `qfai validate` (checking `published` date ≤ 2 years, `source_id` references populated) and serves as the "反映方法" anchor for all 5 specialists.

---

### Finding 3 (Non-blocking observation): "Loose boundary" responsibility model creates maintainability risk at scale

OQ-0011 adopts "ゆるやかな分離" (loose boundary) between the 4 specialists. The rationale is sound -- overlapping domains like form design span multiple experts. However, from a maintainability standpoint, "loosely separated" with no conflict-resolution protocol beyond "統合レビュアーが最終調整" creates a single-point-of-arbitration bottleneck: the Integrated UI/UX Reviewer becomes the de-facto arbiter for all inter-specialist contradictions.

This is not a FAIL trigger (the decision is explicitly resolved in OQ-0011 and rationale is present), but the SDD phase should define escalation criteria: under what conditions does a boundary dispute require Integrated Reviewer arbitration vs. being resolved by the Orchestrator, and what happens when the Integrated Reviewer's own output contradicts a specialist? REQ-0025 (phase activity definition) is the natural home for this.

---

### Finding 4 (Non-blocking observation): NFR-0012 metric is not auto-checkable

NFR-0012 states "統合レビュー項目の100%に『サービス全体への影響』記述あり". This is a natural-language quality gate on free-text review output. Unlike NFR-0011 (which could be validated with a schema), NFR-0012 is entirely dependent on human judgment to confirm "サービス全体への影響" is meaningfully present vs. a perfunctory one-liner. The measurable target is set as 100% but no rubric exists for what qualifies.

This is non-blocking for the discussion gate, but the SDD should either (a) lower the precision of this metric to "checked by qa-lead during review-cycle summary" or (b) define a structured field in the Integrated Reviewer output template that forces the "サービス全体への影響" section to be explicitly populated.

---

## Required Changes (FAIL)

Two changes are required before this pack can receive PASS from this reviewer:

**Required Change 1** (addresses Finding 1):

Add to `06_REQ.md` (or `05_Scope.md`, Section 6) a structural specification for sub-agent artifact format. At minimum:

- Agent file path convention (e.g., `.qfai/assistant/agents/<role-id>.md`)
- Mandatory section headers for agent definition files
- Draft `review-roster.yml` YAML snippet showing how REQ-0024 (Integrated UI/UX Reviewer) maps to a roster entry (id, name, scope, must_check fields, can_be_na, na_rule)

**Required Change 2** (addresses Finding 2):

Add to `06_REQ.md` under REQ-0023 (or as a dedicated REQ-0023-A in a new row) a machine-readable Research-First Protocol output schema. The schema must define the minimum fields required for `qfai validate` to verify NFR-0011 compliance (source citation and recency). A YAML block example as shown in Finding 2 above is sufficient for the discussion gate.

These two changes close the implementation gap between what is decided in this discussion and what an SDD author can actually execute.
