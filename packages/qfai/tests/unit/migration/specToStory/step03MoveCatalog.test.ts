import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { getInitAssetsDir } from "../../../../src/shared/assets.js";
import { defaultConfig } from "../../../../src/core/config.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import { step03 } from "../../../../src/migration/specToStory/step03MoveCatalog.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-catalog-"));
  roots.push(root);
  const specsDir = path.join(root, ".qfai", "spec");
  const contractsDir = path.join(specsDir, "03_contract");
  await mkdir(contractsDir, { recursive: true });
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf8");
  return { root, specsDir, contractsDir, config: structuredClone(defaultConfig) };
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function run(context: MigrationContext): Promise<{ code: number; output: string }> {
  let output = "";
  const code = await executePlannedStep(step03, context, false, {
    stdout: {
      write: (value) => {
        output += value;
      },
    },
    stderr: {
      write: (value) => {
        throw new Error(value);
      },
    },
  });
  return { code, output };
}

describe("migration catalog move", () => {
  it("routes whole sections and keeps the standard commands section", async () => {
    // QFAI:EX-0004-0006-02
    // QFAI:EX-0004-0006-04
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# Old\n\n## Objective\n\nShared paragraph.\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/product.md",
      "# Product\n\n## Who is the user?\n\nUser marker.\n\n## Milestones\n\nMilestone marker.\n\n## Pricing notes\n\nPrice marker.\n\n## What is success?\n\nShared paragraph.\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/tech.md",
      "# Tech\n\n## Standard commands (copy-paste)\n\n- Test: run test\n",
    );
    await put(
      context.root,
      ".qfai/spec/03_contract/tech.md",
      "# Technology\n\n## Standard commands (copy-paste)\n\n- Test: run test\n",
    );
    await run(context);
    const objective = await readFile(
      path.join(context.specsDir, "01_policy", "objective.md"),
      "utf8",
    );
    const initiative = await readFile(
      path.join(context.specsDir, "01_policy", "initiative.md"),
      "utf8",
    );
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(objective).toContain("## Who is the user?\n\nUser marker.");
    expect(objective).toContain("## Pricing notes\n\nPrice marker.");
    expect(objective.match(/Shared paragraph\./g)).toHaveLength(1);
    expect(initiative).toContain("## Milestones\n\nMilestone marker.");
    expect(tech).toContain("## Standard commands (copy-paste)\n\n- Test: run test");
    expect(tech.match(/- Test: run test/g)).toHaveLength(1);
  });

  it("archives the full legacy slice policy without restoring obsolete rules", async () => {
    // QFAI:EX-0004-0006-03
    const context = await fixture();
    const original =
      "# Slice\n\n## Principle (read first)\n\nOld CAP/spec rule.\n\n## Triage オペレーション (8 種)\n\nOld TC rule.\n\n## Project choice\n\nSpecific.\n";
    await put(context.root, ".qfai/spec/_policies/11_Slice-Policy.md", original);
    const first = await run(context);
    expect(first.code).toBe(0);
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/_policies/11_Slice-Policy.md",
        ),
        "utf8",
      ),
    ).toBe(original);
    await expect(
      readFile(path.join(context.specsDir, "01_policy", "principle.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("leaves the policy directory for step 4 while capability and flow sources remain", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/spec/_policies/01_Objective.md", "# Objective\n");
    await put(context.root, ".qfai/spec/_policies/03_Capabilities.md", "# Capabilities\n");
    await put(context.root, ".qfai/spec/_policies/04_Business-Flow.md", "# Flow\n");

    const first = await run(context);
    expect(first.code).toBe(0);
    expect(first.output).not.toContain(".qfai/spec/_policies: remove empty directory");
    expect(
      await readFile(path.join(context.specsDir, "_policies", "03_Capabilities.md"), "utf8"),
    ).toBe("# Capabilities\n");
    expect(
      await readFile(path.join(context.specsDir, "_policies", "04_Business-Flow.md"), "utf8"),
    ).toBe("# Flow\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/_policies/01_Objective.md",
        ),
        "utf8",
      ),
    ).toBe("# Objective\n");

    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("archives abolished directories and moves only overlays with a rule master", async () => {
    // QFAI:EX-0004-0006-06
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/drift-protocol.md", "# Rule\n");
    await put(context.root, ".qfai/assistant/constitution/drift-protocol.local.md", "local rule\n");
    await put(context.root, ".qfai/assistant/catalog/house-notes.local.md", "local notes\n");
    await put(context.root, ".qfai/assistant/process/unused.md", "process\n");
    const first = await run(context);
    expect(first.code).toBe(3);
    expect(first.output).toContain("house-notes.local.md");
    expect(first.output).toContain("no rule master or the overlay destination exists");
    expect(
      await readFile(
        path.join(context.root, ".qfai/assistant/rule/drift-protocol.local.md"),
        "utf8",
      ),
    ).toBe("local rule\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/assistant/catalog/house-notes.local.md",
        ),
        "utf8",
      ),
    ).toBe("local notes\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/assistant/process/unused.md",
        ),
        "utf8",
      ),
    ).toBe("process\n");
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("keeps both files when an archive destination already exists", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/assistant/process/unused.md", "new source\n");
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/retired/assistant/process/unused.md",
      "older archive\n",
    );
    await run(context);
    const archive = path.join(
      context.root,
      ".qfai/evidence/migration-spec-to-story/retired/assistant/process",
    );
    expect(await readFile(path.join(archive, "unused.md"), "utf8")).toBe("older archive\n");
    expect(await readFile(path.join(archive, "unused.md-1"), "utf8")).toBe("new source\n");
  });

  it("writes only manifest entries that differ from built-in defaults", async () => {
    // QFAI:EX-0004-0006-05
    const context = await fixture();
    const defaultsDir = path.resolve(getInitAssetsDir(), "..", "defaults");
    const defaults = parseYaml(
      await readFile(path.join(defaultsDir, "agent-routing.yml"), "utf8"),
    ) as {
      routing: Array<Record<string, unknown>>;
    };
    expect(defaults.routing.length).toBeGreaterThanOrEqual(2);
    const unchanged = defaults.routing[0];
    const changed = { ...defaults.routing[1], review_profile: "migration-test" };
    await put(
      context.root,
      ".qfai/assistant/manifest/agent-routing.yml",
      stringifyYaml({ routing: [unchanged, changed] }),
    );
    await put(
      context.root,
      ".qfai/assistant/manifest/review-profiles.yml",
      await readFile(path.join(defaultsDir, "review-profiles.yml"), "utf8"),
    );
    await run(context);
    const config = parseYaml(
      await readFile(path.join(context.root, "qfai.config.yaml"), "utf8"),
    ) as {
      routing?: Array<Record<string, unknown>>;
      reviewProfiles?: Record<string, unknown>;
    };
    expect(config.routing).toEqual([changed]);
    expect(config.reviewProfiles).toBeUndefined();
  });
});
