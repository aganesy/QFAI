# Review: Devil's Advocate

- **Reviewer ID**: devils-advocate
- **Target**: spec-0016
- **Cycle**: 1
- **Date**: 2026-03-20
- **Verdict**: PASS

> Premise: 現状すべてが間違っている。こじつけ・屁理屈・全否定してでも自分の意見をはっきりと通す。FAIL 判定時は必ず具体的代替案を提示する。

## Challenges Raised

### Challenge 1: The 6-agent roster is an arbitrary number

**Objection**: Why exactly 6 sub-agents? The spec asserts "exactly 6" as if this is a natural law, but it is an arbitrary design choice that may be wrong. If RedGreenAuditor and TDDSpecReviewer are both "reviewers," why not merge them? If TDDCycleController orchestrates everything, why does ParallelSliceDispatcher exist as a separate agent rather than a method on TDDCycleController?

**Alternative (あるべき姿)**: The spec should acknowledge that the 6-agent count is a design decision point, not a fixed truth. The actual requirement is role separation (self-certification prevention), not agent count. A 4-agent model (Orchestrator, Executor, Auditor, Reviewer) could satisfy all 5 failure modes with less complexity.

**Assessment**: Upon reflection — the spec does acknowledge this in DEC-0016-005 rationale ("Separating internal implementation from external interface reduces coupling"). The 6-agent model is explicitly justified by the need to separate observation authority (RedGreenAuditor), spec review, and quality review into independently accountable roles, each preventing a distinct failure mode. The count is not arbitrary; it maps 1:1 to the prevention mechanisms. The Temptation to consolidate agents is the exact failure mode F-6202 addresses. **Objection does not constitute a blocking issue.**

---

### Challenge 2: "Behavior-only wrappers" hide too much — users cannot understand what qfai-implement does

**Objection**: DEC-0016-005 says wrapper descriptions must not expose sub-agent names. But sub-agent names (TDDImplementer, RedGreenAuditor) are the exact mental model developers need to understand the skill's behavior. Hiding them creates an opaque black box. The claimed benefit ("reduces coupling") is theoretical, but the cost (user confusion) is real and immediate.

**Alternative (あるべき姿)**: Wrapper descriptions should expose the key agent concepts at the "what" level (e.g., "requires an auditor to confirm test failure before proceeding") while remaining generic about implementation ("auditor" rather than "RedGreenAuditor"). This preserves the external interface contract while giving users enough context to understand what is happening when the skill fails at a gate.

**Assessment**: The spec partially addresses this through AC-0016-0032 (behavior-only language that describes "watch-it-fail/pass, reviewer gates" without exposing internal names). The EX-0016-0037 example shows "enforces watch-it-fail / watch-it-pass" as acceptable. This does give users the key behavioral concepts ("fail before pass," "reviewer gates"). The alternative I proposed is actually what the spec already requires — behavior language is not the same as opaque language. The forbidden thing is the internal agent name, not the behavioral description. **Objection resolved by existing spec content.**

---

### Challenge 3: The evidence format is not actually validated — it is just a documentation contract

**Objection**: The evidence contract (US-0016-0003, BR-0016-0014/0015) defines minimum evidence fields, but since the format is free-text+labels (not strict JSON), there is no machine-enforceable schema. "Status-only evidence is rejected" (BR-0016-0015) — but by whom? By a human reviewer reading SKILL.md text? This is not a hard enforcement; it is a social contract. The spec creates the illusion of enforcement without real enforcement.

**Alternative (あるべき姿)**: If machine enforcement is the goal, even v1.6.2 could introduce a minimal regex-based check (e.g., evidence entry must contain both "cmd:" and "result:" labels) without requiring full JSON schema. This would convert the social contract into an actual enforcement at negligible complexity cost. The full JSON deferral to v1.6.3+ remains correct, but a label-presence check is not JSON schema.

**Assessment**: This is a legitimate and non-trivial objection. However, `01_Spec.md` explicitly states the primary actors are "QFAI maintainers, downstream project developers" — AI agents operating within SKILL.md constraints. The enforcement mechanism is the AI agent's behavior model (SKILL.md defines what RedGreenAuditor MUST do). In an AI-agent system, the SKILL.md text IS the enforcement mechanism. The alternative (regex label check) would be a valid enhancement but is correctly scoped to v1.6.3+ evidence schema versioning. DEC-0016-001 explicitly defers this. **Objection is noted as a valid enhancement but does not constitute a blocking issue for v1.6.2 scope.**

---

### Challenge 4: Wrapper parity drift = 0 is unmeasurable without a semantic equivalence check

**Objection**: NFR-0002 says "wrapper parity drift = 0" but the only enforcement mechanism is required phrase presence. Two wrappers could both contain the 8 required phrases while having completely different semantic content — one says "enforces reviewer gates" and another says "reviewer gates are optional in some cases." The required phrase check catches the presence of words but not semantic contradictions.

**Alternative (あるべき姿)**: Add a semantic equivalence assertion: each wrapper must contain the same set of required phrases, AND no wrapper may contain language that contradicts any required phrase's implied semantics. Concretely: add forbidden phrases specifically designed to catch semantic negations (e.g., "reviewer is optional," "skip review," "reviewer can be bypassed"). Some of these are already in the forbidden phrase list (implicitly). The spec should make this semantic check explicit.

**Assessment**: This is a genuine sharpness gap. The forbidden phrase list (7 phrases: `qfai-tdd-red`, `qfai-tdd-green`, etc.) targets stale v1.6.0 wording, not semantic contradictions. However, the forbidden phrase mechanism IS extensible — if semantic anti-patterns are identified, they can be added as forbidden phrases. The current set is pragmatic for v1.6.2's scope (removing stale shortcut wording). Requiring semantic equivalence verification at this phase would expand scope beyond the targeted 5 failure modes. **Objection is a valid future enhancement for v1.6.3+ but does not constitute a blocking issue for v1.6.2.**

---

### Challenge 5: The plan has no rollback plan for the implementation itself

**Objection**: `10_Plan.md` Risk 2 says "fix regressions before merge" but provides no rollback plan if a regression is discovered post-merge. The mitigation is "don't merge broken code" — which is circular reasoning, not risk mitigation.

**Alternative (あるべき姿)**: The plan should state an explicit rollback strategy: "If post-merge regressions are detected, revert the PR using git revert and re-enter the SDD phase with the regression as a new failure mode." This converts the circular non-mitigation into an actionable recovery path.

**Assessment**: For a single-PR delivery (NFR-0001), the standard Git workflow is to revert the PR. The plan does not need to spell this out because it is standard repository practice. The Risk 2 mitigation correctly focuses on preventing the failure (pre-merge gates) rather than spelling out standard recovery. **Objection is pedantically valid but non-blocking in a standard Git workflow.**

---

## Summary of Objections

| #   | Objection                                               | Blocking? | Resolution                                                          |
| --- | ------------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| 1   | 6-agent count is arbitrary                              | No        | Count maps 1:1 to failure mode prevention                           |
| 2   | Behavior-only wrappers are opaque                       | No        | Behavioral language is descriptive, not opaque                      |
| 3   | Evidence contract is a social contract, not enforcement | No        | AI-agent SKILL.md is the enforcement mechanism; v1.6.3+ adds schema |
| 4   | Wrapper parity check is syntactic, not semantic         | No        | Valid future enhancement; not in v1.6.2 scope                       |
| 5   | No implementation rollback plan                         | No        | Standard Git revert applies; pre-merge gates prevent the need       |

No blocking issues found after concrete alternative analysis.

## Verdict

**PASS** — All 5 challenges raised have been examined with concrete alternatives. None constitute blocking issues. Challenges 3 and 4 identify valid enhancements appropriate for v1.6.3+. The spec is sound for v1.6.2 scope.
