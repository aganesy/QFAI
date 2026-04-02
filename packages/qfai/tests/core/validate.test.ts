import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import { defaultConfig } from "../../src/core/config.js";
import { normalizeValidationResult } from "../../src/core/normalize.js";
import { writeValidateRunLog } from "../../src/core/runLog.js";
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

  it("skips ATDD hard gate checks in refinement phase", async () => {
    await withProject(async (root) => {
      await rm(path.join(root, "tests"), { recursive: true, force: true });

      const full = await validateProject(root);
      expect(full.issues.some((item) => item.code === "QFAI-ATDD-111")).toBe(true);

      const refinement = await validateProject(root, undefined, {
        phase: "refinement",
      });
      expect(refinement.issues.some((item) => item.code.startsWith("QFAI-ATDD-"))).toBe(false);
    });
  });

  it("fails when required file set is missing", async () => {
    await withProject(async (root) => {
      const specDir = resolveSpecPackDir(root);
      await rm(path.join(specDir, "10_Test-cases.md"), { force: true });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_SPEC_MISSING_FILESET");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("10_Test-cases.md");
    });
  });

  it("fails when prototyping evidence is missing", async () => {
    await withProject(async (root) => {
      await rm(path.join(root, ".qfai", "evidence", "prototyping.json"), {
        force: true,
      });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-PROT-101");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when prototyping runtime gate records API 404", async () => {
    await withProject(async (root) => {
      const evidencePath = path.join(root, ".qfai", "evidence", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8")) as Record<string, unknown>;
      evidence.runtimeGate = {
        ui: [{ route: "/orders", status: 200 }],
        api: [{ method: "GET", path: "/api/orders", status: 404 }],
      };
      await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) =>
          item.code === "QFAI-PROT-113" && item.rule === "prototypingEvidence.apiRuntime404",
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("GET /api/orders");
    });
  });

  it("does not emit delta structure errors when 18_delta.md is missing", async () => {
    await withProject(async (root) => {
      const specDir = resolveSpecPackDir(root);
      await rm(path.join(specDir, "18_delta.md"), { force: true });

      const result = await validateProject(root);
      const missingFileIssue = result.issues.find((item) => item.code === "E_SPEC_MISSING_FILESET");
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
      const issue = result.issues.find((item) => item.code === "E_LEDGER_EMPTY_CELL");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.message).toContain("ex_ids");
    });
  });

  it("fails when ledger references unknown EX", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(root, "TR-0001", "ex_ids", "EX-9999");

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_REF_NOT_FOUND");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("EX-9999");
    });
  });

  it("keeps ledger row validation even when AC definitions are missing", async () => {
    await withProject(async (root) => {
      const acPath = path.join(resolveSpecPackDir(root), "07_Acceptance-criteria.md");
      await writeFile(acPath, "# Acceptance Criteria\n\n(no ids)\n", "utf-8");
      await updateLedgerCell(root, "TR-0001", "trace_id", "TR-XYZ");

      const result = await validateProject(root);
      const codes = result.issues.map((item) => item.code);
      const ledgerIssue = result.issues.find((item) => item.code === "E_ID_INVALID_FORMAT");

      expect(codes).toContain("QFAI-AC-001");
      expect(codes).toContain("E_ID_INVALID_FORMAT");
      expect(ledgerIssue?.refs).toContain("TR-XYZ");
    });
  });

  it("fails when upper layer references lower IDs directly", async () => {
    await withProject(async (root) => {
      const userStoriesPath = path.join(resolveSpecPackDir(root), "06_User-stories.md");
      const text = await readFile(userStoriesPath, "utf-8");
      await writeFile(userStoriesPath, `${text}\n- AC-0001 should be listed here\n`);

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_UPWARD_REF_FORBIDDEN");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when ledger references missing contract declaration", async () => {
    await withProject(async (root) => {
      await updateLedgerCell(root, "TR-0001", "con_ids", "CON-API-9999;CON-DB-0001");

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_REF_NOT_FOUND");

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
      const issue = result.issues.find((item) => item.code === "E_DELTA_MISSING_REQUIRED");
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
      const issue = result.issues.find((item) => item.code === "E_DELTA_MISSING_REQUIRED");
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("keeps OQ open as warning when release_candidate is false", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_OQ_OPEN_RELEASE_BLOCK");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("blocks OQ open on release_candidate", async () => {
    await withProject(async (root) => {
      const initiativePath = path.join(resolveSpecPackDir(root), "03_Initiative.md");
      const initiative = await readFile(initiativePath, "utf-8");
      await writeFile(
        initiativePath,
        initiative.replace("release_candidate: false", "release_candidate: true"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "E_OQ_OPEN_RELEASE_BLOCK");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("does not elevate OQ gate from legacy status JSON", async () => {
    await withProject(async (root) => {
      const statusPath = path.join(root, ".qfai", "status", "release.json");
      await mkdir(path.dirname(statusPath), { recursive: true });
      await writeFile(
        statusPath,
        `${JSON.stringify({ release_candidate: true }, null, 2)}\n`,
        "utf-8",
      );

      const result = await validateProject(root);
      const oqIssue = result.issues.find((item) => item.code === "E_OQ_OPEN_RELEASE_BLOCK");
      const legacyIssue = result.issues.find((item) => item.code === "LEGACY_STATUS_DIR_NONEMPTY");

      expect(oqIssue).toBeDefined();
      expect(oqIssue?.severity).toBe("warning");
      expect(oqIssue?.refs).toContain("OQ-0001");
      expect(legacyIssue).toBeDefined();
      expect(legacyIssue?.severity).toBe("warning");
    });
  });

  it("blocks release candidate when OQ status cannot be parsed", async () => {
    await withProject(async (root) => {
      const initiativePath = path.join(resolveSpecPackDir(root), "03_Initiative.md");
      const openQuestionsPath = path.join(resolveSpecPackDir(root), "15_Open-questions.md");
      const initiative = await readFile(initiativePath, "utf-8");
      await writeFile(
        initiativePath,
        initiative.replace("release_candidate: false", "release_candidate: true"),
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
      const issue = result.issues.find((item) => item.code === "E_OQ_STATUS_UNPARSEABLE");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("OQ-0001");
    });
  });

  it("warns when specs contain status-like fields", async () => {
    await withProject(async (root) => {
      const result = await validateProject(root);
      const issue = result.issues.find(
        (item) => item.code === "QFAI-STATUS-001" && item.file?.endsWith("03_Initiative.md"),
      );

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("release_candidate:");
    });
  });

  it("warns when legacy status directory exists", async () => {
    await withProject(async (root) => {
      const statusDir = path.join(root, ".qfai", "status");
      await mkdir(statusDir, { recursive: true });
      await writeFile(path.join(statusDir, "README.md"), "# status\n", "utf-8");

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "LEGACY_STATUS_DIR");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toBe(statusDir);
    });
  });

  it("warns stronger when legacy status directory is non-empty", async () => {
    await withProject(async (root) => {
      const statusDir = path.join(root, ".qfai", "status");
      await mkdir(statusDir, { recursive: true });
      await writeFile(
        path.join(statusDir, "release.json"),
        JSON.stringify({ release_candidate: false }),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "LEGACY_STATUS_DIR_NONEMPTY");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("release.json");
    });
  });

  it("warns when business-rules has no BR IDs", async () => {
    await withProject(async (root) => {
      const pathToFile = path.join(resolveSpecPackDir(root), "08_Business-rules.md");
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
      const pathToFile = path.join(resolveSpecPackDir(root), "09_Examples.feature");
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
      const pathToFile = path.join(resolveSpecPackDir(root), "10_Test-cases.md");
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

  it("fails when discussion-pack is missing", async () => {
    await withProject(async (root) => {
      const discussionDir = path.join(root, ".qfai", "discussion");
      await rm(resolveDiscussionPackDir(root), { recursive: true, force: true });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-DPACK-001");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(discussionDir);
    });
  });

  it("fails when discussion-pack has missing required files", async () => {
    await withProject(async (root) => {
      await rm(path.join(resolveDiscussionPackDir(root), "08_Glossary.md"), {
        force: true,
      });
      await rm(path.join(resolveDiscussionPackDir(root), "10_Policy.md"), {
        force: true,
      });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-DPACK-002");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toEqual(expect.arrayContaining(["08_Glossary.md", "10_Policy.md"]));
    });
  });

  it("fails when discussion-pack minimum content is not satisfied", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "07_NFR.md"),
        ["# 07 NFR", "", "TODO"].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-DPACK-003");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("07_NFR.md");
    });
  });

  it("fails when blocking OQ exists in discussion-pack", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "11_OQ-Register.md"),
        [
          "# 11 OQ Register",
          "",
          "### OQ-0002: unresolved architecture choice",
          "",
          "- Disposition: open",
          "- Gate: tdd",
          "- Owner: arch-owner",
          "- Reason: more analysis required",
          "- Next decision point: before implementation start",
          "- Options:",
          "  - Option A: keep current stack",
          "  - Option B: replace runtime stack",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-DPACK-004");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("OQ-0002");
    });
  });

  it("fails when deferred OQ is missing from 13_Deferred.md (QFAI-DPACK-007)", async () => {
    await withProject(async (root) => {
      // Use table format so extractOqTableRows can parse the register.
      // OQ-0003 is deferred but NOT in 13_Deferred.md → triggers DPACK-007.
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "11_OQ-Register.md"),
        [
          "# 11 OQ Register",
          "",
          "| OQ-ID   | Title                    | Gate    | Disposition | Owner   | Rationale                        | Options                                      | Recommendation | Next-Decision-Point | Due        | Evidence         |",
          "| ------- | ------------------------ | ------- | ----------- | ------- | -------------------------------- | -------------------------------------------- | -------------- | ------------------- | ---------- | ---------------- |",
          "| OQ-0001 | fallback strategy        | discussion | deferred | qa-lead | policy review in next cycle      | Option A: keep scope / Option B: extend scope | Option A       | before RC            | 2026-03-01 | Conversation log |",
          "| OQ-0003 | missing deferred detail  | sdd        | deferred | user    | needs external input             | Option A: proceed / Option B: defer further   | Option A       | before sdd           | 2026-04-01 | Conversation log |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const dpackIssue = result.issues.find((item) => item.code === "QFAI-DPACK-007");

      expect(dpackIssue).toBeDefined();
      expect(dpackIssue?.severity).toBe("error");
      expect(dpackIssue?.refs).toContain("OQ-0003");
      // OQ-0001 is already in 13_Deferred.md so should NOT be reported
      expect(dpackIssue?.refs).not.toContain("OQ-0001");
    });
  });

  it("fails when 03_Story-Workshop.md has no mermaid block (QFAI-DPACK-008)", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md"),
        [
          "# 03 Story Workshop",
          "",
          "## User Stories",
          "",
          "As a user, I want to validate discussion packs so that I can ensure completeness.",
          "",
          "No diagram is included here.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const dpackIssue = result.issues.find((item) => item.code === "QFAI-DPACK-008");

      expect(dpackIssue).toBeDefined();
      expect(dpackIssue?.severity).toBe("error");
    });
  });

  it("warns when 02_Inception-Deck.md has no mermaid block (QFAI-VIS-001)", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "02_Inception-Deck.md"),
        [
          "# 02 Inception Deck",
          "",
          "## 6. Show the Solution",
          "",
          "This inception deck text intentionally omits a mermaid diagram while still providing enough narrative detail for minimum content checks.",
          "The validator should emit a warning that a mermaid-based visual aid is recommended for decision clarity.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-VIS-001");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
    });
  });

  it("warns when story workshop has UI hints but no HTML+CSS mock (QFAI-VIS-002)", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md"),
        [
          "# 03 Story Workshop",
          "",
          "The UI screen for order creation needs a clear form layout and button placement.",
          "",
          "```mermaid",
          "flowchart TD",
          "  A[User opens screen] --> B[User fills form]",
          "  B --> C[Submit]",
          "```",
          "",
          "This fixture intentionally omits HTML+CSS screen mock details.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-VIS-002");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("info");
    });
  });

  it("fails when _policies/04_Business-Flow.md has no mermaid block", async () => {
    await withProject(async (root) => {
      const businessFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_policies",
        "04_Business-Flow.md",
      );
      await mkdir(path.dirname(businessFlowPath), { recursive: true });
      await writeFile(businessFlowPath, "# 04 Business Flow\n\nNo diagram block.\n", "utf-8");

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-MMD-003");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(businessFlowPath);
    });
  });

  it("fails when _policies/04_Business-Flow.md has mermaid but no flowchart/sequenceDiagram", async () => {
    await withProject(async (root) => {
      const businessFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_policies",
        "04_Business-Flow.md",
      );
      await mkdir(path.dirname(businessFlowPath), { recursive: true });
      await writeFile(
        businessFlowPath,
        ["# 04 Business Flow", "", "```mermaid", "classDiagram", "  class User", "```", ""].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-MMD-004");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(businessFlowPath);
    });
  });

  it("warns when legacy Business-flow.feature exists under _policies", async () => {
    await withProject(async (root) => {
      const legacyFlowPath = path.join(
        root,
        ".qfai",
        "specs",
        "_policies",
        "05_Business-flow.feature",
      );
      await mkdir(path.dirname(legacyFlowPath), { recursive: true });
      await writeFile(
        legacyFlowPath,
        ["Feature: Legacy Business Flow", "  Scenario: old format", "    Given legacy", ""].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-BFLOW-003");

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
        "discussion",
        "discussion-20260216170000000",
        "03_Story-Workshop.md",
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
      const issue = result.issues.find((item) => item.code === "QFAI-MMD-001");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(discussPath);
    });
  });

  it("fails when root .gitignore is missing and no legacy review gitignore exists", async () => {
    await withProject(async (root) => {
      // Remove root .gitignore (created by init) so neither approach works
      await rm(path.join(root, ".gitignore"), { force: true });
      await rm(path.join(root, ".qfai", "review", ".gitignore"), {
        force: true,
      });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-REVIEW-001");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.file).toBe(path.join(root, ".gitignore"));
    });
  });

  it("fails when review summary is missing in review pack", async () => {
    await withProject(async (root) => {
      await rm(resolveReviewSummaryPath(root), { force: true });

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-REVIEW-004");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
    });
  });

  it("fails when review summary schema is invalid", async () => {
    await withProject(async (root) => {
      const summaryPath = resolveReviewSummaryPath(root);
      await writeFile(
        summaryPath,
        JSON.stringify({
          version: "1.0",
          created_at: "invalid-date",
          target: { kind: "spec", path: ".qfai/specs/spec-0001" },
          roster: [{ reviewer: "reviewer", status: "PASS", feedback_count: 0 }],
          overall_status: "PASS",
        }),
      );

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-REVIEW-007");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.message).toContain("created_at");
    });
  });

  it("fails when review summary target.kind uses legacy require", async () => {
    await withProject(async (root) => {
      const summaryPath = resolveReviewSummaryPath(root);
      const summary = JSON.parse(await readFile(summaryPath, "utf-8")) as {
        target?: { kind?: string };
      };
      if (summary.target) {
        summary.target.kind = "require";
      }
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");

      const result = await validateProject(root);
      const issue = result.issues.find((item) => item.code === "QFAI-REVIEW-007");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.message).toContain("target.kind");
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

      const { runPath, runDir } = await resolveLatestRunPath(root);
      const runJson = JSON.parse(await readFile(path.join(runPath, "run.json"), "utf-8")) as {
        schema_version: number;
        run_id: string;
        result: {
          status: "pass" | "fail";
        };
      };
      const validatorJson = JSON.parse(
        await readFile(path.join(runPath, "validator.json"), "utf-8"),
      ) as {
        schema_version: number;
        status: string;
      };
      await expect(readFile(path.join(runPath, "summary.md"), "utf-8")).resolves.toContain(
        "# Validate Run Summary",
      );

      expect(runJson.schema_version).toBe(1);
      expect(runJson.run_id).toBe(runDir);
      expect(runJson.result.status).toBe("pass");
      expect(validatorJson.schema_version).toBe(1);
      expect(validatorJson.status).toBe("pass");

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

  it("records fail run-log status when warning policy fails the command", async () => {
    await withProject(async (root) => {
      let exitCode = -1;
      await captureStdout(async () => {
        exitCode = await runValidate({
          root,
          strict: false,
          failOn: "warning",
          format: "text",
        });
      });

      expect(exitCode).toBe(1);

      const { runPath } = await resolveLatestRunPath(root);
      const runJson = JSON.parse(await readFile(path.join(runPath, "run.json"), "utf-8")) as {
        result: { status: "pass" | "fail"; errors: number; warnings: number };
      };
      const validatorJson = JSON.parse(
        await readFile(path.join(runPath, "validator.json"), "utf-8"),
      ) as {
        status: "pass" | "fail";
      };

      expect(runJson.result.status).toBe("fail");
      expect(runJson.result.errors).toBe(0);
      expect(runJson.result.warnings).toBeGreaterThan(0);
      expect(validatorJson.status).toBe("fail");
    });
  });

  it("escapes multiline fix text in github annotation output", async () => {
    await withProject(async (root) => {
      const skillPath = path.join(root, ".qfai", "assistant", "skills", "qfai-sdd", "SKILL.md");
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
      const line = output.split("\n").find((item) => item.includes("QFAI-SKILLS-001")) ?? "";

      expect(line).toContain("::error");
      expect(line).toContain("%0A");
      expect(line).not.toContain(
        "fix=skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。\n",
      );
    });
  });

  it("indents multiline fix text in text output", async () => {
    await withProject(async (root) => {
      const skillPath = path.join(root, ".qfai", "assistant", "skills", "qfai-sdd", "SKILL.md");
      const original = await readFile(skillPath, "utf-8");
      await writeFile(skillPath, `${original}\n<!-- modified for text format -->\n`);

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

describe("writeValidateRunLog", { timeout: 15000 }, () => {
  it("allocates unique run directories when the same timestamp collides", async () => {
    await withProject(async (root) => {
      const validation = await validateProject(root);
      const normalized = normalizeValidationResult(root, validation);
      const startedAt = new Date("2026-02-18T09:00:00.123Z");

      const first = await writeValidateRunLog({
        root,
        config: defaultConfig,
        result: normalized,
        startedAt,
        command: "/qfai-validate",
      });
      const second = await writeValidateRunLog({
        root,
        config: defaultConfig,
        result: normalized,
        startedAt,
        command: "/qfai-validate",
      });

      expect(first.runId).toMatch(/^run-\d{17}$/);
      expect(second.runId).toMatch(/^run-\d{17}$/);
      expect(second.runId).not.toBe(first.runId);
      expect(path.dirname(first.reportDir)).toBe(path.dirname(second.reportDir));

      await expect(readFile(path.join(first.reportDir, "run.json"), "utf-8")).resolves.toContain(
        first.runId,
      );
      await expect(readFile(path.join(second.reportDir, "run.json"), "utf-8")).resolves.toContain(
        second.runId,
      );
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

async function resolveLatestRunPath(root: string): Promise<{ runPath: string; runDir: string }> {
  const reportRoot = path.join(root, ".qfai", "report");
  const runDirs = (await readdir(reportRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^run-\d{17}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  expect(runDirs.length).toBeGreaterThan(0);

  const runDir = runDirs[runDirs.length - 1];
  expect(runDir).toBeDefined();
  return {
    runPath: path.join(reportRoot, runDir ?? ""),
    runDir: runDir ?? "",
  };
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
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
  const fixtureRoot = path.resolve(process.cwd(), "tests", "fixtures", "init-seed", ".qfai");
  await cp(
    path.join(fixtureRoot, "specs", "spec-0001"),
    path.join(root, ".qfai", "specs", "spec-0001"),
    { recursive: true, force: true },
  );
  await seedDiscussionPackFixtures(root);

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

  const testsRoot = path.join(root, "tests");
  await mkdir(path.join(testsRoot, "e2e"), { recursive: true });
  await mkdir(path.join(testsRoot, "integration"), { recursive: true });
  await mkdir(path.join(testsRoot, "api"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "specs", "spec-0001", "tdd"), { recursive: true });

  await writeFile(
    path.join(root, ".qfai", "specs", "spec-0001", "tdd", "test-list.md"),
    [
      "# Test List",
      "",
      "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
      "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
      "| TDD-0001 | TC-0001 | integration | tests/integration/orderDraft.integration.test.ts | covers tc set | done |  | red=observed;green=observed |",
      "",
    ].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(testsRoot, "e2e", "orderDraft.e2e.test.ts"),
    [
      "/* QFAI:SPEC-0001:US-0001 */",
      "/* QFAI:SPEC-0001:US-0002 */",
      "describe('order draft e2e', () => {",
      "  it('covers key user stories', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(testsRoot, "integration", "orderDraft.integration.test.ts"),
    [
      "/* QFAI:SPEC-0001:TC-0001 */",
      "/* QFAI:SPEC-0001:TC-0002 */",
      "/* QFAI:SPEC-0001:TC-0003 */",
      "describe('order draft integration', () => {",
      "  it('covers tc set', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(testsRoot, "api", "orderDraft.api.test.ts"),
    [
      "/* QFAI:CON-API-0001 */",
      "describe('order draft api', () => {",
      "  it('covers api contract', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n"),
    "utf-8",
  );

  await seedPrototypingEvidenceFixture(root);
}

async function seedDiscussionPackFixtures(root: string): Promise<void> {
  const discussionPackDir = resolveDiscussionPackDir(root);
  await mkdir(path.join(discussionPackDir, "uiux"), { recursive: true });

  const files: Array<{ name: string; lines: string[] }> = [
    {
      name: "01_Context.md",
      lines: [
        "# 01 Context",
        "",
        "## Background",
        "",
        "This discussion pack provides the baseline context for validator fixture stability.",
        "It captures the product concept, stakeholders, and constraints to enable deterministic validation.",
        "",
      ],
    },
    {
      name: "02_Inception-Deck.md",
      lines: [
        "# 02 Inception Deck",
        "",
        "## Elevator Pitch",
        "",
        "A stable discussion baseline for validator fixtures that enables deterministic and repeatable test runs.",
        "",
      ],
    },
    {
      name: "03_Story-Workshop.md",
      lines: [
        "# 03 Story Workshop",
        "",
        "## Behavior Obligations",
        "",
        "### CTA Hierarchy",
        "",
        "- Primary: Start Free Trial — hero section",
        "",
        "### State Coverage",
        "",
        "- default: Standard dashboard state with summary content",
        "- loading: Skeleton loading state with spinner",
        "- empty: Empty state with onboarding CTA",
        "- error: Retry state with error guidance",
        "",
        "### Design Anti-goals",
        "",
        "- Anti-goal: Avoid cluttered dashboards with competing CTAs",
        "",
        "```mermaid",
        "sequenceDiagram",
        "  participant U as User",
        "  participant S as System",
        "  U->>S: request",
        "```",
        "",
        "Story workshop content for validator fixture baseline with sufficient detail.",
        "",
      ],
    },
    {
      name: "04_Sources.md",
      lines: [
        "# 04 Sources",
        "",
        "## Trend Scan",
        "",
        "| reference | confidence | freshness_date | source_translation |",
        "| --------- | ---------- | -------------- | ------------------ |",
        "| Ref A | high | 2026-02-16 | Motion pattern translated for the current dashboard workflow |",
        "",
        "## Competitive Reference Registry",
        "",
        "### Competitor Alpha",
        "",
        "- adopted_points: Clear onboarding flow with focused CTA hierarchy",
        "- rejected_points: Hidden navigation patterns that slow first-run completion",
        "- local_translation: Adapted onboarding to the current single-flow dashboard context",
        "",
        "## Source Registry",
        "",
        "| Source ID | Type | Location | Version/Date | Owner | Confidence | Notes |",
        "| --------- | ---- | -------- | ------------ | ----- | ---------- | ----- |",
        "| SRC-0001 | file | discussion/discussion-20260215205220203 | 2026-02-16 | system | high | fixture seed for validator baseline |",
        "",
      ],
    },
    {
      name: "05_Scope.md",
      lines: [
        "# 05 Scope",
        "",
        "## In Scope",
        "",
        "- Provide a stable discussion pack baseline for validator fixtures.",
        "",
        "## Out of Scope",
        "",
        "- Production feature rollout and environment-specific deployment behavior.",
        "",
      ],
    },
    {
      name: "06_REQ.md",
      lines: [
        "# 06 REQ",
        "",
        "## Requirement Catalog",
        "",
        "| REQ-ID | Requirement | Priority | Source refs | Acceptance viewpoint |",
        "| ------ | ----------- | -------- | ----------- | -------------------- |",
        "| REQ-0001 | Seed requirement for validator fixture stability. | Must | SRC-0001 | Validator can parse required files and proceed without fallback. |",
        "",
      ],
    },
    {
      name: "07_NFR.md",
      lines: [
        "# 07 NFR",
        "",
        "## Non-Functional Requirements",
        "",
        "| Category | Requirement | Metric | Validation method | Notes |",
        "| -------- | ----------- | ------ | ----------------- | ----- |",
        "| Reliability | Deterministic validator behavior for baseline fixtures. | No flaky failures in repeated runs. | Core tests pass on CI and local runs. | Baseline for release gating. |",
        "",
      ],
    },
    {
      name: "08_Glossary.md",
      lines: [
        "# 08 Glossary",
        "",
        "## Terms",
        "",
        "| Term | Definition | Synonyms | Source refs |",
        "| ---- | ---------- | -------- | ----------- |",
        "| Discussion-pack | A timestamped 15-file intake package under `.qfai/discussion/discussion-<ts>/`. | discussion pack | SRC-0001 |",
        "",
      ],
    },
    {
      name: "09_Constraints.md",
      lines: [
        "# 09 Constraints",
        "",
        "- Keep discussion-pack files in `discussion-<timestamp>` directories only.",
        "- Keep status fields outside discussion artifacts; status belongs in `.qfai/report/run-*` logs.",
        "- Keep markdown structure explicit so validator parsing remains deterministic.",
        "",
      ],
    },
    {
      name: "10_Policy.md",
      lines: [
        "# 10 Policy",
        "",
        "- SSOT: detailed implementation design belongs to `.qfai/specs/**`.",
        "- Reference direction: lower artifacts may refer to upper artifacts; avoid upper-to-lower direct references.",
        "- Mermaid syntax must use ` ```mermaid ` fences.",
        "",
      ],
    },
    {
      name: "11_OQ-Register.md",
      lines: [
        "# 11 OQ Register",
        "",
        "### OQ-0001: validate fallback strategy timeline",
        "",
        "- Disposition: deferred",
        "- Gate: discussion",
        "- Owner: qa-lead",
        "- Reason: policy review is scheduled in next cycle",
        "- Next decision point: before release candidate creation",
        "- Options:",
        "  - Option A: keep current validator scope",
        "  - Option B: extend validator scope",
        "",
      ],
    },
    {
      name: "12_OQ-Resolution-Log.md",
      lines: [
        "# 12 OQ Resolution Log",
        "",
        "No resolutions recorded yet for this discussion pack baseline.",
        "This file tracks OQ resolution decisions and their rationale.",
        "",
      ],
    },
    {
      name: "13_Deferred.md",
      lines: [
        "# 13 Deferred",
        "",
        "### OQ-0001: validate fallback strategy timeline",
        "",
        "- Reason: policy review is scheduled in next cycle",
        "- Next decision point: before release candidate creation",
        "",
        "This file records deferred items from OQ-Register for traceability.",
        "",
      ],
    },
    {
      name: "14_Review-Request.md",
      lines: [
        "# 14 Review Request",
        "",
        "Review request for discussion pack baseline validator fixtures.",
        "This file captures the review scope and expected reviewers.",
        "Selected direction: verify `uiux/30_comparison.md` Selected Direction is populated and references a compared option.",
        "Strategy alignment: verify `uiux/10_strategy.md` chosen_option matches the selected direction.",
        "Verify screen contracts use all 4 required states (default/loading/empty/error).",
        "",
      ],
    },
    {
      name: "99_delta.md",
      lines: [
        "# 99 Delta",
        "",
        "## Change Summary",
        "",
        "- Seeded baseline discussion-pack fixtures for validator and preflight tests.",
        "",
        "## Rationale",
        "",
        "- Ensures deterministic and complete discussion-pack inputs for test scenarios.",
        "",
      ],
    },
  ];

  for (const file of files) {
    await writeFile(path.join(discussionPackDir, file.name), `${file.lines.join("\n")}\n`, "utf-8");
  }

  const sidecarFiles: Array<{ name: string; lines: string[] }> = [
    {
      name: "uiux/00_index.md",
      lines: ["# uiux Index", "", "- canonical sidecar family"],
    },
    {
      name: "uiux/10_strategy.md",
      lines: [
        "# Strategy",
        "",
        "- surface: web-ui",
        "- selection_required: true",
        "- decision: Choose Option A",
        "- candidate_options: Option A, Option B",
        "- chosen_option: Option A",
        "- rationale: Option A provides the clearest primary action for the dashboard workflow.",
        "- verification_expectations: Check responsive layout and task completion behavior.",
        "- notes_for_reviewer: Focus on selected direction consistency.",
      ],
    },
    {
      name: "uiux/11_design_taste_interview.md",
      lines: [
        "# Taste Interview",
        "",
        "## visual_character",
        "Bold but restrained visual system.",
        "",
        "## emotional_tone",
        "Confident and calm product tone.",
        "",
        "## anti_preferences",
        "Avoid noisy cluttered layouts.",
        "",
        "## admired_rejected_references",
        "Admire clear dashboards; reject hidden navigation.",
        "",
        "## novelty_vs_safety",
        "Bias toward safe core interactions with one focused novelty accent.",
        "",
        "## density_hierarchy",
        "Medium density with one dominant CTA zone.",
        "",
        "## motion_material",
        "Motion should support state changes, not decorate.",
        "",
        "## brand_tone",
        "Professional and direct.",
        "",
        "## unresolved_taste_questions",
        "Confirm dashboard density on smaller screens.",
        "",
        "## taste_reflection_depth",
        "These answers should be reflected in selected direction and contracts.",
      ],
    },
    {
      name: "uiux/20_design_eval_invariant.md",
      lines: [
        "# Invariant Evaluation",
        "",
        "## invariant",
        "",
        "## Axis: accessibility",
        "- axis_id: AX-001",
        "- axis_name: accessibility",
        "- layer: invariant",
        "- definition: Accessibility baseline",
        "- rationale: Required for all surfaces",
        "- scoring_rubric: WCAG AA pass",
        "- weight: 1",
        "- min_score: 0",
        "- max_score: 5",
        "- pass_threshold: 4",
        "- evidence_type: review",
        "- evidence_source: contracts",
        "- review_prompt: Check accessibility",
        "- calibration_anchor: baseline",
        "- dependencies: none",
        "- review_questions: Are accessibility basics present?",
      ],
    },
    {
      name: "uiux/21_design_eval_trend_derived.md",
      lines: [
        "# Trend-derived Evaluation",
        "",
        "## trend-derived",
        "",
        "## Axis: motion_clarity",
        "- axis_id: AX-002",
        "- axis_name: motion_clarity",
        "- layer: trend-derived",
        "- definition: Motion clarity derived from trend scan",
        "- rationale: Reflect current expectations",
        "- scoring_rubric: Motion remains explanatory",
        "- weight: 1",
        "- min_score: 0",
        "- max_score: 5",
        "- pass_threshold: 4",
        "- evidence_type: review",
        "- evidence_source: 04_Sources.md",
        "- review_prompt: Check motion clarity",
        "- calibration_anchor: trend-scan",
        "- dependencies: source_translation",
        "- review_questions: Does motion clarify state change?",
      ],
    },
    {
      name: "uiux/22_design_eval_product_specific.md",
      lines: [
        "# Product-specific Evaluation",
        "",
        "## product-specific",
        "",
        "## Axis: dashboard_focus",
        "- axis_id: AX-003",
        "- axis_name: dashboard_focus",
        "- layer: product-specific",
        "- definition: Keeps the dashboard focused on the primary workflow",
        "- rationale: Supports the chosen surface behavior",
        "- scoring_rubric: Primary task remains obvious",
        "- weight: 1",
        "- min_score: 0",
        "- max_score: 5",
        "- pass_threshold: 4",
        "- evidence_type: review",
        "- evidence_source: 40_contracts.md",
        "- review_prompt: Check dashboard focus",
        "- calibration_anchor: product-baseline",
        "- dependencies: selected-direction",
        "- review_questions: Is the primary task obvious?",
      ],
    },
    {
      name: "uiux/23_design_eval_aggregate.md",
      lines: [
        "# Aggregate Evaluation",
        "",
        "## invariant",
        "Baseline aggregate context.",
        "",
        "- thresholds: min 70 overall",
        "- floors: no axis below 50",
        "- plateau: diminishing returns above 90",
        "- missing_score_policy: exclude from aggregate",
      ],
    },
    {
      name: "uiux/24_design_eval_dynamic_overrides.md",
      lines: ["# Dynamic Overrides", "", "- override_rule: none by default"],
    },
    {
      name: "uiux/30_comparison.md",
      lines: [
        "# 30 Comparison",
        "",
        "## Option Comparison",
        "",
        "- **Option A**: Focused dashboard with a clear hero action",
        "- **Option B**: Dense table-first dashboard",
        "",
        "## Selected Direction",
        "",
        "Selected: Option A - best fit for the current workflow and review criteria",
      ],
    },
    {
      name: "uiux/40_contracts.md",
      lines: [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "",
        "- screen_id: dashboard",
        "- route: /dashboard",
        "- purpose: Review current order status",
        "- actor: end-user",
        "- primary_tasks:",
        "  - Start Free Trial",
        "- required_states:",
        "  - default: Standard dashboard state",
        "  - loading: Skeleton loading state",
        "  - empty: Empty dashboard state",
        "  - error: Retry dashboard state",
        "- transitions:",
        "  - default -> loading: Refresh requested",
        "- observable_outcomes:",
        "  - Dashboard summary is visible",
        "- notes_for_verify: Verify state coverage and task completion path",
        "- notes_for_reviewer: Focus on primary task clarity",
      ],
    },
    {
      name: "uiux/50_review_bundle.md",
      lines: ["# Review Bundle", "", "- strategy", "- contracts"],
    },
  ];

  for (const file of sidecarFiles) {
    await writeFile(path.join(discussionPackDir, file.name), `${file.lines.join("\n")}\n`, "utf-8");
  }
}

function resolveSpecPackDir(root: string): string {
  return path.join(root, ".qfai", "specs", "spec-0001");
}

function resolveDiscussionPackDir(root: string): string {
  return path.join(root, ".qfai", "discussion", "discussion-20260216000000000");
}

async function seedPrototypingEvidenceFixture(root: string): Promise<void> {
  const evidenceRoot = path.join(root, ".qfai", "evidence");
  const renderRoot = path.join(evidenceRoot, "renders");
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(renderRoot, { recursive: true });
  await writeFile(path.join(renderRoot, "dashboard-desktop.png"), "png", "utf-8");
  await writeFile(
    path.join(renderRoot, "dashboard-desktop.html"),
    "<html><body>desktop</body></html>\n",
    "utf-8",
  );
  await writeFile(path.join(renderRoot, "dashboard-mobile.png"), "png", "utf-8");
  await writeFile(
    path.join(renderRoot, "dashboard-mobile.html"),
    "<html><body>mobile</body></html>\n",
    "utf-8",
  );
  await writeFile(
    path.join(evidenceRoot, "prototyping.md"),
    [
      "# Prototyping Evidence",
      "",
      "## Coverage Matrix",
      "",
      "| Spec | UI (declared/ok) | API (declared/non-404) | DB (declared/present) | Notes |",
      "| ---- | ----------------- | ---------------------- | --------------------- | ----- |",
      "| spec-0001 | 1/1 | 1/1 | 1/1 | fixture baseline |",
      "",
      "## Render Critique Log",
      "",
      "### Desktop Review",
      "- date: 2026-02-23",
      "- viewport: desktop 1280px",
      "- verdict: PASS",
      "- findings: Primary CTA remains clear and state transitions are visible.",
      "",
      "### Mobile Review",
      "- date: 2026-02-23",
      "- viewport: mobile 390px",
      "- verdict: PASS",
      "- findings: Primary CTA remains visible without competing actions.",
      "",
      "## Evaluation Criteria",
      "",
      "- rubric: hierarchy, clarity, responsive behavior, taskFidelity",
      "",
      "## taskFidelity",
      "",
      "- max_primary_steps: 3",
      "- step_count: 2",
      "- cta_visibility: pass",
      "- four_state_check: pass",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(evidenceRoot, "prototyping.json"),
    `${JSON.stringify(
      {
        specs: [
          {
            specId: "spec-0001",
            declared: {
              uiRoutes: 1,
              apiEndpoints: 1,
              dbObjects: 1,
            },
            checked: {
              uiOk: 1,
              apiNon404: 1,
              dbPresent: 1,
            },
            missing: {
              uiRoutes: [],
              apiEndpoints: [],
              dbObjects: [],
            },
          },
        ],
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          version: "0.1",
          mode: "interactive",
          screens: [
            {
              route: "/orders/new",
              uiContractId: "CON-UI-0001",
              expected: { elements: 3, actions: 1 },
              observed: {
                elementsPlaced: 3,
                actionsWired: 1,
              },
              mockPaths: [{ id: "mp_create_to_list", status: "pass" }],
              renders: [
                {
                  viewport: "desktop",
                  width: 1280,
                  height: 960,
                  status: "captured",
                  imagePath: ".qfai/evidence/renders/dashboard-desktop.png",
                  htmlPath: ".qfai/evidence/renders/dashboard-desktop.html",
                },
                {
                  viewport: "mobile",
                  width: 390,
                  height: 844,
                  status: "captured",
                  imagePath: ".qfai/evidence/renders/dashboard-mobile.png",
                  htmlPath: ".qfai/evidence/renders/dashboard-mobile.html",
                },
              ],
            },
          ],
        },
        meta: {
          generatedAt: "2026-02-23T00:00:00.000Z",
          toolVersion: "1.4.36",
          commands: ["pnpm dev", "qfai validate --fail-on error"],
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

async function updateLedgerCell(
  root: string,
  traceId: string,
  column: string,
  value: string,
): Promise<void> {
  const ledgerPath = path.join(resolveSpecPackDir(root), "16_Traceability-ledger.md");
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

const REVIEW_FIXTURE_TIMESTAMP = "20260216010102003";

async function seedReviewGateFixtures(root: string): Promise<void> {
  const reviewRoot = path.join(root, ".qfai", "review");
  await mkdir(reviewRoot, { recursive: true });

  const reviewPackDir = path.join(reviewRoot, `review-${REVIEW_FIXTURE_TIMESTAMP}`);
  await mkdir(reviewPackDir, { recursive: true });

  await writeFile(
    path.join(reviewPackDir, "review_request.md"),
    ["# Review Request", "", "- target: spec", "- path: .qfai/specs/spec-0001", ""].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(reviewPackDir, "R01_reviewer.md"),
    ["# Reviewer Result", "", "- status: PASS", "- feedback_count: 0", ""].join("\n"),
    "utf-8",
  );

  await writeFile(
    resolveReviewSummaryPath(root),
    `${JSON.stringify(
      {
        version: "1.0",
        created_at: "2026-02-16T00:05:00+09:00",
        target: { kind: "spec", path: ".qfai/specs/spec-0001" },
        roster: [
          {
            reviewer: "reviewer",
            status: "PASS",
            feedback_count: 0,
          },
        ],
        overall_status: "PASS",
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

function resolveReviewSummaryPath(root: string): string {
  return path.join(root, ".qfai", "review", `review-${REVIEW_FIXTURE_TIMESTAMP}`, "summary.json");
}

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function formatMarkdownRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}
