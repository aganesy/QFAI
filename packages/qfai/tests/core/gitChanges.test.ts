/**
 * Rename handling in the base-branch diff.
 *
 * Driven against a real git repository rather than a mocked `execFileSync`:
 * the whole question is what git prints for a rename under two different flag
 * sets, so a mock would only assert that this file and the module agree with
 * each other.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { getChangedFilesAgainstBase } from "../../src/core/gitChanges.js";
import { validateTraceabilityIntegrity } from "../../src/core/validators/traceabilityIntegrity.js";

const tempDirs: string[] = [];

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
};

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

async function newRepo(seed: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-git-changes-"));
  tempDirs.push(root);
  git(root, "init", "--initial-branch=base");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  for (const [rel, content] of Object.entries(seed)) {
    await write(root, rel, content);
  }
  git(root, "add", "-A");
  git(root, "commit", "-m", "seed");
  git(root, "checkout", "-b", "work");
  return root;
}

/** Identical content at a new path — the shape git reports as a rename. */
const MODULE_BODY = [
  "export function evaluate(input: number): number {",
  "  return input * 2;",
  "}",
  "",
].join("\n");

const config: QfaiConfig = { ...defaultConfig, baseBranch: "base" };

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("getChangedFilesAgainstBase", () => {
  it("reports both endpoints of a rename by default", async () => {
    const root = await newRepo({ "src/core/old.ts": MODULE_BODY });
    git(root, "mv", "src/core/old.ts", "src/core/new.ts");
    git(root, "commit", "-m", "move");

    // The drift guard wants the source: an artifact moved out from under its
    // protected path is exactly what it exists to notice.
    const changed = getChangedFilesAgainstBase(root, "base");
    expect(changed.has("src/core/old.ts")).toBe(true);
    expect(changed.has("src/core/new.ts")).toBe(true);
  });

  it("drops the source of a rename when asked to", async () => {
    const root = await newRepo({ "src/core/old.ts": MODULE_BODY });
    git(root, "mv", "src/core/old.ts", "src/core/new.ts");
    git(root, "commit", "-m", "move");

    const changed = getChangedFilesAgainstBase(root, "base", { dropRenameSources: true });
    expect(changed.has("src/core/old.ts")).toBe(false);
    expect(changed.has("src/core/new.ts")).toBe(true);
  });

  it("keeps an ordinary deletion, which is not a rename source", async () => {
    const root = await newRepo({
      "src/core/gone.ts": MODULE_BODY,
      "src/core/kept.ts": "export const kept = 1;\n",
    });
    execFileSync("git", ["rm", "src/core/gone.ts"], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    git(root, "commit", "-m", "delete");

    const changed = getChangedFilesAgainstBase(root, "base", { dropRenameSources: true });
    expect(changed.has("src/core/gone.ts")).toBe(true);
  });
});

describe("validateTraceabilityIntegrity across a rename", () => {
  const ledgerFor = (implFile: string): string =>
    [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      `| BR-0001-0001 | ${implFile} | tests/core/module.test.ts |`,
    ].join("\n");

  // The row still names the path the rename emptied. Reading the source as
  // "modified" made the stalest possible ledger the one case that passed.
  it("reports a ledger row still pointing at the rename's source", async () => {
    const root = await newRepo({
      ".qfai/specs/spec-0001/04_Business-Rules.md": "# BR\n\n- BR-0001-0001: original\n",
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": ledgerFor("src/core/old.ts"),
      "src/core/old.ts": MODULE_BODY,
    });
    await write(
      root,
      ".qfai/specs/spec-0001/04_Business-Rules.md",
      "# BR\n\n- BR-0001-0001: revised\n",
    );
    git(root, "mv", "src/core/old.ts", "src/core/new.ts");
    git(root, "add", "-A");
    git(root, "commit", "-m", "revise the rule and move the module");

    const issues = await validateTraceabilityIntegrity(root, config);
    const stale = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
    expect(stale).toHaveLength(1);
    expect(stale[0]?.file).toBe("src/core/old.ts");
  });

  it("passes a ledger row updated to the rename's destination", async () => {
    const root = await newRepo({
      ".qfai/specs/spec-0001/04_Business-Rules.md": "# BR\n\n- BR-0001-0001: original\n",
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": ledgerFor("src/core/old.ts"),
      "src/core/old.ts": MODULE_BODY,
    });
    await write(
      root,
      ".qfai/specs/spec-0001/04_Business-Rules.md",
      "# BR\n\n- BR-0001-0001: revised\n",
    );
    git(root, "mv", "src/core/old.ts", "src/core/new.ts");
    await write(
      root,
      ".qfai/specs/spec-0001/16_Traceability-ledger.md",
      ledgerFor("src/core/new.ts"),
    );
    git(root, "add", "-A");
    git(root, "commit", "-m", "revise the rule, move the module, update the ledger");

    const issues = await validateTraceabilityIntegrity(root, config);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });
});
