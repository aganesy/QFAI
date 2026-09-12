/**
 * A UI contract entry the product reads as no screen is named.
 *
 * Every consumer takes its screens from one reader, which keeps the first entry
 * for each `id` and drops an entry with no `id` or no `route`. The reading is
 * one; what a dropped entry states used to pass every check in silence.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { readUiContractScreenContracts } from "../../../src/core/contracts/screenContracts.js";
import { validateContracts } from "../../../src/core/validators/contracts.js";
import { validateUiScreenEntries } from "../../../src/core/validators/uiScreenEntries.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project whose `.qfai/contracts/ui/` holds these files. */
async function projectWith(files: Readonly<Record<string, readonly string[]>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-screens-"));
  roots.push(root);
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  for (const [name, lines] of Object.entries(files)) {
    await writeFile(path.join(uiDir, name), [...lines, ""].join("\n"), "utf-8");
  }
  return root;
}

const screen = (id: string, route: string, tasks = "      - Browse"): string[] => [
  `  - id: ${id}`,
  `    route: ${route}`,
  "    primary_tasks:",
  tasks,
];

describe("a UI contract entry no screen is read from is reported", () => {
  it("says nothing about a contract whose every entry is a screen", async () => {
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/"), ...screen("orders", "/orders")],
    });
    expect(await validateUiScreenEntries(root, defaultConfig)).toEqual([]);
  });

  it("names an entry with no route, and an entry with no id", async () => {
    // An empty `primary_tasks` on either one passed the audit lane and the
    // prototyping preflight, because neither reader saw the entry.
    const root = await projectWith({
      "a.yaml": [
        "screens:",
        ...screen("home", "/"),
        "  - id: draft",
        "    primary_tasks: []",
        "  - route: /nameless",
        "    primary_tasks: []",
      ],
    });
    const messages = (await validateUiScreenEntries(root, defaultConfig)).map(
      (finding) => finding.message,
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain(
      "`screens[1]` in .qfai/contracts/ui/a.yaml (`draft`) has no `route`",
    );
    expect(messages[1]).toContain("`screens[2]` in .qfai/contracts/ui/a.yaml has no `id`");
  });

  it("names an entry that is not a mapping", async () => {
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/"), "  - just a string"],
    });
    const [finding] = await validateUiScreenEntries(root, defaultConfig);
    expect(finding?.code).toBe("QFAI-CONTRACT-042");
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain(
      "`screens[1]` in .qfai/contracts/ui/a.yaml is not a mapping",
    );
  });

  it("names a repeated id with the entry read in its place, across files", async () => {
    // Only the first entry is read, so the second one's empty task list passed.
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/")],
      "b.yaml": [
        "screens:",
        ...screen("home", "/home", "      []").slice(0, 2),
        "    primary_tasks: []",
      ],
    });
    const screens = await readUiContractScreenContracts(root);
    const findings = await validateUiScreenEntries(root, defaultConfig);
    expect(findings).toHaveLength(1);
    const read = screens.find((item) => item.screenId === "home");
    const reportedFile = findings[0]?.file ?? "";
    // The reported entry is the one the reader did not keep.
    const keptFile = read?.sourceRef.split("#")[0];
    expect(keptFile).toBeDefined();
    expect(path.relative(root, reportedFile).split(path.sep).join("/")).not.toBe(keptFile);
    expect(findings[0]?.message).toContain(
      "repeats the `id` `home` of `screens[0]` in .qfai/contracts/ui/",
    );
  });

  it("names a repeated id inside one file", async () => {
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/"), ...screen("home", "/again")],
    });
    const [finding] = await validateUiScreenEntries(root, defaultConfig);
    expect(finding?.message).toContain(
      "`screens[1]` in .qfai/contracts/ui/a.yaml repeats the `id` `home` of `screens[0]` in .qfai/contracts/ui/a.yaml",
    );
  });

  it("is part of the contract checks", async () => {
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/"), "  - id: draft"],
    });
    const codes = (await validateContracts(root, defaultConfig)).map((finding) => finding.code);
    expect(codes).toContain("QFAI-CONTRACT-042");
  });
});
