// QFAI:EX-0001-0201-08

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");
const PLANS = path.join(PACKAGE_ROOT, "assets", "defaults", "workflows");

let initRoot = "";

beforeAll(async () => {
  initRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-host-adapter-"));
  const init = spawnSync(process.execPath, [CLI, "init", "--yes"], {
    cwd: initRoot,
    encoding: "utf8",
  });
  if (init.status !== 0) throw new Error(`qfai init: ${init.stderr}`);
}, 180_000);

afterAll(async () => {
  await removeTempTree(initRoot);
});

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

// `qfai-run` and every skill a built-in plan dispatches to.
async function entrySkills(): Promise<string[]> {
  const skills = new Set<string>(["qfai-run"]);
  for (const name of await readdir(PLANS)) {
    const plan = record(parseYaml(await readFile(path.join(PLANS, name), "utf8")));
    for (const stage of Array.isArray(plan.stages) ? plan.stages : []) {
      const skill = record(stage).skill;
      for (const each of Array.isArray(skill) ? skill : [skill]) skills.add(String(each));
    }
  }
  return [...skills].sort();
}

function frontmatter(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return record(match ? parseYaml(match[1] ?? "") : undefined);
}

// The skills a host's skill directory does not resolve, by the `name` each SKILL.md declares.
async function undiscovered(skillDir: string, skills: string[]) {
  const names = await Promise.all(
    skills.map(async (skill) => {
      const file = path.join(initRoot, skillDir, skill, "SKILL.md");
      return existsSync(file) ? frontmatter(await readFile(file, "utf8")).name : undefined;
    }),
  );
  return skills.filter((skill, index) => names[index] !== skill);
}

// The skills whose host link does not resolve to the one canonical copy.
async function notOneSource(skillDir: string, skills: string[]) {
  const differing: string[] = [];
  for (const skill of skills) {
    const link = await realpath(path.join(initRoot, skillDir, skill)).catch(() => "");
    const source = await realpath(path.join(initRoot, ".qfai", "assistant", "skill", skill));
    if (link !== source) differing.push(skill);
  }
  return differing;
}

async function modelInvocationDisabled(skillDir: string, skills: string[]) {
  const disabled: string[] = [];
  for (const skill of skills) {
    const file = path.join(initRoot, skillDir, skill, "SKILL.md");
    const text = existsSync(file) ? await readFile(file, "utf8") : "";
    if ("disable-model-invocation" in frontmatter(text)) disabled.push(skill);
  }
  return disabled;
}

// The lines above the entry point's first heading that send a request to `qfai-run`.
async function entryDirectives(file: string): Promise<string[]> {
  const lines = (await readFile(path.join(initRoot, file), "utf8")).split(/\r?\n/);
  const heading = lines.findIndex((line) => line.startsWith("# "));
  return lines.slice(0, heading < 0 ? 0 : heading).filter((line) => line.includes("qfai-run"));
}

const HOSTS: [string, string, string][] = [
  ["claude-code", ".claude/skills", "CLAUDE.md"],
  ["codex", ".agents/skills", "AGENTS.md"],
];

for (const [host, skillDir, entryFile] of HOSTS) {
  it(`The tree qfai init writes carries the ${host} adapter`, async () => {
    const skills = await entrySkills();

    expect({
      undiscovered: await undiscovered(skillDir, skills),
      directives: (await entryDirectives(entryFile)).length,
      notOneSource: await notOneSource(skillDir, [...skills, "qfai-maintain"]),
      disabled: await modelInvocationDisabled(skillDir, skills),
    }).toEqual({ undiscovered: [], directives: 1, notOneSource: [], disabled: [] });
  });
}
