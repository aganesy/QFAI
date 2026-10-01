import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";

let root: string;
const specs = ".qfai/spec";
const examples = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md`;
const test = "tests/unit/order.test.ts";
const example = "EX-0001-0001-01";
const header = "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
const decisions = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

async function put(file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function commit(message: string): void {
  git("add", ".");
  git("commit", "-m", message);
}

function config() {
  const value = structuredClone(defaultConfig);
  value.paths.specsDir = specs;
  value.paths.contractsDir = `${specs}/03_contract`;
  value.validation.traceability.testFileGlobs = ["tests/**/*.test.ts"];
  value.baseBranch = "main";
  return value;
}

async function warned(): Promise<boolean> {
  const findings = await validateStoryTreeDrift(root, config(), "tdd");
  return findings.some(
    (item) =>
      item.code === "QFAI-DRIFT-002" &&
      item.severity === "warning" &&
      item.file === examples &&
      item.refs?.includes(example),
  );
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-example-drift-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
  await put(`${specs}/decisions.md`, decisions);
  await put(examples, `${header}| ${example} | AC-0001-0001-01 | an order | it is paid |\n`);
  await put(test, `// ${["QFAI", example].join(":")}\nit("pays", () => {});\n`);
  commit("base");
  git("checkout", "-b", "topic");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("an example rewritten on the branch", () => {
  // QFAI:EX-0001-0054-12
  // QFAI:AC-0001-0054-07
  it("warns until a test annotating the example changes too", async () => {
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`);
    commit("rewrite the example");
    expect(await warned()).toBe(true);

    await put(test, `// ${["QFAI", example].join(":")}\nit("refunds", () => {});\n`);
    commit("rewrite the test");
    expect(await warned()).toBe(false);
  });

  // QFAI:EX-0001-0054-12
  it("does not warn when only the table padding changed", async () => {
    await put(
      examples,
      `${header}|  ${example}  |  AC-0001-0001-01  |  an order  |  it is paid  |\n`,
    );
    commit("re-pad the table");
    expect(await warned()).toBe(false);
  });
});
