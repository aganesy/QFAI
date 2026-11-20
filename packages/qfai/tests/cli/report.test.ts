import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import type { Issue, ValidationResult } from "../../src/core/types.js";

const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function storyRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-story-"));
  roots.push(root);
  const flow = path.join(root, ".qfai/spec/02_business-flow/business-flow-0001");
  await mkdir(flow, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Checkout\n", "utf8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf8",
  );
  return root;
}

function issue(severity: Issue["severity"]): Issue {
  return { code: "QFAI-TEST-001", severity, category: "canonical", message: "fixture finding" };
}

async function writeValidation(
  root: string,
  issues: Issue[],
  file = "validate.json",
  flowIds?: string[],
): Promise<void> {
  const result: ValidationResult = {
    toolVersion: "2.0.0-test",
    profile: "full",
    ...(flowIds ? { flowIds } : {}),
    issues,
    counts: { info: 0, warning: 0, error: 0 },
  };
  const output = path.isAbsolute(file) ? file : path.join(root, ".qfai/report", file);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result)}\n`, "utf8");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

describe("qfai report on a story tree", () => {
  it("reads validation findings and writes a story-tree Markdown report", async () => {
    const root = await storyRoot();
    await writeValidation(root, [issue("warning")]);
    expect(await runReport({ root, format: "md", failOn: "never" })).toBe(0);
    const output = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    expect(output).toContain("BF-0001");
    expect(output).toContain("QFAI-TEST-001");
    expect(output).not.toContain("SC Coverage");
    expect(output).not.toContain("TC coverage");
    expect(await exists(path.join(root, ".qfai/report/business-flow-0001/coverage.md"))).toBe(true);
  });

  // QFAI:EX-0001-0058-01
  it("counts a declared contract no rule links to a flow, unless --flow scopes the report", async () => {
    const root = await storyRoot();
    const contractDir = path.join(root, ".qfai/spec/03_contract/cli");
    await mkdir(contractDir, { recursive: true });
    await writeFile(path.join(contractDir, "cli-0001-sample.md"), "# CLI-0001: Sample\n", "utf8");
    const contractCount = async (file: string): Promise<number> => {
      const output = JSON.parse(await readFile(path.join(root, ".qfai/report", file), "utf8")) as {
        summary: { contracts: number };
      };
      return output.summary.contracts;
    };
    await writeValidation(root, []);
    expect(await runReport({ root, format: "json", failOn: "never" })).toBe(0);
    expect(await contractCount("report.json")).toBe(1);
    await writeValidation(root, [], "validate.flow-0001.json", ["BF-0001"]);
    expect(await runReport({ root, format: "json", failOn: "never", flowIds: ["BF-0001"] })).toBe(
      0,
    );
    expect(await contractCount("report.flow-0001.json")).toBe(0);
  });

  it("links finding paths when --base-url is set", async () => {
    const root = await storyRoot();
    await writeValidation(root, [{ ...issue("warning"), file: ".qfai/spec/decisions.md" }]);
    await runReport({ root, format: "md", failOn: "never", baseUrl: "https://example.test/repo" });
    const output = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    expect(output).toContain(
      "[.qfai/spec/decisions.md](https://example.test/repo/.qfai/spec/decisions.md)",
    );
  });

  // QFAI:EX-0001-0060-02
  it("renders diagnostic text as Markdown text and encodes each linked path segment", async () => {
    const root = await storyRoot();
    await writeValidation(root, [
      {
        ...issue("warning"),
        code: "QFAI-[X]",
        message: "see [here](https://evil.test) <b>*now*</b>\n# Heading",
        file: "docs/a b/(x)](https:/evil.test)#.md",
      },
    ]);
    await runReport({ root, format: "md", failOn: "never", baseUrl: "https://example.test/repo/" });
    const output = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    expect(output).toContain(
      "- WARNING QFAI-\\[X\\]: see \\[here\\](https://evil.test) \\<b\\>\\*now\\*\\</b\\> # Heading" +
        " ([docs/a b/(x)\\](https:/evil.test)#.md]" +
        "(https://example.test/repo/docs/a%20b/%28x%29%5D%28https%3A/evil.test%29%23.md))",
    );
    expect(output.split("\n").filter((line) => line.startsWith("# "))).toEqual(["# QFAI Report"]);
  });

  // QFAI:EX-0001-0060-02
  it("leaves a path that climbs out of the base URL unlinked", async () => {
    const root = await storyRoot();
    await writeValidation(root, [{ ...issue("warning"), file: "../../other/secret.md" }]);
    await runReport({ root, format: "md", failOn: "never", baseUrl: "https://example.test/repo" });
    const output = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    expect(output).toContain("(../../other/secret.md)");
    expect(output).not.toContain("](https://");
  });

  // QFAI:EX-0001-0060-03
  it.each([
    "javascript:alert(1)",
    "not a url",
    "https://example.test/repo?x=1",
    "https://example.test/#a",
    "https://example.test/repo?",
    "https://example.test/repo#",
    "https://user:secret@example.test/repo",
  ])("exits 2 before writing a report when --base-url is %s", async (baseUrl) => {
    const root = await storyRoot();
    await writeValidation(root, [issue("warning")]);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md", failOn: "never", baseUrl })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("--base-url");
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  it("uses loaded findings for the exit gate even when stored counts are stale", async () => {
    const root = await storyRoot();
    await writeValidation(root, [issue("error")]);
    expect(await runReport({ root, format: "json" })).toBe(1);
    const output = JSON.parse(
      await readFile(path.join(root, ".qfai/report/report.json"), "utf8"),
    ) as {
      summary: { counts: { error: number } };
    };
    expect(output.summary.counts.error).toBe(1);
  });

  it("rejects a malformed validate result before writing output", async () => {
    const root = await storyRoot();
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(path.join(root, ".qfai/report/validate.json"), '{"issues":[]}', "utf8");
    await expect(runReport({ root, format: "md" })).rejects.toThrow("invalid shape");
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  it("rejects an invalid issue severity rather than dropping the gate", async () => {
    const root = await storyRoot();
    await writeValidation(root, [{ ...issue("error"), severity: "invalid" } as unknown as Issue]);
    await expect(runReport({ root, format: "json" })).rejects.toThrow("issues[0].severity");
  });

  it("refuses a non-string issue file and names it before rendering a link", async () => {
    const root = await storyRoot();
    await writeValidation(root, [
      issue("warning"),
      { ...issue("warning"), file: 42 } as unknown as Issue,
    ]);
    await expect(
      runReport({ root, format: "md", failOn: "never", baseUrl: "https://example.test/repo" }),
    ).rejects.toThrow(/invalid shape: .*validate\.json \(issues\[1\]\.file must be a string\)/);
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  it("names the top-level field that makes a validate result malformed", async () => {
    const root = await storyRoot();
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(path.join(root, ".qfai/report/validate.json"), '{"issues":[]}', "utf8");
    await expect(runReport({ root, format: "md" })).rejects.toThrow("toolVersion");
  });

  // QFAI:EX-0001-0062-01
  it("exits 2 and names the missing input when no validate output exists", async () => {
    const root = await storyRoot();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md" })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "input file not found",
    );
  });

  // QFAI:EX-0001-0061-02
  it("reports a narrow profile run in CI at warning without failing on it", async () => {
    const root = await storyRoot();
    vi.stubEnv("CI", "true");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const exit = await runReport({ root, format: "md", runValidate: true, profile: "atdd" });
      const written = JSON.parse(
        await readFile(path.join(root, ".qfai/report/validate.json"), "utf8"),
      ) as { issues: Issue[] };
      expect(written.issues).toContainEqual(
        expect.objectContaining({ code: "QFAI-VALIDATE-017", severity: "warning" }),
      );
      expect(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
        "run a full scan",
      );
      const otherErrors = written.issues.filter(
        (item) => item.severity === "error" && item.code !== "QFAI-VALIDATE-017",
      );
      expect(exit).toBe(otherErrors.length > 0 ? 1 : 0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // QFAI:EX-0001-0061-01
  it("writes the same findings as validate, coverage notice included, when it runs validation", async () => {
    const root = await storyRoot();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const profileJson = path.join(root, ".qfai/report/validate-sdd.json");
    const findings = async (): Promise<Issue[]> =>
      (JSON.parse(await readFile(profileJson, "utf8")) as ValidationResult).issues;

    await runValidate({ root, strict: false, format: "json", profile: "sdd", failOn: "never" });
    const fromValidate = await findings();
    await runReport({ root, format: "md", runValidate: true, profile: "sdd", failOn: "never" });
    const fromReport = await findings();

    expect(fromValidate.map((item) => item.code)).toContain("QFAI-PROFILE-001");
    expect(fromReport).toEqual(fromValidate);
  });

  // QFAI:EX-0001-0066-04
  it("requires a scoped input file for --flow", async () => {
    const root = await storyRoot();
    await writeValidation(root, []);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "qfai validate --flow BF-0001",
    );
    await writeValidation(root, [], "validate.flow-0001.json", ["BF-0001"]);
    expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(0);
    expect(await exists(path.join(root, ".qfai/report/report.flow-0001.md"))).toBe(true);
  });

  // QFAI:EX-0001-0066-06
  it("refuses a validation result whose recorded flow scope is not the requested one", async () => {
    const root = await storyRoot();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const scopedReport = path.join(root, ".qfai/report/report.flow-0001.md");
    const elsewhere = path.join(root, "copied/validate.flow-0001.json");

    for (const recorded of [["BF-0002"], undefined]) {
      await writeValidation(root, [], "validate.flow-0001.json", recorded);
      expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(2);
      await writeValidation(root, [], elsewhere, recorded);
      expect(
        await runReport({ root, format: "md", flowIds: ["BF-0001"], inputPath: elsewhere }),
      ).toBe(2);
    }
    expect(await exists(scopedReport)).toBe(false);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "qfai validate --flow BF-0001",
    );
    stderr.mockClear();
    expect(
      await runReport({
        root,
        format: "md",
        flowIds: ["BF-0001"],
        inputPath: elsewhere,
        profile: "full",
      }),
    ).toBe(2);
    const withProfile = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(withProfile).toContain("qfai validate --flow BF-0001 --profile full");
    expect(withProfile).toContain("qfai report --flow BF-0001 --profile full");

    await writeValidation(root, [], "validate.json", ["BF-0001"]);
    expect(await runReport({ root, format: "md" })).toBe(2);
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);

    await writeValidation(root, [], elsewhere, ["BF-0001"]);
    expect(
      await runReport({ root, format: "md", flowIds: ["BF-0001"], inputPath: elsewhere }),
    ).toBe(0);
    expect(await exists(scopedReport)).toBe(true);
  });

  // QFAI:EX-0001-0062-02
  it("refuses a legacy spec layout", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-legacy-"));
    roots.push(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(path.join(root, ".qfai/specs/spec-0001/01_Spec.md"), "# Legacy\n", "utf8");
    expect(await runReport({ root, format: "md" })).toBe(2);
  });
});
