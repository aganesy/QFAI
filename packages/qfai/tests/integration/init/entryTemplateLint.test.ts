/**
 * Integration: the entry directive above the shipped templates' first heading passes the shipped
 * Markdown lint configuration, which still requires that first heading to be level 1.
 */
// QFAI:AC-0001-0203-03
// QFAI:EX-0001-0203-10
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../../src/cli/lib/assets.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const SHIPPED_CONFIG = path.join(PACKAGE_ROOT, "shipped.markdownlint-cli2.jsonc");
// The linter the shipped lane runs, a devDependency of the workspace root.
const LINTER = path.join(
  PACKAGE_ROOT,
  "..",
  "..",
  "node_modules",
  "markdownlint-cli2",
  "markdownlint-cli2-bin.mjs",
);
const TEMPLATES = ["AGENTS.md", "CLAUDE.md"];

/** The MD041 findings the shipped configuration raises over `files` written into a temp root. */
async function firstHeadingFindings(files: Record<string, string>): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-md041-"));
  try {
    await copyFile(SHIPPED_CONFIG, path.join(root, ".markdownlint-cli2.jsonc"));
    for (const [name, text] of Object.entries(files)) {
      await writeFile(path.join(root, name), text, "utf-8");
    }
    const run = spawnSync(process.execPath, [LINTER, "*.md"], { cwd: root, encoding: "utf-8" });
    if (run.error) throw run.error;
    // 0 is a clean run and 1 a run with findings; anything else means the linter never ran.
    if (run.status !== 0 && run.status !== 1) throw new Error(`${run.stderr}`);
    expect(run.stdout, "the linter read the files").toContain("Linting:");
    return `${run.stdout}\n${run.stderr}`.split(/\r?\n/).filter((line) => line.includes("MD041"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function template(name: string): Promise<string> {
  return readFile(path.join(getInitAssetsDir(), "root", name), "utf-8");
}

describe("the entry directive and the first-heading rule", () => {
  it("The shipped templates open with the directive and raise no MD041 finding", async () => {
    const files: Record<string, string> = {};
    for (const name of TEMPLATES) {
      const text = await template(name);
      expect(text.split(/\r?\n/)[0], `${name} opens with the directive`).toContain("`qfai-run`");
      files[name] = text;
    }

    expect(await firstHeadingFindings(files)).toEqual([]);
  });

  it("A template whose first heading is not level 1 still raises MD041", async () => {
    const demoted = (await template("AGENTS.md")).replace(/^# /m, "## ");

    expect(await firstHeadingFindings({ "AGENTS.md": demoted })).toHaveLength(1);
  });
});
