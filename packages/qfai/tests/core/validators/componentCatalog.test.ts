/**
 * The warnings validate raises from a committed component catalogue.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../../src/core/config.js";
import type { Issue } from "../../../src/core/types.js";
import { renderCatalog, scanComponents } from "../../../src/core/uiux/componentCatalog.js";
import { validateComponentCatalog } from "../../../src/core/validators/componentCatalog.js";

const roots: string[] = [];
const packageRequire = createRequire(import.meta.url);
const realTypescript = (): unknown => packageRequire("typescript");
const CATALOG = ".qfai/catalog/components.yaml";

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

const config: QfaiConfig = {
  ...defaultConfig,
  uiux: { ...defaultConfig.uiux, surfacePaths: ["src/**"] },
};

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-component-warnings-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

/** A component file whose doc comment carries the given tag lines. */
function component(name: string, tags: readonly string[], body = "<div />"): string {
  const doc = tags.length > 0 ? `/**\n${tags.map((tag) => ` * ${tag}\n`).join("")} */\n` : "";
  return `${doc}export function ${name}() {\n  return ${body};\n}\n`;
}

/** The project with its catalogue written from the source, as the command writes it. */
async function catalogued(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await projectWith(files);
  const scan = await scanComponents(root, config, { loadTypescript: realTypescript });
  if (!scan.readable) throw new Error("typescript did not load");
  await mkdir(path.join(root, ".qfai", "catalog"), { recursive: true });
  await writeFile(path.join(root, ...CATALOG.split("/")), renderCatalog(scan.components), "utf-8");
  return root;
}

async function warnings(root: string): Promise<Issue[]> {
  return validateComponentCatalog(root, config, { loadTypescript: realTypescript });
}

describe("validate warns from the component catalogue", () => {
  // QFAI:EX-0001-0307-07
  // QFAI:EX-0001-0307-15
  it("warns about a shared component with no source and an authored one with no reason, not a page", async () => {
    const root = await catalogued({
      "src/card.tsx": component("Card", []),
      "src/pages/home.tsx": `import { Card } from "../card";\n${component("Home", [], "<Card />")}`,
      "src/banner.tsx": component("Banner", ["@source authored"]),
      "src/badge.tsx": component("Badge", ["@source Authored", "@reason No item fits"]),
      "src/button.tsx": component("Button", ["@source shadcn/ui button@2.1"]),
    });
    const found = await warnings(root);
    expect(found.map((item) => [item.code, item.severity, item.file])).toEqual([
      ["QFAI-COMP-001", "warning", "src/banner.tsx"],
      ["QFAI-COMP-001", "warning", "src/card.tsx"],
    ]);
    expect(found[0]?.message).toContain("`Banner`");
    expect(found[0]?.message).toContain("@reason");
    expect(found[1]?.message).toContain("`Card`");
  });

  // QFAI:EX-0001-0307-08
  it("warns once about two components realising one pattern", async () => {
    const source = "@source authored";
    const reason = "@reason The list needs its own toolbar";
    const root = await catalogued({
      "src/ui/list-kit.tsx": component("ListToolbar", [source, reason, "@pattern list toolbar"]),
      "src/orders/toolbar.tsx": component("OrdersToolbar", [
        source,
        reason,
        "@pattern List Toolbar ",
      ]),
      "src/ui/button.tsx": component("Button", ["@source shadcn/ui button@2.1", "@pattern button"]),
    });
    const found = await warnings(root);
    expect(found.map((item) => item.code)).toEqual(["QFAI-COMP-002"]);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.file).toBe(CATALOG);
    expect(found[0]?.message).toContain("`OrdersToolbar` (src/orders/toolbar.tsx)");
    expect(found[0]?.message).toContain("`ListToolbar` (src/ui/list-kit.tsx)");
    expect(found[0]?.message).toContain("`list toolbar`");
  });

  // QFAI:EX-0001-0307-09
  it("warns about a raw element a listed component replaces, outside its own file", async () => {
    const root = await catalogued({
      "src/ui/button.tsx": component(
        "Button",
        ["@source shadcn/ui button@2.1", "@pattern button"],
        "<button />",
      ),
      "src/pages/orders.tsx": [
        "export const Orders = () => (",
        "  <form>",
        "    <div />",
        "    <button>Save</button>",
        "    <input />",
        "  </form>",
        ");",
        "",
      ].join("\n"),
    });
    const found = (await warnings(root)).filter((item) => item.code === "QFAI-COMP-003");
    expect(found.map((item) => [item.code, item.file, item.loc?.line])).toEqual([
      ["QFAI-COMP-003", "src/pages/orders.tsx", 4],
    ]);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain("`Button` (src/ui/button.tsx)");
    expect(found[0]?.suggested_action).toContain("`Button`");
  });

  // QFAI:EX-0001-0307-16
  it("skips a hidden input and reports any other input type", async () => {
    const root = await catalogued({
      "src/ui/field.tsx": component(
        "Field",
        ["@source shadcn/ui input@2.1", "@pattern input"],
        "<input />",
      ),
      "src/pages/form.tsx": [
        "export const form = (",
        "  <form>",
        '    <input type="hidden" />',
        '    <input type={"hidden"} />',
        '    <input type="checkbox" />',
        "  </form>",
        ");",
        "",
      ].join("\n"),
    });
    const found = await warnings(root);
    expect(found.map((item) => [item.code, item.file, item.loc?.line])).toEqual([
      ["QFAI-COMP-003", "src/pages/form.tsx", 5],
    ]);
  });

  // QFAI:EX-0001-0307-10
  it("warns about a stale or malformed catalogue and asks nothing without one", async () => {
    const files = { "src/a.tsx": component("Alpha", ["@source authored", "@reason x"]) };
    const root = await catalogued(files);
    expect(await warnings(root)).toEqual([]);

    await writeFile(
      path.join(root, "src", "b.tsx"),
      component("Beta", ["@source authored", "@reason y"]),
      "utf-8",
    );
    const stale = await warnings(root);
    expect(stale.map((item) => [item.code, item.severity, item.file])).toEqual([
      ["QFAI-COMP-004", "warning", CATALOG],
    ]);
    expect(stale[0]?.suggested_action).toContain("qfai catalog components");

    await writeFile(path.join(root, ...CATALOG.split("/")), "components: 5\n", "utf-8");
    expect((await warnings(root)).map((item) => item.code)).toEqual(["QFAI-COMP-004"]);

    expect(await warnings(await projectWith(files))).toEqual([]);
  });

  // QFAI:EX-0001-0310-01
  it("warns about hand-written dialog, menu and tab list markup where a registry is declared", async () => {
    const root = await projectWith({
      "src/pages/settings.tsx": [
        "export const Settings = () => (",
        "  <main>",
        '    <div role="dialog" aria-modal="true">',
        '      <ul role="menu" />',
        '      <div role={"tablist"} />',
        '      <Panel role="dialog" />',
        '      <div role="alert">Saved</div>',
        "    </div>",
        "  </main>",
        ");",
        "",
      ].join("\n"),
    });
    const withRegistry: QfaiConfig = {
      ...config,
      uiux: { ...config.uiux, registries: { shadcn: "https://ui.shadcn.com/r/{name}.json" } },
    };
    const found = await validateComponentCatalog(root, withRegistry, {
      loadTypescript: realTypescript,
    });
    expect(found.map((item) => [item.code, item.severity, item.file, item.loc?.line])).toEqual([
      ["QFAI-COMP-005", "warning", "src/pages/settings.tsx", 3],
      ["QFAI-COMP-005", "warning", "src/pages/settings.tsx", 4],
      ["QFAI-COMP-005", "warning", "src/pages/settings.tsx", 5],
    ]);
    expect(found[0]?.message).toContain('`role="dialog"` and `aria-modal`');
    expect(found[1]?.message).toContain('`role="menu"`');
    expect(found[2]?.message).toContain('`role="tablist"`');
    expect(found[0]?.suggested_action).toContain("ui-procurement.md");
  });

  // QFAI:EX-0001-0310-02
  it("treats a catalogue item as an installed catalogue and spares that item's own file", async () => {
    const root = await catalogued({
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
    const found = await warnings(root);
    expect(found.map((item) => [item.code, item.file])).toEqual([
      ["QFAI-COMP-005", "src/pages/home.tsx"],
    ]);
  });

  // QFAI:EX-0001-0310-03
  it("asks nothing of hand-written dialog markup where no catalogue is installed", async () => {
    const files = {
      "src/pages/home.tsx": component("Home", [], '<div role="dialog" />'),
      "src/ui/badge.tsx": component("Badge", ["@source authored", "@reason No item fits"]),
    };
    expect(await warnings(await catalogued(files))).toEqual([]);
    expect(await warnings(await projectWith(files))).toEqual([]);
  });

  // QFAI:EX-0001-0310-04
  it("warns about a listed interactive widget with no @a11y", async () => {
    const root = await catalogued({
      "src/ui/confirm.tsx": component("ConfirmDialog", [
        "@source authored",
        "@reason The confirm step needs its own layout",
        "@pattern Alert-Dialog",
      ]),
      "src/ui/account.tsx": component("AccountMenu", [
        "@source shadcn/ui dropdown-menu@2.1",
        "@pattern menu button",
        "@a11y APG Menu Button; Enter, Space and ArrowDown open the menu",
      ]),
      "src/ui/card.tsx": component("Card", ["@source shadcn/ui card@2.1", "@pattern card"]),
    });
    const found = await warnings(root);
    expect(found.map((item) => [item.code, item.severity, item.file])).toEqual([
      ["QFAI-COMP-006", "warning", "src/ui/confirm.tsx"],
    ]);
    expect(found[0]?.message).toContain("`ConfirmDialog`");
    expect(found[0]?.message).toContain("`Alert-Dialog`");
    expect(found[0]?.suggested_action).toContain("@a11y");
  });

  it("reads a catalogue with CRLF line ends as current", async () => {
    const root = await catalogued({ "src/a.tsx": component("Alpha", ["@source x@1"]) });
    const file = path.join(root, ...CATALOG.split("/"));
    await writeFile(file, (await readFile(file, "utf-8")).replace(/\n/g, "\r\n"), "utf-8");
    expect(await warnings(root)).toEqual([]);
  });
});
