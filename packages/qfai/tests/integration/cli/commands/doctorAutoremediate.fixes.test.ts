// QFAI:SPEC-0006:TC-0006-0021
//
// Integration: `qfai doctor --autoremediate --yes` orchestrates three
// remediations: install missing runtimeDependencies, archive stale
// review packs (--clean behavior), and write missing default-keyed
// config fields. The npm install side effect is routed through a test
// runner so the test never touches the network.

import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-autoremediate-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --autoremediate fixes install + clean + config", () => {
  it("invokes install runner for missing deps, archives stale packs, writes default-keyed config fields", async () => {
    const root = await newTempDir("fixes");

    // Seed skill manifest with one declared runtime dep, none installed.
    const manifestDir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );

    // Seed a stale review pack.
    const oldTs = "20260401120000222";
    const oldDir = path.join(root, ".qfai", "review", `review-${oldTs}`);
    await mkdir(oldDir, { recursive: true });
    const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldDir, mtime, mtime);

    // Seed minimal qfai.config.yaml WITHOUT a `review:` section (default-keyed gap).
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "# user-authored\npaths:\n  specsDir: .qfai/specs\n", "utf-8");

    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
        // Simulate the install by seeding the package dir.
        await mkdir(path.join(root, "node_modules", name), { recursive: true });
      },
    });

    expect(summary.disabledInCi).toBe(false);
    // (1) install ran.
    expect(installCalls).toEqual(["playwright"]);
    expect(summary.installed).toContain("playwright");
    // (2) stale pack moved to _archive/.
    expect(await fileExists(oldDir)).toBe(false);
    expect(
      await fileExists(path.join(root, ".qfai", "review", "_archive", `review-${oldTs}`)),
    ).toBe(true);
    expect(summary.archived).toContain(`review-${oldTs}`);
    // (3) default-keyed `review:` was appended; user-authored content preserved.
    const updated = await readFile(configPath, "utf-8");
    expect(updated).toContain("# user-authored");
    expect(updated).toContain("specsDir: .qfai/specs");
    expect(updated).toMatch(/review:\s*\n\s*staleTtlDays:\s*14/u);
    expect(summary.configFieldsWritten).toContain("review");
  });

  it("previews the legacy-pack record against the post-archive set, as the live run sees it", async () => {
    // A TTL-expired pack with no `revision_form` is archived by phase (2) before
    // phase (4) enumerates the top level, so a live run records nothing. The
    // dry-run moves no directory, so without the same exclusion it counted the
    // pack and promised `.legacy-packs` + `summary.json` writes the live run
    // would never make. Both paths must answer 0.
    const seed = async (label: string): Promise<string> => {
      const root = await newTempDir(label);
      const staleTs = "20260401120000333";
      const packDir = path.join(root, ".qfai", "review", `review-${staleTs}`);
      await mkdir(packDir, { recursive: true });
      // No `revision_form` — this is exactly what the migration records.
      await writeFile(
        path.join(packDir, "summary.json"),
        JSON.stringify({ verdict: "pass" }, null, 2),
        "utf-8",
      );
      const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await utimes(packDir, mtime, mtime);
      return root;
    };

    const dryRoot = await seed("legacy-dry");
    const dry = await runAutoremediate({ root: dryRoot, dryRun: true, yes: true, isCi: false });

    const liveRoot = await seed("legacy-live");
    const live = await runAutoremediate({ root: liveRoot, dryRun: false, yes: true, isCi: false });

    expect(live.archived).toHaveLength(1);
    expect(dry.archived).toEqual(live.archived);
    expect(live.legacyPacksRecorded).toEqual([]);
    expect(dry.legacyPacksRecorded).toEqual([]);
    expect(dry.lines).toContain("autoremediate: would record legacy review packs=0 (dry-run)");
    // The preview promised no manifest, and the live run wrote none.
    expect(await fileExists(path.join(liveRoot, ".qfai", "review", ".legacy-packs"))).toBe(false);
    expect(await fileExists(path.join(dryRoot, ".qfai", "review", ".legacy-packs"))).toBe(false);
  });

  it("previews the config-fill against the parsed document, as the live run sees it", async () => {
    // The dry-run branch skipped `tryFillConfigDefaults` entirely and printed a
    // fixed `would fill default-keyed config fields` line, so the preview
    // promised an append for a config that already declares `review:` (live
    // run: writes nothing) and for one that is not a parseable mapping (live
    // run: `skipped config-fill`). An operator reading the plan saw a change
    // that was neither needed nor possible.
    const seed = async (label: string, source: string): Promise<string> => {
      const root = await newTempDir(label);
      await writeFile(path.join(root, "qfai.config.yaml"), source, "utf-8");
      return root;
    };
    const preview = async (root: string): Promise<string> => {
      const summary = await runAutoremediate({
        root,
        dryRun: true,
        yes: true,
        isCi: false,
        skipInstall: true,
      });
      expect(summary.configFieldsWritten).toEqual([]);
      return summary.lines.join("\n");
    };

    // (a) Key already present: nothing to fill, so nothing may be promised.
    const presentSource = "review:\n  staleTtlDays: 30\n";
    const presentRoot = await seed("preview-present", presentSource);
    const presentLines = await preview(presentRoot);
    expect(presentLines).not.toContain("would fill default-keyed config fields");
    expect(presentLines).toContain("config-fill not needed, default-keyed fields present");
    // ...and the live run on the same input indeed writes nothing.
    const presentLive = await runAutoremediate({
      root: await seed("live-present", presentSource),
      dryRun: false,
      yes: true,
      isCi: false,
      skipInstall: true,
    });
    expect(presentLive.configFieldsWritten).toEqual([]);
    expect(presentLive.lines.join("\n")).not.toContain("wrote default-keyed fields");

    // (b) Unparseable document: the preview must decline exactly as live does.
    const brokenRoot = await seed(
      "preview-unparseable",
      "paths:\n  specsDir: .qfai/specs\n : : :\n",
    );
    const brokenLines = await preview(brokenRoot);
    expect(brokenLines).not.toContain("would fill default-keyed config fields");
    expect(brokenLines).toContain("skipped config-fill");
    expect(await readFile(path.join(brokenRoot, "qfai.config.yaml"), "utf-8")).toContain(" : : :");

    // (c) Over-correction pin: a genuinely missing field must STILL be
    // previewed, and now by name rather than as a blanket claim.
    const gapRoot = await seed("preview-gap", "paths:\n  specsDir: .qfai/specs\n");
    const gapLines = await preview(gapRoot);
    expect(gapLines).toContain("autoremediate: would fill default-keyed config fields: review");
    expect(await readFile(path.join(gapRoot, "qfai.config.yaml"), "utf-8")).not.toContain(
      "staleTtlDays",
    );
  });

  it("does NOT overwrite a user-authored review.staleTtlDays value", async () => {
    const root = await newTempDir("no-overwrite");
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "review:\n  staleTtlDays: 30\n", "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skipInstall: true,
    });

    const updated = await readFile(configPath, "utf-8");
    expect(updated).toContain("staleTtlDays: 30");
    expect(summary.configFieldsWritten).not.toContain("review");
  });

  it("recognises a quoted top-level `review` key and leaves the user value alone", async () => {
    // `"review":` is valid YAML for the same key. Deciding presence with a raw
    // `^review:` text match called it absent and appended a SECOND `review:`
    // block — a duplicate key that either invalidates the file or, on a
    // last-wins reader, replaces the operator's 30 with the default 14. The
    // guarantee "user-authored values are never overwritten" only holds if
    // presence is read off the parsed document.
    const root = await newTempDir("quoted-key");
    const configPath = path.join(root, "qfai.config.yaml");
    const original = '"review":\n  staleTtlDays: 30\n';
    await writeFile(configPath, original, "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skipInstall: true,
    });

    expect(summary.configFieldsWritten).not.toContain("review");
    const updated = await readFile(configPath, "utf-8");
    expect(updated).toBe(original);
    expect(updated).not.toContain("staleTtlDays: 14");
  });

  it("declines to append to a qfai.config.yaml that is not a parseable mapping", async () => {
    // Appending `review:` to a document that does not parse cannot be made
    // safe; report the skip instead of compounding the damage.
    const root = await newTempDir("unparseable");
    const configPath = path.join(root, "qfai.config.yaml");
    const original = "paths:\n  specsDir: .qfai/specs\n : : :\n";
    await writeFile(configPath, original, "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skipInstall: true,
    });

    expect(summary.configFieldsWritten).toEqual([]);
    expect(await readFile(configPath, "utf-8")).toBe(original);
    expect(summary.lines.join("\n")).toContain("skipped config-fill");
  });

  // Regression: "runtimeDependencies — all installed" is an affirmative
  // claim. It must not be printed for a skill whose manifest was never
  // located (a typo'd `--profile`, a renamed skill).
  it("says the manifest was not found instead of 'all installed' for an unresolvable skill", async () => {
    const root = await newTempDir("absent-manifest");

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "no-such-skill",
    });

    expect(summary.lines.join("\n")).not.toContain("runtimeDependencies — all installed");
    const line = summary.lines.find((entry) => entry.includes("runtimeDependencies"));
    expect(line).toBeDefined();
    expect(line).toMatch(/manifest not found/u);
    expect(line).toMatch(/no-such-skill/u);
  });

  // A skill "directory" that is really a regular file is a corrupted
  // tree, not a skill nobody authored a manifest for. Reporting it as
  // "not found" would send the user chasing a --profile typo.
  it("says the manifest is unreadable when the skill directory is a regular file", async () => {
    const root = await newTempDir("skilldir-file");
    const skillsRoot = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(skillsRoot, { recursive: true });
    await writeFile(path.join(skillsRoot, "qfai-prototyping"), "not a directory", "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "qfai-prototyping",
    });

    expect(summary.lines.join("\n")).not.toContain("runtimeDependencies — all installed");
    const line = summary.lines.find((entry) => entry.includes("runtimeDependencies"));
    expect(line).toBeDefined();
    expect(line).toMatch(/unreadable/u);
    expect(line).not.toMatch(/not found/u);
  });

  it("still says 'all installed' when a real manifest declares zero deps", async () => {
    const root = await newTempDir("zero-deps");
    const manifestDir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: [] }, null, 2),
      "utf-8",
    );

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "qfai-prototyping",
    });

    expect(summary.lines).toContain("autoremediate: runtimeDependencies — all installed");
  });
});
