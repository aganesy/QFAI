import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";

const TRIAGE_SECTION = [
  "## Triage",
  "",
  "| Source   | Subject          | Existing Spec | Operation | Sub-op | Approved By | Rationale                        |",
  "| -------- | ---------------- | ------------- | --------- | ------ | ----------- | -------------------------------- |",
  "| REQ-0042 | rename the token | spec-0007     | UPDATE    | MODIFY | -           | AC-0007-0004 references the term |",
  "| REQ-0042 | rename the token | spec-0009     | UPDATE    | REMOVE | user@host   | BR-0009-0002 obsoleted by rename |",
];

async function withPolicies(
  delta: string,
  assertion: (issues: Awaited<ReturnType<typeof validateLayeredTraceability>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-policies-triage-"));
  try {
    const specsDir = path.join(root, ".qfai", "specs");
    const policiesDir = path.join(specsDir, "_policies");
    const specDir = path.join(specsDir, "spec-0001");
    await mkdir(policiesDir, { recursive: true });
    await mkdir(specDir, { recursive: true });

    // Minimal layered spec so the validator has an entry to walk.
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n- Parent: CAP-0001\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# 03 AC\n", "utf-8");
    await writeFile(
      path.join(policiesDir, "03_Capabilities.md"),
      "# Capabilities\n\n## CAP-0001\n",
      "utf-8",
    );
    await writeFile(path.join(policiesDir, "10_delta.md"), delta, "utf-8");

    assertion(await validateLayeredTraceability(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const policyScopeFindings = (
  issues: Awaited<ReturnType<typeof validateLayeredTraceability>>,
): string[] =>
  issues
    .filter(
      (entry) => entry.code === "QFAI-LAYER-100" || entry.code === "TRACE_SHARED_SCOPE_VIOLATION",
    )
    .flatMap((entry) => entry.refs ?? []);

describe("_policies scope bans carve out the mandated Triage table", () => {
  it("does not fire on IDs cited inside the ## Triage section", async () => {
    await withPolicies(["# 10 Delta", "", ...TRIAGE_SECTION, ""].join("\n"), (issues) => {
      expect(policyScopeFindings(issues)).toEqual([]);
    });
  });

  it("still fires on a lower-layer ID outside the Triage section", async () => {
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, "", "## Notes", "", "Owns AC-0007-0004.", ""].join(
        "\n",
      ),
      (issues) => {
        expect(policyScopeFindings(issues)).toContain("AC-0007-0004");
      },
    );
  });

  it("reports the full composite ID, not a truncated prefix", async () => {
    await withPolicies(
      ["# 10 Delta", "", "## Notes", "", "Owns BR-0009-0002.", ""].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("BR-0009-0002");
        expect(refs).not.toContain("BR-0009");
      },
    );
  });

  it("resumes scanning after the Triage section ends", async () => {
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, "", "## Impact", "", "TC-0003-0001 changes.", ""].join(
        "\n",
      ),
      (issues) => {
        expect(policyScopeFindings(issues)).toContain("TC-0003-0001");
      },
    );
  });
});
