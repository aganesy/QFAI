/**
 * Acceptance of the component catalogue: `qfai catalog components` run through the CLI entry,
 * and its warnings read through `validateProject`, over a project whose root resolves the
 * `typescript` package the way an adopter's does.
 */

import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

// QFAI:AC-0001-0307-08
describe("the catalogue is written only inside the project", () => {
  // QFAI:EX-0001-0307-18
  it("refuses a catalogue directory that links outside and leaves the file there as it was", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", []) });
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-outside-"));
    roots.push(outside);
    await writeFile(path.join(outside, "components.yaml"), "keep\n", "utf-8");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await symlink(
      outside,
      path.join(root, ".qfai", "catalog"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const result = await cli(["catalog", "components", "--root", root]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      `qfai catalog components: could not write ${CATALOG}, so any existing catalogue is as it was: .qfai/catalog is a symbolic link.\n`,
    );
    expect(await readFile(path.join(outside, "components.yaml"), "utf-8")).toBe("keep\n");
    expect(await readdir(outside)).toEqual(["components.yaml"]);
  });

  it("replaces the catalogue in place and leaves no temporary file beside it", async () => {
    const root = await projectWith({
      "src/a.tsx": component("Alpha", []),
      [CATALOG]: "stale\n",
    });
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    expect(await readCatalogText(root)).toContain("  - name: Alpha\n");
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
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

// QFAI:AC-0001-0310-01
describe("a hand-written dialog, menu or tab list is a warning where a catalogue is installed", () => {
  it("warns at the element's line when a registry is declared and no catalogue file exists", async () => {
    const root = await projectWith({
      "qfai.config.yaml": [
        "uiux:",
        '  surfacePaths: ["src/**"]',
        "  registries:",
        '    shadcn: "https://ui.shadcn.com/r/{name}.json"',
        "",
      ].join("\n"),
      "src/pages/account.tsx":
        'export const Account = () => (\n  <nav>\n    <ul role="menu" />\n  </nav>\n);\n',
    });
    const found = await comp(root);
    expect(found.map((item) => [item.code, item.severity, item.file, item.loc?.line])).toEqual([
      ["QFAI-COMP-005", "warning", "src/pages/account.tsx", 3],
    ]);
    expect(found[0]?.message).toContain('`role="menu"`');
  });

  // QFAI:EX-0001-0310-05
  it("warns in the four UI profiles only, outside the catalogue item's own file", async () => {
    const root = await projectWith({
      "src/ui/dialog.tsx": component(
        "Dialog",
        [
          "@source shadcn/ui dialog@2.1",
          "@a11y APG Dialog (Modal); Escape closes, focus is trapped",
        ],
        '<div role="dialog" />',
      ),
      "src/pages/home.tsx": component("Home", [], '<div role="dialog" />'),
    });
    await cli(["catalog", "components", "--root", root]);
    const reporting: ValidationProfile[] = ["prototyping", "saas-package", "verify", "full"];
    const silent: ValidationProfile[] = ["discussion", "sdd", "atdd", "tdd", "drift"];
    for (const profile of reporting) {
      const found = await comp(root, profile);
      expect(found.map((item) => [item.code, item.severity, item.file])).toEqual([
        ["QFAI-COMP-005", "warning", "src/pages/home.tsx"],
      ]);
    }
    for (const profile of silent) expect(await comp(root, profile)).toEqual([]);
  });
});

// QFAI:AC-0001-0310-02
describe("a listed interactive widget with no accessibility notes is a warning", () => {
  it("names the component and its widget pattern", async () => {
    const root = await projectWith({
      "src/ui/tabs.tsx": component("SettingsTabs", [
        "@source authored",
        "@reason The settings tabs carry a badge per tab",
        "@pattern tabs",
      ]),
      "src/ui/menu.tsx": component("AccountMenu", [
        "@source shadcn/ui dropdown-menu@2.1",
        "@pattern menu button",
        "@a11y APG Menu Button; Enter, Space and ArrowDown open the menu",
      ]),
    });
    await cli(["catalog", "components", "--root", root]);
    const found = await comp(root);
    expect(found.map((item) => [item.code, item.severity, item.file])).toEqual([
      ["QFAI-COMP-006", "warning", "src/ui/tabs.tsx"],
    ]);
    expect(found[0]?.message).toContain("`SettingsTabs`");
    expect(found[0]?.message).toContain("`tabs`");
  });
});

// QFAI:AC-0001-0310-03
describe("the procurement rule names the widgets that are not hand-authored", () => {
  // QFAI:EX-0001-0310-06
  it("lists each widget with its APG pattern and what an authored one records", async () => {
    const rule = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "assets",
        "init",
        ".qfai",
        "assistant",
        "rule",
        "ui-procurement.md",
      ),
      "utf-8",
    );
    const text = rule.replace(/\s*\n\s*/g, " ");
    const section = text.slice(
      text.indexOf("## Widgets that are not hand-authored"),
      text.indexOf("## What the prototype does not answer"),
    );
    const rows: ReadonlyArray<readonly [string, string]> = [
      ["Dialog", "Dialog (Modal)"],
      ["Alert dialog", "Alert and Message Dialogs"],
      ["Drawer or sheet", "Dialog (Modal)"],
      ["Menu and menu button", "Menu and Menubar, Menu Button"],
      ["Tabs", "Tabs"],
      ["Combobox and autocomplete", "Combobox"],
      ["Listbox and select", "Listbox, Select-Only Combobox"],
      ["Tooltip", "Tooltip"],
      ["Popover", "Disclosure (Show/Hide)"],
      ["Toast", "Alert"],
      ["Date picker", "Date Picker Dialog"],
      ["Disclosure and accordion", "Disclosure (Show/Hide), Accordion"],
    ];
    const cells = section
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell !== "");
    for (const [widget, pattern] of rows) {
      expect(cells[cells.indexOf(widget) + 1]).toBe(pattern);
    }
    expect(section).toContain("skip rung 5, composing from primitives");
    expect(section).toContain(
      "its component's `@a11y` tag in the component catalogue records the APG pattern and the keyboard behaviour it implements, and a test covers that behaviour",
    );
    const record = text.slice(text.indexOf("## Recording what was procured"));
    expect(record).toContain(
      "also names its APG pattern and the keyboard behaviour it implements, in its `@a11y` tag, and the test that covers that behaviour",
    );
  });
});
