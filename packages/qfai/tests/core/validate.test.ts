import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import type { ValidationResult } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";

describe("validateProject (spec pack)", { timeout: 15000 }, () => {
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

  it("blocks OQ open when release_candidate is true in status JSON", async () => {
    await withProject(async (root) => {
      const statusPath = path.join(root, ".qfai", "status", "release.json");
      await writeFile(
        statusPath,
        `${JSON.stringify({ release_candidate: true }, null, 2)}\n`,
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

  it("warns when specs contain status-like fields", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) =>
          item.code === "QFAI-STATUS-001" &&
          item.file?.endsWith("03_Initiative.md"),
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("release_candidate:");
    });
  });

  it("warns when business-rules has no BR IDs", async () => {
    await withProject(async (root) => {
      const pathToFile = path.join(
        resolveSpecPackDir(root),
        "08_Business-rules.md",
      );
      await writeFile(
        pathToFile,
        ["# 08 Business Rules", "", "No rule IDs in this file.", ""].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-DENSITY-001" && item.file === pathToFile,
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(pathToFile);
    });
  });

  it("warns when examples has no Scenario entries", async () => {
    await withProject(async (root) => {
      const pathToFile = path.join(
        resolveSpecPackDir(root),
        "09_Examples.feature",
      );
      await writeFile(
        pathToFile,
        ["Feature: Empty examples", "", "# no scenarios", ""].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-DENSITY-002" && item.file === pathToFile,
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(pathToFile);
    });
  });

  it("warns when test-cases has no IDs or Coverage Matrix", async () => {
    await withProject(async (root) => {
      const pathToFile = path.join(
        resolveSpecPackDir(root),
        "10_Test-cases.md",
      );
      await writeFile(
        pathToFile,
        [
          "# 10 Test Cases",
          "",
          "## Cases",
          "",
          "| Name | Notes |",
          "| ---- | ----- |",
          "| sample | no tc id |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const idIssue = result.issues.find(
        (item) => item.code === "QFAI-DENSITY-003" && item.file === pathToFile,
      );
      const matrixIssue = result.issues.find(
        (item) => item.code === "QFAI-DENSITY-004" && item.file === pathToFile,
      );

      expect(idIssue).toBeDefined();
      expect(idIssue?.severity).toBe("warning");
      expect(idIssue?.file).toBe(pathToFile);
      expect(matrixIssue).toBeDefined();
      expect(matrixIssue?.severity).toBe("warning");
      expect(matrixIssue?.file).toBe(pathToFile);
    });
  });

  it("emits import-lite input warning when require index files are absent", async () => {
    await withProject(async (root) => {
      const requireDir = path.join(root, ".qfai", "require");
      await rm(path.join(requireDir, "01_sources.md"), { force: true });
      await rm(path.join(requireDir, "02_requirement-index.md"), {
        force: true,
      });
      await rm(path.join(requireDir, "03_open-questions.md"), { force: true });

      const result = await validateProject(root);
      const reqCtxIssue = result.issues.find((item) =>
        item.code.startsWith("QFAI-REQCTX-"),
      );
      const importLiteIssue = result.issues.find(
        (item) => item.code === "QFAI-IMPLITE-001",
      );

      expect(reqCtxIssue).toBeUndefined();
      expect(importLiteIssue).toBeDefined();
      expect(importLiteIssue?.severity).toBe("warning");
      expect(result.counts.error).toBe(0);
    });
  });

  it("warns when requirement-index has no REQ IDs", async () => {
    await withProject(async (root) => {
      const requirementIndexPath = path.join(
        root,
        ".qfai",
        "require",
        "02_requirement-index.md",
      );
      await writeFile(
        requirementIndexPath,
        [
          "# 02 Requirement Index",
          "",
          "| REQ-ID | Statement | Priority | Source refs | Notes |",
          "| ------ | --------- | -------- | ----------- | ----- |",
          "| EXT-REQ-0001 | legacy id | P1 | SRC-0001 | sample |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-REQINDEX-001",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(requirementIndexPath);
    });
  });

  it("warns when source refs are mostly missing in requirement-index", async () => {
    await withProject(async (root) => {
      const requirementIndexPath = path.join(
        root,
        ".qfai",
        "require",
        "02_requirement-index.md",
      );
      await writeFile(
        requirementIndexPath,
        [
          "# 02 Requirement Index",
          "",
          "| REQ-ID | Statement | Priority | Source refs | Notes |",
          "| ------ | --------- | -------- | ----------- | ----- |",
          "| REQ-0001 | sample 1 | P1 |  | missing refs |",
          "| REQ-0002 | sample 2 | P2 |  | missing refs |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-REQINDEX-002",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(requirementIndexPath);
    });
  });

  it("does not warn about import-lite input source when evidence exists", async () => {
    await withProject(async (root) => {
      const requireDir = path.join(root, ".qfai", "require");
      await rm(path.join(requireDir, "01_sources.md"), { force: true });
      await rm(path.join(requireDir, "02_requirement-index.md"), {
        force: true,
      });
      await rm(path.join(requireDir, "03_open-questions.md"), { force: true });

      const evidencePath = path.join(
        root,
        ".qfai",
        "evidence",
        "import-lite-20260216000000000.md",
      );
      await writeFile(
        evidencePath,
        [
          "# Evidence: import-lite",
          "",
          "## Metadata",
          "",
          "- entrypoint: import-lite",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-IMPLITE-001",
      );

      expect(issue).toBeUndefined();
    });
  });

  it("fails when _shared/04_Business-flow.md has no mermaid block", async () => {
    await withProject(async (root) => {
      const businessFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_shared",
        "04_Business-flow.md",
      );
      await mkdir(path.dirname(businessFlowPath), { recursive: true });
      await writeFile(
        businessFlowPath,
        "# 04 Business Flow\n\nNo diagram block.\n",
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-MMD-003",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(businessFlowPath);
    });
  });

  it("fails when _shared/04_Business-flow.md has mermaid but no flowchart/sequenceDiagram", async () => {
    await withProject(async (root) => {
      const businessFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_shared",
        "04_Business-flow.md",
      );
      await mkdir(path.dirname(businessFlowPath), { recursive: true });
      await writeFile(
        businessFlowPath,
        [
          "# 04 Business Flow",
          "",
          "```mermaid",
          "classDiagram",
          "  class User",
          "```",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-MMD-004",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(businessFlowPath);
    });
  });

  it("warns when legacy Business-flow.feature exists under _shared", async () => {
    await withProject(async (root) => {
      const legacyFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_shared",
        "05_Business-flow.feature",
      );
      await mkdir(path.dirname(legacyFlowPath), { recursive: true });
      await writeFile(
        legacyFlowPath,
        [
          "Feature: Legacy Business Flow",
          "  Scenario: old format",
          "    Given legacy",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-BFLOW-003",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(legacyFlowPath);
    });
  });

  it("fails when mermaid syntax is placed in non-mermaid fence", async () => {
    await withProject(async (root) => {
      const discussPath = path.join(
        root,
        ".qfai",
        "discuss",
        "discuss-20260216170000000",
        "04_Business-flow.md",
      );
      await mkdir(path.dirname(discussPath), { recursive: true });
      await writeFile(
        discussPath,
        [
          "# Business Flow",
          "",
          "```text",
          "sequenceDiagram",
          "  User->>System: request",
          "```",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-MMD-001",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(discussPath);
    });
  });

  it("fails when required review gate summary is missing", async () => {
    await withProject(async (root) => {
      const summaryPath = resolveReviewSummaryPath(
        root,
        "spec-0001",
        "user-stories",
      );
      await rm(summaryPath, { force: true });

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-RGATE-040",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.message).toContain("scope=spec-0001");
      expect(issue?.message).toContain("layer=user-stories");
    });
  });

  it("fails when fixed summary keeps feedback", async () => {
    await withProject(async (root) => {
      const summaryPath = resolveReviewSummaryPath(
        root,
        "spec-0001",
        "user-stories",
      );
      const summaryRaw = await readFile(summaryPath, "utf-8");
      const summary = JSON.parse(summaryRaw) as {
        aggregate: {
          total_feedback: number;
          all_passed: boolean;
          status: string;
        };
        reviewers: Array<{ feedback_count: number }>;
      };

      summary.aggregate.total_feedback = 1;
      summary.aggregate.all_passed = false;
      summary.aggregate.status = "fixed";
      if (summary.reviewers[0]) {
        summary.reviewers[0].feedback_count = 1;
      }

      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-RGATE-020",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when fingerprint changed without attempt increment", async () => {
    await withProject(async (root) => {
      const userStoriesPath = path.join(
        resolveSpecPackDir(root),
        "06_User-stories.md",
      );
      const original = await readFile(userStoriesPath, "utf-8");
      await writeFile(userStoriesPath, `${original}\n- drift\n`);

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-RGATE-031",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
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
  await seedReviewGateFixtures(root);
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
    path.join(fixtureRoot, "require", "REQUIRE-0001", "07_Open-questions.md"),
    path.join(root, ".qfai", "require", "03_open-questions.md"),
    { force: true },
  );
  await writeFile(
    path.join(root, ".qfai", "require", "01_sources.md"),
    [
      "# 01 Sources",
      "",
      "| Source ID | Type | Location | Version/Date | Owner | Confidence | Notes |",
      "| --------- | ---- | -------- | ------------ | ----- | ---------- | ----- |",
      "| SRC-0001 | file | discuss/discuss-20260215205220203 | 2026-02-16 | system | high | fixture seed |",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai", "require", "02_requirement-index.md"),
    [
      "# 02 Requirement Index",
      "",
      "| REQ-ID | Statement (1-3 lines, what only) | Priority (P0/P1/P2) | Source refs (required) | Notes |",
      "| ------ | -------------------------------- | -------------------- | ---------------------- | ----- |",
      "| REQ-0001 | Seed requirement for validator fixture. | P1 | SRC-0001 | fixture seed |",
      "",
    ].join("\n"),
    "utf-8",
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

async function seedReviewGateFixtures(root: string): Promise<void> {
  const specDir = resolveSpecPackDir(root);
  const requiredLayers: Array<{ layer: string; fileName: string }> = [
    { layer: "spec", fileName: "01_Spec.md" },
    { layer: "user-stories", fileName: "06_User-stories.md" },
    { layer: "acceptance-criteria", fileName: "07_Acceptance-criteria.md" },
    { layer: "business-rules", fileName: "08_Business-rules.md" },
    { layer: "examples", fileName: "09_Examples.feature" },
    { layer: "test-cases", fileName: "10_Test-cases.md" },
  ];

  for (const gate of requiredLayers) {
    await writeFixedReviewAttempt(root, {
      scope: "spec-0001",
      layer: gate.layer,
      inputs: [path.join(specDir, gate.fileName)],
      label: toTitleCase(gate.layer),
    });
  }
}

async function writeFixedReviewAttempt(
  root: string,
  input: {
    scope: string;
    layer: string;
    inputs: string[];
    label: string;
  },
): Promise<void> {
  const scopeType = inferScopeType(input.scope);
  const attemptDir = path.join(
    root,
    ".qfai",
    "review",
    input.scope,
    input.layer,
    "attempt-01",
  );
  await mkdir(attemptDir, { recursive: true });

  await writeFile(
    path.join(attemptDir, "review_request.md"),
    [
      "# Review Request",
      "",
      `- scope: ${input.scope}`,
      `- layer: ${input.layer}`,
      "- attempt: attempt-01",
      "",
    ].join("\n"),
  );

  await writeFile(
    path.join(attemptDir, "R01_qa-lead.md"),
    ["- verdict: pass", "- feedback: (none)", ""].join("\n"),
  );
  await writeFile(
    path.join(attemptDir, "R02_qa-gatekeeper.md"),
    ["- verdict: pass", "- feedback: (none)", ""].join("\n"),
  );
  await writeFile(
    path.join(attemptDir, "R03_reviewer.md"),
    ["- verdict: pass", "- feedback: (none)", ""].join("\n"),
  );

  const fingerprintEntries = input.inputs.map((filePath) => ({
    absolutePath: filePath,
    digestPath: toPosix(path.relative(root, filePath)),
  }));
  const fingerprintInputs = fingerprintEntries.map((entry) => entry.digestPath);
  const fingerprintValue = await computeReviewFingerprint(fingerprintEntries);

  const summary = {
    schema_version: "1.0",
    scope: {
      type: scopeType,
      id: input.scope,
    },
    layer: {
      name: input.layer,
      label: input.label,
    },
    attempt: {
      no: 1,
      dir: "attempt-01",
      started_at: "2026-02-16T00:00:00Z",
      finished_at: "2026-02-16T00:05:00Z",
    },
    fingerprint: {
      algo: "sha256",
      value: fingerprintValue,
      inputs: fingerprintInputs,
    },
    reviewers: [
      {
        id: "qa-lead",
        role: "Quality Lead",
        verdict: "pass",
        feedback_count: 0,
        file: "R01_qa-lead.md",
      },
      {
        id: "qa-gatekeeper",
        role: "QA Gatekeeper",
        verdict: "pass",
        feedback_count: 0,
        file: "R02_qa-gatekeeper.md",
      },
      {
        id: "reviewer",
        role: "Independent Reviewer",
        verdict: "pass",
        feedback_count: 0,
        file: "R03_reviewer.md",
      },
    ],
    aggregate: {
      total_feedback: 0,
      all_passed: true,
      status: "fixed",
    },
  };

  await writeFile(
    path.join(attemptDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
}

function inferScopeType(
  value: string,
): "shared" | "spec" | "require" | "discuss" {
  if (value === "shared") {
    return "shared";
  }
  if (value.startsWith("spec-")) {
    return "spec";
  }
  if (value.startsWith("require-")) {
    return "require";
  }
  return "discuss";
}

async function computeReviewFingerprint(
  entries: Array<{ absolutePath: string; digestPath: string }>,
): Promise<string> {
  const hash = createHash("sha256");
  for (const entry of entries) {
    const content = await readFile(entry.absolutePath, "utf-8");
    hash.update(entry.digestPath);
    hash.update("\n");
    hash.update(content);
    hash.update("\n---\n");
  }
  return hash.digest("hex");
}

function resolveReviewSummaryPath(
  root: string,
  scope: string,
  layer: string,
): string {
  return path.join(
    root,
    ".qfai",
    "review",
    scope,
    layer,
    "attempt-01",
    "summary.json",
  );
}

function toTitleCase(value: string): string {
  return value
    .split("-")
    .map((part) =>
      part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part,
    )
    .join(" ");
}

function toPosix(value: string): string {
  return value.replaceAll("\\", "/");
}

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function formatMarkdownRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}
