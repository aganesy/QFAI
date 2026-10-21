import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseDesignMd } from "../../src/core/design/designMd.js";
import type { FactOverlay, RoutingSeed } from "./routingEval.js";

/**
 * The design-authoring eval: what a seed of `design-authoring-seeds.jsonl` holds, what each of its
 * `repoFacts` keys puts on a fixture tree built from the `qfai init` base, and how the root
 * `DESIGN.md` a host run leaves behind is scored. Only tests and the manual eval runner read it,
 * so it lives beside the tests and never ships.
 */

// What a run may leave at the root `DESIGN.md`, judged by its digest before and after the run.
export const DESIGN_OUTCOMES = ["absent", "created", "unchanged", "changed", "removed"] as const;
export type DesignOutcome = (typeof DESIGN_OUTCOMES)[number];

export interface DesignSeed extends RoutingSeed {
  userPrompt: string;
  expected: {
    designMd: DesignOutcome;
    // Front-matter fields the resulting file must hold, keyed by dotted path and compared without
    // case: a value taken from the token source, or a brand field the change had to preserve.
    fields?: Readonly<Record<string, string>>;
    // The other fixture files the run must leave byte-identical, as `/`-separated paths from the
    // fixture root: the token source, the discussion pack and the shipped sample.
    preserved: readonly string[];
  };
  rationale: string;
}

const read = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

/** Whether a parsed seed line holds what a design-authoring seed needs. */
export const isDesignSeed = (value: unknown): value is DesignSeed =>
  typeof read(value, "id") === "string" &&
  typeof read(value, "userPrompt") === "string" &&
  typeof read(value, "expected") === "object" &&
  read(value, "expected") !== null &&
  typeof read(read(value, "expected"), "designMd") === "string" &&
  isTextList(read(read(value, "expected"), "preserved"));

function isTextList(value: unknown): boolean {
  return Array.isArray(value) && value.every((each) => typeof each === "string" && each !== "");
}

// The sha256 digests of one file before and after the run, `null` where it was absent.
export interface FileDigests {
  before: string | null;
  after: string | null;
}

// What the manual runner observed for one seed: the root file's digests and its text after the
// run, the digests of each file the seed preserves, how the host exited, and whether the session
// engaged, that is planned at least once.
export interface DesignRun {
  seedId: string;
  before: string | null;
  after: string | null;
  text: string | null;
  preserved: Readonly<Record<string, FileDigests>>;
  exit: number | null;
  signal: string | null;
  engaged: boolean;
}

export interface DesignCaseScore {
  seedId: string;
  outcome: DesignOutcome | null;
  missing: string[];
  // The preserved files that changed, vanished, were absent before the run or were not read.
  notKept: string[];
  pass: boolean;
}

function outcomeOf(run: DesignRun): DesignOutcome {
  if (run.after === null) return run.before === null ? "absent" : "removed";
  if (run.before === null) return "created";
  return run.before === run.after ? "unchanged" : "changed";
}

// The expected fields the file's front matter does not hold, or every one when it does not parse.
function missingFields(text: string | null, fields: Readonly<Record<string, string>>): string[] {
  const keys = Object.keys(fields);
  const parsed = text === null ? null : parseDesignMd(text);
  if (parsed === null || "error" in parsed) return keys;
  return keys.filter((key) => {
    const value = key.split(".").reduce<unknown>((at, part) => read(at, part), parsed.data);
    return typeof value !== "string" || value.toLowerCase() !== (fields[key] ?? "").toLowerCase();
  });
}

// A host that exited non-zero or on a signal fails its case, and an outcome that writes nothing
// passes only where the session engaged, so a host that stopped at once proves nothing.
function ranCleanly(run: DesignRun, outcome: DesignOutcome): boolean {
  if (run.exit !== 0 || run.signal !== null) return false;
  return outcome === "unchanged" || outcome === "absent" ? run.engaged : true;
}

// A preserved file is kept only where it existed before the run and its bytes did not change.
function notKept(run: DesignRun, preserved: readonly string[]): string[] {
  return preserved.filter((rel) => {
    const file = Object.hasOwn(run.preserved, rel) ? run.preserved[rel] : undefined;
    return !file || file.before === null || file.before !== file.after;
  });
}

/**
 * Scores each seed's run on the file outcome, the fields it must hold, the files it must keep
 * byte-identical and how the host ran. A seed with no run fails.
 */
export function scoreDesignCases(
  seeds: readonly DesignSeed[],
  runs: readonly DesignRun[],
): DesignCaseScore[] {
  return seeds.map((seed) => {
    const run = runs.find((each) => each.seedId === seed.id);
    if (!run) {
      const missing = Object.keys(seed.expected.fields ?? {});
      const kept = [...seed.expected.preserved];
      return { seedId: seed.id, outcome: null, missing, notKept: kept, pass: false };
    }
    const missing = seed.expected.fields ? missingFields(run.text, seed.expected.fields) : [];
    const altered = notKept(run, seed.expected.preserved);
    const outcome = outcomeOf(run);
    return {
      seedId: seed.id,
      outcome,
      missing,
      notKept: altered,
      pass:
        outcome === seed.expected.designMd &&
        missing.length === 0 &&
        altered.length === 0 &&
        ranCleanly(run, outcome),
    };
  });
}

/** Every design-authoring case must pass: each one checks a write the workflow allows or refuses. */
export function designVerdict(scores: readonly DesignCaseScore[]): {
  pass: boolean;
  failures: string[];
} {
  const failures = scores.filter((score) => !score.pass).map((score) => score.seedId);
  return { pass: failures.length === 0, failures };
}

export const DESIGN_MD = "DESIGN.md";

const isMissing = (error: unknown): boolean => read(error, "code") === "ENOENT";

/**
 * A fixture file as the runner reads it before and after the host session: the sha256 digest of
 * its bytes and its text, or `null` for both when it is absent. Any other read error is thrown.
 */
export async function readFixtureFile(
  root: string,
  rel: string,
): Promise<{ digest: string | null; text: string | null }> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(root, ...rel.split("/")));
  } catch (error) {
    if (isMissing(error)) return { digest: null, text: null };
    throw error;
  }
  return { digest: createHash("sha256").update(bytes).digest("hex"), text: bytes.toString("utf8") };
}

// What one tree holds of the files a seed scores: the root file and each preserved file.
export interface DesignSnapshot {
  designMd: { digest: string | null; text: string | null };
  preserved: Readonly<Record<string, string | null>>;
}

/** Reads the root `DESIGN.md` and every file the seed preserves from `root`. */
export async function snapshotDesignFiles(root: string, seed: DesignSeed): Promise<DesignSnapshot> {
  const preserved: Record<string, string | null> = {};
  for (const rel of seed.expected.preserved) {
    preserved[rel] = (await readFixtureFile(root, rel)).digest;
  }
  return { designMd: await readFixtureFile(root, DESIGN_MD), preserved };
}

/** The run a seed is scored on, from the snapshots taken before and after the host session. */
export function designRunOf(
  seedId: string,
  before: DesignSnapshot,
  after: DesignSnapshot,
  host: Pick<DesignRun, "exit" | "signal" | "engaged">,
): DesignRun {
  const preserved: Record<string, FileDigests> = {};
  for (const [rel, digest] of Object.entries(before.preserved)) {
    preserved[rel] = { before: digest, after: after.preserved[rel] ?? null };
  }
  return {
    seedId,
    before: before.designMd.digest,
    after: after.designMd.digest,
    text: after.designMd.text,
    preserved,
    ...host,
  };
}
const PACK = path.join(".qfai", "discussion", "discussion-20261019000000000");
const SAMPLE = path.join(
  ".qfai",
  "assistant",
  "skill",
  "qfai-prototyping",
  "templates",
  "DESIGN.md.sample",
);
const THEME = "themes/harbor.css";

async function writeAt(root: string, rel: string, text: string): Promise<void> {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

// The published values of the theme the recorded direction adopts.
const THEME_CSS = [
  "/* Harbor: the published theme this product adopts. */",
  ":root {",
  "  --background: #FFFFFF;",
  "  --card: #F8FAFC;",
  "  --foreground: #0F172A;",
  "  --muted-foreground: #64748B;",
  "  --primary: #0F766E;",
  "  --secondary: #334155;",
  "  --accent: #F59E0B;",
  "  --destructive: #B91C1C;",
  "  --border: #E2E8F0;",
  "}",
  "",
].join("\n");

const DIRECTION = [
  "## Design Direction",
  "",
  `- adopted_theme: Harbor, published in \`${THEME}\``,
  "- brand_accent: the Harbor teal primary, with Inter for text",
  "- conventions_kept: ordinary forms, tables and navigation",
  "- chosen_by: user",
  "",
].join("\n");

// The discussion pack's context: its surface classification and, when recorded, its direction.
function context(surface: "web" | "cli", direction: boolean): string {
  return [
    "# 01 Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: true",
    `- primary_surface: ${surface}`,
    "- secondary_surfaces:",
    `- classification_rationale: The customer portal is used through ${surface === "web" ? "a browser" : "a terminal"}.`,
    "",
    ...(direction ? [DIRECTION] : []),
  ].join("\n");
}

// The installed sample with its sample marker removed: a valid file this project authored.
async function authoredDesignMd(root: string): Promise<string> {
  const sample = await readFile(path.join(root, SAMPLE), "utf8");
  return sample
    .replace(/<!-- QFAI-SAMPLE-DESIGN-MD[\s\S]*?-->\n*/, "")
    .replace(/^(\s*theme:\s*).*$/m, `$1"Harbor (${THEME})"`);
}

const DECISIONS_HEAD =
  "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | ------- | -------- | ------ |\n";

export const DESIGN_OVERLAYS: Readonly<Record<string, FactOverlay>> = {
  // `web` with the direction recorded, `web-no-direction` with no brand chosen, or `cli`.
  discussionPack: async (root, value) =>
    writeAt(
      root,
      path.join(PACK, "01_Context.md"),
      context(value === "cli" ? "cli" : "web", value === "web"),
    ),
  themeTokens: async (root) => writeAt(root, THEME, THEME_CSS),
  // `authored` for a valid file this project wrote, `sample` for the unreplaced sample.
  designMd: async (root, value) => {
    const text =
      value === "sample"
        ? await readFile(path.join(root, SAMPLE), "utf8")
        : await authoredDesignMd(root);
    await writeAt(root, DESIGN_MD, text);
  },
  // A change request on the root `DESIGN.md`: `{ status, change }`.
  changeRequest: async (root, value) => {
    const status = Reflect.get(Object(value), "status");
    const change = Reflect.get(Object(value), "change");
    const row = `| DEC-0001 | Change request: DESIGN.md | - Evidence: file:DESIGN.md - Grounds: ${String(change)} - Residual risk: none — one token - Rollback: restore the previous value | ${String(status)} |\n`;
    await writeAt(root, path.join(".qfai", "spec", "decisions.md"), DECISIONS_HEAD + row);
  },
};
