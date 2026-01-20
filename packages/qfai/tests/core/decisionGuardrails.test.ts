import { describe, expect, it } from "vitest";

import {
  checkDecisionGuardrails,
  extractDecisionGuardrailsFromMarkdown,
  normalizeDecisionGuardrails,
  sortDecisionGuardrails,
} from "../../src/core/decisionGuardrails.js";

describe("decision guardrails", () => {
  it("extracts and normalizes guardrails", () => {
    const text = [
      "# SPEC-0001: Delta",
      "",
      "## Decision Guardrails",
      "",
      "- ID: DG-0001",
      "  Type: non-goal",
      "  Guardrail: Do not change the spec layout.",
      "  Rationale: Spec layout is a hard gate.",
      "  Reconsider: never",
      "  Related: SPEC-0001",
      "  Keywords: layout, spec",
      "",
      "- ID: DG-0002",
      "  Type: trade-off",
      "  Guardrail: Prefer CLI checks over manual review.",
      "  Rationale: Deterministic gates reduce drift.",
      "  Reconsider: when CI is unstable",
      "",
    ].join("\n");

    const entries = extractDecisionGuardrailsFromMarkdown(text, "delta.md");
    const items = sortDecisionGuardrails(normalizeDecisionGuardrails(entries));

    expect(items).toHaveLength(2);
    expect(items[0]?.id).toBe("DG-0001");
    expect(items[0]?.type).toBe("non-goal");
    expect(items[0]?.keywords).toEqual(["layout", "spec"]);
    expect(items[1]?.id).toBe("DG-0002");
    expect(items[1]?.type).toBe("trade-off");
  });

  it("reports missing fields as errors or warnings", () => {
    const text = [
      "# SPEC-0001: Delta",
      "",
      "## Decision Guardrails",
      "",
      "- ID: DG-0001",
      "  Guardrail: Missing type",
      "",
    ].join("\n");

    const entries = extractDecisionGuardrailsFromMarkdown(text, "delta.md");
    const result = checkDecisionGuardrails(entries);

    expect(result.errors.map((issue) => issue.code)).toContain("QFAI-GR-003");
    expect(result.warnings.map((issue) => issue.code)).toContain("QFAI-GR-006");
    expect(result.warnings.map((issue) => issue.code)).toContain("QFAI-GR-007");
  });

  it("extracts guardrails from heading format", () => {
    const text = [
      "# SPEC-0001: Delta",
      "",
      "## Decision Guardrails",
      "",
      "### DG-0003: Avoid auto-upgrade",
      "- Type: not-now",
      "- Guardrail: Do not add auto-upgrade flows.",
      "- Reason: Upgrade policy needs a separate spec.",
      "- Reconsider: after upgrade design is approved",
      "- Keywords: upgrade, templates",
      "",
    ].join("\n");

    const entries = extractDecisionGuardrailsFromMarkdown(text, "delta.md");
    const items = normalizeDecisionGuardrails(entries);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("DG-0003");
    expect(items[0]?.type).toBe("not-now");
    expect(items[0]?.title).toBe("Avoid auto-upgrade");
    expect(items[0]?.keywords).toEqual(["upgrade", "templates"]);
  });
});
