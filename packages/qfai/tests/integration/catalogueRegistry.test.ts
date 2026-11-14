import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ISSUE_EXPECTED_BY_CODE, resolveIssueFix } from "../../src/cli/commands/validate.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

const CODE = "QFAI-STORY-021";
const TECH = path.join(".qfai", "spec", "03_contract", "tech.md");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-catalogue-registry-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(relative: string, text: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf-8");
}

/** A tech.md whose Stack table carries the given Component catalogue cell. */
function tech(catalogue: string): string {
  return [
    "# Technology",
    "",
    "## Stack",
    "",
    "| Component | Choice |",
    "| --- | --- |",
    "| Runtime | `Node.js 22` |",
    `| Component catalogue | ${catalogue} |`,
    "",
  ].join("\n");
}

async function findings(profile: ValidationProfile = "sdd"): Promise<Issue[]> {
  const { issues } = await validateProject(root, undefined, { profile });
  return issues.filter((item) => item.code === CODE);
}

describe("QFAI-STORY-021 warns about a catalogue with no registry", () => {
  // QFAI:AC-0001-0306-01
  // QFAI:EX-0001-0306-01
  it("raises one warning naming tech.md and the catalogue when no config declares a registry", async () => {
    await put(TECH, tech("`shadcn/ui`"));
    const reported = await findings();
    expect(reported).toHaveLength(1);
    const [found] = reported;
    expect(found?.severity).toBe("warning");
    expect(found?.file).toContain("tech.md");
    expect(found?.message).toContain("shadcn/ui");
    expect(found?.message).toContain("uiux.registries");
    expect(ISSUE_EXPECTED_BY_CODE[CODE]).toEqual(expect.stringMatching(/\S/));
    const hint = found ? resolveIssueFix(found) : "";
    expect(hint).toEqual(expect.stringMatching(/\S/));
    expect(hint).toContain("uiux.registries");
    expect(hint).toContain("exactly `none`");
  });

  // QFAI:EX-0001-0306-07
  it("compares labels without case and names only the first code span of the cell", async () => {
    await put(
      TECH,
      [
        "# Technology",
        "",
        "## Stack",
        "",
        "| component | CHOICE |",
        "| --- | --- |",
        "| component catalogue | `shadcn/ui` (via components.json) |",
        "",
      ].join("\n"),
    );
    const reported = await findings();
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toContain("catalogue shadcn/ui,");
    expect(reported[0]?.message).not.toContain("via components.json");
  });

  // QFAI:EX-0001-0306-02
  it("raises it when uiux.registries is empty or holds no valid entry", async () => {
    await put(TECH, tech("`shadcn/ui`"));
    await put("qfai.config.yaml", "uiux:\n  registries: {}\n");
    expect(await findings()).toHaveLength(1);
    await put("qfai.config.yaml", "uiux:\n  registries:\n    shadcn: https://ui.shadcn.com/r/\n");
    expect(await findings()).toHaveLength(1);
  });

  // QFAI:EX-0001-0306-03
  it("is reported in sdd, verify and full, and not in the other six profiles", async () => {
    await put(TECH, tech("`shadcn/ui`"));
    for (const profile of ["sdd", "verify", "full"] as const) {
      expect((await findings(profile)).length, profile).toBe(1);
    }
    for (const profile of [
      "discussion",
      "prototyping",
      "atdd",
      "tdd",
      "drift",
      "saas-package",
    ] as const) {
      expect((await findings(profile)).length, profile).toBe(0);
    }
  });
});

describe("QFAI-STORY-021 stays quiet when a registry serves the catalogue", () => {
  // QFAI:AC-0001-0306-02
  // QFAI:EX-0001-0306-04
  it("raises nothing when uiux.registries holds a valid entry", async () => {
    await put(TECH, tech("`shadcn/ui`"));
    await put(
      "qfai.config.yaml",
      "uiux:\n  registries:\n    shadcn: https://ui.shadcn.com/r/{name}.json\n",
    );
    expect(await findings()).toEqual([]);
  });
});

describe("QFAI-STORY-021 reads only a row that names a catalogue", () => {
  // QFAI:AC-0001-0306-03
  // QFAI:EX-0001-0306-05
  it("raises nothing for the template placeholder, none, a none sentence or an empty cell", async () => {
    for (const cell of [
      "`<primary component catalogue, or none>`",
      "none",
      "`none`",
      "NONE",
      "None: the package is a command-line tool",
      "",
    ]) {
      await put(TECH, tech(cell));
      expect(await findings(), cell).toEqual([]);
    }
  });

  // QFAI:EX-0001-0306-06
  it("raises nothing with no tech.md, no Stack section or no Component catalogue row", async () => {
    expect(await findings()).toEqual([]);
    await put(TECH, "# Technology\n\n## Architecture\n\nNone.\n");
    expect(await findings()).toEqual([]);
    await put(
      TECH,
      "# Technology\n\n## Stack\n\n| Component | Choice |\n| --- | --- |\n| Runtime | `Node.js 22` |\n",
    );
    expect(await findings()).toEqual([]);
  });
});
