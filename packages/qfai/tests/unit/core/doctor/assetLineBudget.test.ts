// The shipped assistant assets carry a hard line ceiling. The number used to
// live only in `tests/helpers/skillBudget.ts`, which is not published, so a
// `qfai init` project had neither the number nor a tool that knew it. These
// cases pin the runtime owner of the ceiling and the `assets.lineBudget`
// doctor check that exposes it.

import type * as NodeFs from "node:fs";
import type * as NodeFsPromises from "node:fs/promises";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

/**
 * A read failure is injected rather than staged on disk: `chmod 000` has no
 * portable Windows equivalent, and deleting a path mid-walk is a race. Every
 * other path goes straight through to the real module.
 */
const UNREADABLE_ASSET = "qfai-unreadable-fixture.md";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();
  return {
    ...actual,
    createReadStream: (
      target: Parameters<typeof actual.createReadStream>[0],
      options?: Parameters<typeof actual.createReadStream>[1],
    ) => {
      if (String(target).endsWith(UNREADABLE_ASSET)) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return actual.createReadStream(target, options);
    },
  };
});

/**
 * Marker for a root whose assistant directory cannot be probed at all.
 *
 * `chmod 000` on a directory is not portable to Windows either, so the `access`
 * rejection is injected the same way the read failure is: by path marker, with
 * every other call going through to the real implementation.
 */
const UNPROBEABLE_ROOT = "qfai-unprobeable-";

/**
 * Marker for a root that answers `readdir` without entry types.
 *
 * NFS, some FUSE mounts and other network filesystems return `DT_UNKNOWN`, so
 * every `Dirent` predicate is false for ordinary files and directories alike.
 * No local filesystem reproduces that, so the type is stripped by marker — the
 * same injection style as the read and probe failures above.
 */
const UNTYPED_ROOT = "qfai-untyped-";

/** An entry inside an untyped root whose `lstat` also fails. */
const UNSTATTABLE_ASSET = "qfai-unstattable-fixture.md";

/**
 * Markers for the two directories `createDoctorData` walks *before* it reaches
 * `assets.lineBudget`.
 *
 * `diffProjectSkillsAgainstInitAssets` and `buildAgentFrontmatterCheck` both
 * ran their `readdir` unguarded, so one unreadable subdirectory rejected the
 * whole `qfai doctor` run — including the finding whose job is to report that
 * kind of damage.
 */
const UNLISTABLE_SKILL_DIR = "qfai-unlistable-skill";
const UNLISTABLE_AGENTS_ROOT = "qfai-unlistable-agents-";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsPromises>();
  return {
    ...actual,
    access: async (
      target: Parameters<typeof actual.access>[0],
      mode?: Parameters<typeof actual.access>[1],
    ) => {
      if (String(target).includes(UNPROBEABLE_ROOT)) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return actual.access(target, mode);
    },
    readdir: async (target: string, options?: { withFileTypes?: true }) => {
      const targetPath = String(target);
      if (
        targetPath.includes(UNLISTABLE_SKILL_DIR) ||
        (targetPath.includes(UNLISTABLE_AGENTS_ROOT) && targetPath.endsWith("agents"))
      ) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      if (options?.withFileTypes !== true) {
        return actual.readdir(target);
      }
      const entries = await actual.readdir(target, { withFileTypes: true });
      if (!String(target).includes(UNTYPED_ROOT)) {
        return entries;
      }
      return entries.map((entry) => ({
        name: entry.name,
        parentPath: target,
        path: target,
        isFile: () => false,
        isDirectory: () => false,
        isSymbolicLink: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      }));
    },
    lstat: async (target: string) => {
      if (String(target).endsWith(UNSTATTABLE_ASSET)) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return actual.lstat(target);
    },
  };
});

import { createDoctorData } from "../../../../src/core/doctor.js";
import {
  ASSISTANT_ASSET_MAX_LINES,
  LINE_BUDGET_EXEMPT,
  checkAssistantAssetLineBudget,
  countLines,
} from "../../../../src/core/doctor/assetLineBudget.js";

async function withTempRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-asset-budget-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withUntypedRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), UNTYPED_ROOT));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withUnprobeableRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), UNPROBEABLE_ROOT));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeAsset(root: string, relPath: string, lines: number): Promise<void> {
  const abs = path.join(root, ".qfai", "assistant", relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(
    abs,
    Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n"),
    "utf-8",
  );
}

describe("countLines", () => {
  it("counts with split(/\\r?\\n/) so blank and CRLF lines are not discounted", () => {
    expect(countLines("a\nb\nc")).toBe(3);
    expect(countLines("a\r\nb\r\nc")).toBe(3);
    // A trailing newline yields a final empty element — the same arithmetic the
    // asset test uses, so both agree on a file that ends with a newline.
    expect(countLines("a\n\n\n")).toBe(4);
  });
});

describe("checkAssistantAssetLineBudget", () => {
  it("exposes the ceiling as a runtime constant", () => {
    expect(ASSISTANT_ASSET_MAX_LINES).toBe(500);
  });

  it("reports a file over the ceiling with its measured line count", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 3);
      await writeAsset(root, "catalog/test-layers.md", 10);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("over_budget");
      expect(report.maxLines).toBe(ASSISTANT_ASSET_MAX_LINES);
      expect(report.scanned).toBe(2);
      expect(report.oversized).toEqual([
        { path: "assistant/skills/qfai-demo/SKILL.md", lines: ASSISTANT_ASSET_MAX_LINES + 3 },
      ]);
    });
  });

  it("passes when every asset is at or under the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "constitution/baseline.md", ASSISTANT_ASSET_MAX_LINES);
      await writeAsset(root, "manifest/skills.yml", 12);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("ok");
      expect(report.oversized).toEqual([]);
      expect(report.scanned).toBe(2);
    });
  });

  it("ignores files whose extension is not a shipped asset extension", async () => {
    await withTempRoot(async (root) => {
      const abs = path.join(root, ".qfai", "assistant", "catalog", "notes.txt");
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, "x\n".repeat(ASSISTANT_ASSET_MAX_LINES + 50), "utf-8");

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.scanned).toBe(0);
      expect(report.status).toBe("ok");
    });
  });

  it("honours the exemption list instead of reporting a generated file", async () => {
    await withTempRoot(async (root) => {
      const exemptRel = [...LINE_BUDGET_EXEMPT.keys()][0];
      expect(exemptRel).toBeDefined();
      const withinAssistant = exemptRel?.replace(/^assistant\//, "") ?? "";
      await writeAsset(root, withinAssistant, ASSISTANT_ASSET_MAX_LINES + 40);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("ok");
      expect(report.oversized).toEqual([]);
      // The baseline promises the reader sees *why* a file was skipped, so the
      // reason travels with the path rather than living only in the source.
      expect(report.exempt).toEqual([
        { path: exemptRel, reason: LINE_BUDGET_EXEMPT.get(exemptRel ?? "") },
      ]);
    });
  });

  it("does not treat an unreadable assistant directory as 'not created yet'", async () => {
    await withUnprobeableRoot(async (root) => {
      const report = await checkAssistantAssetLineBudget(root);

      // Answering EACCES with "run 'qfai init'" would certify a tree that was
      // never measured. Only ENOENT means the tree has not been created.
      expect(report.status).toBe("incomplete");
      expect(report.unscannable).toEqual(["assistant"]);
      expect(report.scanned).toBe(0);
    });
  });

  // POSIX-only: Windows rejects `\` in a filename, so the collision this guards
  // against cannot be staged there (and `path.sep === "\\"` keeps the old
  // collapse, which is correct on that platform).
  it.skipIf(path.sep === "\\")(
    "keeps a POSIX backslash in a filename out of the exemption match",
    async () => {
      await withTempRoot(async (root) => {
        const exemptRel = [...LINE_BUDGET_EXEMPT.keys()][0] ?? "";
        const withinAssistant = exemptRel.replace(/^assistant\//, "");
        const assistantDir = path.join(root, ".qfai", "assistant");
        await mkdir(assistantDir, { recursive: true });
        // One file, directly under assistant/, whose *name* contains the
        // separators of the exempt path. It is an authored asset, not the
        // generated catalog, so the ceiling still applies to it.
        await writeFile(
          path.join(assistantDir, withinAssistant.replace(/\//g, "\\")),
          "x\n".repeat(ASSISTANT_ASSET_MAX_LINES + 3),
          "utf-8",
        );

        const report = await checkAssistantAssetLineBudget(root);

        expect(report.exempt).toEqual([]);
        expect(report.oversized).toHaveLength(1);
      });
    },
  );

  it("measures assets under directories the default walker ignores", async () => {
    await withTempRoot(async (root) => {
      // `collectFiles` drops any directory named tmp/dist/node_modules; the
      // baseline promises every `.qfai/assistant/**` asset is measured.
      await writeAsset(
        root,
        "skills/qfai-demo/references/tmp/oversized.md",
        ASSISTANT_ASSET_MAX_LINES + 2,
      );

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("over_budget");
      expect(report.oversized).toEqual([
        {
          path: "assistant/skills/qfai-demo/references/tmp/oversized.md",
          lines: ASSISTANT_ASSET_MAX_LINES + 2,
        },
      ]);
    });
  });

  it("stats entries whose type readdir could not report instead of dropping them", async () => {
    await withUntypedRoot(async (root) => {
      // On a filesystem that answers DT_UNKNOWN, isFile()/isDirectory() are both
      // false for a plain directory and a plain file. Skipping those left whole
      // subtrees unmeasured while the report still said `ok`.
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 4);
      await writeAsset(root, "catalog/test-layers.md", 10);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("over_budget");
      expect(report.oversized).toEqual([
        {
          path: "assistant/skills/qfai-demo/SKILL.md",
          lines: ASSISTANT_ASSET_MAX_LINES + 4,
        },
      ]);
      expect(report.scanned).toBe(2);
      expect(report.unscannable).toEqual([]);
    });
  });

  it("records an entry whose type it cannot resolve instead of passing it silently", async () => {
    await withUntypedRoot(async (root) => {
      await writeAsset(root, "catalog/test-layers.md", 10);
      // Type unknown and the lstat that would settle it fails: the entry may be
      // a directory of oversized assets, so it counts as unmeasured.
      await writeAsset(root, `catalog/${UNSTATTABLE_ASSET}`, 10);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("incomplete");
      expect(report.unscannable).toEqual([`assistant/catalog/${UNSTATTABLE_ASSET}`]);
      expect(report.scanned).toBe(1);
    });
  });

  it("reports an unreadable asset as incomplete instead of compliant", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "catalog/test-layers.md", 10);
      // Stands in for the file that is locked, or is removed between the walk
      // and the read: a read failure must not report as "inside the ceiling".
      await writeAsset(root, `catalog/${UNREADABLE_ASSET}`, 10);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("incomplete");
      expect(report.unreadable).toEqual([`assistant/catalog/${UNREADABLE_ASSET}`]);
      expect(report.oversized).toEqual([]);
      expect(report.scanned).toBe(1);
    });
  });

  it("reports a directory it cannot list instead of rejecting the whole run", async () => {
    await withTempRoot(async (root) => {
      // A non-directory in the assistant slot makes readdir fail (ENOTDIR), the
      // same branch a locked or mid-scan-removed subdirectory takes. Doctor has
      // to keep reporting, so this is a finding rather than a thrown error.
      await mkdir(path.join(root, ".qfai"), { recursive: true });
      await writeFile(path.join(root, ".qfai", "assistant"), "not a directory\n", "utf-8");

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("incomplete");
      expect(report.unscannable).toEqual(["assistant"]);
      expect(report.scanned).toBe(0);
    });
  });

  it("skips cleanly when the assistant tree has not been created", async () => {
    await withTempRoot(async (root) => {
      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("skipped_missing_assistant");
      expect(report.scanned).toBe(0);
    });
  });
});

describe("doctor assets.lineBudget check", () => {
  it("still reports assets.lineBudget when the skills tree cannot be listed", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, `skills/${UNLISTABLE_SKILL_DIR}/SKILL.md`, 3);
      await writeAsset(root, "constitution/long-rule.md", ASSISTANT_ASSET_MAX_LINES + 2);

      // The skills diff runs first and used to reject, so the run produced no
      // diagnostics at all — not even the oversized asset below it.
      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      const integrity = data.checks.find((entry) => entry.id === "skills.integrity");
      expect(integrity?.severity).toBe("warning");
      expect(integrity?.message).toContain("Could not inspect skills");

      const budget = data.checks.find((entry) => entry.id === "assets.lineBudget");
      expect(budget?.severity).toBe("warning");
      expect(budget?.details?.["oversized"]).toEqual([
        { path: "assistant/constitution/long-rule.md", lines: ASSISTANT_ASSET_MAX_LINES + 2 },
      ]);
    });
  });

  it("still reports assets.lineBudget when the agents tree cannot be listed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), UNLISTABLE_AGENTS_ROOT));
    try {
      await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
      await writeAsset(root, "constitution/long-rule.md", ASSISTANT_ASSET_MAX_LINES + 5);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      const frontmatter = data.checks.find((entry) => entry.id === "agents.frontmatter");
      expect(frontmatter?.severity).toBe("warning");
      expect(frontmatter?.message).toContain("Could not enumerate the agent directory");

      const budget = data.checks.find((entry) => entry.id === "assets.lineBudget");
      expect(budget?.severity).toBe("warning");
      expect(budget?.details?.["oversized"]).toEqual([
        { path: "assistant/constitution/long-rule.md", lines: ASSISTANT_ASSET_MAX_LINES + 5 },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns with the ceiling and the offending files in details", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 1);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check).toBeDefined();
      expect(check?.severity).toBe("warning");
      expect(check?.message).toContain(String(ASSISTANT_ASSET_MAX_LINES));
      expect(check?.details?.["oversized"]).toEqual([
        { path: "assistant/skills/qfai-demo/SKILL.md", lines: ASSISTANT_ASSET_MAX_LINES + 1 },
      ]);
    });
  });

  it("names each oversized file and its line count in the message itself", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 1);
      await writeAsset(root, "constitution/long-rule.md", ASSISTANT_ASSET_MAX_LINES + 7);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");
      const message = check?.message ?? "";

      // The default `qfai doctor` run is the text formatter, which prints only
      // `message`; `details` is JSON-only. Both files, their measured counts and
      // the repair guidance must therefore survive into the message.
      expect(message).toContain(
        `assistant/skills/qfai-demo/SKILL.md (${ASSISTANT_ASSET_MAX_LINES + 1} lines)`,
      );
      expect(message).toContain(
        `assistant/constitution/long-rule.md (${ASSISTANT_ASSET_MAX_LINES + 7} lines)`,
      );
      expect(message).toContain("references/");
      expect(message).toContain("within its own layer");
      // One finding must stay one line so severity-grep readers are unaffected.
      expect(message).not.toContain("\n");
    });
  });

  it("keeps skill guidance off non-skill assets", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "constitution/long-rule.md", ASSISTANT_ASSET_MAX_LINES + 1);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");
      const nextActions = check?.details?.["nextActions"];

      expect(check?.severity).toBe("warning");
      expect(Array.isArray(nextActions)).toBe(true);
      // A constitution document must not be told to move under a skill's
      // references/ — that would break the loader contract that reads it.
      expect(JSON.stringify(nextActions)).not.toContain("references/");
      expect(JSON.stringify(nextActions)).toContain("within its own layer");
    });
  });

  it("still reports when an asset could not be read", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, `catalog/${UNREADABLE_ASSET}`, 10);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("warning");
      expect(check?.details?.["unreadable"]).toEqual([`assistant/catalog/${UNREADABLE_ASSET}`]);
      // Text readers need the unmeasured path too, not just its count.
      expect(check?.message).toContain(`assistant/catalog/${UNREADABLE_ASSET}`);
    });
  });

  it("states the exempt path and its reason in the default output, not only in JSON", async () => {
    await withTempRoot(async (root) => {
      const exemptRel = [...LINE_BUDGET_EXEMPT.keys()][0] ?? "";
      const reason = LINE_BUDGET_EXEMPT.get(exemptRel) ?? "";
      await writeAsset(root, exemptRel.replace(/^assistant\//, ""), ASSISTANT_ASSET_MAX_LINES + 40);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("ok");
      // Without this the counts speak only for what was measured, and a reader
      // cannot tell a compliant tree from one whose longest file is exempt.
      expect(check?.message).toContain(exemptRel);
      expect(check?.message).toContain(reason);
      expect(check?.details?.["exempt"]).toEqual([{ path: exemptRel, reason }]);
    });
  });

  // POSIX-only: Windows rejects a newline in a filename.
  it.skipIf(path.sep === "\\")(
    "escapes control characters in a path before rendering it into the message",
    async () => {
      await withTempRoot(async (root) => {
        const assistantDir = path.join(root, ".qfai", "assistant", "skills", "qfai-demo");
        await mkdir(assistantDir, { recursive: true });
        const hostileName = "over\n[ok] injected: not a real finding.md";
        await writeFile(
          path.join(assistantDir, hostileName),
          "x\n".repeat(ASSISTANT_ASSET_MAX_LINES + 1),
          "utf-8",
        );

        const data = await createDoctorData({ startDir: root, rootExplicit: true });
        const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

        expect(check?.severity).toBe("warning");
        // One finding stays one line, so the injected `[ok]` cannot pose as a
        // separate severity-prefixed line in `formatDoctorText` output.
        expect(check?.message).not.toContain("\n");
        expect(check?.message).toContain("over\\x0a[ok] injected");
        // `details` keeps the real path so tooling can still act on it.
        expect(check?.details?.["oversized"]).toEqual([
          {
            path: `assistant/skills/qfai-demo/${hostileName}`,
            lines: ASSISTANT_ASSET_MAX_LINES + 2,
          },
        ]);
      });
    },
  );

  it("is ok when the assistant tree is inside the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("ok");
    });
  });
});
