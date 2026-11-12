// QFAI:AC-0001-0242-01
// QFAI:AC-0001-0243-01

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const ASSETS = path.dirname(getInitAssetsDir());
const SCRIPTS = path.join(ASSETS, "scripts");
const INIT = getInitAssetsDir();

type Shipped = { name: string; text: string };

/** The text a caller may run a script from: no HTML comment, no YAML comment line. */
function runnable({ name, text }: Shipped): string {
  if (name.endsWith(".md")) return text.replace(/<!--[\s\S]*?-->/g, "");
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

/** The shipped files that run `script` as a `node` command. */
function callersOf(script: string, shipped: readonly Shipped[]): string[] {
  const command = new RegExp(`\\bnode\\s+\\S*${script.replace(/\./g, "\\.")}\\b`);
  return shipped.filter((file) => command.test(runnable(file))).map((file) => file.name);
}

async function shippedCallers(): Promise<Shipped[]> {
  const names = await fg(
    [".qfai/assistant/**/*.md", "root/.agents/rules/**/*.md", "root/.github/workflows/*.yml"],
    { cwd: INIT, dot: true },
  );
  return Promise.all(
    names.sort().map(async (name) => ({
      name,
      text: await readFile(path.join(INIT, name), "utf-8"),
    })),
  );
}

describe("shipped checker scripts", () => {
  // QFAI:EX-0001-0243-01
  it("are each run by a shipped step, skill, rule or workflow", async () => {
    const shipped = await shippedCallers();
    const scripts = (await readdir(SCRIPTS)).filter((name) => name.endsWith(".mjs")).sort();
    expect(scripts).toEqual(expect.arrayContaining(["check-mdschema.mjs", "check-mermaid.mjs"]));
    const uncalled = scripts.filter((script) => callersOf(script, shipped).length === 0);
    expect(uncalled).toEqual([]);
  });

  // QFAI:EX-0001-0243-02
  it("do not count a workflow comment line as a caller", () => {
    const workflow = {
      name: "root/.github/workflows/x.yml",
      text: "steps:\n  # node scripts/check-new.mjs\n  - run: echo done\n",
    };
    expect(callersOf("check-new.mjs", [workflow])).toEqual([]);
  });

  // QFAI:EX-0001-0243-03
  it("do not count an HTML comment in a step as a caller", () => {
    const step = {
      name: ".qfai/assistant/step/x/STEP.md",
      text: "# x\n\n<!-- node scripts/check-new.mjs -->\n",
    };
    expect(callersOf("check-new.mjs", [step])).toEqual([]);
    expect(
      callersOf("check-new.mjs", [{ ...step, text: "Run `node scripts/check-new.mjs`.\n" }]),
    ).toEqual([".qfai/assistant/step/x/STEP.md"]);
  });
});

describe("steps that write Mermaid diagrams", () => {
  const step = (name: string) =>
    readFile(path.join(INIT, ".qfai", "assistant", "step", name, "STEP.md"), "utf-8");

  // QFAI:EX-0001-0242-02
  it("sdd-flow runs the parser with --tools over the files it wrote", async () => {
    expect(await step("sdd-flow")).toContain(
      "node node_modules/qfai/assets/scripts/check-mermaid.mjs --tools tmp/qfai-mermaid <files written>",
    );
  });

  // QFAI:EX-0001-0242-03
  it("installs the parser under tmp/ and never into the project's dependency tree", async () => {
    const flow = await step("sdd-flow");
    expect(flow).toMatch(
      /npm install --no-save [^\n]*--ignore-scripts [^\n]*--prefix=tmp\/qfai-mermaid/,
    );
    expect(flow.replace(/\s+/g, " ")).toContain("never into the project's dependency tree");
  });

  // QFAI:EX-0001-0242-03
  it("installs the project's own QFAI release when node_modules has none, and runs its checker", async () => {
    const flow = await step("sdd-flow");
    const install = flow.search(
      /npm install --no-save [^\n]*--ignore-scripts [^\n]*--prefix=tmp\/qfai-release qfai@<version>/,
    );
    const release = flow.indexOf(
      "node tmp/qfai-release/node_modules/qfai/assets/scripts/check-mermaid.mjs --tools tmp/qfai-mermaid <files written>",
    );
    expect(install).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(install);
    expect(flow.replace(/\s+/g, " ")).toContain(
      "Where the project has no `node_modules/qfai`, install the release that `npx qfai --version` prints",
    );
  });

  // QFAI:EX-0001-0242-04
  it("reports a parser that cannot run as not run, never as passed", async () => {
    expect((await step("sdd-flow")).replace(/\s+/g, " ")).toMatch(/as not run[^.]*never as passed/);
  });
});
