/**
 * The post-handoff writer produces `design-system.yaml` from the frozen root
 * `DESIGN.md`. Every oracle here reads the file the writer left on disk and
 * compares it with the front matter parsed independently of the writer.
 */

// QFAI:SPEC-0012:TC-0012-0335

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { writeDesignSystemMirror } from "../../src/core/prototyping/designSystemMirror.js";

const CONTRACTS_DIR = path.join(".qfai", "contracts");

const COLORS = [
  "  colors:",
  '    primary: "#1F2937"',
  '    secondary: "#6366F1"',
  '    accent: "#D97706"',
  '    surface: "#FFFFFF"',
  '    surface_muted: "#F3F4F6"',
  '    text: "#111827"',
  '    text_muted: "#6B7280"',
  '    danger: "#DC2626"',
  '    warning: "#F59E0B"',
  '    success: "#10B981"',
  '    border: "#E5E7EB"',
  '    overlay: "rgba(0,0,0,0.5)"',
];

const FAMILIES = [
  "  typography:",
  '    family_sans: "Inter, system-ui, sans-serif"',
  '    family_display: "Inter Tight, Inter, system-ui, sans-serif"',
  '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
];

const RADIUS_AND_SHADOW = [
  "  radius:",
  '    sm: "0.25rem"',
  '    md: "0.5rem"',
  '    lg: "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
];

const FULL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  '  theme: "Acme UI"',
  "visual:",
  ...COLORS,
  ...FAMILIES,
  '    scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem" }',
  "    weight: { regular: 400, medium: 500, bold: 700 }",
  "  spacing:",
  '    base: "0.25rem"',
  "    scale: [0, 1, 2, 4, 8]",
  ...RADIUS_AND_SHADOW,
  "---",
  "",
  "# Brand",
  "",
].join("\n");

const MINIMAL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  ...COLORS,
  ...FAMILIES,
  ...RADIUS_AND_SHADOW,
  "---",
  "",
].join("\n");

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-output-"));
  await mkdir(path.join(root, CONTRACTS_DIR, "design"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function freeze(designMd: string, lockedText: string = designMd): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), designMd, "utf-8");
  await writeFile(
    path.join(root, CONTRACTS_DIR, "design", "DESIGN.md.lock.yaml"),
    `designMdSha256: "${sha256(lockedText)}"\n`,
    "utf-8",
  );
}

function mirrorPath(): string {
  return path.join(root, CONTRACTS_DIR, "design", "design-system.yaml");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

function frontMatter(designMd: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(designMd);
  return asRecord(parseYaml(match?.[1] ?? ""));
}

async function readMirror(): Promise<Record<string, unknown>> {
  return asRecord(parseYaml(await readFile(mirrorPath(), "utf-8")));
}

function visual(doc: Record<string, unknown>, key: string): unknown {
  return asRecord(doc.visual)[key];
}

describe("post-handoff design-system.yaml writer", () => {
  it("TC-0012-0335: the written mirror holds exactly the DESIGN.md tokens in colors, typography, radius and shadow", async () => {
    await freeze(FULL_DESIGN_MD);

    const result = await writeDesignSystemMirror(root, CONTRACTS_DIR);

    expect(result).toEqual({ ok: true, path: mirrorPath() });
    const mirror = await readMirror();
    const source = frontMatter(FULL_DESIGN_MD);
    for (const key of ["colors", "typography", "radius", "shadow"]) {
      expect(visual(mirror, key), key).toStrictEqual(visual(source, key));
    }
    expect(mirror.source).toBe("DESIGN.md");
    expect(mirror.designMdSha256).toBe(sha256(FULL_DESIGN_MD));
  });

  it("copies optional sections only when DESIGN.md authors them", async () => {
    await freeze(FULL_DESIGN_MD);
    await writeDesignSystemMirror(root, CONTRACTS_DIR);
    const full = await readMirror();
    expect(full.brand).toStrictEqual({ theme: "Acme UI" });
    expect(visual(full, "spacing")).toStrictEqual({ base: "0.25rem", scale: [0, 1, 2, 4, 8] });

    await freeze(MINIMAL_DESIGN_MD);
    await writeDesignSystemMirror(root, CONTRACTS_DIR);
    const minimal = await readMirror();
    expect(minimal.brand).toBeUndefined();
    expect(visual(minimal, "spacing")).toBeUndefined();
    expect(visual(minimal, "typography")).toStrictEqual(
      visual(frontMatter(MINIMAL_DESIGN_MD), "typography"),
    );
  });

  it("writes the same bytes on every run", async () => {
    await freeze(FULL_DESIGN_MD);
    await writeDesignSystemMirror(root, CONTRACTS_DIR);
    const first = await readFile(mirrorPath(), "utf-8");
    await writeDesignSystemMirror(root, CONTRACTS_DIR);
    expect(await readFile(mirrorPath(), "utf-8")).toBe(first);
  });

  it("refuses without writing when DESIGN.md changed after the freeze", async () => {
    await freeze(FULL_DESIGN_MD, MINIMAL_DESIGN_MD);

    const result = await writeDesignSystemMirror(root, CONTRACTS_DIR);

    expect(result.ok).toBe(false);
    await expect(readFile(mirrorPath(), "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses without writing when the frozen DESIGN.md does not parse", async () => {
    await freeze("no front matter\n");

    const result = await writeDesignSystemMirror(root, CONTRACTS_DIR);

    expect(result.ok).toBe(false);
    await expect(readFile(mirrorPath(), "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses without writing when the lock carries no digest", async () => {
    await freeze(FULL_DESIGN_MD);
    await writeFile(
      path.join(root, CONTRACTS_DIR, "design", "DESIGN.md.lock.yaml"),
      "{}\n",
      "utf-8",
    );

    const result = await writeDesignSystemMirror(root, CONTRACTS_DIR);

    expect(result.ok).toBe(false);
    await expect(readFile(mirrorPath(), "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
