import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runReport } from "../../src/cli/commands/report.js";
import { parseArgs } from "../../src/cli/lib/args.js";
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
): Promise<void> {
  const result: ValidationResult = {
    toolVersion: "2.0.0-test",
    profile: "full",
    issues,
    counts: { info: 0, warning: 0, error: 0 },
  };
  const output = path.join(root, ".qfai/report", file);
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

  it("links finding paths when --base-url is set", async () => {
    const root = await storyRoot();
    await writeValidation(root, [{ ...issue("warning"), file: ".qfai/spec/decisions.md" }]);
    await runReport({ root, format: "md", failOn: "never", baseUrl: "https://example.test/repo" });
    const output = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    expect(output).toContain(
      "[.qfai/spec/decisions.md](https://example.test/repo/.qfai/spec/decisions.md)",
    );
  });

  it("includes policy guardrails in the JSON report", async () => {
    const root = await storyRoot();
    const policy = path.join(root, ".qfai/spec/01_policy/policy.md");
    await mkdir(path.dirname(policy), { recursive: true });
    await writeFile(
      policy,
      "## Decision Guardrails\n### DG-0001: Boundary\n- Type: non-goal\n- Guardrail: Keep this boundary.\n- Rationale: Scope is fixed.\n- Reconsider: When the scope changes.\n",
      "utf8",
    );
    await writeValidation(root, []);
    expect(await runReport({ root, format: "json", failOn: "never" })).toBe(0);
    const output = JSON.parse(
      await readFile(path.join(root, ".qfai/report/report.json"), "utf8"),
    ) as {
      guardrails: { total: number; items: Array<{ id: string }> };
    };
    expect(output.guardrails.total).toBe(1);
    expect(output.guardrails.items.map((item) => item.id)).toContain("DG-0001");
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

  it("rejects a legacy validate result with SC traceability", async () => {
    const root = await storyRoot();
    const input = path.join(root, ".qfai/report/validate.json");
    await writeValidation(root, []);
    const parsed = JSON.parse(await readFile(input, "utf8")) as Record<string, unknown>;
    parsed.traceability = { sc: { total: 0 } };
    await writeFile(input, JSON.stringify(parsed), "utf8");
    await expect(runReport({ root, format: "md" })).rejects.toThrow("invalid shape");
    expect(await exists(path.join(root, ".qfai/report/report.md"))).toBe(false);
  });

  it("rejects an invalid issue severity rather than dropping the gate", async () => {
    const root = await storyRoot();
    await writeValidation(root, [{ ...issue("error"), severity: "invalid" } as unknown as Issue]);
    await expect(runReport({ root, format: "json" })).rejects.toThrow("invalid shape");
  });

  // QFAI:EX-0001-0064-01
  it("exits 2 and names the missing input when no validate output exists", async () => {
    const root = await storyRoot();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md" })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "input file not found",
    );
  });

  // QFAI:EX-0001-0063-02
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

  it("requires a scoped input file for --flow", async () => {
    const root = await storyRoot();
    await writeValidation(root, []);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(2);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain(
      "qfai validate --flow BF-0001",
    );
    await writeValidation(root, [], "validate.flow-0001.json");
    expect(await runReport({ root, format: "md", flowIds: ["BF-0001"] })).toBe(0);
    expect(await exists(path.join(root, ".qfai/report/report.flow-0001.md"))).toBe(true);
  });

  it("refuses --spec with an actionable replacement", async () => {
    const root = await storyRoot();
    const parsed = parseArgs(["report", "--spec", "0001"], root);
    expect(parsed.invalid).toBe(true);
    expect(parsed.invalidReason).toContain("--flow BF-NNNN");
    expect(await exists(path.join(root, ".qfai/report/report.spec-0001.md"))).toBe(false);
  });

  it("refuses a legacy spec layout", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-legacy-"));
    roots.push(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(path.join(root, ".qfai/specs/spec-0001/01_Spec.md"), "# Legacy\n", "utf8");
    expect(await runReport({ root, format: "md" })).toBe(2);
  });
});
