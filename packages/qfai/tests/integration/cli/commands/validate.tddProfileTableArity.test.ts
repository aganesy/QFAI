/**
 * `--profile tdd` must observe the markdown table arity gate (QFAI-TABLE-001).
 *
 * `validateMarkdownTableArity` was written for the TDD ledger — its docstring
 * names the `tddList` checks that `continue` on the empty string a truncated
 * row yields — but it was wired into `sdd` only, the profile that never reads
 * `tdd/test-list.md`. `qfai-implement` gates each item on `--profile tdd`, so a
 * row cut before `Status` was unread and unflagged in the one profile that
 * reads the table it corrupts.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

const CANONICAL_REL = ".qfai/report/validate.json";

type Finding = { code: string; severity: string; message: string };

async function findings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

/** A ledger whose second data row is truncated before `Status`. */
const TRUNCATED_LEDGER = [
  "# Test list",
  "",
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
  "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | it a | done |  | ev |",
  "| TDD-0002 | TC-0002 | unit | tests/b.test.ts | it b |",
  "",
].join("\n");

async function seedSpec(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(specDir, "tdd", "test-list.md"), TRUNCATED_LEDGER, "utf-8");
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-arity-"));
  try {
    await seedSpec(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("--profile tdd runs the markdown table arity gate", () => {
  it("raises QFAI-TABLE-001 on a ledger row truncated before Status", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const arity = (await findings(root)).filter((entry) => entry.code === "QFAI-TABLE-001");
      expect(arity).toHaveLength(1);
      // The finding has to name the row, or it is not actionable in a ledger
      // with hundreds of rows.
      expect(arity[0]?.message).toContain(".qfai/specs/spec-0001/tdd/test-list.md:6");
      expect(arity[0]?.message).toContain("row has 5");
    });
  });

  it("does not double-report the arity gate under the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const arity = (await findings(root)).filter((entry) => entry.code === "QFAI-TABLE-001");
      expect(arity).toHaveLength(1);
    });
  });

  it("keeps the sdd profile reporting it exactly once", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "sdd" });
      const arity = (await findings(root)).filter((entry) => entry.code === "QFAI-TABLE-001");
      expect(arity).toHaveLength(1);
    });
  });
});
