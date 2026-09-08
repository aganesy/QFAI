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
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  LINE_BUDGET_EXEMPT,
  checkAssistantAssetLineBudget,
  countLines,
  widestMeasurableLine,
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

/** Writes a file verbatim, for cases where the line SHAPE is the subject. */
async function writeRawAsset(root: string, relPath: string, lines: string[]): Promise<void> {
  const abs = path.join(root, ".qfai", "assistant", relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, lines.join("\n"), "utf-8");
}

/** A prose line of exactly `width` characters. */
const wide = (width: number): string => "w".repeat(width);

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
    expect(ASSISTANT_ASSET_MAX_LINES).toBe(800);
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
describe("widestMeasurableLine", () => {
  it("measures characters, not bytes", () => {
    // These assets carry em dashes and Japanese. A byte count would report a
    // compliant line as three times its width and fail it for its alphabet.
    expect(widestMeasurableLine("日本語のテキスト")).toBe(8);
    expect(widestMeasurableLine("a — b")).toBe(5);
  });

  it("does not count a carriage return as content", () => {
    // `countLines` splits on `/\r?\n/`, so a CRLF file has the same lines as
    // its LF twin. Counting the `\r` would make each one a character wider.
    expect(widestMeasurableLine("abcd\r\nef")).toBe(4);
  });

  it("skips a table row, which markdown gives no continuation", () => {
    const row = `| ${wide(500)} | b |`;
    expect(widestMeasurableLine(["| a | b |", "| --- | --- |", row].join("\n"))).toBe(0);
  });

  it("skips a table written without leading pipes", () => {
    // The leading pipe is optional in markdown. Keying the exemption on it
    // measured the rows of a table that omits it, which is a defect with no fix:
    // the row still cannot wrap.
    const row = `${wide(500)} | b`;
    expect(widestMeasurableLine(["a | b", "--- | ---", row].join("\n"))).toBe(0);
  });

  it("measures prose that merely starts with a pipe", () => {
    // The other direction of the same defect: a leading pipe was an exemption
    // any line could claim, which is a way around the ceiling.
    expect(widestMeasurableLine(`| ${wide(500)}`)).toBe(502);
  });

  it("measures pipe-carrying lines a blank line cut off from their table", () => {
    // A blank line ends a table, so what follows renders as a paragraph however
    // much it looks like rows. Treating it as a table would exempt prose.
    expect(
      widestMeasurableLine(["| a | b |", "| --- | --- |", "", `| ${wide(500)} |`].join("\n")),
    ).toBe(504);
  });

  it("skips a fenced block, whose content is verbatim", () => {
    expect(widestMeasurableLine(["```sh", wide(500), "```"].join("\n"))).toBe(0);
  });

  it("resumes measuring after the fence closes", () => {
    // A fence that never re-opened the measurement would hide every line below
    // the first code sample in the file.
    expect(widestMeasurableLine(["```sh", wide(500), "```", wide(120)].join("\n"))).toBe(120);
  });

  it("does not let a shorter marker close a longer fence", () => {
    // A four-backtick block legally quotes a three-backtick sample. Toggling on
    // any fence line ends it there, and every verbatim line after reads as
    // prose — which is a false report on content nobody can wrap.
    const doc = ["````md", "```sh", wide(500), "```", "````", wide(120)].join("\n");
    expect(widestMeasurableLine(doc)).toBe(120);
  });

  it("does not let a different marker close a fence", () => {
    expect(widestMeasurableLine(["```sh", "~~~", wide(500), "```", wide(90)].join("\n"))).toBe(90);
  });

  it("counts a code point once, however many code units it takes", () => {
    // `String.prototype.length` counts UTF-16 units, so an emoji reads as two.
    // Both measuring paths route through one counter; a file that failed one
    // ceiling and passed the other would make two guards disagree on one rule.
    expect(widestMeasurableLine("😀".repeat(300))).toBe(300);
  });

  it("measures a list item, an ordered item and a paragraph", () => {
    // The three shapes the packing produces, and the ones that can be wrapped.
    expect(widestMeasurableLine(`- ${wide(300)}`)).toBe(302);
    expect(widestMeasurableLine(`1. ${wide(300)}`)).toBe(303);
    expect(widestMeasurableLine(wide(300))).toBe(300);
  });
});

describe("assets.lineBudget width ceiling", () => {
  it("reports a file whose prose line is wider than the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeRawAsset(root, "skills/qfai-demo/SKILL.md", [
        "# Demo",
        `- ${wide(ASSISTANT_ASSET_MAX_LINE_CHARS)}`,
      ]);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("over_budget");
      expect(report.wideLines).toEqual([
        {
          path: "assistant/skills/qfai-demo/SKILL.md",
          widest: ASSISTANT_ASSET_MAX_LINE_CHARS + 2,
          allowed: ASSISTANT_ASSET_MAX_LINE_CHARS,
        },
      ]);
      // The count is untouched: a two-line file is not over the line ceiling,
      // and reporting it as such would make the two budgets indistinguishable.
      expect(report.oversized).toEqual([]);
    });
  });

  it("passes a file exactly at the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeRawAsset(root, "skills/qfai-demo/SKILL.md", [
        wide(ASSISTANT_ASSET_MAX_LINE_CHARS),
      ]);

      const report = await checkAssistantAssetLineBudget(root);
      expect(report.wideLines).toEqual([]);
      expect(report.status).toBe("ok");
    });
  });

  it("does not fail a wide table row or a wide fenced block", async () => {
    await withTempRoot(async (root) => {
      await writeRawAsset(root, "skills/qfai-demo/SKILL.md", [
        // A real table: the delimiter row is what makes the rows above and
        // below it rows, so the fixture has to carry one.
        "| head | other |",
        "| ---- | ----- |",
        `| ${wide(1200)} | x |`,
        "",
        "```sh",
        wide(1200),
        "```",
      ]);

      const report = await checkAssistantAssetLineBudget(root);
      expect(report.wideLines).toEqual([]);
    });
  });

  it("names the width a file was held to, in the doctor message", async () => {
    await withTempRoot(async (root) => {
      await writeRawAsset(root, "skills/qfai-demo/SKILL.md", [wide(900)]);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("warning");
      expect(check?.message).toContain(`900 > ${ASSISTANT_ASSET_MAX_LINE_CHARS} chars`);
    });
  });

  it("measures width on a file exempt from the line ceiling", async () => {
    // The exemption's stated reason is about a roster's LENGTH — one entry per
    // agent, nothing to move out. None of that is about how wide a line may be,
    // and a file excused from both would be the one place this rule cannot see.
    await withTempRoot(async (root) => {
      const [exemptPath] = [...LINE_BUDGET_EXEMPT.keys()];
      const relative = (exemptPath ?? "").replace(/^assistant\//, "");
      await writeRawAsset(root, relative, [wide(900)]);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.exempt.map((entry) => entry.path)).toEqual([exemptPath]);
      expect(report.wideLines).toEqual([
        { path: exemptPath, widest: 900, allowed: ASSISTANT_ASSET_MAX_LINE_CHARS },
      ]);
    });
  });

  it("leaves an exempt file's line count unreported however long it is", async () => {
    await withTempRoot(async (root) => {
      const [exemptPath] = [...LINE_BUDGET_EXEMPT.keys()];
      const relative = (exemptPath ?? "").replace(/^assistant\//, "");
      await writeAsset(root, relative, ASSISTANT_ASSET_MAX_LINES + 50);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.oversized).toEqual([]);
      expect(report.wideLines).toEqual([]);
    });
  });

  it("asks for a wrap on a width overrun, not for a split", async () => {
    // A two-line file can fail the width ceiling. Telling its author to move a
    // topic into `references/` asks for a structural change that would not fix
    // it: what the width ceiling wants is the line wrapped.
    await withTempRoot(async (root) => {
      await writeRawAsset(root, "skills/qfai-demo/SKILL.md", ["# Demo", wide(500)]);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");
      const actions = check?.details?.["nextActions"];

      expect(JSON.stringify(actions)).toContain("wrap the over-wide prose");
      expect(JSON.stringify(actions)).not.toContain("move one topic out");
    });
  });

  it("says both ceilings when the tree is clean", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", 10);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("ok");
      expect(check?.message).toContain(`${ASSISTANT_ASSET_MAX_LINE_CHARS} characters per line`);
    });
  });
});
