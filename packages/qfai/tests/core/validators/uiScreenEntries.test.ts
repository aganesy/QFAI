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
import { validateProject } from "../../../src/core/validate.js";
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
    // A contract violation, named by the repository-relative path every finding carries.
    expect(finding?.category).toBe("canonical");
    expect(finding?.file).toBe(".qfai/contracts/ui/a.yaml");
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
    expect(reportedFile).not.toBe(keptFile);
    expect(findings[0]?.message).toContain(
      "repeats the `id` `home` of `screens[0]` in .qfai/contracts/ui/",
    );
  });

  it("names a screens value that is not a list, and not an empty one", async () => {
    // Every screen under a mapping or a scalar is dropped by the reader.
    const root = await projectWith({
      "a.yaml": ["screens:", "  home:", "    id: home", "    route: /"],
      "b.yaml": ["screens: home"],
      "c.yaml": ["screens:"],
    });
    const findings = await validateUiScreenEntries(root, defaultConfig);
    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining("`screens` in .qfai/contracts/ui/a.yaml is not a list"),
      expect.stringContaining("`screens` in .qfai/contracts/ui/b.yaml is not a list"),
    ]);
  });

  it("reads an id each spec's own contract reuses as a screen of that spec", async () => {
    // Certification reads one spec's contract on its own, so `home` in two
    // specs' contracts is two screens. Inside one spec's files it repeats.
    const root = await projectWith({
      "spec-0001.yaml": ["screens:", ...screen("home", "/")],
      "spec-0002.yaml": ["screens:", ...screen("home", "/two")],
    });
    expect(await validateUiScreenEntries(root, defaultConfig)).toEqual([]);

    await mkdir(path.join(root, ".qfai", "contracts", "ui", "spec-0003"), { recursive: true });
    for (const name of ["a.yaml", "b.yaml"]) {
      await writeFile(
        path.join(root, ".qfai", "contracts", "ui", "spec-0003", name),
        ["screens:", ...screen("home", "/three"), ""].join("\n"),
        "utf-8",
      );
    }
    const [finding] = await validateUiScreenEntries(root, defaultConfig);
    expect(finding?.message).toContain("spec-0003/b.yaml");
    expect(finding?.message).toContain("repeats the `id` `home`");
  });

  it("finds the contracts of a project whose path holds a glob character", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-screens-"));
    roots.push(parent);
    const root = path.join(parent, "build[1]");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "a.yaml"),
      ["screens:", ...screen("home", "/"), "  - just a string", ""].join("\n"),
      "utf-8",
    );
    const [finding] = await validateUiScreenEntries(root, defaultConfig);
    expect(finding?.message).toContain("is not a mapping");
  });

  it("is reported by the prototyping profile, which certification accepts", async () => {
    const root = await projectWith({
      "a.yaml": ["screens:", ...screen("home", "/"), "  - id: draft"],
    });
    const result = await validateProject(root, undefined, { profile: "prototyping" });
    const codes = result.issues.map((finding) => finding.code);
    expect(codes.filter((code) => code === "QFAI-CONTRACT-042")).toHaveLength(1);
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
