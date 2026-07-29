import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate, scopedReportPath } from "../../src/cli/commands/validate.js";
import { validateProject } from "../../src/core/validate.js";

const SCENARIO = (specNumber: string): string =>
  [
    `Feature: spec ${specNumber}`,
    "",
    `  @SC-${specNumber}-0001`,
    "  Scenario: only scenario",
    "    Given a precondition",
    "    When an action",
    "    Then an outcome",
    "",
  ].join("\n");

async function seedSpec(specsRoot: string, specNumber: string): Promise<void> {
  const dir = path.join(specsRoot, `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), `# spec-${specNumber}\n`, "utf-8");
  await writeFile(path.join(dir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(dir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  await writeFile(path.join(dir, "05_Examples.md"), SCENARIO(specNumber), "utf-8");
  await writeFile(path.join(dir, "06_Test-Cases.md"), "# TC\n", "utf-8");
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-scope-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "_policies"), { recursive: true });
    await seedSpec(specsRoot, "0003");
    await seedSpec(specsRoot, "0004");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Array<{ code: string }>): string[] => issues.map((entry) => entry.code);

describe("validateProject --spec scoping", () => {
  it("reports a --spec value that cannot be read as a spec number", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, { profile: "sdd", specIds: ["nope"] });
      const finding = result.issues.find((entry) => entry.code === "QFAI-SCOPE-001");
      expect(finding?.severity).toBe("error");
      expect(finding?.refs).toEqual(["nope"]);
    });
  });

  it("reports a --spec that names a spec directory which does not exist", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, { profile: "sdd", specIds: ["9999"] });
      const finding = result.issues.find((entry) => entry.code === "QFAI-SCOPE-002");
      expect(finding?.severity).toBe("error");
      expect(finding?.refs).toEqual(["spec-9999"]);
    });
  });

  it("stays quiet for a --spec that resolves to a real spec", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root, undefined, { profile: "sdd", specIds: ["0003"] });
      expect(codes(result.issues)).not.toContain("QFAI-SCOPE-001");
      expect(codes(result.issues)).not.toContain("QFAI-SCOPE-002");
    });
  });

  it("keeps a duplicate-ID finding the in-scope spec is party to", async () => {
    await withProject(async (root) => {
      const specsRoot = path.join(root, ".qfai", "specs");
      // The same US is defined by both specs; QFAI-ID-001 reports it against
      // spec-0003 (lexicographically first), so a run scoped to spec-0004 must
      // still see its own violation.
      for (const specNumber of ["0003", "0004"]) {
        await writeFile(
          path.join(specsRoot, `spec-${specNumber}`, "02_User-stories.md"),
          [
            "# 02 User stories",
            "",
            "| US-ID        | Title  | Parent   |",
            "| ------------ | ------ | -------- |",
            "| US-0003-0001 | shared | CAP-0001 |",
            "",
          ].join("\n"),
          "utf-8",
        );
      }

      const scoped = await validateProject(root, undefined, { profile: "sdd", specIds: ["0004"] });
      const finding = scoped.issues.find((entry) => entry.code === "QFAI-ID-001");
      expect(finding?.message).toContain("US-0003-0001");
      expect(finding?.relatedFiles?.some((file) => file.includes("spec-0004"))).toBe(true);
    });
  });

  it("scopes SC traceability to the requested spec, not just the findings", async () => {
    await withProject(async (root) => {
      const all = await validateProject(root, undefined, { profile: "sdd" });
      expect(Object.keys(all.traceability.sc.refs).sort()).toEqual([
        "SC-0003-0001",
        "SC-0004-0001",
      ]);

      const scoped = await validateProject(root, undefined, { profile: "sdd", specIds: ["0003"] });
      // A sibling's SC in `total` / `missingIds` / `refs` would misreport the
      // requested slice's coverage to any programmatic consumer.
      expect(Object.keys(scoped.traceability.sc.refs)).toEqual(["SC-0003-0001"]);
      expect(scoped.traceability.sc.total).toBe(1);
      expect(scoped.traceability.sc.missingIds).toEqual(["SC-0003-0001"]);
    });
  });
});

describe("scopedReportPath", () => {
  it("derives a per-scope file from the configured path", () => {
    expect(scopedReportPath(".qfai/report/validate.json", ["0003"])).toBe(
      ".qfai/report/validate.spec-0003.json",
    );
    expect(scopedReportPath(".qfai/report/validate.json", ["spec-4", "3"])).toBe(
      ".qfai/report/validate.spec-0003+0004.json",
    );
    expect(scopedReportPath("custom/report.json", ["0003"])).toBe("custom/report.spec-0003.json");
  });

  it("never puts an unnormalizable value into the path", () => {
    // `--spec x/../../../outside` would escape the report directory once
    // `path.resolve` runs; the run already fails with QFAI-SCOPE-001.
    expect(scopedReportPath(".qfai/report/validate.json", ["x/../../../outside"])).toBe(
      ".qfai/report/validate.spec-.json",
    );
    expect(scopedReportPath(".qfai/report/validate.json", ["0003", "../evil"])).toBe(
      ".qfai/report/validate.spec-0003.json",
    );
  });
});

describe("runValidate --spec report isolation", () => {
  it("does not write the shared reports a parallel worker would race on", async () => {
    await withProject(async (root) => {
      await runValidate({
        root,
        strict: false,
        profile: "sdd",
        specIds: ["0003"],
        toolVersionOverride: "1.9.2",
      });

      const reportDir = path.join(root, ".qfai", "report");
      const written = await readdir(reportDir);
      expect(written).toContain("validate.spec-0003.json");
      // Shared paths every downstream reader treats as the repo-wide result.
      expect(written).not.toContain("validate.json");
      expect(written).not.toContain("validate-sdd.json");
      await expect(readdir(path.join(root, ".qfai", "output"))).rejects.toThrow();
    });
  });

  it("does not warn about a legacy write a scoped run never performs", async () => {
    // The writer-side D-DEPRECATED-PATH would otherwise fail an
    // otherwise-clean slice gate under --strict / --fail-on warning.
    await withProject(async (root) => {
      await runValidate({
        root,
        strict: false,
        profile: "sdd",
        specIds: ["0003"],
        toolVersionOverride: "1.9.2",
      });

      const body: unknown = JSON.parse(
        await readFile(path.join(root, ".qfai/report/validate.spec-0003.json"), "utf-8"),
      );
      const issues =
        typeof body === "object" && body !== null && "issues" in body ? body.issues : [];
      expect(Array.isArray(issues)).toBe(true);
      expect(
        (Array.isArray(issues) ? issues : []).some(
          (entry) =>
            typeof entry === "object" &&
            entry !== null &&
            "code" in entry &&
            entry.code === "D-DEPRECATED-PATH",
        ),
      ).toBe(false);
    });
  });

  it("writes the shared reports for an unscoped run", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "sdd", toolVersionOverride: "1.9.2" });

      const written = await readdir(path.join(root, ".qfai", "report"));
      expect(written).toContain("validate.json");
      expect(written).toContain("validate-sdd.json");
    });
  });
});
