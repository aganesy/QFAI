/**
 * The component catalogue scanner: which exports it lists, what it records for each, and the
 * file it renders.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../../src/core/config.js";
import {
  renderCatalog,
  scanComponents,
  type CatalogComponent,
} from "../../../src/core/uiux/componentCatalog.js";

const roots: string[] = [];
const packageRequire = createRequire(import.meta.url);
const realTypescript = (): unknown => packageRequire("typescript");

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

const config: QfaiConfig = {
  ...defaultConfig,
  uiux: { ...defaultConfig.uiux, surfacePaths: ["src/**"] },
};

async function components(files: Readonly<Record<string, string>>): Promise<CatalogComponent[]> {
  const scan = await scanComponents(await projectWith(files), config, {
    loadTypescript: realTypescript,
  });
  if (!scan.readable) throw new Error("typescript did not load");
  return scan.components;
}

const BUTTON = [
  "interface ButtonProps {",
  "  variant: string;",
  "  size?: string;",
  "}",
  "",
  "/**",
  " * The one button.",
  " * @source shadcn/ui button@2.1",
  " * @states default, disabled",
  " * @pattern button",
  " * @a11y APG button;",
  " *   Enter and Space activate",
  " */",
  "export function Button(props: ButtonProps) {",
  "  return <button className={props.variant}>Save</button>;",
  "}",
  "",
].join("\n");

describe("the scanner lists exported components", () => {
  // QFAI:EX-0001-0307-01
  it("records the name, file, props and every doc tag", async () => {
    expect(await components({ "src/ui/button.tsx": BUTTON })).toEqual([
      {
        name: "Button",
        file: "src/ui/button.tsx",
        props: ["variant", "size"],
        source: "shadcn/ui button@2.1",
        states: ["default", "disabled"],
        pattern: "button",
        a11y: "APG button; Enter and Space activate",
      },
    ]);
  });

  // QFAI:EX-0001-0307-02
  it("reads props from a destructuring, an annotation's type argument and a local intersection", async () => {
    const found = await components({
      "src/toolbar.jsx": "export const Toolbar = ({ title, actions, ...rest }) => <div />;\n",
      "src/list.tsx": [
        'import { memo, type FC } from "react";',
        'import type { Shared, ImportedProps } from "./shared";',
        "type ToolbarProps = { items: string[] } & Shared;",
        "export const ListToolbar: FC<ToolbarProps> = memo(() => <div />);",
        "export function Panel(props: ImportedProps) {",
        "  return <section />;",
        "}",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([
      { name: "ListToolbar", file: "src/list.tsx", props: ["items"] },
      { name: "Panel", file: "src/list.tsx" },
      { name: "Toolbar", file: "src/toolbar.jsx", props: ["title", "actions"] },
    ]);
  });

  // QFAI:EX-0001-0307-03
  it("ignores test and story files and exports that are not components", async () => {
    const component = "export function Card() {\n  return <div />;\n}\n";
    expect(
      await components({
        "src/button.test.tsx": component,
        "src/card.stories.tsx": component,
        "src/util.ts": component,
        "src/misc.tsx": [
          "export function formatDate() {",
          "  return <time />;",
          "}",
          "export function Limit() {",
          "  return 5;",
          "}",
          "export const LIMIT = 5;",
          "function Hidden() {",
          "  return <div />;",
          "}",
          "",
        ].join("\n"),
      }),
    ).toEqual([]);
  });

  // QFAI:EX-0001-0307-04
  it("sorts by file then name and renders the same bytes each time", async () => {
    const files = {
      "src/b.tsx": "export const Zeta = () => <i />;\nexport const Alpha = () => <b />;\n",
      "src/a.tsx": "export function Beta() {\n  return <p />;\n}\n",
    };
    const first = await components(files);
    expect(first.map((found) => found.name)).toEqual(["Beta", "Alpha", "Zeta"]);
    const text = renderCatalog(first);
    expect(renderCatalog(await components(files))).toBe(text);
    expect(text).toContain("components:\n  - name: Beta\n    file: src/a.tsx\n");
    expect(text).not.toContain("source");
  });

  it("keeps the key order fixed and omits empty tags", () => {
    const text = renderCatalog([
      { name: "Badge", file: "src/badge.tsx", props: [], source: "authored", reason: "No item" },
    ]);
    expect(text.split("\n").slice(2).join("\n")).toBe(
      [
        "components:",
        "  - name: Badge",
        "    file: src/badge.tsx",
        "    props: []",
        "    source: authored",
        "    reason: No item",
        "",
      ].join("\n"),
    );
  });

  it("reports the files it could not read when typescript does not load", async () => {
    const root = await projectWith({ "src/a.tsx": BUTTON, "src/b.tsx": BUTTON });
    const scan = await scanComponents(root, config, {
      loadTypescript: () => {
        throw new Error("missing");
      },
    });
    expect(scan).toEqual({ readable: false, unread: 2 });
  });
});
