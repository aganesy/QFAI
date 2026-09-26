import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkDecisionGuardrails,
  extractDecisionGuardrailsFromMarkdown,
  loadDecisionGuardrails,
  normalizeDecisionGuardrails,
  sortDecisionGuardrails,
} from "../../src/core/decisionGuardrails.js";

describe("decision guardrails", () => {
  it("extracts and normalizes guardrails", () => {
    const text = [
      "# Policy",
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

    const entries = extractDecisionGuardrailsFromMarkdown(text, "policy.md");
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
      "# Policy",
      "",
      "## Decision Guardrails",
      "",
      "- ID: DG-0001",
      "  Guardrail: Missing type",
      "",
    ].join("\n");

    const entries = extractDecisionGuardrailsFromMarkdown(text, "policy.md");
    const result = checkDecisionGuardrails(entries);

    expect(result.errors.map((issue) => issue.code)).toContain("QFAI-GR-003");
    expect(result.warnings.map((issue) => issue.code)).toContain("QFAI-GR-006");
    expect(result.warnings.map((issue) => issue.code)).toContain("QFAI-GR-007");
  });

  it("extracts guardrails from heading format", () => {
    const text = [
      "# Contract",
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

    const entries = extractDecisionGuardrailsFromMarkdown(text, "contract.md");
    const items = normalizeDecisionGuardrails(entries);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("DG-0003");
    expect(items[0]?.type).toBe("not-now");
    expect(items[0]?.title).toBe("Avoid auto-upgrade");
    expect(items[0]?.keywords).toEqual(["upgrade", "templates"]);
  });

  it("loads explicit entries from configured policy and contract trees only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    const policyRoot = path.join(root, "custom", "stories", "01_policy");
    const contractsRoot = path.join(root, "custom", "contracts");
    const oldDelta = path.join(root, ".qfai", "specs", "spec-0001", "18_delta.md");
    try {
      await Promise.all([
        mkdir(policyRoot, { recursive: true }),
        mkdir(path.join(contractsRoot, "api"), { recursive: true }),
        mkdir(path.dirname(oldDelta), { recursive: true }),
      ]);
      const entry = (id: string): string =>
        [
          "## Decision Guardrails",
          `### ${id}: Explicit decision`,
          "- Type: non-goal",
          "- Guardrail: Keep this boundary.",
          "- Rationale: Scope is fixed.",
          "- Reconsider: When the scope changes.",
        ].join("\n");
      await Promise.all([
        writeFile(path.join(policyRoot, "02_Constraints.md"), entry("DG-0001")),
        writeFile(path.join(contractsRoot, "api", "service.md"), entry("DG-0002")),
        writeFile(oldDelta, entry("DG-0003")),
      ]);

      const loaded = await loadDecisionGuardrails(root, {
        specsRoot: policyRoot,
        contractsRoot,
      });
      expect(loaded.errors).toEqual([]);
      expect(loaded.entries.map((item) => item.id).sort()).toEqual(["DG-0001", "DG-0002"]);
      expect(loaded.files).toHaveLength(2);

      const explicit = await loadDecisionGuardrails(root, {
        paths: [path.join(contractsRoot, "api")],
        specsRoot: policyRoot,
        contractsRoot,
      });
      expect(explicit.entries.map((item) => item.id)).toEqual(["DG-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores RFC 2119 prose without a DG entry", () => {
    const entries = extractDecisionGuardrailsFromMarkdown(
      "## Constraints\n\nThe service MUST preserve the policy.\n",
      "policy.md",
    );
    expect(entries).toEqual([]);
  });

  it("reports an explicitly requested missing path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    try {
      const loaded = await loadDecisionGuardrails(root, { paths: ["missing.md"] });
      expect(loaded.errors).toEqual([
        { path: path.join(root, "missing.md"), message: "Path does not exist" },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
