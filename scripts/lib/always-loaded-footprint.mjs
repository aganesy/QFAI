/* global console, process */
/**
 * What an adopter's agent loads because `qfai init` installed it, measured on an init tree.
 *
 * Four parts, by when the host loads them:
 *
 * | Part                  | Loaded                                                         |
 * | --------------------- | -------------------------------------------------------------- |
 * | `AGENTS.md`           | Every session; init owns the section between the qfai markers  |
 * | Each reminder         | On its hook event, as often as the hook wiring lets it fire    |
 * | The skill listing     | Every session: name and description of each model-invocable skill |
 * | Each `SKILL.md` body  | Only when that skill is invoked                                |
 *
 * Characters are code points with no `\r` and no leading byte order mark counted, the way
 * `qfai doctor` counts a skill body, so the figures are the same on every checkout. Bytes are the UTF-8 size of the same text. The token figure is an estimate,
 * characters divided by four, and is labelled as one wherever it is printed.
 *
 * Usage:
 *   node scripts/lib/always-loaded-footprint.mjs [--tree <dir>] [--base <ref>]
 *
 * `--tree` names the init tree, `packages/qfai/assets/init` by default. `--base` reads the same
 * paths from `<ref>` through `git show` and prints a before, after and delta table to paste into a
 * pull request. Exit codes: 0 printed; 2 the arguments or a read failed.
 *
 * Reminder frequencies come from the Claude Code wiring init writes. Codex reads the same reminder
 * texts from `reminders.json`, so the per-text figures hold for it too; its own wiring is not read.
 */
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL, URL } from "node:url";

/** The parser the package itself uses, resolved from the package that depends on it. */
const require = createRequire(new URL("../../packages/qfai/package.json", import.meta.url));
const { parse: parseYaml } = require("yaml");

export const DEFAULT_TREE = "packages/qfai/assets/init";

/** Paths inside an init tree, POSIX-separated so `git show` can read them too. */
export const TREE_PATHS = {
  agents: "root/AGENTS.md",
  reminders: "root/.agents/rules/reminders.json",
  hookWiring: ".claude/settings.json",
  skills: ".qfai/assistant/skill",
};

const MANAGED_START = "<!-- qfai:cross-ai-rules:start -->";
const MANAGED_END = "<!-- qfai:cross-ai-rules:end -->";

/** How often a wired reminder can print, read off the hook command that prints it. */
export const FREQUENCY = {
  once: "once per session",
  brief: "full once, then brief on every later prompt",
  every: "on every matching event",
};

/** Reads an init tree from the working copy. */
export function fsSource(treeDir) {
  return {
    read: (rel) => readFileSync(path.join(treeDir, ...rel.split("/")), "utf-8"),
    skillNames: () =>
      readdirSync(path.join(treeDir, ...TREE_PATHS.skills.split("/")), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort(),
  };
}

/** Reads the same init tree as `ref` holds it, through `git show` and `git ls-tree`. */
export function gitSource(repoRoot, ref, treeRel) {
  const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf-8" });
  const treePath = (rel) => `${treeRel}/${rel}`;
  return {
    read: (rel) => git(["show", `${ref}:${treePath(rel)}`]),
    skillNames: () =>
      git(["ls-tree", "--name-only", `${ref}:${treePath(TREE_PATHS.skills)}`])
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name !== "")
        .sort(),
  };
}

/**
 * The text as it is counted: no `\r` and no byte order mark at the start. The same definition
 * `qfai doctor` applies to a skill body, so a CRLF checkout and an LF one give one figure.
 */
const normalize = (text) => text.replace(/\r/g, "").replace(/^\uFEFF/, "");

/** Code points, bytes and lines of a piece of text. */
export function measure(text) {
  const normalized = normalize(text);
  return {
    lines: normalized.split("\n").length,
    chars: [...normalized].length,
    bytes: Buffer.byteLength(normalized, "utf-8"),
  };
}

/** The section of `AGENTS.md` init owns, markers included; empty when a marker is missing. */
export function managedSection(agentsText) {
  const text = normalize(agentsText);
  const start = text.indexOf(MANAGED_START);
  const end = text.indexOf(MANAGED_END);
  if (start === -1 || end === -1 || end < start) return "";
  return text.slice(start, end + MANAGED_END.length);
}

/**
 * A file's YAML frontmatter and its body, split the way `qfai doctor` splits a skill body: a
 * first line of exactly `---` closed by a later line of exactly `---`, an empty frontmatter
 * included. A frontmatter that never closes is not one, and the whole file is body.
 */
export function splitFrontmatter(text) {
  const lines = normalize(text).split("\n");
  const close = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
  if (close === -1) return { frontmatter: {}, body: lines.join("\n") };
  return {
    frontmatter: parseYaml(lines.slice(1, close).join("\n")) ?? {},
    body: lines.slice(close + 1).join("\n"),
  };
}

/**
 * Each reminder `hookWiring` runs, with the event it is wired to and how often it can print.
 *
 * A reminder command reads `reminders.json` and the key it is given as its last two arguments.
 * The command that swaps in `briefContext` prints on every prompt; one that prints only on the
 * first firing tests `n===1`; anything else prints every time its event matches.
 */
export function reminderWiring(hookWiring) {
  const wired = new Map();
  for (const [event, groups] of Object.entries(hookWiring.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        const args = hook.args ?? [];
        if (args.length < 2 || !String(args[args.length - 2]).endsWith("reminders.json")) continue;
        const script = args.join(" ");
        const frequency = script.includes("briefContext")
          ? FREQUENCY.brief
          : script.includes("n===1")
            ? FREQUENCY.once
            : FREQUENCY.every;
        wired.set(String(args[args.length - 1]), { event, frequency });
      }
    }
  }
  return wired;
}

/**
 * The footprint of one init tree.
 *
 * Reminder totals are worst cases: every conditional reminder is taken to fire. `firstPrompt`
 * is what the first prompt of a session can carry, `laterPrompt` what each later prompt can, and
 * `perSession` every reminder once at full length; a reminder that repeats adds `laterPrompt` on
 * each further prompt rather than another full copy.
 *
 * @param {{ read: (rel: string) => string, skillNames: () => string[] }} source
 */
export function computeFootprint(source) {
  const agentsText = source.read(TREE_PATHS.agents);
  const reminderFile = JSON.parse(source.read(TREE_PATHS.reminders));
  const wiring = reminderWiring(JSON.parse(source.read(TREE_PATHS.hookWiring)));

  const reminders = Object.entries(reminderFile).map(([key, entry]) => {
    const wired = wiring.get(key);
    const text = String(entry?.hookSpecificOutput?.additionalContext ?? "");
    return {
      key,
      event: wired?.event ?? String(entry?.hookSpecificOutput?.hookEventName ?? ""),
      frequency: wired?.frequency ?? "not wired",
      wired: wired !== undefined,
      ...measure(text),
      ...(typeof entry?.briefContext === "string"
        ? { briefChars: measure(entry.briefContext).chars }
        : {}),
    };
  });
  const firing = reminders.filter((reminder) => reminder.wired);
  const onPrompt = firing.filter((reminder) => reminder.event === "UserPromptSubmit");
  const sum = (values) => values.reduce((total, value) => total + value, 0);

  const skills = source.skillNames().map((name) => {
    const { frontmatter, body } = splitFrontmatter(
      source.read(`${TREE_PATHS.skills}/${name}/SKILL.md`),
    );
    return {
      name,
      listed: frontmatter["disable-model-invocation"] !== true,
      listingChars: measure(String(frontmatter.name ?? "") + String(frontmatter.description ?? ""))
        .chars,
      body: measure(body),
    };
  });
  const listed = skills.filter((skill) => skill.listed);

  return {
    agents: { file: measure(agentsText), managed: measure(managedSection(agentsText)) },
    reminders,
    reminderTotals: {
      firstPrompt: sum(onPrompt.map((reminder) => reminder.chars)),
      laterPrompt: sum(
        onPrompt.map((reminder) =>
          reminder.frequency === FREQUENCY.brief
            ? (reminder.briefChars ?? reminder.chars)
            : reminder.frequency === FREQUENCY.every
              ? reminder.chars
              : 0,
        ),
      ),
      perSession: sum(firing.map((reminder) => reminder.chars)),
    },
    skillListing: {
      skills: listed.map((skill) => ({ name: skill.name, chars: skill.listingChars })),
      total: sum(listed.map((skill) => skill.listingChars)),
    },
    skillBodies: skills.map((skill) => ({ name: skill.name, ...skill.body })),
  };
}

/**
 * One row per measured item, in a stable order: what the tables and the pin are made of.
 *
 * `pinned` marks what loads in every session because init installed it: the managed section, the
 * reminders and the skill listing. The whole `AGENTS.md` is the project's as much as init's, and a
 * skill body loads only when its skill is invoked, so those rows appear in the tables only.
 */
export function footprintRows(footprint) {
  const rows = [
    { label: "AGENTS.md, whole file (every session)", ...footprint.agents.file, pinned: false },
    { label: "AGENTS.md, managed section (every session)", ...footprint.agents.managed },
  ];
  for (const reminder of footprint.reminders) {
    rows.push({
      label: `reminder ${reminder.key} (${reminder.event}, ${reminder.frequency})`,
      chars: reminder.chars,
      bytes: reminder.bytes,
    });
    if (reminder.briefChars !== undefined) {
      rows.push({ label: `reminder ${reminder.key}, brief form`, chars: reminder.briefChars });
    }
  }
  const totals = footprint.reminderTotals;
  rows.push(
    {
      label: "reminders the first prompt of a session can carry (worst case)",
      chars: totals.firstPrompt,
    },
    { label: "reminders each later prompt can carry (worst case)", chars: totals.laterPrompt },
    { label: "reminders per session (worst case)", chars: totals.perSession },
  );
  for (const skill of footprint.skillListing.skills) {
    rows.push({ label: `skill listing ${skill.name} (every session)`, chars: skill.chars });
  }
  rows.push({ label: "skill listing, total (every session)", chars: footprint.skillListing.total });
  for (const skill of footprint.skillBodies) {
    rows.push({ label: `SKILL.md body ${skill.name} (when invoked)`, ...skill, pinned: false });
  }
  return rows.map(({ label, chars, bytes, lines, pinned }) => ({
    label,
    chars,
    bytes,
    lines,
    pinned: pinned ?? true,
  }));
}

/** The figures the pin holds: what loads every session, and the managed section's lines. */
export function pinView(footprint) {
  const pinned = footprintRows(footprint).filter((row) => row.pinned);
  return {
    characters: Object.fromEntries(pinned.map((row) => [row.label, row.chars])),
    lines: { "AGENTS.md, managed section": footprint.agents.managed.lines },
  };
}

const estimate = (chars) => Math.ceil(chars / 4);

/** A Markdown table of every row with its characters, bytes and estimated tokens. */
export function renderReport(footprint, treeLabel) {
  const lines = [
    `Always-loaded footprint of ${treeLabel}`,
    "",
    "Characters are exact; ~tokens is an estimate (characters / 4).",
    "",
    "| Item | Characters | Bytes | ~tokens |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const row of footprintRows(footprint)) {
    lines.push(`| ${row.label} | ${row.chars} | ${row.bytes ?? "-"} | ${estimate(row.chars)} |`);
  }
  return lines.join("\n");
}

/** A Markdown table of characters before and after, with the delta, for a pull request. */
export function renderDelta(before, after, baseLabel) {
  const beforeRows = new Map(footprintRows(before).map((row) => [row.label, row.chars]));
  const afterRows = new Map(footprintRows(after).map((row) => [row.label, row.chars]));
  const labels = [...new Set([...afterRows.keys(), ...beforeRows.keys()])];
  const lines = [
    `Always-loaded footprint against ${baseLabel}, in characters (exact)`,
    "",
    "| Item | Before | After | Delta |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const label of labels) {
    const was = beforeRows.get(label);
    const now = afterRows.get(label);
    const delta = (now ?? 0) - (was ?? 0);
    const sign = delta > 0 ? `+${delta}` : String(delta);
    lines.push(`| ${label} | ${was ?? "-"} | ${now ?? "-"} | ${sign} |`);
  }
  return lines.join("\n");
}

/** Parses `--tree <dir>` and `--base <ref>`; anything else is an error. */
export function parseArgs(argv) {
  const options = { tree: DEFAULT_TREE, base: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if ((flag === "--tree" || flag === "--base") && value !== undefined && value !== "") {
      options[flag.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${flag}`);
  }
  return options;
}

/** Runs the command against `repoRoot`; returns the exit code. */
export function main(argv, repoRoot) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`${error.message}. Usage: [--tree <dir>] [--base <ref>]`);
    return 2;
  }
  try {
    const treeDir = path.resolve(repoRoot, options.tree);
    const after = computeFootprint(fsSource(treeDir));
    if (options.base === undefined) {
      console.log(renderReport(after, options.tree));
      return 0;
    }
    const treeRel = path.relative(repoRoot, treeDir).split(path.sep).join("/");
    const before = computeFootprint(gitSource(repoRoot, options.base, treeRel));
    console.log(renderDelta(before, after, options.base));
    return 0;
  } catch (error) {
    console.error(`could not measure the footprint: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2), process.cwd());
}
