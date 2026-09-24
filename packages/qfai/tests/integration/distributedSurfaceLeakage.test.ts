/**
 * Integration: distributed surface leakage smoke.
 *
 * Runs `qfai init` into a temp dir and asserts that the resulting
 * filesystem contains zero QFAI-internal spec IDs, internal version
 * markers, internal trace IDs, or schemaVersion fields.
 *
 * Complements scripts/check-no-internal-version-leakage.sh by checking
 * the *output* of init (post-template-copy), not just the source assets.
 *
 * SSOT note: the shared scan helper is one of THREE equivalent
 * expressions of the same forbidden class set:
 *   1. `packages/qfai/scripts/lint-shipping.ts` `src-comment` rules
 *      (JS RegExp, pre-build, `src/*.ts` JSDoc scan).
 *   2. `packages/qfai/scripts/check-no-internal-version-leakage.sh`
 *      (POSIX ERE, post-build `dist/` scan).
 *   3. `tests/helpers/distributedSurfaceScan.ts` (JS RegExp, smoke
 *      against `qfai init` output).
 *
 * Updating one requires updating all three in the same change. The guard
 * table in `.agents/rules/distributed-surface.md` lists the layers.
 *
 * The patterns are applied in two dimensions: to file CONTENT and to
 * file NAMES (`scanPathName` in the helper), because `qfai init` copies a path
 * component into the consuming project just as literally as a line.
 * Site 2 carries the same two dimensions.
 */
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import {
  STORY_ID_BOUNDARIES,
  STORY_ID_TRAILING_HYPHEN_BOUNDARIES,
  scanDistributedSurface,
} from "../helpers/distributedSurfaceScan.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-leakage-"));
  tempDirs.push(dir);
  return dir;
}

/** Repo-relative rule-master paths cited by the generated agent instructions. */
const RULE_REFERENCE_RE = /\.agents\/rules\/[A-Za-z0-9._-]+\.md/g;

async function scanSingleName(relative: string): Promise<string[]> {
  const root = await newTempDir();
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "clean body", "utf-8");
  return (await scanDistributedSurface(root)).nameHits
    .filter((hit) => hit.file === relative)
    .map((hit) => hit.className);
}

describe("distributed surface leakage smoke", () => {
  it.each(STORY_ID_BOUNDARIES)(
    "accepts %s and reports %s in a shipped file",
    async (sample, internal) => {
      expect(await scanSingleName(sample + ".md")).toEqual([]);
      expect(await scanSingleName(internal + ".md")).toEqual(["internal story id"]);
      const root = await newTempDir();
      const file = path.join(root, "notes.md");
      await writeFile(file, sample, "utf-8");
      expect((await scanDistributedSurface(root)).hits).toEqual([]);
      await writeFile(file, internal, "utf-8");
      const { hits } = await scanDistributedSurface(root);
      expect(hits).toEqual([
        { file: "notes.md", line: 1, match: internal, className: "internal story id" },
      ]);
    },
  );

  it.each(STORY_ID_TRAILING_HYPHEN_BOUNDARIES)(
    "accepts %s and reports %s at a path or line end",
    async (sample, internal) => {
      expect(await scanSingleName(sample)).toEqual([]);
      expect(await scanSingleName(internal)).toEqual(["internal story id"]);
      const root = await newTempDir();
      const file = path.join(root, "notes.md");
      await writeFile(file, sample, "utf-8");
      expect((await scanDistributedSurface(root)).hits).toEqual([]);
      await writeFile(file, internal, "utf-8");
      expect((await scanDistributedSurface(root)).hits.map((hit) => hit.className)).toEqual([
        "internal story id",
      ]);
    },
  );

  it("keeps legacy composite decisions and questions in their existing class", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "notes.md"), "DEC-0010-0001 OQ-0010-0001", "utf-8");
    const { hits } = await scanDistributedSurface(root);
    expect(hits.map((hit) => hit.className)).toEqual([
      "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    ]);
  });

  it("qfai init output contains no internal IDs or version markers", async () => {
    const tmpDir = await newTempDir();
    await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

    const { hits, nameHits, visitedRelative, scannedRelative } =
      await scanDistributedSurface(tmpDir);
    if (hits.length > 0) {
      const report = hits
        .slice(0, 30)
        .map((h) => `  [${h.className}] ${h.file}:${h.line} -> ${h.match}`)
        .join("\n");
      throw new Error(
        `Distributed surface leakage detected in qfai init output (${hits.length} hits):\n${report}\n\n` +
          "Fix: remove the internal identifier from the originating asset under packages/qfai/assets/init/.",
      );
    }
    expect(hits).toEqual([]);

    if (nameHits.length > 0) {
      const report = nameHits
        .slice(0, 30)
        .map((h) => `  [${h.className}] ${h.file}`)
        .join("\n");
      throw new Error(
        `Distributed surface leakage detected in qfai init FILE NAMES (${nameHits.length} hits):\n${report}\n\n` +
          "Fix: rename the originating asset under packages/qfai/assets/init/ so the identifier is not part of its path.",
      );
    }
    expect(nameHits).toEqual([]);

    // TC-1.5.1: the brand sample must be in the walked file list (guard
    // against accidental rename / exclusion). It ships as the prototyping
    // template rather than at the project root: `qfai init` writes no root
    // DESIGN.md, because `/qfai-discussion` emits one and only for a
    // visual-prototyping surface.
    expect(visitedRelative).toContain(
      path.join(".qfai", "assistant", "skill", "qfai-prototyping", "templates", "DESIGN.md.sample"),
    );

    // The walk must actually reach the symlinked wrappers, or the name pass
    // above proves nothing about the names `syncIntegrationWrappers` mints.
    // Directories have to be in the list too: an empty one is otherwise
    // reachable by no path at all.
    const walked = new Set(visitedRelative.map((entry) => entry.split(path.sep).join("/")));
    expect(walked).toContain(".qfai/assistant/skill");
    const symlinked = [...walked].filter((entry) =>
      /^\.(claude|codex|github|agents)\/skills\//.test(entry),
    );
    expect(
      symlinked.length,
      "the walk must reach the skill wrappers init creates as symlinks",
    ).toBeGreaterThan(0);

    // The MCP server templates the `web-research` skill ships are TOML — a text
    // format the init payload did not carry until they moved into it, and one
    // this pass would have walked past unread. A shipped text file the content
    // scan skips is a distributed surface with no guard over it, and the shell
    // guard greps the tree with no extension filter at all, so the two layers
    // would have disagreed about what they cover with nothing saying so.
    //
    // Pinned on the SCANNED list rather than the walked one: walking a file
    // proves nothing about whether its bytes were read, which is the whole
    // distinction `isScannableTextFile` draws.
    expect(
      scannedRelative.filter((rel) => rel.endsWith(".toml")),
      "the init payload ships .toml, so the content scan has to open it",
    ).not.toEqual([]);
  });

  it.each([
    ["CAP-0009", []],
    ["CAP-0999", ["internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)"]],
    ["CAP-1000", ["internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)"]],
  ])("reads %s as a capability ID only from CAP-0010 up", async (id, classes) => {
    expect(await scanSingleName(path.join(".qfai", String(id) + "-notes.md"))).toEqual(classes);
  });

  // The walk above only proves that today's tree happens to be clean —
  // which is exactly the state a content-only scan also reported. Pin the
  // name matcher itself on synthetic paths so the dimension stays alive.
  it("name pass flags path-borne tokens and honours the migration-memo exemption", async () => {
    expect(await scanSingleName(path.join(".qfai", "assistant", "notes-v2.0-draft.md"))).toEqual([
      "internal version marker",
    ]);
    expect(await scanSingleName(path.join(".qfai", "specs", "spec-0042-notes.md"))).toEqual([
      "internal spec id (spec-0010+)",
    ]);
    expect(await scanSingleName(path.join(".qfai", "DR-0007", "notes.md"))).toEqual([
      "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    ]);

    const memoDir = path.join(".qfai", "assistant", "process", "migrations");
    expect(await scanSingleName(path.join(memoDir, "v1.4.27-atdd-alignment.md"))).toEqual([]);
    // The exemption is scoped to the version class only.
    expect(await scanSingleName(path.join(memoDir, "spec-0042-recut.md"))).toEqual([
      "internal spec id (spec-0010+)",
    ]);
    // ...and to the sanctioned name shape only: a file that merely sits in
    // the memo directory, a nested directory, or the same fragment in
    // another tree all keep the version scan.
    expect(await scanSingleName(path.join(memoDir, "notes-v2.0-draft.md"))).toEqual([
      "internal version marker",
    ]);
    expect(await scanSingleName(path.join(memoDir, "drafts-v2.0", "clean.md"))).toEqual([
      "internal version marker",
    ]);
    expect(
      await scanSingleName(
        path.join("docs", "assistant", "process", "migrations", "v2.0.0-notes.md"),
      ),
    ).toEqual(["internal version marker"]);
    expect(
      await scanSingleName(path.join(".qfai", "assistant", "steering", "test-layers.md")),
    ).toEqual([]);
  });

  // TC-1.5.2: standalone DESIGN.md sample scan against every forbidden pattern.
  it("the DESIGN.md sample alone has zero forbidden matches", async () => {
    const designMdPath = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "skill",
      "qfai-prototyping",
      "templates",
      "DESIGN.md.sample",
    );
    const content = await readFile(designMdPath, "utf-8");
    const root = await newTempDir();
    await writeFile(path.join(root, "DESIGN.md"), content, "utf-8");
    const { hits, scannedRelative } = await scanDistributedSurface(root);
    expect(scannedRelative).toContain("DESIGN.md");
    expect(hits).toEqual([]);
  });

  // The generated agent instruction files declare `.agents/rules/**` the
  // cross-AI SSOT. A consumer project has no other source for those files, so
  // every path they name must exist in the tree `qfai init` just produced —
  // otherwise the rules named as authoritative are unreadable by construction.
  it("every .agents/rules path cited by the generated instructions resolves", async () => {
    const tmpDir = await newTempDir();
    await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

    // Every entry point an agent loads on its own: Codex reads `AGENTS.md`,
    // Claude Code reads `CLAUDE.md`, Copilot reads its instructions file.
    const citingFiles = ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"];
    const missing: string[] = [];

    for (const citing of citingFiles) {
      const citingPath = path.join(tmpDir, ...citing.split("/"));
      const content = await readFile(citingPath, "utf-8").catch(() => null);
      expect(content, `qfai init did not create ${citing}`).not.toBeNull();
      const cited = new Set(content?.match(RULE_REFERENCE_RE) ?? []);
      expect(cited.size, `${citing} cites no .agents/rules path`).toBeGreaterThan(0);
      for (const rulePath of cited) {
        const stats = await stat(path.join(tmpDir, ...rulePath.split("/"))).catch(() => null);
        if (!stats?.isFile()) {
          missing.push(`${citing} -> ${rulePath}`);
        }
      }
    }

    expect(
      missing,
      `dangling .agents/rules references in qfai init output:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
