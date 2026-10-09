/**
 * The validate gate an SDD run ends on: a conforming project passes it with no
 * error, and each story-tree validator is exported, registered in the pipeline
 * and run by the profile that owns it.
 */

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import * as validators from "../../src/core/validators/index.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];
const specs = ".qfai/spec";
const flow = `${specs}/02_business-flow/business-flow-0001`;
const story = `${flow}/user-story-0001-0001`;
const contract = `${specs}/03_contract`;

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-gate-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function put(root: string, file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

describe("the validate gate at the end of SDD", () => {
  async function sddGate(root: string): Promise<{ exit: number; errors: Issue[] }> {
    let exit = -1;
    await captureStdout(async () => {
      exit = await runValidate({ root, strict: false, failOn: "error", profile: "sdd" });
    });
    const report = JSON.parse(
      await readFile(path.join(root, ".qfai", "report", "validate-sdd.json"), "utf-8"),
    ) as { issues: Issue[]; counts: { error: number } };
    expect(report.counts.error).toBe(report.issues.filter((i) => i.severity === "error").length);
    return { exit, errors: report.issues.filter((found) => found.severity === "error") };
  }

  // QFAI:AC-0001-0150-01
  it("passes with no error for a conforming project and fails for a story directory that lacks files", async () => {
    const root = await newRoot();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    expect(await sddGate(root)).toEqual({ exit: 0, errors: [] });

    await put(root, `${story}/01_User-story.md`, "# US-0001-0001: Pay\n");
    const failed = await sddGate(root);
    expect(failed.exit).not.toBe(0);
    expect(failed.errors.some((found) => found.code === "QFAI-STORY-001")).toBe(true);
  });
});

describe("story-tree validators in the validate pipeline", () => {
  const OWNED = [
    "validateStoryTreeStructure",
    "validateStoryTreeContractReferences",
    "validateStoryTreeObligations",
    "validateStoryTreeDrift",
  ] as const;

  /** The names `fn` calls, found in the syntax tree rather than in comments. */
  async function calledWithin(fn: string): Promise<Set<string>> {
    const file = path.resolve(process.cwd(), "src", "core", "validate.ts");
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const called = new Set<string>();
    const visit = (node: ts.Node, inside: boolean): void => {
      const entering = ts.isFunctionDeclaration(node) && node.name?.text === fn;
      if (inside || entering) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          called.add(node.expression.text);
        }
      }
      ts.forEachChild(node, (child) => visit(child, inside || entering));
    };
    visit(source, false);
    return called;
  }

  // QFAI:AC-0001-0150-02
  it("exports each validator and registers it in the profile pipeline", async () => {
    for (const name of OWNED) {
      expect(typeof validators[name], name).toBe("function");
    }
    const called = await calledWithin("runStoryProfileValidators");
    for (const name of OWNED) {
      expect(called.has(name), name).toBe(true);
    }
  });

  // QFAI:AC-0001-0150-02
  it("runs the structure and contract-index validators in sdd, and the obligation validator in tdd", async () => {
    const root = await newRoot();
    await put(
      root,
      `${specs}/02_business-flow/business-flows.md`,
      "| BF-ID | Title |\n| --- | --- |\n| BF-0001 | Checkout |\n",
    );
    await put(root, `${flow}/business-flow.md`, "# BF-0001: Checkout\n");
    await put(
      root,
      `${flow}/user-stories.md`,
      "| US-ID | Title |\n| --- | --- |\n| US-0001-0001 | Pay |\n",
    );
    await put(root, `${story}/01_User-story.md`, "# US-0001-0001: Pay\n");
    await put(root, `${story}/notes.md`, "Notes.\n");
    await put(
      root,
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: Pay\n  Given a cart\n  When it is paid\n  Then a receipt exists\n```\n",
    );
    await put(
      root,
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | one item | receipt |\n",
    );
    await put(
      root,
      `${contract}/contracts.md`,
      "# Contracts\n\n## Contract Index\n\n| ID | Title | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- |\n",
    );
    await put(
      root,
      `${contract}/api/api-0001-orders.yaml`,
      "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.1.0\n",
    );

    const config = structuredClone(defaultConfig);
    const run = async (profile: "sdd" | "tdd"): Promise<Issue[]> =>
      (
        await validateProject(
          root,
          { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
          { profile },
        )
      ).issues;

    const sdd = await run("sdd");
    expect(sdd.some((found) => found.code === "QFAI-STORY-006")).toBe(false);
    expect(
      sdd.filter((found) => found.code === "QFAI-STORY-001").map((found) => found.severity),
    ).toEqual(["error"]);
    expect(
      sdd.filter((found) => found.code === "QFAI-CONTRACT-034").map((found) => found.severity),
    ).toEqual(["error"]);

    const tdd = await run("tdd");
    expect(tdd.some((found) => found.code === "QFAI-STORY-001")).toBe(false);
    expect(
      tdd.filter((found) => found.code === "QFAI-STORY-006").map((found) => found.refs),
    ).toEqual([["EX-0001-0001-01"]]);
  });

  // QFAI:AC-0001-0150-02
  it("runs the drift validator in the drift profile", async () => {
    const root = await newRoot();
    const git = (...args: string[]): void => {
      execFileSync("git", args, { cwd: root, stdio: "ignore" });
    };
    git("init", "-b", "main");
    git("config", "user.email", "test@example.test");
    git("config", "user.name", "Test");
    const glossary = `${specs}/01_policy/glossary.md`;
    await put(
      root,
      `${specs}/decisions.md`,
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n",
    );
    await put(root, glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(root, glossary, "# Terms\nChanged\n");
    git("add", ".");
    git("commit", "-m", "edit the glossary");

    const config = structuredClone(defaultConfig);
    config.baseBranch = "main";
    const result = await validateProject(
      root,
      { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
      { profile: "drift" },
    );
    expect(
      result.issues
        .filter((found) => found.code === "QFAI-DRIFT-001")
        .map((found) => [found.severity, found.file]),
    ).toEqual([["error", glossary]]);
  });
});
