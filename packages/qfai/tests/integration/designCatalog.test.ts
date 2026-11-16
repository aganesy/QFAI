/**
 * Acceptance of the design catalogue: `qfai catalog design` run through the CLI entry, and its
 * warnings read through `validateProject`, over a project whose root holds the shipped sample
 * `DESIGN.md`.
 */

import { mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const roots: string[] = [];
const TOKENS = ".qfai/catalog/design.tokens.json";
const THEME = ".qfai/catalog/theme.css";
const ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");
const SAMPLE = path.join(ASSISTANT, "skill", "qfai-prototyping", "templates", "DESIGN.md.sample");

afterEach(async () => {
  vi.restoreAllMocks();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project selecting `src/**`, with the shipped sample as its `DESIGN.md` unless one is given. */
async function projectWith(files: Readonly<Record<string, string | null>> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-design-catalog-at-"));
  roots.push(root);
  const all: Record<string, string | null> = {
    "qfai.config.yaml": 'uiux:\n  surfacePaths: ["src/**"]\n',
    "DESIGN.md": await readFile(SAMPLE, "utf-8"),
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    if (content === null) continue;
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

/** Rewrites the token file as a formatter might: four-space indents and short arrays on one line. */
async function rewrapTokens(root: string): Promise<void> {
  const file = path.join(root, ...TOKENS.split("/"));
  const value: unknown = JSON.parse(await readFile(file, "utf-8"));
  const rewrapped = JSON.stringify(value, null, 4).replace(
    /\[\s+([^[\]{}]*?)\s+\]/g,
    (_whole, items: string) => `[${items.replace(/,\s+/g, ", ")}]`,
  );
  await writeFile(file, `${rewrapped}\n`, "utf-8");
}

/** Runs the CLI and returns its exit code with what it wrote to each stream. */
async function cli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(args, process.cwd());
    return { code: Number(process.exitCode ?? 0), out: out.join(""), err: err.join("") };
  } finally {
    process.exitCode = previous;
    vi.restoreAllMocks();
  }
}

const readAt = (root: string, relative: string): Promise<string> =>
  readFile(path.join(root, ...relative.split("/")), "utf-8");

async function exists(root: string, relative: string): Promise<boolean> {
  return stat(path.join(root, ...relative.split("/"))).then(
    () => true,
    () => false,
  );
}

async function changePrimary(root: string): Promise<void> {
  const text = await readAt(root, "DESIGN.md");
  await writeFile(path.join(root, "DESIGN.md"), text.replace('"#1F2937"', '"#202938"'), "utf-8");
}

async function dcat(root: string, profile: ValidationProfile = "prototyping"): Promise<Issue[]> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.filter((found) => found.code.startsWith("QFAI-DCAT-"));
}

// QFAI:AC-0001-0312-01
describe("the command writes the token file and the theme from DESIGN.md", () => {
  // QFAI:EX-0001-0312-01
  it("writes both files byte-stably and prints one summary line", async () => {
    const root = await projectWith();
    const first = await cli(["catalog", "design", "--root", root]);
    expect(first).toMatchObject({
      code: 0,
      out: "Wrote .qfai/catalog/design.tokens.json and .qfai/catalog/theme.css: 61 token(s) from DESIGN.md.\n",
    });
    const tokens = await readAt(root, TOKENS);
    const theme = await readAt(root, THEME);
    expect(JSON.parse(tokens)).toMatchObject({
      color: { primary: { $type: "color", $value: { hex: "#1f2937" } } },
    });
    expect(theme).toContain("  --color-primary: #1F2937;\n");
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    expect(await readAt(root, TOKENS)).toBe(tokens);
    expect(await readAt(root, THEME)).toBe(theme);
  });

  // QFAI:EX-0001-0312-01
  it("leaves both files as they were when one of them cannot be written", async () => {
    const root = await projectWith();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readAt(root, TOKENS);
    await changePrimary(root);
    await unlink(path.join(root, ...THEME.split("/")));
    await mkdir(path.join(root, ...THEME.split("/")));
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toContain("both files are as they were");
    expect(await readAt(root, TOKENS)).toBe(tokens);
    const catalogDir = path.join(root, ".qfai", "catalog");
    expect((await readdir(catalogDir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  // QFAI:EX-0001-0312-01
  it("moves a replaced file back when a later file of the pair cannot be replaced", async () => {
    const root = await projectWith();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(path.join(root, ...TOKENS.split("/")));
    const theme = await readFile(path.join(root, ...THEME.split("/")));
    await changePrimary(root);
    // A directory where the theme would be moved aside makes that rename fail after the token
    // file has already been replaced.
    const blocker = `${path.join(root, ...THEME.split("/"))}.${process.pid}.old`;
    await mkdir(path.join(blocker, "keep"), { recursive: true });
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(await readFile(path.join(root, ...TOKENS.split("/")))).toEqual(tokens);
    expect(await readFile(path.join(root, ...THEME.split("/")))).toEqual(theme);
    const left = (await readdir(path.join(root, ".qfai", "catalog"))).sort();
    expect(left).toEqual(["design.tokens.json", "theme.css", path.basename(blocker)].sort());
  });
});

// QFAI:AC-0001-0312-02
describe("layout and data display values reach the token file when DESIGN.md states them", () => {
  // QFAI:EX-0001-0312-03
  it("writes the layout tokens and theme properties, and refuses a value outside the schema", async () => {
    const sample = await readFile(SAMPLE, "utf-8");
    const sections = ["data_display:", '  locale: "ja-JP"', "accessibility:"].join("\n");
    const root = await projectWith({ "DESIGN.md": sample.replace("accessibility:", sections) });
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    expect(JSON.parse(await readAt(root, TOKENS))).toMatchObject({
      layout: {
        breakpoint: { sm: { $type: "dimension", $value: { value: 40, unit: "rem" } } },
        "content-max-width": { app: { $type: "dimension", $value: { value: 80, unit: "rem" } } },
        "target-min": { $value: { value: 44, unit: "px" } },
      },
      "data-display": { $extensions: { "dev.qfai": { locale: "ja-JP" } } },
    });
    const theme = await readAt(root, THEME);
    expect(theme).toContain("  --breakpoint-sm: 40rem;\n");
    expect(theme).toContain("  --container-app: 80rem;\n");
    expect(theme).toContain("  --spacing-target-min: 44px;\n");

    // QFAI:EX-0001-0312-04
    const invalid = await projectWith({
      "DESIGN.md": sample.replace("target_min_px: 44", "target_min_px: 20"),
    });
    const refused = await cli(["catalog", "design", "--root", invalid]);
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("visual.layout.target_min_px");
    const injected = await projectWith({
      "DESIGN.md": sample.replace(/family_sans: .*$/m, 'family_sans: "Inter; } body { color: red"'),
    });
    const blocked = await cli(["catalog", "design", "--root", injected]);
    expect(blocked.code).toBe(1);
    expect(blocked.err).toContain("visual.typography.family_sans");
    const shadowed = await projectWith({
      "DESIGN.md": sample.replace(
        /^(\s*sm: )"0 1px 2px [^"]*"/m,
        '$1"0 1px 2px #0a0a0a; } body { background: url(https://x/t) } @theme {"',
      ),
    });
    const shadowBlocked = await cli(["catalog", "design", "--root", shadowed]);
    expect(shadowBlocked.code).toBe(1);
    expect(shadowBlocked.err).toContain("visual.shadow.sm");
    expect(await exists(shadowed, THEME)).toBe(false);
  });
});

// QFAI:AC-0001-0312-03
describe("the check mode compares and writes nothing", () => {
  // QFAI:EX-0001-0312-05
  it("passes on current files, ignores line ends, and names each stale or missing file", async () => {
    const root = await projectWith();
    await cli(["catalog", "design", "--root", root]);
    expect((await cli(["catalog", "design", "--check", "--root", root])).code).toBe(0);
    const themeFile = path.join(root, ...THEME.split("/"));
    await writeFile(themeFile, (await readAt(root, THEME)).replace(/\n/g, "\r\n"), "utf-8");
    expect((await cli(["catalog", "design", "--check", "--root", root])).code).toBe(0);

    await changePrimary(root);
    const before = await readAt(root, TOKENS);
    const stale = await cli(["catalog", "design", "--check", "--root", root]);
    expect(stale.code).toBe(1);
    expect(stale.err.trim().split("\n")).toEqual([
      ".qfai/catalog/design.tokens.json is out of date with DESIGN.md. Run `qfai catalog design` and commit it.",
      ".qfai/catalog/theme.css is out of date with DESIGN.md. Run `qfai catalog design` and commit it.",
    ]);
    expect(await readAt(root, TOKENS)).toBe(before);

    await cli(["catalog", "design", "--root", root]);
    await unlink(path.join(root, ...TOKENS.split("/")));
    const missing = await cli(["catalog", "design", "--check", "--root", root]);
    expect(missing.code).toBe(1);
    expect(missing.err).toBe(
      ".qfai/catalog/design.tokens.json does not exist. Run `qfai catalog design` and commit it.\n",
    );
  });

  // QFAI:EX-0001-0312-14
  it("reads the token file as JSON, so a formatter's rewrapping keeps it up to date", async () => {
    const root = await projectWith();
    await cli(["catalog", "design", "--root", root]);
    await rewrapTokens(root);
    expect((await cli(["catalog", "design", "--check", "--root", root])).code).toBe(0);
  });
});

// QFAI:AC-0001-0312-04
describe("no DESIGN.md, or one that does not parse, writes nothing", () => {
  // QFAI:EX-0001-0312-06
  it("exits 1 with one line and writes neither file", async () => {
    const absent = await projectWith({ "DESIGN.md": null });
    for (const args of [[], ["--check"]]) {
      const result = await cli(["catalog", "design", ...args, "--root", absent]);
      expect(result.code).toBe(1);
      expect(result.err).toContain("DESIGN.md does not exist at the project root");
      expect(result.err.trim().split("\n")).toHaveLength(1);
    }
    const invalid = await projectWith({
      "DESIGN.md": (await readFile(SAMPLE, "utf-8")).replace("archetype: tech", "archetype: loud"),
    });
    const result = await cli(["catalog", "design", "--root", invalid]);
    expect(result.code).toBe(1);
    expect(result.err).toContain("DESIGN.md does not parse:");
    for (const root of [absent, invalid]) {
      expect(await exists(root, TOKENS)).toBe(false);
      expect(await exists(root, THEME)).toBe(false);
    }
  });

  // QFAI:EX-0001-0312-13
  it("prints one line for a YAML syntax error", async () => {
    const sample = await readFile(SAMPLE, "utf-8");
    const broken = await projectWith({
      "DESIGN.md": sample.replace("archetype: tech", "archetype: [tech"),
    });
    const result = await cli(["catalog", "design", "--root", broken]);
    expect(result.code).toBe(1);
    expect(result.err).toContain("DESIGN.md does not parse:");
    expect(result.err.trim().split("\n")).toHaveLength(1);
    expect(await exists(broken, TOKENS)).toBe(false);
    expect(await exists(broken, THEME)).toBe(false);
  });
});

// QFAI:AC-0001-0312-05
describe("a design catalogue out of date with DESIGN.md is a warning", () => {
  // QFAI:EX-0001-0312-07
  it("warns about a stale or missing file and asks nothing of a project without one", async () => {
    const root = await projectWith();
    await cli(["catalog", "design", "--root", root]);
    expect(await dcat(root)).toEqual([]);

    await changePrimary(root);
    const stale = await dcat(root);
    expect(stale.map((found) => [found.code, found.severity, found.file])).toEqual([
      ["QFAI-DCAT-001", "warning", TOKENS],
      ["QFAI-DCAT-002", "warning", THEME],
    ]);
    for (const found of stale) expect(found.suggested_action).toContain("qfai catalog design");

    await cli(["catalog", "design", "--root", root]);
    await unlink(path.join(root, ...THEME.split("/")));
    const missing = await dcat(root);
    expect(missing.map((found) => found.code)).toEqual(["QFAI-DCAT-002"]);
    expect(missing[0]?.message).toContain("does not exist");

    await cli(["catalog", "design", "--root", root]);
    await unlink(path.join(root, "DESIGN.md"));
    await unlink(path.join(root, ...TOKENS.split("/")));
    const orphan = await dcat(root);
    expect(orphan.map((found) => [found.code, found.file])).toEqual([
      ["QFAI-DCAT-001", TOKENS],
      ["QFAI-DCAT-002", THEME],
    ]);
    expect(orphan[0]?.message).toContain("does not exist");
    expect(orphan[1]?.message).toContain("DESIGN.md");

    expect(await dcat(await projectWith())).toEqual([]);
  });

  // QFAI:EX-0001-0312-15
  it("raises no QFAI-DCAT-001 for a token file a formatter rewrapped", async () => {
    const root = await projectWith();
    await cli(["catalog", "design", "--root", root]);
    await rewrapTokens(root);
    expect(await dcat(root)).toEqual([]);
  });

  // QFAI:EX-0001-0312-08
  it("runs in the prototyping, saas-package, verify and full profiles only", async () => {
    const root = await projectWith();
    await cli(["catalog", "design", "--root", root]);
    await changePrimary(root);
    const loud: ValidationProfile[] = ["prototyping", "saas-package", "verify", "full"];
    const silent: ValidationProfile[] = ["discussion", "sdd", "atdd", "tdd", "drift"];
    for (const profile of loud) {
      expect((await dcat(root, profile)).map((found) => found.code)).toContain("QFAI-DCAT-001");
    }
    for (const profile of silent) expect(await dcat(root, profile)).toEqual([]);
  });
});

// QFAI:AC-0001-0312-06
describe("a hex colour in UI source that matches no token is a warning", () => {
  // QFAI:EX-0001-0312-09
  it("warns at the line of each unknown colour only", async () => {
    const root = await projectWith({
      "src/page.tsx": [
        'export const a = "#1f2937";',
        'export const b = "#12ab56";',
        'export const c = "#FFF";',
        'export const d = <a href="#add">x</a>;',
        'export const e = "#00000080";',
        "// see #12ab",
        "export const f = <p>Order #12ab</p>;",
        'export const g = <path fill="url(#fade)" />;',
        'export const h = <rect data-color="#12ab56" />;',
        `export const i = '<a :href="\\'#bad\\'">x</a>';`,
        "",
      ].join("\n"),
    });
    await cli(["catalog", "design", "--root", root]);
    const found = await dcat(root);
    expect(found.map((item) => [item.code, item.severity, item.file, item.loc?.line])).toEqual([
      ["QFAI-DCAT-003", "warning", "src/page.tsx", 2],
    ]);
    expect(found[0]?.message).toContain("`#12ab56`");
  });
});

// QFAI:AC-0001-0312-07
describe("the implementer uses the theme instead of copying values", () => {
  // QFAI:EX-0001-0312-10
  it("ships the design catalogue in the UI guidance and the sections in the DESIGN.md spec", async () => {
    const guidance = await readFile(
      path.join(ASSISTANT, "skill", "qfai-implement", "references", "ui-affecting.md"),
      "utf-8",
    );
    expect(guidance).toContain("## Design catalogue");
    for (const text of [
      TOKENS,
      THEME,
      "npx qfai catalog design",
      "QFAI-DCAT-001",
      "QFAI-DCAT-003",
      "A stylesheet is not read",
    ]) {
      expect(guidance).toContain(text);
    }
    const spec = await readFile(
      path.join(ASSISTANT, "skill", "qfai-prototyping", "references", "design-md-spec.md"),
      "utf-8",
    );
    for (const text of ["layout:", "target_min_px", "data_display:"]) expect(spec).toContain(text);
  });
});
