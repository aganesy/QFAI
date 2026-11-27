/**
 * Acceptance of the component catalogue: `qfai catalog components` run through the CLI entry,
 * and its warnings read through `validateProject`, over a project whose root resolves the
 * `typescript` package the way an adopter's does.
 */

import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCatalogComponents } from "../../src/cli/commands/catalog.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { runCliCaptured as cli } from "../helpers/cliCapture.js";

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

  // QFAI:EX-0001-0307-24
  it.each([
    {
      entry: "a .qfai junction",
      shown: ".qfai is a symbolic link",
      kept: path.join("catalog", "components.yaml"),
      arrange: async (root: string, outside: string): Promise<boolean> => {
        await mkdir(path.join(outside, "catalog"), { recursive: true });
        await writeFile(path.join(outside, "catalog", "components.yaml"), "keep\n", "utf-8");
        await symlink(
          outside,
          path.join(root, ".qfai"),
          process.platform === "win32" ? "junction" : "dir",
        );
        return true;
      },
    },
    {
      entry: "a components.yaml file symbolic link",
      shown: `${CATALOG} is a symbolic link`,
      kept: "components.yaml",
      arrange: async (root: string, outside: string): Promise<boolean> => {
        await writeFile(path.join(outside, "components.yaml"), "keep\n", "utf-8");
        await mkdir(path.join(root, ".qfai", "catalog"), { recursive: true });
        try {
          await symlink(
            path.join(outside, "components.yaml"),
            path.join(root, ...CATALOG.split("/")),
            "file",
          );
        } catch {
          // A host without symlink permission cannot exercise this case.
          return false;
        }
        return true;
      },
    },
    {
      entry: "a .qfai/catalog entry that is a file",
      shown: ".qfai/catalog is not a directory",
      kept: null,
      arrange: async (root: string): Promise<boolean> => {
        await mkdir(path.join(root, ".qfai"), { recursive: true });
        await writeFile(path.join(root, ".qfai", "catalog"), "keep\n", "utf-8");
        return true;
      },
    },
  ])(
    "refuses $entry with and without --check, writing nothing",
    async ({ shown, kept, arrange }) => {
      const root = await projectWith({ "src/a.tsx": component("Alpha", []) });
      const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-outside-"));
      roots.push(outside);
      if (!(await arrange(root, outside))) return;
      const written = await cli(["catalog", "components", "--root", root]);
      expect(written.code).toBe(1);
      expect(written.err).toBe(
        `qfai catalog components: could not write ${CATALOG}, so any existing catalogue is as it was: ${shown}.\n`,
      );
      const checked = await cli(["catalog", "components", "--check", "--root", root]);
      expect(checked.code).toBe(1);
      expect(checked.err).toBe(
        `qfai catalog components: could not read ${CATALOG}, so nothing was compared: ${shown}.\n`,
      );
      if (kept === null) {
        expect(await readFile(path.join(root, ".qfai", "catalog"), "utf-8")).toBe("keep\n");
        expect(await readdir(outside)).toEqual([]);
      } else {
        expect(await readFile(path.join(outside, kept), "utf-8")).toBe("keep\n");
        expect(await readdir(path.join(outside, path.dirname(kept)))).toEqual(["components.yaml"]);
      }
    },
  );

  // QFAI:EX-0001-0307-23
  it("under --check refuses a catalogue directory that links outside and reads nothing through it", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", []) });
    const current = await projectWith({ "src/a.tsx": component("Alpha", []) });
    expect((await cli(["catalog", "components", "--root", current])).code).toBe(0);
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-outside-"));
    roots.push(outside);
    // The outside file is the current catalogue, so a check read through the link would pass.
    await writeFile(path.join(outside, "components.yaml"), await readCatalogText(current), "utf-8");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await symlink(
      outside,
      path.join(root, ".qfai", "catalog"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const result = await cli(["catalog", "components", "--check", "--root", root]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      `qfai catalog components: could not read ${CATALOG}, so nothing was compared: .qfai/catalog is a symbolic link.\n`,
    );
    expect(await readdir(outside)).toEqual(["components.yaml"]);
  });

  // QFAI:EX-0001-0307-19
  it("replaces the catalogue in place and leaves no temporary file beside it", async () => {
    const root = await projectWith({
      "src/a.tsx": component("Alpha", []),
      [CATALOG]: "stale\n",
    });
    const fresh = await projectWith({ "src/a.tsx": component("Alpha", []) });
    expect((await cli(["catalog", "components", "--root", fresh])).code).toBe(0);
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    expect(await readCatalogText(root)).toBe(await readCatalogText(fresh));
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
  });
});

// QFAI:AC-0001-0307-09
describe("a configuration the command cannot use stops it before it scans", () => {
  const broken = { "qfai.config.yaml": "paths: [\n", "src/a.tsx": component("Alpha", []) };

  // QFAI:EX-0001-0307-20
  it("exits 1 naming qfai.config.yaml and leaves an existing catalogue as it was", async () => {
    const root = await projectWith({ ...broken, [CATALOG]: "keep\n" });
    const result = await cli(["catalog", "components", "--root", root]);
    expect(result.code).toBe(1);
    expect(result.out).toBe("");
    expect(result.err).toBe(
      [
        "qfai catalog components: cannot use qfai.config.yaml, so no catalogue was written:",
        "  - The configuration file could not be read or parsed.",
        "",
      ].join("\n"),
    );
    expect(await readCatalogText(root)).toBe("keep\n");
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
  });

  // QFAI:EX-0001-0307-21
  it("under --check exits 1 naming qfai.config.yaml rather than calling the catalogue out of date", async () => {
    const root = await projectWith({ ...broken, [CATALOG]: "keep\n" });
    const result = await cli(["catalog", "components", "--check", "--root", root]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      [
        "qfai catalog components: cannot use qfai.config.yaml, so nothing was compared:",
        "  - The configuration file could not be read or parsed.",
        "",
      ].join("\n"),
    );
    expect(await readCatalogText(root)).toBe("keep\n");
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
  // QFAI:EX-0001-0307-10
  it("reports a linked catalogue as unreadable during validation", async () => {
    const files = { "src/a.tsx": component("Alpha", ["@source x@1"]) };
    const root = await projectWith(files);
    const outside = await projectWith(files);
    expect((await cli(["catalog", "components", "--root", outside])).code).toBe(0);
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await symlink(
      path.join(outside, ".qfai", "catalog"),
      path.join(root, ".qfai", "catalog"),
      process.platform === "win32" ? "junction" : "dir",
    );

    const findings = await comp(root);
    expect(findings.map(({ code, severity, file }) => [code, severity, file])).toEqual([
      ["QFAI-COMP-004", "warning", CATALOG],
    ]);
    expect(findings[0]?.message).toContain("Could not read");
    expect(findings[0]?.message).toContain(".qfai/catalog is a symbolic link.");
    expect(findings[0]?.suggested_action).toContain("Fix the reported catalogue path issue.");
    expect(findings[0]?.suggested_action).toContain("qfai catalog components");
  });

  // QFAI:EX-0001-0307-10
  it("reports a dangling catalogue link as unreadable during validation", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", []) });
    const file = path.join(root, ...CATALOG.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    expect(await comp(root)).toEqual([]);

    await symlink(
      path.join(path.dirname(file), "missing-catalogue"),
      file,
      process.platform === "win32" ? "junction" : "file",
    );

    const findings = await comp(root);
    expect(findings.map(({ code, severity, file }) => [code, severity, file])).toEqual([
      ["QFAI-COMP-004", "warning", CATALOG],
    ]);
    expect(findings[0]?.message).toContain(CATALOG + " is a symbolic link.");
    expect(findings[0]?.suggested_action).toContain("qfai catalog components");
  });

  // QFAI:EX-0001-0307-10
  it("reports a directory in place of the catalogue as unreadable", async () => {
    const root = await projectWith({ "src/a.tsx": component("Alpha", []) });
    await mkdir(path.join(root, ...CATALOG.split("/")), { recursive: true });

    const findings = await comp(root);
    expect(findings.map(({ code, severity, file }) => [code, severity, file])).toEqual([
      ["QFAI-COMP-004", "warning", CATALOG],
    ]);
    expect(findings[0]?.message).toContain(CATALOG + " is not a file.");
  });

  // QFAI:EX-0001-0307-28
  // QFAI:EX-0001-0307-29
  it("reports the catalogue byte limit and still reads a file at the limit", async () => {
    const limit = 8 * 1024 * 1024;
    const prefix = "components: []\n#";
    const root = await projectWith({
      [CATALOG]: prefix + "x".repeat(limit + 1 - prefix.length),
    });
    const file = path.join(root, ...CATALOG.split("/"));
    const reason = `The component catalogue exceeds ${limit} bytes.`;

    const findings = await comp(root);
    expect(findings.map(({ code, severity, file }) => [code, severity, file])).toEqual([
      ["QFAI-COMP-004", "warning", CATALOG],
    ]);
    expect(findings[0]?.message).toBe(`Could not read the component catalogue: ${reason}`);

    const check = await cli(["catalog", "components", "--check", "--root", root]);
    expect(check.code).toBe(1);
    expect(check.err).toContain(`could not read ${CATALOG}, so nothing was compared: ${reason}`);
    expect((await stat(file)).size).toBe(limit + 1);

    await truncate(file, limit);
    const atLimit = await comp(root);
    expect(atLimit.map(({ code, message }) => [code, message])).toEqual([
      [
        "QFAI-COMP-004",
        "The component catalogue is out of date with the components the surface files export.",
      ],
    ]);
    const compared = await cli(["catalog", "components", "--check", "--root", root]);
    expect(compared.code).toBe(1);
    expect(compared.err).toContain(`${CATALOG} is out of date with the source.`);
    expect((await stat(file)).size).toBe(limit);
  });

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

// QFAI:AC-0001-0307-11
describe("each component lists the business rules its declaration cites", () => {
  // QFAI:EX-0001-0307-31
  it("writes realizes through the CLI, passes --check and leaves the catalogue readable to validate", async () => {
    const root = await projectWith({
      "src/ui/order.tsx": [
        "/**",
        " * @source authored",
        " * @reason no catalogue item shows an order status",
        " */",
        "// QFAI:BR-UI-0003-0002",
        "export function OrderStatus() {",
        "  // QFAI:BR-UI-0003-0001",
        "  return <p />;",
        "}",
        "",
      ].join("\n"),
    });
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    expect(await readCatalogText(root)).toContain(
      [
        "    reason: no catalogue item shows an order status",
        "    realizes:",
        "      - BR-UI-0003-0001",
        "      - BR-UI-0003-0002",
        "",
      ].join("\n"),
    );
    expect((await cli(["catalog", "components", "--check", "--root", root])).code).toBe(0);
    expect(await comp(root)).toEqual([]);
  });

  // QFAI:EX-0001-0307-33
  it("ships the realizes lookup in the UI guidance", async () => {
    const guidance = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "assets",
        "init",
        ".qfai",
        "assistant",
        "skill",
        "qfai-implement",
        "references",
        "ui-affecting.md",
      ),
      "utf-8",
    );
    const section = guidance.slice(
      guidance.indexOf("## Component catalogue"),
      guidance.indexOf("\n## ", guidance.indexOf("## Component catalogue") + 1),
    );
    expect(section).toContain("`realizes`");
    expect(section).toContain("`QFAI:BR-UI-");
  });
});

// QFAI:AC-0001-0307-13
describe("each component lists the theme variables its declaration references", () => {
  // QFAI:EX-0001-0307-38
  it("writes tokens through the CLI, passes --check and leaves the catalogue readable to validate", async () => {
    const root = await projectWith({
      "src/ui/badge.tsx": [
        "/**",
        " * @source authored",
        " * @reason no catalogue item shows a badge",
        " */",
        "// QFAI:BR-UI-0003-0001",
        "export function Badge() {",
        '  return <span className="bg-[var(--color-brand)] text-[var(--color-text)]" />;',
        "}",
        "",
      ].join("\n"),
    });
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    expect(await readCatalogText(root)).toContain(
      [
        "    reason: no catalogue item shows a badge",
        "    tokens:",
        "      - --color-brand",
        "      - --color-text",
        "    realizes:",
        "      - BR-UI-0003-0001",
        "",
      ].join("\n"),
    );
    expect((await cli(["catalog", "components", "--check", "--root", root])).code).toBe(0);
    expect(await comp(root)).toEqual([]);
  });

  // QFAI:EX-0001-0307-39
  it("reports a catalogue whose tokens value is not a list of names as not a components list", async () => {
    const root = await projectWith({
      "src/ui/badge.tsx": component("Badge", ["@source authored", "@reason none fits"]),
      [CATALOG]: [
        "components:",
        "  - name: Badge",
        "    file: src/ui/badge.tsx",
        "    tokens: --color-brand",
        "",
      ].join("\n"),
    });
    expect((await comp(root)).map((found) => found.message)).toContain(
      "The component catalogue is not a `components:` list of entries with a `name` and a `file`.",
    );
  });

  // QFAI:EX-0001-0307-40
  it("ships the var(--name) reference in the UI guidance", async () => {
    const guidance = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "assets",
        "init",
        ".qfai",
        "assistant",
        "skill",
        "qfai-implement",
        "references",
        "ui-affecting.md",
      ),
      "utf-8",
    );
    const start = guidance.indexOf("## Component catalogue");
    const section = guidance.slice(start, guidance.indexOf("\n## ", start + 1));
    expect(section).toContain("`tokens`");
    expect(section).toContain("`var(--");
  });
});

// QFAI:AC-0001-0307-12
describe("each component lists the string literal values its props take", () => {
  // QFAI:EX-0001-0307-37
  it("writes variants through the CLI, passes --check, and validate reads it back or finds it malformed", async () => {
    const root = await projectWith({
      "src/ui/button.tsx": [
        'type Size = "sm" | "lg";',
        'interface ButtonProps { variant?: "primary" | "ghost"; size: Size }',
        "/**",
        " * @source authored",
        " * @reason no catalogue item has these variants",
        " */",
        "export function Button(props: ButtonProps) {",
        "  return <button />;",
        "}",
        "",
      ].join("\n"),
    });
    expect((await cli(["catalog", "components", "--root", root])).code).toBe(0);
    const text = await readCatalogText(root);
    expect(text).toContain(
      [
        "    props:",
        "      - variant",
        "      - size",
        "    variants:",
        "      variant:",
        "        - primary",
        "        - ghost",
        "      size:",
        "        - sm",
        "        - lg",
        "    source: authored",
        "",
      ].join("\n"),
    );
    expect((await cli(["catalog", "components", "--check", "--root", root])).code).toBe(0);
    expect(await comp(root)).toEqual([]);

    for (const malformed of ["    variants: [primary]\n", "    variants:\n      size: sm\n"]) {
      await writeFile(
        path.join(root, ...CATALOG.split("/")),
        text.replace(/ {4}variants:\n(?: {6}.*\n)+/, malformed),
        "utf-8",
      );
      const findings = await comp(root);
      expect(findings.map(({ code, file }) => [code, file])).toEqual([["QFAI-COMP-004", CATALOG]]);
      expect(findings[0]?.message).toContain("is not a `components:` list");
    }
  });

  // QFAI:EX-0001-0307-48
  it("ships the guidance to pass a listed variants value rather than restyle", async () => {
    const guidance = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "assets",
        "init",
        ".qfai",
        "assistant",
        "skill",
        "qfai-implement",
        "references",
        "ui-affecting.md",
      ),
      "utf-8",
    );
    const start = guidance.indexOf("## Component catalogue");
    const end = guidance.indexOf("\n## ", start + 1);
    const section = guidance.slice(start, end).replace(/\s+/g, " ");
    expect(section).toContain(
      "Pass one of a prop's listed `variants` values rather than restyling",
    );
  });
});
