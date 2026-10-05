import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type * as StoryObligations from "../../src/core/validators/storyTreeObligations.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";

const scan = vi.hoisted(() => ({
  capped: undefined as "empty" | "prefix" | undefined,
  fault: undefined as Error | undefined,
}));

vi.mock("../../src/core/validators/storyTreeObligations.js", async (importOriginal) => {
  const original = await importOriginal<typeof StoryObligations>();
  return {
    ...original,
    readStoryTests: async (...args: Parameters<typeof original.readStoryTests>) => {
      if (scan.fault) throw scan.fault;
      const read = await original.readStoryTests(...args);
      return scan.capped
        ? { ...read, files: scan.capped === "empty" ? [] : read.files, truncated: true }
        : read;
    },
  };
});

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

function config(specsDir = specs) {
  const value = structuredClone(defaultConfig);
  value.paths.specsDir = specsDir;
  value.paths.contractsDir = path.posix.join(specsDir, "03_contract");
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
  scan.capped = undefined;
  scan.fault = undefined;
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
  scan.capped = undefined;
  scan.fault = undefined;
  await rm(root, { recursive: true, force: true });
});

describe("an example rewritten on the branch", () => {
  it("reports a rewritten example when the spec tree is at the repository root", async () => {
    const rootExample = path.posix.relative(specs, examples);
    git("mv", `${specs}/decisions.md`, "decisions.md");
    git("mv", path.posix.join(specs, "02_business-flow"), "02_business-flow");
    commit("move the spec tree to the repository root");
    git("branch", "-f", "main", "HEAD");
    await put(
      rootExample,
      `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`,
    );
    commit("rewrite the root example");
    const findings = await validateStoryTreeDrift(root, config("."), "tdd");
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "QFAI-DRIFT-002", file: rootExample, refs: [example] }),
    );
  });

  it("does not warn for a newly appended example", async () => {
    await put(
      examples,
      `${header}| ${example} | AC-0001-0001-01 | an order | it is paid |\n| EX-0001-0001-02 | AC-0001-0001-01 | a new order | it is paid |\n`,
    );
    commit("append an example");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(findings.some(({ code }) => code === "QFAI-DRIFT-002")).toBe(false);
  });

  it.each(["tests/e2e/order.test.ts", "tests/unit/order.md"])(
    "does not let a changed ineligible annotation in %s suppress the warning",
    async (file) => {
      await put(
        examples,
        `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`,
      );
      await put(file, `// ${["QFAI", example].join(":")}\n`);
      commit("change an ineligible carrier");
      expect(await warned()).toBe(true);
    },
  );

  it("does not let a changed annotation that sits before no test declaration suppress the warning", async () => {
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`);
    await put(test, `// ${["QFAI", example].join(":")}\nconst unrelated = 1;\n`);
    commit("annotate a line that is not a test");
    expect(await warned()).toBe(true);
  });

  it("detects internal cell-space changes next to an escaped pipe", async () => {
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | a\\| b | it is paid |\n`);
    commit("base escaped pipe");
    git("branch", "-f", "main", "HEAD");
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | a\\|b | it is paid |\n`);
    commit("change internal cell space");
    expect(await warned()).toBe(true);
  });

  it("ignores a removed trailing table delimiter", async () => {
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | an order | it is paid\n`);
    commit("remove trailing delimiter");
    expect(await warned()).toBe(false);
  });

  it.each(["empty", "prefix"] as const)(
    "reports a capped %s test scan without example-change conclusions",
    async (capped) => {
      await put(
        examples,
        `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`,
      );
      commit("rewrite the example");
      scan.capped = capped;
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({ code: "QFAI-SCAN-002", severity: "error" }),
      );
      expect(findings.some(({ code }) => code === "QFAI-DRIFT-002")).toBe(false);
    },
  );

  it.each(["EACCES", "EIO"])(
    "reports a %s reader fault without an example-change conclusion",
    async (code) => {
      await put(
        examples,
        `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`,
      );
      commit("rewrite the example");
      const fault = Object.assign(new Error(`test scan failed: ${code} at tests`), { code });
      scan.fault = fault;
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({
          code: "QFAI-SCAN-002",
          severity: "error",
          message: expect.stringContaining(fault.message),
        }),
      );
      expect(findings.some(({ code: findingCode }) => findingCode === "QFAI-DRIFT-002")).toBe(
        false,
      );
    },
  );

  // QFAI:EX-0001-0054-16
  // QFAI:AC-0001-0054-08
  it("warns until a test annotating the example changes too", async () => {
    await put(examples, `${header}| ${example} | AC-0001-0001-01 | an order | it is refunded |\n`);
    commit("rewrite the example");
    expect(await warned()).toBe(true);

    await put(test, `// ${["QFAI", example].join(":")}\nit("refunds", () => {});\n`);
    commit("rewrite the test");
    expect(await warned()).toBe(false);
  });

  // QFAI:EX-0001-0054-16
  it("does not warn when only the table padding changed", async () => {
    await put(
      examples,
      `${header}|  ${example}  |  AC-0001-0001-01  |  an order  |  it is paid  |\n`,
    );
    commit("re-pad the table");
    expect(await warned()).toBe(false);
  });
});
