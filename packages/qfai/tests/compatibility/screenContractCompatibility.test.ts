import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateScreenContractSchema } from "../../src/core/validators/uix/screenContract.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-compat-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("compatibility: screen contract CSV acceptance", () => {
  it("accepts legacy inline CSV nested fields while canonical format stays nested bullets", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(
      path.join(root, "uiux", "40_contracts.md"),
      [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "",
        "- screen_id: dashboard",
        "- route: /dashboard",
        "- purpose: Review current status",
        "- actor: end-user",
        "- primary_tasks: Start evaluation, Review status",
        "- required_states: default, loading, empty, error",
        "- transitions: empty -> loading, loading -> default, loading -> error, error -> loading",
        "- observable_outcomes: Summary appears, Retry remains visible",
        "- notes_for_verify: Validate backward compatibility only",
        "- notes_for_reviewer: Canonical authoring should use nested bullets",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
