import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";

describe("validateLayeredTraceability (v1421)", () => {
  it("detects downstream references and _policies scope violations", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layer-v1421-"));
    try {
      await seedV1421Layout(root);

      const acPath = path.join(root, ".qfai", "specs", "spec-0001", "03_Acceptance-Criteria.md");
      await writeFile(
        acPath,
        [
          "# 03 Acceptance Criteria",
          "",
          "## AC-0001: login success",
          "- Refs: US-0001, BR-0001",
          "",
        ].join("\n"),
        "utf-8",
      );

      const objectivePath = path.join(root, ".qfai", "specs", "_policies", "01_Objective.md");
      await writeFile(
        objectivePath,
        ["# 01 Objective", "", "- Related: US-0001", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateLayeredTraceability(root, defaultConfig);
      const downstreamIssue = issues.find((issue) => issue.code === "TRACE_DOWNSTREAM_REF");
      const sharedIssue = issues.find((issue) => issue.code === "TRACE_SHARED_SCOPE_VIOLATION");

      expect(downstreamIssue).toBeDefined();
      expect(downstreamIssue?.severity).toBe("error");
      expect(downstreamIssue?.file).toBe(acPath);
      expect(downstreamIssue?.refs).toContain("BR-0001");
      // The rule carried no remedy at all, and the sentence an author reaches
      // for — "per BR-0017-0004" — is what trips it. The supported form is the
      // owning spec's contract id, and it has to be in the finding (#1101).
      expect(downstreamIssue?.suggested_action).toContain("contract id");
      expect(downstreamIssue?.suggested_action).toContain("CON-DB-*");
      expect(downstreamIssue?.suggested_action).toContain("Contracts");

      expect(sharedIssue).toBeDefined();
      expect(sharedIssue?.severity).toBe("error");
      expect(sharedIssue?.file).toBe(objectivePath);
      expect(sharedIssue?.refs).toContain("US-0001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedV1421Layout(root: string): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(policiesDir, { recursive: true });
  await mkdir(specDir, { recursive: true });

  const sharedFiles: Array<[string, string]> = [
    ["01_Objective.md", "# 01 Objective\n"],
    ["02_Initiative.md", "# 02 Initiative\n"],
    ["03_Capabilities.md", "# 03 Capabilities\n"],
    ["04_Business-Flow.md", "# 04 Business Flow\n"],
    ["05_Contracts.md", "# 05 Contracts\n"],
    ["06_Glossary.md", "# 06 Glossary\n"],
    ["07_Constraints.md", "# 07 Constraints\n"],
    ["08_Decisions.md", "# 08 Decisions\n"],
    ["09_Open-questions.md", "# 09 Open Questions\n"],
    ["10_delta.md", "# 10 Delta\n"],
  ];
  for (const [fileName, content] of sharedFiles) {
    await writeFile(path.join(policiesDir, fileName), content, "utf-8");
  }

  const specFiles: Array<[string, string]> = [
    ["01_Spec.md", "# 01 Spec\n"],
    ["02_User-stories.md", "# 02 User Stories\n\n## US-0001: login\n"],
    ["03_Acceptance-Criteria.md", "# 03 Acceptance Criteria\n"],
    ["04_Business-Rules.md", "# 04 Business Rules\n\n## BR-0001: rule\n"],
    ["05_Examples.md", "# 05 Examples\n\n## EX-0001\n- Refs: BR-0001\n"],
    ["06_Test-Cases.md", "# 06 Test Cases\n\n## TC-0001\n- Refs: EX-0001\n"],
    ["07_Decisions.md", "# 07 Decisions\n"],
    ["08_Open-questions.md", "# 08 Open Questions\n"],
    ["09_delta.md", "# 09 Delta\n"],
  ];
  for (const [fileName, content] of specFiles) {
    await writeFile(path.join(specDir, fileName), content, "utf-8");
  }
}
