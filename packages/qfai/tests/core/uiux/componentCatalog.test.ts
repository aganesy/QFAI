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
  readCatalog,
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

  // QFAI:EX-0001-0307-13
  it("follows an export list and a default export, and reads forwardRef props and extended interfaces", async () => {
    const found = await components({
      "src/ui/button.tsx": [
        'import * as React from "react";',
        "interface BaseProps { variant?: string }",
        "interface ButtonProps extends BaseProps { asChild?: boolean }",
        "/** @source shadcn/ui button@2.1 */",
        "const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (",
        "  <button ref={ref} />",
        "));",
        "const buttonVariants = () => 'btn';",
        "export { Button, buttonVariants };",
        "",
      ].join("\n"),
      "src/ui/card.tsx": "function Card() {\n  return <div />;\n}\nexport default Card;\n",
    });
    expect(found).toEqual([
      {
        name: "Button",
        file: "src/ui/button.tsx",
        props: ["asChild", "variant"],
        source: "shadcn/ui button@2.1",
      },
      { name: "Card", file: "src/ui/card.tsx" },
    ]);
  });

  // QFAI:EX-0001-0307-14
  it("keeps a scoped package line inside the tag and reads past trailing line comments", async () => {
    const found = await components({
      "src/ui/dialog.tsx": [
        "/**",
        " * @source shadcn/ui dialog@2.1",
        " *   @radix-ui/react-dialog@1.1",
        " * @param props the props",
        " *   the dialog",
        " */",
        "// eslint-disable-next-line react/display-name",
        "export function Dialog() {",
        "  return <dialog />;",
        "}",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([
      {
        name: "Dialog",
        file: "src/ui/dialog.tsx",
        source: "shadcn/ui dialog@2.1 @radix-ui/react-dialog@1.1",
      },
    ]);
  });

  // QFAI:EX-0001-0307-22
  it("lists a const binding and never a let or var one, however it is exported", async () => {
    const found = await components({
      "src/ui/bindings.tsx": [
        "export const Card = () => <div />, Chip = () => <i />;",
        "export let Banner = () => <div />, Badge = () => <b />;",
        "export var Panel = () => <section />;",
        "let Toast = () => <output />;",
        "var Tile = () => <figure />;",
        "export { Toast };",
        "export default Tile;",
        "",
      ].join("\n"),
    });
    expect(found.map((component) => component.name)).toEqual(["Card", "Chip"]);
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

describe("each component lists the business rules its declaration cites", () => {
  // QFAI:EX-0001-0307-32
  it("ignores comment-like template and JSX text while preserving real comments in substitutions", async () => {
    const [component] = await components({
      "src/ui/caption.tsx": [
        "export function Caption() {",
        "  const caption = `",
        "    // QFAI:BR-UI-0003-0001",
        "    ${(() => {",
        "      // QFAI:BR-UI-0003-0002",
        '      return "caption";',
        "    })()}",
        "    // QFAI:BR-UI-0003-0003",
        "  `;",
        "  return <p>{caption}",
        "    // QFAI:BR-UI-0003-0004",
        "  </p>;",
        "}",
      ].join("\n"),
    });
    expect(component?.realizes).toEqual(["BR-UI-0003-0002"]);
  });

  // QFAI:EX-0001-0307-32
  it("counts block-comment lines and ignores comment prefixes in incomplete expressions", async () => {
    const [component] = await components({
      "src/ui/progress.tsx": [
        "export function Progress() {",
        "  const progress = 2",
        "    * QFAI:BR-UI-0003-0001 ;",
        "  /*",
        "   * QFAI:BR-UI-0003-0002",
        "   */",
        "  return <p />;",
        "}",
      ].join("\n"),
    });
    expect(component?.realizes).toEqual(["BR-UI-0003-0002"]);
  });

  // QFAI:EX-0001-0307-31
  it("records the IDs each declaration cites, once each and sorted, as the last key", async () => {
    const found = await components({
      "src/ui/order.tsx": [
        "/**",
        " * @pattern status",
        " */",
        "// QFAI:BR-UI-0003-0002",
        "export function OrderStatus() {",
        "  // QFAI:BR-UI-0003-0001",
        "  // QFAI:BR-UI-0003-0002",
        "  return <p />;",
        "}",
        "",
        "export function OrderTotal() {",
        "  return <p />;",
        "}",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([
      {
        name: "OrderStatus",
        file: "src/ui/order.tsx",
        pattern: "status",
        realizes: ["BR-UI-0003-0001", "BR-UI-0003-0002"],
      },
      { name: "OrderTotal", file: "src/ui/order.tsx" },
    ]);
    const text = renderCatalog(found);
    expect(text).toContain(
      [
        "    pattern: status",
        "    realizes:",
        "      - BR-UI-0003-0001",
        "      - BR-UI-0003-0002",
        "  - name: OrderTotal",
      ].join("\n"),
    );
  });

  // QFAI:EX-0001-0307-32
  it("records no ID held in a string, after code or in a JSX comment", async () => {
    const found = await components({
      "src/ui/thing.tsx": [
        "export function Thing() {",
        '  const id = "QFAI:BR-UI-0003-0001";',
        "  doThing(); // QFAI:BR-UI-0003-0002",
        "  return (",
        "    <div>",
        "      {/* see QFAI:BR-UI-0003-0003 */}",
        "    </div>",
        "  );",
        "}",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([{ name: "Thing", file: "src/ui/thing.tsx" }]);
  });

  // QFAI:EX-0001-0307-34
  it("credits no ID after the previous statement or in another declarator", async () => {
    expect(
      await components({
        "src/ui/pair.tsx": [
          "export function First() {",
          "  return <p />;",
          "} // QFAI:BR-UI-0003-0004",
          "export function Second() {",
          "  return <p />;",
          "}",
          "",
          "export const Left = () => { // QFAI:BR-UI-0003-0005",
          "  // QFAI:BR-UI-0003-0006",
          "  return <p />;",
          "}, Right = () => <p />;",
          "",
        ].join("\n"),
      }),
    ).toEqual([
      { name: "First", file: "src/ui/pair.tsx" },
      { name: "Left", file: "src/ui/pair.tsx", realizes: ["BR-UI-0003-0006"] },
      { name: "Right", file: "src/ui/pair.tsx" },
      { name: "Second", file: "src/ui/pair.tsx" },
    ]);
  });

  // QFAI:EX-0001-0307-34
  it.each([
    { name: "LF", lineEnding: "\n" },
    { name: "CR", lineEnding: "\r" },
  ])(
    "keeps a citation before another declarator with $name line endings",
    async ({ lineEnding }) => {
      const found = await components({
        "src/ui/pair.tsx": [
          "export const First = () => {",
          "  /* QFAI:BR-UI-0003-0007 */ return <p />; }, Second = () => <p />;",
          "",
          "export function Third() {",
          "  return <p />;",
          "}",
          "",
        ].join(lineEnding),
      });
      expect(found).toEqual([
        { name: "First", file: "src/ui/pair.tsx", realizes: ["BR-UI-0003-0007"] },
        { name: "Second", file: "src/ui/pair.tsx" },
        { name: "Third", file: "src/ui/pair.tsx" },
      ]);
    },
  );
});

describe("each component lists the theme variables its declaration references", () => {
  // QFAI:EX-0001-0307-38
  it("records each var(--name) once, sorted, before realizes, and resolves no utility class", async () => {
    const found = await components({
      "src/ui/badge.tsx": [
        "// QFAI:BR-UI-0003-0001",
        "export function Badge() {",
        "  const gap = `calc(var(--space-2, 4px) * 2)`;",
        "  return (",
        '    <span className="bg-[var(--color-brand)]" style={{ color: "var(--color-text)", gap }}>',
        '      <i className="border-[var(--color-brand)]" />',
        "    </span>",
        "  );",
        "}",
        "",
        "export function Plain() {",
        '  return <p className="bg-brand" />;',
        "} // var(--leak)",
        'export const Left = () => <p style={{ color: "var(--color-left)" }} />,',
        "  Right = () => <p />;",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([
      {
        name: "Badge",
        file: "src/ui/badge.tsx",
        tokens: ["--color-brand", "--color-text", "--space-2"],
        realizes: ["BR-UI-0003-0001"],
      },
      { name: "Left", file: "src/ui/badge.tsx", tokens: ["--color-left"] },
      { name: "Plain", file: "src/ui/badge.tsx" },
      { name: "Right", file: "src/ui/badge.tsx" },
    ]);
    expect(renderCatalog(found)).toContain(
      [
        "    tokens:",
        "      - --color-brand",
        "      - --color-text",
        "      - --space-2",
        "    realizes:",
        "      - BR-UI-0003-0001",
        "  - name: Left",
      ].join("\n"),
    );
  });

  // QFAI:EX-0001-0307-39
  it("reads a tokens list back and treats any other tokens value as invalid", async () => {
    const entry = ["components:", "  - name: Badge", "    file: src/ui/badge.tsx"];
    const root = await projectWith({
      ".qfai/catalog/components.yaml": [...entry, "    tokens:", "      - --color-brand", ""].join(
        "\n",
      ),
    });
    expect(await readCatalog(root)).toMatchObject({
      state: "read",
      components: [{ name: "Badge", file: "src/ui/badge.tsx", tokens: ["--color-brand"] }],
    });
    for (const malformed of ["    tokens: --color-brand", "    tokens:\n      - 3"]) {
      const bad = await projectWith({
        ".qfai/catalog/components.yaml": [...entry, malformed, ""].join("\n"),
      });
      expect(await readCatalog(bad)).toEqual({ state: "invalid" });
    }
  });
});

describe("each component lists the string literal values its props take", () => {
  // QFAI:EX-0001-0307-35
  it("records only common variant values from intersected properties in either operand order", async () => {
    const found = await components({
      "src/ui/intersection.tsx": [
        'import type { External } from "./external";',
        'type Left = { variant: "left" | "common"; exclusive: "one" | "two" };',
        'type Right = { variant: "common" | "right"; exclusive: "three" | "four" };',
        "export const LeftFirst = (props: Left & Right) => <div />;",
        "export const RightFirst = (props: Right & Left) => <div />;",
        "export const Grouped = (props: Left & (Right)) => <div />;",
        "export const Unresolved = (props: Left & External) => <div />;",
      ].join("\n"),
    });
    expect(found.map(({ variants }) => variants)).toEqual([
      { variant: ["common"] },
      { variant: ["common"] },
      { variant: ["common"] },
      undefined,
    ]);
  });

  // QFAI:EX-0001-0307-35
  it("keeps a generic prop without using a shadowed alias as its variants", async () => {
    const [component] = await components({
      "src/ui/shadowed.tsx": [
        'type Tone = "info" | "warn";',
        "type Props<Tone> = { tone: Tone };",
        'export const Widget = (props: Props<"local">) => <div />;',
      ].join("\n"),
    });
    expect(component).toMatchObject({ props: ["tone"] });
    expect(component?.variants).toBeUndefined();
  });

  // QFAI:EX-0001-0307-35
  it("records each string literal union prop's values, in order, right after props", async () => {
    const found = await components({
      "src/ui/button.tsx": [
        'import type { Theme } from "./theme";',
        'type Tone = "info" | "warn";',
        "interface BaseProps {",
        '  size?: "sm" | "lg" | undefined;',
        "}",
        "interface ButtonProps extends BaseProps {",
        '  variant: "default" | "destructive" | "outline";',
        "  tone: Tone;",
        "  label: string;",
        '  kind: "a" | 1;',
        "  theme: Theme;",
        '  state: "idle" | null | (string & {});',
        "}",
        "/**",
        " * @pattern button",
        " */",
        "export function Button(props: ButtonProps) {",
        "  return <button />;",
        "}",
        "",
      ].join("\n"),
    });
    expect(found).toEqual([
      {
        name: "Button",
        file: "src/ui/button.tsx",
        props: ["variant", "tone", "label", "kind", "theme", "state", "size"],
        variants: {
          variant: ["default", "destructive", "outline"],
          tone: ["info", "warn"],
          size: ["sm", "lg"],
        },
        pattern: "button",
      },
    ]);
    expect(renderCatalog(found)).toContain(
      [
        "      - size",
        "    variants:",
        "      variant:",
        "        - default",
        "        - destructive",
        "        - outline",
        "      tone:",
        "        - info",
        "        - warn",
        "      size:",
        "        - sm",
        "        - lg",
        "    pattern: button",
      ].join("\n"),
    );
  });

  // QFAI:EX-0001-0307-36
  it("records no variants for destructured props or props with no string literal union", async () => {
    expect(
      await components({
        "src/ui/chip.tsx": [
          'export const Chip = ({ size = "sm" }) => <i />;',
          'type Size = "sm" | Wide;',
          'export function Tag(props: { size: Size; label: string; one: "x" }) {',
          "  return <b />;",
          "}",
          "",
        ].join("\n"),
      }),
    ).toEqual([
      { name: "Chip", file: "src/ui/chip.tsx", props: ["size"] },
      { name: "Tag", file: "src/ui/chip.tsx", props: ["size", "label", "one"] },
    ]);
  });
});
