/**
 * `prototyping refreeze` — re-take the frozen DESIGN.md hash after a
 * prose-only edit, and refuse an edit that changed a token.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingRefreeze } from "../../src/cli/commands/prototypingRefreeze.js";
import {
  hashDesignMd,
  hashDesignMdTokens,
  parseDesignMd,
} from "../../src/core/design/designMd.js";
import * as logger from "../../src/core/logger.js";

const FRONT_MATTER = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
].join("\n");

const FROZEN_DESIGN_MD = `${FRONT_MATTER}\n\n# Brand Philosophy\n\nRestrained, calm, sobre.\n`;
const PROSE_EDIT = `${FRONT_MATTER}\n\n# Brand Philosophy\n\nRestrained, calm, sober.\n`;
const TOKEN_EDIT = PROSE_EDIT.replace('primary:        "#1F2937"', 'primary:        "#000000"');

const PROTO_REL = path.join(".qfai", "evidence", "prototyping", "prototyping.json");
const dirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function tokensOf(text: string): string {
  const parsed = parseDesignMd(text);
  if ("error" in parsed) throw new Error(parsed.error.message);
  return hashDesignMdTokens(parsed.data);
}

/** A loop frozen on `FROZEN_DESIGN_MD` at cycle 3, with `live` on disk. */
async function frozenLoop(live: string, withTokens = true): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-refreeze-"));
  dirs.push(root);
  await mkdir(path.dirname(path.join(root, PROTO_REL)), { recursive: true });
  const designMd: Record<string, string> = {
    path: "DESIGN.md",
    sha256: hashDesignMd(FROZEN_DESIGN_MD),
  };
  if (withTokens) designMd.tokensSha256 = tokensOf(FROZEN_DESIGN_MD);
  await writeFile(
    path.join(root, PROTO_REL),
    `${JSON.stringify({ cycle: 3, runId: "run-1", designMd }, null, 2)}\n`,
    "utf-8",
  );
  await writeFile(path.join(root, "DESIGN.md"), live, "utf-8");
  return root;
}

async function readRecord(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, PROTO_REL), "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("prototyping.json is not an object");
  }
  return Object.fromEntries(Object.entries(parsed));
}

describe("hashDesignMdTokens", () => {
  it("ignores the prose body and the front-matter layout, and follows a token", () => {
    expect(tokensOf(PROSE_EDIT)).toBe(tokensOf(FROZEN_DESIGN_MD));
    expect(tokensOf(PROSE_EDIT.replace("primary:        ", "primary: "))).toBe(
      tokensOf(FROZEN_DESIGN_MD),
    );
    expect(tokensOf(TOKEN_EDIT)).not.toBe(tokensOf(FROZEN_DESIGN_MD));
  });
});

describe("runPrototypingRefreeze", () => {
  // QFAI:AC-0001-0112-02
  // QFAI:EX-0001-0112-05
  it("re-takes the byte hash after a prose-only edit and logs the change", async () => {
    vi.spyOn(logger, "info").mockImplementation(() => {});
    const root = await frozenLoop(PROSE_EDIT);

    expect(await runPrototypingRefreeze({ root, dryRun: false })).toBe(0);

    const record = await readRecord(root);
    expect(record.designMd).toEqual({
      path: "DESIGN.md",
      sha256: hashDesignMd(PROSE_EDIT),
      tokensSha256: tokensOf(FROZEN_DESIGN_MD),
    });
    expect(record.cycle).toBe(3);
    expect(record.designMdRefreezeLog).toEqual([
      expect.objectContaining({
        from: hashDesignMd(FROZEN_DESIGN_MD),
        to: hashDesignMd(PROSE_EDIT),
        cycle: 3,
      }),
    ]);
  });

  // QFAI:EX-0001-0112-05
  it("writes nothing under --dry-run", async () => {
    vi.spyOn(logger, "info").mockImplementation(() => {});
    const root = await frozenLoop(PROSE_EDIT);
    const before = await readFile(path.join(root, PROTO_REL), "utf-8");

    expect(await runPrototypingRefreeze({ root, dryRun: true })).toBe(0);

    expect(await readFile(path.join(root, PROTO_REL), "utf-8")).toBe(before);
  });

  // QFAI:EX-0001-0112-06
  it("refuses a token edit with exit 2 and changes nothing", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const root = await frozenLoop(TOKEN_EDIT);
    const before = await readFile(path.join(root, PROTO_REL), "utf-8");

    expect(await runPrototypingRefreeze({ root, dryRun: false })).toBe(2);

    expect(await readFile(path.join(root, PROTO_REL), "utf-8")).toBe(before);
    expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).toMatch(
      /tokens changed since cycle 0.*Re-run prototyping from cycle 0/,
    );
  });

  // QFAI:EX-0001-0112-06
  it("refuses a loop frozen without a token hash", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const root = await frozenLoop(PROSE_EDIT, false);
    const before = await readFile(path.join(root, PROTO_REL), "utf-8");

    expect(await runPrototypingRefreeze({ root, dryRun: false })).toBe(2);

    expect(await readFile(path.join(root, PROTO_REL), "utf-8")).toBe(before);
    expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).toContain(
      "records no tokensSha256",
    );
  });
});
