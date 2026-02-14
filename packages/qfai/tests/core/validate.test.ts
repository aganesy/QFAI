import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import type { ValidationResult } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";

describe("validateProject (v1.4.8 spec pack)", { timeout: 15000 }, () => {
  it("passes when required files and ledger links are complete", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const codes = result.issues.map((item) => item.code);

      expect(typeof result.toolVersion).toBe("string");
      expect(result.counts.error).toBe(0);
      expect(codes).not.toContain("E_SPEC_MISSING_FILESET");
      expect(codes).not.toContain("E_AC_NOT_VERIFIED");
      expect(codes).not.toContain("E_TC_ORPHAN");
    });
  });

  it("fails when required file set is missing", async () => {
    await withProject(async (root) => {
      const specDir = resolveSpecPackDir(root);
      await rm(path.join(specDir, "10_Test-cases.md"), { force: true });

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_SPEC_MISSING_FILESET",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("10_Test-cases.md");
    });
  });

  it("does not emit delta structure errors when 18_delta.md is missing", async () => {
    await withProject(async (root) => {
      const specDir = resolveSpecPackDir(root);
      await rm(path.join(specDir, "18_delta.md"), { force: true });

      const result = await validateProject(root);
      const missingFileIssue = result.issues.find(
        (item) => item.code === "E_SPEC_MISSING_FILESET",
      );
      const deltaStructureIssue = result.issues.find(
        (item) => item.code === "E_DELTA_MISSING_REQUIRED",
      );

      expect(missingFileIssue).toBeDefined();
      expect(missingFileIssue?.refs).toContain("18_delta.md");
      expect(deltaStructureIssue).toBeUndefined();
    });
  });

  it("fails when ledger ex_ids is empty", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(root, "TR-0001", "ex_ids", "");

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_LEDGER_EMPTY_CELL",
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
        (item) => item.code === "E_REF_NOT_FOUND",
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
        (item) => item.code === "E_ID_INVALID_FORMAT",
      );

      expect(codes).toContain("QFAI-AC-001");
      expect(codes).toContain("E_ID_INVALID_FORMAT");
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
        (item) => item.code === "E_UPWARD_REF_FORBIDDEN",
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
        (item) => item.code === "E_REF_NOT_FOUND",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("CON-API-9999");
    });
  });

  it("fails when delta required sections are missing", async () => {
    await withProject(async (root) => {
      const deltaPath = path.join(resolveSpecPackDir(root), "18_delta.md");
      await writeFile(
        deltaPath,
        ["# 18 Delta", "", "## Notes", "", "- incomplete delta", ""].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_DELTA_MISSING_REQUIRED",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when Rejected section lacks markers", async () => {
    await withProject(async (root) => {
      const deltaPath = path.join(resolveSpecPackDir(root), "18_delta.md");
      await writeFile(
        deltaPath,
        [
          "# 18 Delta",
          "",
          "## Change Summary",
          "",
          "- sample",
          "",
          "## Rationale",
          "",
          "- sample",
          "",
          "## Candidates Considered",
          "",
          "- sample",
          "",
          "## Adopted",
          "",
          "- sample",
          "",
          "## Rejected",
          "",
          "- rationale only",
          "",
          "## Impact",
          "",
          "- sample",
          "",
          "## Follow-ups",
          "",
          "- sample",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_DELTA_MISSING_REQUIRED",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("keeps OQ open as warning when release_candidate is false", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_OQ_OPEN_RELEASE_BLOCK",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("blocks OQ open on release_candidate", async () => {
    await withProject(async (root) => {
      const initiativePath = path.join(
        resolveSpecPackDir(root),
        "03_Initiative.md",
      );
      const initiative = await readFile(initiativePath, "utf-8");
      await writeFile(
        initiativePath,
        initiative.replace(
          "release_candidate: false",
          "release_candidate: true",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_OQ_OPEN_RELEASE_BLOCK",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("blocks release candidate when OQ status cannot be parsed", async () => {
    await withProject(async (root) => {
      const initiativePath = path.join(
        resolveSpecPackDir(root),
        "03_Initiative.md",
      );
      const openQuestionsPath = path.join(
        resolveSpecPackDir(root),
        "15_Open-questions.md",
      );
      const initiative = await readFile(initiativePath, "utf-8");
      await writeFile(
        initiativePath,
        initiative.replace(
          "release_candidate: false",
          "release_candidate: true",
        ),
        "utf-8",
      );
      await writeFile(
        openQuestionsPath,
        [
          "# Open Questions",
          "",
          "## OQ-0001",
          "- stauts: open",
          "- context: typo status key",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "E_OQ_STATUS_UNPARSEABLE",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("does not fail when REQUIRE package exists without legacy require files", async () => {
    await withProject(async (root) => {
      const requireDir = path.join(root, ".qfai", "require");
      await rm(path.join(requireDir, "glossary.md"), { force: true });
      await rm(path.join(requireDir, "actors.md"), { force: true });
      await rm(path.join(requireDir, "business-flows.md"), { force: true });
      await rm(path.join(requireDir, "require.md"), { force: true });

      const result = await validateProject(root);
      const reqCtxError = result.issues.find(
        (item) => item.code === "QFAI-REQCTX-003",
      );

      expect(reqCtxError).toBeUndefined();
      expect(result.counts.error).toBe(0);
    });
  });

  it("fails when REQUIRE package and business-flows.md are both missing", async () => {
    await withProject(async (root) => {
      const requireDir = path.join(root, ".qfai", "require");
      await rm(path.join(requireDir, "REQUIRE-0001"), {
        recursive: true,
        force: true,
      });
      await rm(path.join(requireDir, "business-flows.md"), { force: true });

      const result = await validateProject(root);
      const reqCtxError = result.issues.find(
        (item) => item.code === "QFAI-REQCTX-003",
      );

      expect(reqCtxError).toBeDefined();
      expect(reqCtxError?.severity).toBe("error");
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

  it("escapes multiline fix text in github annotation output", async () => {
    await withProject(async (root) => {
      const skillPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-sdd",
        "SKILL.md",
      );
      const original = await readFile(skillPath, "utf-8");
      await writeFile(skillPath, `${original}\n<!-- modified for test -->\n`);

      const output = await captureStdout(async () => {
        await runValidate({
          root,
          strict: false,
          failOn: "never",
          format: "github",
        });
      });
      const line =
        output.split("\n").find((item) => item.includes("QFAI-SKILLS-001")) ??
        "";

      expect(line).toContain("::error");
      expect(line).toContain("%0A");
      expect(line).not.toContain(
        "fix=skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。\n",
      );
    });
  });

  it("indents multiline fix text in text output", async () => {
    await withProject(async (root) => {
      const skillPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-sdd",
        "SKILL.md",
      );
      const original = await readFile(skillPath, "utf-8");
      await writeFile(
        skillPath,
        `${original}\n<!-- modified for text format -->\n`,
      );

      const output = await captureStdout(async () => {
        await runValidate({
          root,
          strict: false,
          failOn: "never",
          format: "text",
        });
      });

      expect(output).toContain(
        "  fix: skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
      );
      expect(output).toContain("\n       次のいずれかを実施してください:");
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
  await seedValidationFixtures(root);
  return root;
}

async function seedValidationFixtures(root: string): Promise<void> {
  const fixtureRoot = path.resolve(
    process.cwd(),
    "tests",
    "fixtures",
    "init-seed",
    ".qfai",
  );
  await cp(
    path.join(fixtureRoot, "specs", "spec-0001"),
    path.join(root, ".qfai", "specs", "spec-0001"),
    { recursive: true, force: true },
  );
  await cp(
    path.join(fixtureRoot, "require", "REQUIRE-0001"),
    path.join(root, ".qfai", "require", "REQUIRE-0001"),
    { recursive: true, force: true },
  );

  const contractsTemplateRoot = path.join(
    root,
    ".qfai",
    "assistant",
    "skills",
    "qfai-sdd",
    "templates",
    "contracts",
  );
  await cp(
    path.join(contractsTemplateRoot, "api-contract.sample.yaml"),
    path.join(root, ".qfai", "contracts", "api", "api-contract.sample.yaml"),
    { force: true },
  );
  await cp(
    path.join(contractsTemplateRoot, "db-contract.sample.sql"),
    path.join(root, ".qfai", "contracts", "db", "db-contract.sample.sql"),
    { force: true },
  );
  await cp(
    path.join(contractsTemplateRoot, "ui-contract.sample.yaml"),
    path.join(root, ".qfai", "contracts", "ui", "ui-contract.sample.yaml"),
    { force: true },
  );
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
