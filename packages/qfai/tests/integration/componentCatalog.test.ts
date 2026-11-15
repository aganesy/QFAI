/**
 * Acceptance of the component catalogue: `qfai catalog components` run through the CLI entry,
 * and its warnings read through `validateProject`, over a project whose root resolves the
 * `typescript` package the way an adopter's does.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCatalogComponents } from "../../src/cli/commands/catalog.js";
import { run } from "../../src/cli/main.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

const roots: string[] = [];
const packageRequire = createRequire(import.meta.url);
const CATALOG = ".qfai/catalog/components.yaml";

afterEach(async () => {
  vi.restoreAllMocks();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project selecting `src/**`, with `node_modules/typescript` linked to this package's copy. */
async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-at-"));
  roots.push(root);
  const all = { "qfai.config.yaml": 'uiux:\n  surfacePaths: ["src/**"]\n', ...files };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  // A shim, not a link, so removing the project never reaches this package's own copy.
  const shim = path.join(root, "node_modules", "typescript");
  await mkdir(shim, { recursive: true });
  await writeFile(path.join(shim, "package.json"), '{"name":"typescript","main":"index.js"}\n');
  await writeFile(
    path.join(shim, "index.js"),
    `module.exports = require(${JSON.stringify(packageRequire.resolve("typescript"))});\n`,
  );
  return root;
}

/** Runs the CLI and returns its exit code with what it wrote to each stream. */
async function cli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(args, process.cwd());
    return { code: Number(process.exitCode ?? 0), out: out.join(""), err: err.join("") };
  } finally {
    process.exitCode = previous;
    vi.restoreAllMocks();
  }
}

const readCatalogText = (root: string): Promise<string> =>
  readFile(path.join(root, ...CATALOG.split("/")), "utf-8");

function component(name: string, tags: readonly string[], body = "<div />"): string {
  const doc = tags.length > 0 ? `/**\n${tags.map((tag) => ` * ${tag}\n`).join("")} */\n` : "";
  return `${doc}export function ${name}() {\n  return ${body};\n}\n`;
}

async function comp(root: string, profile: ValidationProfile = "prototyping"): Promise<Issue[]> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.filter((found) => found.code.startsWith("QFAI-COMP-"));
}

// QFAI:AC-0001-0307-01
describe("the command lists every exported component", () => {
  it("writes the sorted catalogue with the doc tags and prints one summary line", async () => {
    const root = await projectWith({
      "src/ui/button.tsx": [
        "interface ButtonProps { variant: string }",
        "/**",
        " * @source shadcn/ui button@2.1",
        " * @states default, disabled",
        " * @pattern button",
        " * @a11y APG button; Enter and Space activate",
        " */",
        "export function Button(props: ButtonProps) {",
        "  return <button />;",
        "}",
        "",
      ].join("\n"),
      "src/ui/card.tsx": component("Card", []),
      "src/ui/card.test.tsx": component("CardTest", []),
      "src/ui/format.tsx": "export const formatDate = () => <time />;\n",
    });
    const first = await cli(["catalog", "components", "--root", root]);
    expect(first.code).toBe(0);
    expect(first.out).toBe(
      "Wrote .qfai/catalog/components.yaml: 2 component(s) in 2 file(s), 1 with no @source.\n",
    );
    const text = await readCatalogText(root);
    expect(text).toContain(
      [
        "  - name: Button",
        "    file: src/ui/button.tsx",
        "    props:",
        "      - variant",
        "    source: shadcn/ui button@2.1",
        "    states:",
        "      - default",
        "      - disabled",
        "    pattern: button",
        "    a11y: APG button; Enter and Space activate",
        "  - name: Card",
        "    file: src/ui/card.tsx",
        "",
      ].join("\n"),
    );
    expect(text).not.toContain("CardTest");
    expect(text).not.toContain("formatDate");
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    expect(await readCatalogText(root)).toBe(text);
  });
});

// QFAI:AC-0001-0307-01
describe("the summary says when no JSX file is selected", () => {
  // QFAI:EX-0001-0307-17
  it("writes an empty catalogue and names the reason", async () => {
    const root = await projectWith({ "src/page.vue": "<template><p /></template>\n" });
    const result = await cli(["catalog", "components", "--root", root]);
    expect(result.code).toBe(0);
    expect(result.out).toBe(
      "Wrote .qfai/catalog/components.yaml: 0 component(s); uiux.surfacePaths selects no .tsx or .jsx file.\n",
    );
  });
});

// QFAI:AC-0001-0307-02
describe("the check mode compares and writes nothing", () => {
  // QFAI:EX-0001-0307-05
  it("passes a current catalogue and fails a missing or stale one without writing", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", ["@source x@1"]) });
    const missing = await cli(["catalog", "components", "--check", "--root", root]);
    expect(missing.code).toBe(1);
    expect(missing.err).toContain(`${CATALOG} does not exist`);

    await cli(["catalog", "components", "--root", root]);
    expect((await cli(["catalog", "components", "--check", "--root", root])).code).toBe(0);

    const file = path.join(root, ...CATALOG.split("/"));
    await writeFile(file, (await readFile(file, "utf-8")).replace(/\n/g, "\r\n"), "utf-8");
    expect((await cli(["catalog", "components", "--check", "--root", root])).code).toBe(0);

    await writeFile(path.join(root, "src", "b.tsx"), component("Beta", []), "utf-8");
    const before = await readFile(file, "utf-8");
    const stale = await cli(["catalog", "components", "--check", "--root", root]);
    expect(stale.code).toBe(1);
    expect(stale.err).toContain(`${CATALOG} is out of date`);
    expect(await readFile(file, "utf-8")).toBe(before);
  });

  it("refuses --check on another command and an unknown catalog subcommand", async () => {
    expect((await cli(["validate", "--check"])).code).toBe(2);
    expect((await cli(["catalog", "pages"])).code).toBe(2);
  });
});

// QFAI:AC-0001-0307-03
describe("JSX needs the TypeScript compiler the project installs", () => {
  // QFAI:EX-0001-0307-06
  it("exits 1 naming typescript and the unread files, and writes nothing", async () => {
    const root = await projectWith({
      "src/a.tsx": component("Alpha", []),
      "src/b.tsx": component("Beta", []),
    });
    const err: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      err.push(String(chunk));
      return true;
    });
    const code = await runCatalogComponents({
      root,
      loadTypescript: () => {
        throw new Error("not installed");
      },
    });
    expect(code).toBe(1);
    expect(err.join("")).toMatch(/2 \.tsx\/\.jsx file\(s\)[^\n]*`typescript`/);
    await expect(readCatalogText(root)).rejects.toThrow();
  });
});

// QFAI:AC-0001-0307-04
describe("a component with no source, and two components for one pattern, are warnings", () => {
  it("warns on the unsourced component and once on the shared pattern", async () => {
    const root = await projectWith({
      "src/ui/list-kit.tsx": component("ListToolbar", [
        "@source authored",
        "@pattern list toolbar",
      ]),
      "src/orders/toolbar.tsx": component("OrdersToolbar", [
        "@source authored",
        "@reason Orders needs a filter",
        "@pattern list toolbar",
      ]),
    });
    await cli(["catalog", "components", "--root", root]);
    const found = await comp(root);
    expect(found.map((item) => [item.code, item.severity, item.file])).toEqual([
      ["QFAI-COMP-001", "warning", "src/ui/list-kit.tsx"],
      ["QFAI-COMP-002", "warning", CATALOG],
    ]);
    expect(found[1]?.message).toContain("`ListToolbar`");
    expect(found[1]?.message).toContain("`OrdersToolbar`");
  });
});

// QFAI:AC-0001-0307-05
describe("a raw element a listed component replaces is a warning", () => {
  it("names the component at the element's line, outside the component's own file", async () => {
    const root = await projectWith({
      "src/ui/button.tsx": component(
        "Button",
        ["@source shadcn/ui button@2.1", "@pattern button"],
        "<button />",
      ),
      "src/pages/orders.tsx":
        "export const Orders = () => (\n  <div>\n    <button />\n    <select />\n  </div>\n);\n",
    });
    await cli(["catalog", "components", "--root", root]);
    const found = (await comp(root)).filter((item) => item.code === "QFAI-COMP-003");
    expect(found.map((item) => [item.code, item.file, item.loc?.line])).toEqual([
      ["QFAI-COMP-003", "src/pages/orders.tsx", 3],
    ]);
    expect(found[0]?.message).toContain("`Button`");
  });
});

// QFAI:AC-0001-0307-06
describe("a stale catalogue is a warning, and no catalogue asks nothing", () => {
  // QFAI:EX-0001-0307-11
  it("warns in the four UI profiles only, and not at all without a catalogue", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", ["@source x@1"]) });
    expect(await comp(root)).toEqual([]);
    await cli(["catalog", "components", "--root", root]);
    expect(await comp(root)).toEqual([]);
    await writeFile(path.join(root, "src", "b.tsx"), component("Beta", ["@source y@1"]), "utf-8");
    const reporting: ValidationProfile[] = ["prototyping", "saas-package", "verify", "full"];
    const silent: ValidationProfile[] = ["discussion", "sdd", "atdd", "tdd", "drift"];
    for (const profile of reporting) {
      const found = await comp(root, profile);
      expect(found.map((item) => [item.code, item.severity])).toEqual([
        ["QFAI-COMP-004", "warning"],
      ]);
      expect(found[0]?.suggested_action).toContain("qfai catalog components");
    }
    for (const profile of silent) expect(await comp(root, profile)).toEqual([]);
  });
});

// QFAI:AC-0001-0307-07
describe("the implementer reads the catalogue and keeps it current", () => {
  // QFAI:EX-0001-0307-12
  it("ships the catalogue procedure in the UI guidance and points to it from the ladder and the step", async () => {
    const assistant = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "assets",
      "init",
      ".qfai",
      "assistant",
    );
    const read = (relative: string): Promise<string> =>
      readFile(path.join(assistant, ...relative.split("/")), "utf-8");
    const guidance = await read("skill/qfai-implement/references/ui-affecting.md");
    expect(guidance).toContain("## Component catalogue");
    expect(guidance).toContain(CATALOG);
    expect(guidance).toContain("npx qfai catalog components");
    for (const tag of ["@source", "@reason", "@states", "@pattern", "@a11y"]) {
      expect(guidance).toContain(tag);
    }
    expect(await read("rule/ui-procurement.md")).toContain(
      "skill/qfai-implement/references/ui-affecting.md#component-catalogue",
    );
    const step = await read("step/implement-tdd/STEP.md");
    expect(step).toContain("#component-catalogue");
    expect(step).toContain("skill/qfai-implement/references/ui-affecting.md");
  });
});
