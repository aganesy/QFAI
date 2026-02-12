import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import type { ValidationResult } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";

describe("validateProject (v1.4.1 spec pack)", { timeout: 15000 }, () => {
  it("passes when required files and ledger links are complete", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const codes = result.issues.map((item) => item.code);

      expect(typeof result.toolVersion).toBe("string");
      expect(result.counts.error).toBe(0);
      expect(codes).not.toContain("QFAI-SPACK-001");
      expect(codes).not.toContain("QFAI-LEDGER-010");
      expect(codes).not.toContain("QFAI-LEDGER-011");
    });
  });

  it("fails when required file set is missing", async () => {
    await withProject(async (root) => {
      const specDir = resolveSpecPackDir(root);
      await rm(path.join(specDir, "10_Test-cases.md"), { force: true });

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-SPACK-001",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("10_Test-cases.md");
    });
  });

  it("fails when ledger ex_ids is empty", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(root, "TR-0001", "ex_ids", "");

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-LEDGER-004",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.message).toContain("ex_ids");
    });
  });

  it("fails when ledger references unknown EX", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(root, "TR-0001", "ex_ids", "EX-9999");

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-LEDGER-007",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("EX-9999");
    });
  });

  it("keeps ledger row validation even when AC definitions are missing", async () => {
    await withProject(async (root) => {
      const acPath = path.join(
        resolveSpecPackDir(root),
        "07_Acceptance-criteria.md",
      );
      await writeFile(acPath, "# Acceptance Criteria\n\n(no ids)\n", "utf-8");
      await updateLedgerCell(root, "TR-0001", "trace_id", "TR-XYZ");

      const result = await validateProject(root);
      const codes = result.issues.map((item) => item.code);
      const ledgerIssue = result.issues.find(
        (item) => item.code === "QFAI-LEDGER-005",
      );

      expect(codes).toContain("QFAI-AC-001");
      expect(codes).toContain("QFAI-LEDGER-005");
      expect(ledgerIssue?.refs).toContain("TR-XYZ");
    });
  });

  it("fails when upper layer references lower IDs directly", async () => {
    await withProject(async (root) => {
      const userStoriesPath = path.join(
        resolveSpecPackDir(root),
        "06_User-stories.md",
      );
      const text = await readFile(userStoriesPath, "utf-8");
      await writeFile(
        userStoriesPath,
        `${text}\n- AC-0001 should be listed here\n`,
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-SPACK-010",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when ledger references missing contract declaration", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(
        root,
        "TR-0001",
        "con_ids",
        "CON-API-9999;CON-DB-0001",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-LEDGER-009",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("CON-API-9999");
    });
  });
});

describe("runValidate", { timeout: 15000 }, () => {
  it("writes JSON output and respects failOn=error", async () => {
    await withProject(async (root) => {
      let exitCode = -1;
      await captureStdout(async () => {
        exitCode = await runValidate({
          root,
          strict: false,
          failOn: "error",
          format: "text",
        });
      });

      expect(exitCode).toBe(0);

      const jsonPath = path.join(root, ".qfai", "report", "validate.json");
      const raw = await readFile(jsonPath, "utf-8");
      const parsed = JSON.parse(raw) as ValidationResult;
      expect(parsed.counts.error).toBe(0);

      await rm(path.join(resolveSpecPackDir(root), "09_Examples.feature"), {
        force: true,
      });

      await captureStdout(async () => {
        exitCode = await runValidate({
          root,
          strict: false,
          failOn: "error",
          format: "text",
        });
      });

      expect(exitCode).toBe(1);
    });
  });
});

describe("shouldFail", () => {
  it("evaluates failOn policy", () => {
    const result = {
      counts: { info: 0, warning: 1, error: 1 },
    } as ValidationResult;

    expect(shouldFail(result, "never")).toBe(false);
    expect(shouldFail(result, "error")).toBe(true);
    expect(shouldFail(result, "warning")).toBe(true);
  });
});

async function withProject(
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await setupProject();
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function setupProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-validate-v141-"));
  await captureStdout(async () => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
  });
  return root;
}

function resolveSpecPackDir(root: string): string {
  return path.join(root, ".qfai", "specs", "spec-0001");
}

async function updateLedgerCell(
  root: string,
  traceId: string,
  column: string,
  value: string,
): Promise<void> {
  const ledgerPath = path.join(
    resolveSpecPackDir(root),
    "16_Traceability-ledger.md",
  );
  const text = await readFile(ledgerPath, "utf-8");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headerIndex = lines.findIndex((line) => line.includes("trace_id"));
  if (headerIndex < 0 || headerIndex + 2 >= lines.length) {
    throw new Error("ledger table header not found");
  }

  const headers = parseMarkdownRow(lines[headerIndex] ?? "");
  const traceIndex = headers.indexOf("trace_id");
  const targetIndex = headers.indexOf(column);
  if (traceIndex < 0 || targetIndex < 0) {
    throw new Error(`ledger column not found: ${column}`);
  }

  let updated = false;
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.trim().startsWith("|")) {
      break;
    }
    const cells = parseMarkdownRow(line);
    if ((cells[traceIndex] ?? "").trim() !== traceId) {
      continue;
    }
    cells[targetIndex] = value;
    lines[index] = formatMarkdownRow(cells);
    updated = true;
    break;
  }

  if (!updated) {
    throw new Error(`trace row not found: ${traceId}`);
  }
  await writeFile(ledgerPath, `${lines.join("\n")}\n`, "utf-8");
}

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function formatMarkdownRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}
