/**
 * The `mode` a UI contract's `prototype` mapping declares.
 *
 * Nothing branches on the value, so the subject of these cases is what the
 * contract tells a reader. A word outside the vocabulary claims the prototype
 * is something it is not, and no run disagrees.
 *
 * The reading they hold: only a contract that writes a mode is asked anything,
 * the mode read is the one directly under a top-level `prototype`, and the
 * finding is an error.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  UI_PROTOTYPE_MODE_RULE_ID,
  validateUiPrototypeMode,
} from "../../src/core/validators/uiPrototypeMode.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-proto-mode-"));
  tempDirs.push(root);
  return root;
}

/** Writes one file under `root`, creating the directories it needs. */
async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/** A UI contract carrying a `prototype` block written as the template writes it. */
function contractWithPrototype(...prototypeLines: string[]): string {
  return [
    "prototype:",
    ...prototypeLines,
    "screens:",
    "  - id: order_create",
    "    route: /orders/new",
    "",
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("a mode outside the vocabulary", () => {
  it("is reported against the contract that declared it, naming both words", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractWithPrototype("  mode: static"));

    const issues = await validateUiPrototypeMode(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe(UI_PROTOTYPE_MODE_RULE_ID);
    expect(issues[0]?.file).toBe(".qfai/contracts/ui/order.yaml");
    expect(issues[0]?.message).toContain("static");
    expect(issues[0]?.message).toContain("interactive");
  });

  it("reports an unknown mode as an error", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractWithPrototype("  mode: static"));

    const [finding] = await validateUiPrototypeMode(root, defaultConfig);

    expect(finding?.severity).toBe("error");
  });

  it("is named as written when quoted, so the message matches the file", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractWithPrototype('  mode: "static"'));

    const [finding] = await validateUiPrototypeMode(root, defaultConfig);

    expect(finding?.message).toContain("`prototype.mode: static`");
  });

  it("is reported once per contract that declares one", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractWithPrototype("  mode: static"));
    await write(root, ".qfai/contracts/ui/report.yaml", contractWithPrototype("  mode: printed"));

    const issues = await validateUiPrototypeMode(root, defaultConfig);

    expect(issues.map((i) => i.file)).toEqual([
      ".qfai/contracts/ui/order.yaml",
      ".qfai/contracts/ui/report.yaml",
    ]);
  });
});

describe("what the rule declines to ask for", () => {
  it("says nothing about the mode the template writes", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      contractWithPrototype(
        "  mode: interactive",
        "  mockPaths:",
        "    - id: mp_create_to_list",
        "      flow: create -> list reflects",
      ),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("says nothing about the same mode written in quotes, which YAML allows", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      contractWithPrototype('  mode: "interactive"'),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("says nothing when the value carries a trailing comment", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      contractWithPrototype("  mode: interactive # the only value"),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("asks nothing of a contract with no prototype block", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      ["screens:", "  - id: order_create", "    route: /orders/new", ""].join("\n"),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("leaves an unfilled slot alone, which is drafting rather than a wrong claim", async () => {
    const root = await newRoot();
    await write(root, ".qfai/contracts/ui/order.yaml", contractWithPrototype("  mode:"));

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("asks nothing of a project with no UI contracts at all", async () => {
    const root = await newRoot();
    await write(root, "src/OrderForm.tsx", "export const OrderForm = () => <form />;\n");

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });
});

describe("which mode the rule reads", () => {
  it("reads the one under prototype, not one nested inside an entry above it", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      contractWithPrototype(
        "  mockPaths:",
        "    - id: mp_create_to_list",
        "      mode: static",
        "  mode: interactive",
      ),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });

  it("stops at the end of the prototype block, so a later mapping's mode is not it", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/ui/order.yaml",
      [
        "prototype:",
        "  mockPaths:",
        "    - id: mp_create_to_list",
        "      flow: create -> list reflects",
        "report:",
        "  mode: static",
        "screens:",
        "  - id: order_create",
        "",
      ].join("\n"),
    );

    expect(await validateUiPrototypeMode(root, defaultConfig)).toEqual([]);
  });
});

describe("the paths the project configured", () => {
  it("reads the contracts where the config puts them", async () => {
    const root = await newRoot();
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, contractsDir: "docs/contracts" },
    };
    await write(root, "docs/contracts/ui/order.yaml", contractWithPrototype("  mode: static"));

    const [finding] = await validateUiPrototypeMode(root, config);

    expect(finding?.file).toBe("docs/contracts/ui/order.yaml");
  });
});
