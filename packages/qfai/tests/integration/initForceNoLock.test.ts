/**
 * Integration: `qfai init --force` overwrites what it regenerates whether or not
 * the project edited it, keeps no record of what it wrote, and leaves the
 * project's own files alone; `qfai init` lists what an earlier release left and
 * deletes none of it.
 */
import { access, link, lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-force-");

/** A local edit that keeps the file valid: a YAML comment, or an HTML comment in Markdown. */
const editFor = (file: string): string =>
  file.endsWith(".yaml") ? "\n# A local edit.\n" : "\n<!-- A local edit. -->\n";

async function init(dir: string, force = false): Promise<string> {
  return captureStdout(() => runInit({ dir, force, dryRun: false, yes: true }));
}

async function exists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function append(file: string): Promise<string> {
  const edited = `${await readFile(file, "utf-8")}${editFor(file)}`;
  await writeFile(file, edited, "utf-8");
  return edited;
}

const shippedAssistant = (relative: string): string =>
  path.join(getInitAssetsDir(), ".qfai", "assistant", ...relative.split("/"));

const shippedMaster = (name: string): string =>
  path.join(getInitAssetsDir(), "root", ".agents", "rules", name);

describe("init --force overwrites the regenerated assets", () => {
  // QFAI:EX-0001-0022-02
  // QFAI:EX-0001-0038-04
  it("restores an edited rule and skill, writes no lock and leaves the project's files alone", async () => {
    const dir = await newTempDir();
    await init(dir);
    const rule = "rule/constitution.md";
    const skill = "skill/qfai-sdd/SKILL.md";
    for (const relative of [rule, skill]) {
      await append(path.join(dir, ".qfai", "assistant", ...relative.split("/")));
    }
    const kept = new Map<string, string>();
    await writeFile(path.join(dir, "DESIGN.md"), "# Our design\n", "utf-8");
    kept.set("DESIGN.md", "# Our design\n");
    for (const file of [
      "qfai.config.yaml",
      "AGENTS.md",
      "CLAUDE.md",
      ".qfai/spec/decisions.md",
      ".qfai/spec/03_contract/tech.md",
    ]) {
      kept.set(file, await append(path.join(dir, ...file.split("/"))));
    }

    await init(dir, true);

    for (const relative of [rule, skill]) {
      expect(
        await readFile(path.join(dir, ".qfai", "assistant", ...relative.split("/")), "utf-8"),
        relative,
      ).toBe(await readFile(shippedAssistant(relative), "utf-8"));
    }
    expect(await exists(path.join(dir, ".qfai", "assistant", ".assets.lock.json"))).toBe(false);
    for (const [file, text] of kept) {
      expect(await readFile(path.join(dir, ...file.split("/")), "utf-8"), file).toBe(text);
    }
  });

  // QFAI:EX-0001-0022-03
  it("restores an edited rule master", async () => {
    const dir = await newTempDir();
    await init(dir);
    const master = path.join(dir, ".agents", "rules", "minimal-implementation.md");
    await append(master);

    await init(dir, true);

    expect(await readFile(master, "utf-8")).toBe(
      await readFile(shippedMaster("minimal-implementation.md"), "utf-8"),
    );
  });
});

describe("init --force never writes through a link", () => {
  // QFAI:EX-0001-0022-02
  it("replaces a linked rule file as an entry and leaves its target alone", async () => {
    const dir = await newTempDir();
    const outside = await newTempDir();
    await init(dir);
    const target = path.join(outside, "constitution.md");
    await writeFile(target, "outside\n", "utf-8");
    const rule = path.join(dir, ".qfai", "assistant", "rule", "constitution.md");
    await rm(rule);
    try {
      await symlink(target, rule, "file");
    } catch {
      return; // A host without symlink permission cannot exercise this case.
    }

    await init(dir, true);

    expect(await readFile(target, "utf-8")).toBe("outside\n");
    expect((await lstat(rule)).isSymbolicLink()).toBe(false);
    expect(await readFile(rule, "utf-8")).toBe(
      await readFile(shippedAssistant("rule/constitution.md"), "utf-8"),
    );
  });

  // QFAI:EX-0001-0022-03
  it("replaces a hard-linked rule master as an entry and leaves its other name alone", async () => {
    const dir = await newTempDir();
    const outside = await newTempDir();
    await init(dir);
    const master = path.join(dir, ".agents", "rules", "minimal-implementation.md");
    const other = path.join(outside, "minimal-implementation.md");
    await writeFile(other, "outside\n", "utf-8");
    await rm(master);
    await link(other, master);

    await init(dir, true);

    expect(await readFile(other, "utf-8")).toBe("outside\n");
    expect(await readFile(master, "utf-8")).toBe(
      await readFile(shippedMaster("minimal-implementation.md"), "utf-8"),
    );
  });

  // QFAI:EX-0001-0022-03
  it("writes nothing under a linked rule directory that points outside the project", async () => {
    const dir = await newTempDir();
    const outside = await newTempDir();
    await init(dir);
    for (const linked of [
      [".agents", "rules"],
      [".qfai", "assistant", "rule"],
    ]) {
      const at = path.join(dir, ...linked);
      const elsewhere = path.join(outside, linked.join("-"));
      await mkdir(elsewhere, { recursive: true });
      await writeFile(path.join(elsewhere, "constitution.md"), "outside\n", "utf-8");
      await writeFile(path.join(elsewhere, "minimal-implementation.md"), "outside\n", "utf-8");
      await rm(at, { recursive: true });
      await symlink(elsewhere, at, "junction");
    }

    const output = await init(dir, true);

    for (const linked of [".agents-rules", ".qfai-assistant-rule"]) {
      for (const name of ["constitution.md", "minimal-implementation.md"]) {
        expect(await readFile(path.join(outside, linked, name), "utf-8"), name).toBe("outside\n");
      }
    }
    expect(output).toContain("was not written: an entry above it is a symbolic link");
  });
});

describe("plain init leaves the rule masters create-only", () => {
  // QFAI:EX-0001-0021-11
  it("keeps an edited master, writes a missing one and keeps no record", async () => {
    const dir = await newTempDir();
    await init(dir);
    const rules = path.join(dir, ".agents", "rules");
    const edited = await append(path.join(rules, "minimal-implementation.md"));
    await rm(path.join(rules, "user-questions.md"));

    await init(dir);

    expect(await readFile(path.join(rules, "minimal-implementation.md"), "utf-8")).toBe(edited);
    expect(await readFile(path.join(rules, "user-questions.md"), "utf-8")).toBe(
      await readFile(shippedMaster("user-questions.md"), "utf-8"),
    );
    expect(await exists(path.join(rules, ".qfai-rules.lock.json"))).toBe(false);
  });
});

describe("init lists what an earlier release left and deletes none of it", () => {
  const LEFT = [
    ".qfai/evidence/",
    ".qfai/review/",
    ".qfai/assistant/.assets.lock.json",
    ".qfai/install-provenance.json",
    ".qfai/run/",
  ];
  const PACK = ["12_OQ-Resolution-Log.md", "13_Deferred.md", "14_Review-Request.md", "99_delta.md"];

  async function seed(dir: string, relative: string): Promise<void> {
    const target = path.join(dir, ...relative.split("/"));
    if (relative.endsWith("/")) {
      await mkdir(target, { recursive: true });
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "{}\n", "utf-8");
    }
  }

  // QFAI:AC-0001-0227-01
  // QFAI:EX-0001-0227-01
  // QFAI:EX-0001-0227-02
  it("lists the leftover paths and the retired discussion-pack files, and keeps them", async () => {
    const dir = await newTempDir();
    const pack = ".qfai/discussion/discussion-20260101000000000";
    const files = [...LEFT, ...PACK.map((name) => `${pack}/${name}`)];
    for (const relative of files) await seed(dir, relative);

    const output = await init(dir);

    for (const relative of files) {
      expect(output, relative).toContain(`  ${relative}\n`);
      expect(await exists(path.join(dir, ...relative.split("/"))), relative).toBe(true);
    }
  });

  // QFAI:AC-0001-0227-02
  // QFAI:EX-0001-0227-03
  it("names the migration archive on its own line and keeps it", async () => {
    const dir = await newTempDir();
    const archive = ".qfai/evidence/migration-spec-to-story/";
    await seed(dir, archive);

    const output = await init(dir);

    const line = output.split("\n").find((entry) => entry.startsWith(archive));
    expect(line).toContain("may hold the only copy of content the 1.x migration retired");
    expect(line).toContain("you decide whether to delete it");
    expect(await exists(path.join(dir, ...archive.split("/")))).toBe(true);
  });

  // QFAI:AC-0001-0227-03
  // QFAI:EX-0001-0227-04
  it("prints no leftover line when none is present", async () => {
    const output = await init(await newTempDir());

    expect(output).not.toContain("Left by an earlier release");
    expect(output).not.toContain("migration-spec-to-story");
  });
});
