/**
 * Integration: concrete `qfai guardrails` examples of BF-0003 — the text list
 * line, the default scan scope, keyword case, the `--max` limit and its
 * refusals, extract ordering, check with warnings or errors, and every load
 * error reported.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runGuardrails } from "../../src/cli/commands/guardrails.js";
import type { GuardrailsCommandOptions } from "../../src/cli/commands/guardrails.js";
import { run } from "../../src/cli/main.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-guardrails-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf8",
  );
  return root;
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

type Entry = { id: string; type?: string; statement?: string; full?: boolean };

function entry({ id, type = "non-goal", statement = `Rule ${id}.`, full = true }: Entry): string {
  const lines = [`- ID: ${id}`];
  if (type) lines.push(`  Type: ${type}`);
  lines.push(`  Guardrail: ${statement}`);
  if (full) {
    lines.push(`  Rationale: Reason for ${id}.`, `  Reconsider: Review ${id} later.`);
  }
  return lines.join("\n");
}

async function policy(root: string, entries: string[]): Promise<void> {
  await put(
    root,
    ".qfai/spec/01_policy/policy.md",
    ["## Decision Guardrails", ...entries].join("\n\n"),
  );
}

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `DG-${String(index + 1).padStart(4, "0")}`);
}

async function guardrails(
  root: string,
  options: Omit<GuardrailsCommandOptions, "root" | "paths"> & { paths?: string[] },
): Promise<{ code: number; stdout: string; stderr: string }> {
  let code = -1;
  let stdout = "";
  const stderr = await captureStderr(async () => {
    stdout = await captureStdout(async () => {
      code = await runGuardrails({ root, paths: [], ...options });
    });
  });
  return { code, stdout, stderr };
}

function listedIds(output: string): string[] {
  return [...output.matchAll(/^- \[(DG-\d{4})\]/gmu)].map((match) => match[1] ?? "");
}

describe("BF-0003 guardrails list", () => {
  it("renders one text line per entry under the list header", async () => {
    // QFAI:EX-0003-0013-02
    const root = await workspace();
    await policy(root, [entry({ id: "DG-0001", statement: "No automatic release." })]);
    const result = await guardrails(root, { action: "list" });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Decision Guardrails (list)");
    expect(result.stdout).toMatch(
      /^- \[DG-0001\]\[non-goal\] No automatic release\. \(\.qfai\/spec\/01_policy\/policy\.md:\d+\)$/mu,
    );
  });

  it("does not read entries outside the policy and contract roots", async () => {
    // QFAI:EX-0003-0013-07
    const root = await workspace();
    await put(
      root,
      ".qfai/spec/02_business-flow/business-flow.md",
      ["## Decision Guardrails", entry({ id: "DG-0001" })].join("\n\n"),
    );
    const result = await guardrails(root, { action: "list" });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("- (none)");
    expect(result.stdout).not.toContain("DG-0001");
  });
});

describe("BF-0003 guardrails extract", () => {
  it("matches the keyword regardless of case", async () => {
    // QFAI:EX-0003-0014-04
    const root = await workspace();
    await policy(root, [
      entry({ id: "DG-0001", statement: "Never follow a symlink out of the tree." }),
      entry({ id: "DG-0002", statement: "Keep the release manual." }),
    ]);
    const result = await guardrails(root, { action: "extract", keyword: "SYMLINK" });
    expect(result.code).toBe(0);
    expect(listedIds(result.stdout)).toEqual(["DG-0001"]);
  });

  it("matches a keyword found only in the rationale", async () => {
    // QFAI:EX-0003-0014-10
    const root = await workspace();
    await policy(root, [
      [
        "- ID: DG-0001",
        "  Type: non-goal",
        "  Guardrail: Keep releases manual.",
        "  Rationale: A rollback needs a person.",
        "  Reconsider: Review later.",
      ].join("\n"),
      entry({ id: "DG-0002", statement: "Never follow a symlink." }),
    ]);
    const result = await guardrails(root, { action: "extract", keyword: "rollback" });
    expect(result.code).toBe(0);
    expect(listedIds(result.stdout)).toEqual(["DG-0001"]);
  });

  it("limits the output to --max entries", async () => {
    // QFAI:EX-0003-0014-02
    const root = await workspace();
    await policy(
      root,
      ids(7).map((id) => entry({ id })),
    );
    const result = await guardrails(root, { action: "extract", max: 5 });
    expect(result.code).toBe(0);
    expect(listedIds(result.stdout)).toHaveLength(5);
  });

  it("outputs 20 entries when --max is omitted", async () => {
    // QFAI:EX-0003-0014-05
    const root = await workspace();
    await policy(
      root,
      ids(30).map((id) => entry({ id })),
    );
    const result = await guardrails(root, { action: "extract" });
    expect(result.code).toBe(0);
    expect(listedIds(result.stdout)).toHaveLength(20);
  });

  it("refuses a negative --max with exit 2", async () => {
    // QFAI:EX-0003-0014-06
    const root = await workspace();
    await policy(root, [entry({ id: "DG-0001" })]);
    const result = await guardrails(root, { action: "extract", max: -1 });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--max");
  });

  it("refuses a non-numeric --max with exit 2", async () => {
    // QFAI:EX-0003-0014-07
    const root = await workspace();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      let stdout = "";
      const stderr = await captureStderr(async () => {
        stdout = await captureStdout(async () => {
          await run(["guardrails", "extract", "--max", "abc"], root);
        });
      });
      expect(process.exitCode).toBe(2);
      expect(`${stderr}${stdout}`).toMatch(/--max[\s\S]*non-negative integer/u);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("accepts --max 0 and outputs no entry", async () => {
    // QFAI:EX-0003-0014-08
    const root = await workspace();
    await policy(root, [entry({ id: "DG-0001" })]);
    const result = await guardrails(root, { action: "extract", max: 0 });
    expect(result.code).toBe(0);
    expect(listedIds(result.stdout)).toEqual([]);
  });

  it("orders extract output by type, then ID", async () => {
    // QFAI:EX-0003-0014-09
    const root = await workspace();
    await policy(root, [
      entry({ id: "DG-0003", type: "trade-off" }),
      entry({ id: "DG-0001", type: "not-now" }),
      entry({ id: "DG-0002", type: "non-goal" }),
    ]);
    const extract = await guardrails(root, { action: "extract", format: "json" });
    const list = await guardrails(root, { action: "list", format: "json" });
    const order = (output: string): string[] =>
      (JSON.parse(output) as { items: Array<{ id: string }> }).items.map((item) => item.id);
    expect(extract.code).toBe(0);
    expect(order(extract.stdout)).toEqual(["DG-0002", "DG-0001", "DG-0003"]);
    expect(order(extract.stdout)).toEqual(order(list.stdout));
  });
});

describe("BF-0003 guardrails check", () => {
  it("reports two error issues and exits 1", async () => {
    // QFAI:EX-0003-0015-02
    const root = await workspace();
    await policy(root, [
      entry({ id: "DG-0001", type: "" }),
      entry({ id: "DG-0002", type: "maybe-later" }),
    ]);
    const result = await guardrails(root, { action: "check" });
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("QFAI-GR-003");
    expect(output).toContain("QFAI-GR-004");
    expect(output).toContain("guardrails check: error=2 warning=0");
    expect(result.code).toBe(1);
  });

  it("reports warnings only and exits 0", async () => {
    // QFAI:EX-0003-0015-03
    const root = await workspace();
    await policy(root, [entry({ id: "DG-0001", full: false })]);
    const result = await guardrails(root, { action: "check" });
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("QFAI-GR-006");
    expect(output).toContain("QFAI-GR-007");
    expect(output).toContain("guardrails check: error=0 warning=2");
    expect(result.code).toBe(0);
  });
});

describe("BF-0003 guardrails input errors", () => {
  it("prints one error per unreadable path and exits 2", async () => {
    // QFAI:EX-0003-0016-03
    const root = await workspace();
    const result = await guardrails(root, {
      action: "list",
      paths: [path.join(root, "nonexistent-a"), path.join(root, "nonexistent-b")],
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("nonexistent-a");
    expect(result.stderr).toContain("nonexistent-b");
  });

  it("refuses an unreadable path for check with exit 2, not 1", async () => {
    // QFAI:EX-0003-0016-04
    const root = await workspace();
    const result = await guardrails(root, {
      action: "check",
      paths: [path.join(root, "nonexistent")],
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("nonexistent");
  });
});
