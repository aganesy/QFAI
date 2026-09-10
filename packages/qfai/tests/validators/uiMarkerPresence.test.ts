/**
 * A `data-qfai` marker a UI contract declares, and nothing on the screen
 * carries.
 *
 * The traceability that already exists runs one way: a test may only name a
 * marker the contract declares. That catches a typo in a test and cannot catch
 * a missing element, because an element nobody built is also an element no test
 * names. So a contract can declare an element, mark it required, and have it
 * rendered by nothing, with every profile green.
 *
 * The reading these cases hold: what the contract writes literally is the
 * declared set, a marker is rendered when its text appears anywhere under the
 * source directory, and a marker on neither side is a finding.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  UI_MARKER_NOT_RENDERED_RULE_ID,
  validateUiMarkerPresence,
} from "../../src/core/validators/uiMarkerPresence.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-marker-"));
  tempDirs.push(root);
  return root;
}

/** Writes one file under `root`, creating the directories it needs. */
async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/** A UI contract declaring one element and the marker that stands for it. */
function contractDeclaring(elementId: string, options?: { required?: boolean }): string {
  return [
    "id: SCR-ORDER",
    "elements:",
    `  - id: ${elementId}`,
    ...(options?.required === true ? ["    required: true"] : []),
    `    selector: "[data-qfai='SCR-ORDER:${elementId}']"`,
    "",
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("a marker the contract declares and no source carries", () => {
  it("is reported once, against the contract that declared it", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const issues = await validateUiMarkerPresence(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe(UI_MARKER_NOT_RENDERED_RULE_ID);
    expect(issues[0]?.file).toBe(".qfai/contracts/ui/order.yaml");
    expect(issues[0]?.message).toContain("SCR-ORDER:submit");
  });

  it("names the element the contract marked required, so the reader can rank it", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      contractDeclaring("submit", { required: true }),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const [finding] = await validateUiMarkerPresence(root, defaultConfig);

    expect(finding?.message).toContain("required: true");
  });

  it("says nothing about required for an element the contract left unmarked", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const [finding] = await validateUiMarkerPresence(root, defaultConfig);

    expect(finding?.message).not.toContain("required");
  });
});

describe("a marker the source mentions", () => {
  it("is not reported when the attribute is written out", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "src/OrderForm.tsx", '<button data-qfai="SCR-ORDER:submit">Send</button>\n');

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("is not reported when a framework renders it through a variable", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "src/markers.ts", 'export const SUBMIT = "SCR-ORDER:submit";\n');
    await write(root, "src/OrderForm.tsx", "<button {...marker(SUBMIT)} />\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("is found in any of the extensions a view can be written in", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "src/views/order.vue", "<button data-qfai='SCR-ORDER:submit' />\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("is found below the top level of the source tree", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(
      root,
      "src/features/order/form/Submit.tsx",
      '<button data-qfai="SCR-ORDER:submit" />\n',
    );

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("is not looked for outside the source directory", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "app/OrderForm.tsx", '<button data-qfai="SCR-ORDER:submit" />\n');

    expect(await validateUiMarkerPresence(root, defaultConfig)).toHaveLength(1);
  });
});

describe("where in the contract the marker is written", () => {
  it("reads one declared under prototype.markers, not only under an element", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "prototype:",
        "  mode: interactive",
        "  markers:",
        "    - id: mk_order_form",
        "      selector: \"[data-qfai='SCR-ORDER:order_form']\"",
        "      purpose: order create form root",
        "screens:",
        "  - id: order_create",
        "    elements:",
        "      - id: submit",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const issues = await validateUiMarkerPresence(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("SCR-ORDER:order_form");
  });
});

describe("how the contract wrote the value", () => {
  it("reads a bare value in a selector, which CSS allows for an identifier", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "id: SCR-ORDER",
        "elements:",
        "  - id: submit",
        "    selector: [data-qfai=order_submit]",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const issues = await validateUiMarkerPresence(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("order_submit");
  });

  it("reads a bare value written as the attribute itself", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "id: SCR-ORDER",
        "elements:",
        "  - id: submit",
        "    markup: <button data-qfai=order_submit>",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toHaveLength(1);
  });

  it("does not report a bare value the source renders", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "id: SCR-ORDER",
        "elements:",
        "  - id: submit",
        "    selector: [data-qfai=order_submit]",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", '<button data-qfai="order_submit" />\n');

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("stops a bare value at the character that closes it, taking no delimiter with it", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "id: SCR-ORDER",
        "elements:",
        "  - id: submit",
        "    selector: [data-qfai=order_submit]",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const [finding] = await validateUiMarkerPresence(root, defaultConfig);

    expect(finding?.message).toContain("`order_submit`");
  });

  it("declares nothing for an attribute left with no value", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      ["id: SCR-ORDER", "elements:", "  - id: submit", "    selector: [data-qfai=]", ""].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });
});

describe("what the rule declines to ask for", () => {
  it("asks nothing of a contract that writes no marker", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      ["id: SCR-ORDER", "elements:", "  - id: submit", "    required: true", ""].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("asks nothing of a project with no UI contracts at all", async () => {
    const root = await newRoot();
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toEqual([]);
  });

  it("reports a declared marker even when the source tree is missing", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));

    const issues = await validateUiMarkerPresence(root, defaultConfig);

    expect(issues.map((i) => i.code)).toEqual([UI_MARKER_NOT_RENDERED_RULE_ID]);
  });
});

describe("the paths the project configured", () => {
  it("reads the contracts and the source where the config puts them", async () => {
    const root = await newRoot();
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, contractsDir: "docs/contracts", srcDir: "app" },
    };
    await write(root, "docs/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, "app/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const [finding] = await validateUiMarkerPresence(root, config);

    expect(finding?.file).toBe("docs/contracts/ui/order.yaml");
    expect(finding?.message).toContain("`app`");
  });
});

describe("more than one declaration", () => {
  it("reports every unrendered marker, in a stable order", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "id: SCR-ORDER",
        "elements:",
        "  - id: submit",
        "    selector: \"[data-qfai='SCR-ORDER:submit']\"",
        "  - id: cancel",
        "    selector: \"[data-qfai='SCR-ORDER:cancel']\"",
        "",
      ].join("\n"),
    );
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    const issues = await validateUiMarkerPresence(root, defaultConfig);

    expect(issues.map((i) => i.message.includes("SCR-ORDER:cancel"))).toEqual([true, false]);
    expect(issues).toHaveLength(2);
  });

  it("reports a marker two contracts declare once", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractDeclaring("submit"));
    await write(root, ".qfai/contracts/ui/order-mobile.yaml", contractDeclaring("submit"));
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiMarkerPresence(root, defaultConfig)).toHaveLength(1);
  });
});
