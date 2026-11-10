/**
 * Tests for `scripts/lib/always-loaded-footprint.mjs`, which measures what an init tree makes an
 * adopter's agent load, and prints a before and after table for a pull request.
 *
 * The cases build a small init tree, so each figure can be checked against text written here.
 */
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeFootprint,
  DEFAULT_TREE,
  FREQUENCY,
  fsSource,
  main,
  managedSection,
  measure,
  parseArgs,
  pinView,
  renderDelta,
  renderReport,
  splitFrontmatter,
} from "../../../../scripts/lib/always-loaded-footprint.mjs";
import { PIN_REL, pinFootprint } from "../../../../scripts/pin-always-loaded-footprint.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A hook entry the way init wires one: the reader script, the reminders file and the key. */
const hook = (script: string, key: string) => ({
  type: "command",
  command: "node",
  args: ["-e", script, "${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json", key],
});

const AGENTS = [
  "# Agent Instructions",
  "",
  "<!-- qfai:cross-ai-rules:start -->",
  "- a rule",
  "<!-- qfai:cross-ai-rules:end -->",
  "",
  "## Project rules",
].join("\n");

const reminder = (event: string, text: string, brief?: string) => ({
  hookSpecificOutput: { hookEventName: event, additionalContext: text },
  ...(brief === undefined ? {} : { briefContext: brief }),
});

async function initTree(eol = "\n"): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-footprint-"));
  tempDirs.push(dir);
  const files: Record<string, string> = {
    "root/AGENTS.md": AGENTS.split("\n").join(eol),
    "root/.agents/rules/reminders.json": JSON.stringify({
      once: reminder("UserPromptSubmit", "aaaa"),
      entry: reminder("UserPromptSubmit", "bbbbbb", "bb"),
      check: reminder("UserPromptSubmit", "ccc"),
      tool: reminder("PreToolUse", "dd"),
      orphan: reminder("PostToolUse", "eeeee"),
    }),
    ".claude/settings.json": JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: "*", hooks: [hook("if(n===1)console.log(e)", "once")] },
          { matcher: "*", hooks: [hook("if(n>1&&typeof briefContext==='string')x", "entry")] },
          { matcher: "*", hooks: [hook("console.log(m)", "check")] },
        ],
        PreToolUse: [{ matcher: "Bash", hooks: [hook("if(n===1)console.log(e)", "tool")] }],
      },
    }),
    ".qfai/assistant/skill/listed/SKILL.md": [
      "---",
      "name: listed",
      'description: "Lists."',
      "---",
      "body\u{1F600}",
    ].join(eol),
    ".qfai/assistant/skill/hidden/SKILL.md": [
      "---",
      "name: hidden",
      "description: Hidden.",
      "disable-model-invocation: true",
      "---",
      "xy",
    ].join(eol),
  };
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, ...rel.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }
  return dir;
}

describe("always-loaded footprint", () => {
  it("measures code points with CRLF read as LF, and UTF-8 bytes", () => {
    expect(measure("a\r\nb\u{1F600}")).toEqual({ lines: 2, chars: 4, bytes: 7 });
  });

  it("counts neither a lone carriage return nor a leading byte order mark", () => {
    expect(measure("\uFEFFa\rb")).toEqual({ lines: 1, chars: 2, bytes: 2 });
  });

  it("closes an empty frontmatter, and reads a never-closed one as body", () => {
    expect(splitFrontmatter("---\n---\nbody")).toEqual({ frontmatter: {}, body: "body" });
    expect(splitFrontmatter("---\nname: x\nbody").body).toBe("---\nname: x\nbody");
    expect(splitFrontmatter("\uFEFF---\r\nname: x\r\n---\r\nabc")).toEqual({
      frontmatter: { name: "x" },
      body: "abc",
    });
  });

  it("takes the section between the qfai markers, markers included", () => {
    expect(managedSection(AGENTS).split("\n")).toHaveLength(3);
    expect(managedSection("# no markers")).toBe("");
  });

  it("reads each reminder's event and frequency off the hook wiring", async () => {
    const footprint = computeFootprint(fsSource(await initTree()));
    const byKey = new Map(footprint.reminders.map((entry) => [entry.key, entry]));

    expect(byKey.get("once")?.frequency).toBe(FREQUENCY.once);
    expect(byKey.get("entry")?.frequency).toBe(FREQUENCY.brief);
    expect(byKey.get("entry")?.briefChars).toBe(2);
    expect(byKey.get("check")?.frequency).toBe(FREQUENCY.every);
    expect(byKey.get("tool")?.event).toBe("PreToolUse");
    expect(byKey.get("orphan")?.wired).toBe(false);
  });

  it("totals the reminders per prompt and per session, leaving out an unwired one", async () => {
    const footprint = computeFootprint(fsSource(await initTree()));

    // First prompt: every prompt reminder at full length.
    // Later prompt: the brief form, plus the one that prints every time.
    // Per session: every wired reminder once.
    expect(footprint.reminderTotals).toEqual({
      firstPrompt: 4 + 6 + 3,
      laterPrompt: 2 + 3,
      perSession: 4 + 6 + 3 + 2,
    });
  });

  it("lists only model-invocable skills, and measures every body after its frontmatter", async () => {
    const footprint = computeFootprint(fsSource(await initTree()));

    expect(footprint.skillListing).toEqual({
      skills: [{ name: "listed", chars: "listed".length + "Lists.".length }],
      total: 12,
    });
    expect(footprint.skillBodies.map((skill) => [skill.name, skill.chars])).toEqual([
      ["hidden", 2],
      ["listed", 5],
    ]);
  });

  it("gives a CRLF tree the same figures as its LF twin", async () => {
    const lf = pinView(computeFootprint(fsSource(await initTree())));
    const crlf = pinView(computeFootprint(fsSource(await initTree("\r\n"))));
    expect(crlf).toEqual(lf);
  });

  it("pins what loads every session, and leaves skill bodies and the whole file to the tables", async () => {
    const pin = pinView(computeFootprint(fsSource(await initTree())));
    const labels = Object.keys(pin.characters);

    expect(labels).toContain("AGENTS.md, managed section (every session)");
    expect(labels).toContain("skill listing, total (every session)");
    expect(labels.some((label) => label.startsWith("SKILL.md body"))).toBe(false);
    expect(labels.some((label) => label.startsWith("AGENTS.md, whole file"))).toBe(false);
    expect(pin.lines).toEqual({ "AGENTS.md, managed section": 3 });
  });

  it("writes the pin of the default init tree, formatted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-footprint-pin-"));
    tempDirs.push(root);
    const tree = path.join(root, ...DEFAULT_TREE.split("/"));
    await mkdir(path.dirname(tree), { recursive: true });
    await rename(await initTree(), tree);
    await mkdir(path.dirname(path.join(root, ...PIN_REL.split("/"))), { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await pinFootprint(root);

    const written = await readFile(path.join(root, ...PIN_REL.split("/")), "utf-8");
    expect(JSON.parse(written)).toEqual(pinView(computeFootprint(fsSource(tree))));
    expect(written.endsWith("}\n")).toBe(true);
    expect(written).toContain('\n  "characters": {\n');
  });

  it("labels the token figure as an estimate", async () => {
    const report = renderReport(computeFootprint(fsSource(await initTree())), "fixture");
    expect(report).toContain("~tokens is an estimate (characters / 4)");
    expect(report).toContain("| SKILL.md body listed (when invoked) | 5 | 8 | 2 |");
  });

  it("prints before, after and the signed delta for every row", async () => {
    const before = computeFootprint(fsSource(await initTree()));
    const after = structuredClone(before);
    after.agents.managed.chars += 10;
    after.skillBodies = after.skillBodies.filter((skill) => skill.name !== "hidden");

    const table = renderDelta(before, after, "base");

    expect(table).toContain("| AGENTS.md, managed section (every session) | ");
    expect(table).toMatch(
      /\| AGENTS\.md, managed section \(every session\) \| \d+ \| \d+ \| \+10 \|/,
    );
    expect(table).toContain("| SKILL.md body hidden (when invoked) | 2 | - | -2 |");
  });

  it("refuses an unknown or incomplete argument", () => {
    expect(() => parseArgs(["--base"])).toThrow(/incomplete argument: --base/);
    expect(() => parseArgs(["--json"])).toThrow(/unknown/);
    expect(parseArgs(["--base", "origin/main"]).base).toBe("origin/main");
  });

  it("reads the base through git and exits 0", () => {
    const printed: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      printed.push(line);
    });

    expect(main(["--base", "HEAD"], repoRoot)).toBe(0);
    expect(printed.join("\n")).toContain("| Item | Before | After | Delta |");
  });

  it("exits 2 on a base git cannot read", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(main(["--base", "no-such-ref-for-footprint"], repoRoot)).toBe(2);
  });
});
