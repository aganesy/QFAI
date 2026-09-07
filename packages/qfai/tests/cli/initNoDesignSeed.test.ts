/**
 * `qfai init` writes no root `DESIGN.md`.
 *
 * It used to seed the shipped sample brand into every project root, and the
 * next `qfai validate` reported that file as an unreplaced seed
 * (`QFAI-DCON-034`). The tool created the condition it then reported, on a
 * project where the adopter had not yet had the chance to do anything wrong.
 *
 * The rest of the workflow already says the file should not be there yet.
 * `/qfai-discussion` emits the draft, and only when a classified surface is
 * `web`, `mobile`, `desktop` or `mixed` — a cli-only or non-UI pack authors no
 * root `DESIGN.md` at all. Seeding it put the file in every project, including
 * the ones that skill deliberately exempts.
 *
 * Removing the seed also removes the hazard the check exists for: an
 * unreplaced sample satisfies every content-agnostic gate, gets sha256-frozen
 * as the project's brand contract, and from then on prototyping enforces a
 * fictional identity. A file nobody wrote cannot be frozen.
 *
 * A project that does need one is still asked for it. `QFAI-DCON-030` reports
 * a missing root `DESIGN.md` once the project has UI contracts, which is the
 * point at which it genuinely owes one.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { validateSddDesignContractReadiness } from "../../src/core/validators/designContractReadiness.js";
import { loadConfig } from "../../src/core/config.js";

const roots: string[] = [];

async function freshInit(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
  roots.push(root);
  await runInit({ dir: root, force: false, dryRun: false, yes: true });
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("qfai init and root DESIGN.md", () => {
  it("writes no root DESIGN.md", async () => {
    const root = await freshInit();

    expect(existsSync(path.join(root, "DESIGN.md"))).toBe(false);
  });

  it("reports no unreplaced-sample finding on the tree it just wrote", async () => {
    // The finding this removes. Read through the validator rather than by
    // grepping output, so a rename of the code cannot make the case vacuous.
    const root = await freshInit();
    const { config } = await loadConfig(root);

    const findings = await validateSddDesignContractReadiness(root, config);

    expect(findings.filter((f) => f.code === "QFAI-DCON-034")).toEqual([]);
  });

  it("still ships the sample, where the remedy text sends an author", async () => {
    // The seed is gone, not the example. `QFAI-DCON-034`'s own suggested
    // action names this path, so it has to keep arriving.
    const root = await freshInit();

    expect(
      existsSync(
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-prototyping",
          "templates",
          "DESIGN.md.sample",
        ),
      ),
    ).toBe(true);
  });

  it("does not carry the sample in the shipped root asset tree", () => {
    // The init-time copy is what seeded it, so the asset itself must be gone —
    // otherwise a later change to the copy logic re-seeds it silently.
    expect(existsSync(path.join(getInitAssetsDir(), "root", "DESIGN.md"))).toBe(false);
  });

  it("leaves an existing root DESIGN.md alone", async () => {
    // Init has always been create-only for root files. A project that
    // authored one keeps it, and this change must not turn init into
    // something that deletes it.
    const root = await freshInit();
    const authored = path.join(root, "DESIGN.md");
    await writeFile(authored, '---\nbrand:\n  name: "Ours"\n---\n', "utf-8");

    await runInit({ dir: root, force: true, dryRun: false, yes: true });

    expect(existsSync(authored)).toBe(true);
  });
});
