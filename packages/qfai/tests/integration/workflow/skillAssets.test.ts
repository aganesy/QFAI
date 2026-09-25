// QFAI:SPEC-0018:TC-0018-0011
// QFAI:SPEC-0018:TC-0018-0024
// QFAI:SPEC-0018:TC-0018-0139
// QFAI:SPEC-0018:TC-0018-0157
// QFAI:SPEC-0018:TC-0018-0166
// QFAI:SPEC-0018:TC-0018-0168
// QFAI:SPEC-0018:TC-0018-0170
// QFAI:SPEC-0018:TC-0018-0218
// QFAI:SPEC-0018:TC-0018-0219
// QFAI:SPEC-0018:TC-0018-0229
// QFAI:SPEC-0018:TC-0018-0254

import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../../src/core/config.js";
import { countLines } from "../../../src/core/doctor/assetLineBudget.js";
import { validateAgentDefinition } from "../../../src/core/validators/agentDefinition.js";
import { validateAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";
import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { removeTempTree } from "../../helpers/tempTree.js";
import { git, initQuietly } from "../init/upgradeStates.js";

const shippedRoot = getInitAssetsDir();
const assistant = path.join(shippedRoot, ".qfai", "assistant");

function shipped(...segments: string[]): Promise<string> {
  return readFile(path.join(assistant, ...segments), "utf8");
}

const runSkill = () => shipped("skills", "qfai-run", "SKILL.md");
const screens = () => shipped("skills", "qfai-run", "references", "operator-screens.md");
const payloads = () => shipped("skills", "qfai-run", "references", "payloads.md");
const maintainSkill = () => shipped("skills", "qfai-maintain", "SKILL.md");

// The text under a heading, up to the next heading of the same or a higher level.
function section(text: string, heading: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf(heading);
  if (start < 0) return "";
  const level = heading.indexOf(" ");
  const end = lines.findIndex(
    (line, index) => index > start && /^#+ /.test(line) && line.indexOf(" ") <= level,
  );
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

// Every validator issue about the named skill, from the role, routing and autopilot checks.
async function validatorIssues(skill: string) {
  const issues = [
    ...(await validateAgentDefinition(shippedRoot, defaultConfig)),
    ...(await validateAutopilotPolicy(shippedRoot, { config: defaultConfig })),
  ];
  return issues
    .filter((issue) => `${issue.file ?? ""} ${issue.message}`.includes(skill))
    .map((issue) => issue.code);
}

const ROUTES = ["direct", "bugfix", "bounded-change", "feature", "discovery"];
const STAGE_KINDS = [
  "maintenance",
  "diagnose",
  "sdd_append",
  "test_fix",
  "regression_fix",
  "sdd",
  "sdd_delta",
  "prototype",
  "acceptance",
  "implement",
  "verify",
  "discussion",
];

it("TC-0018-0011 (TDD-0261): Read the shipped qfai-run skill and its references", async () => {
  const announce = [
    section(await screens(), "## The announcement"),
    /\*\*Announce\.\*\*[\s\S]*?(?=\n\d+\. )/.exec(await runSkill())?.[0].replace(/\s+/g, " ") ?? "",
  ];
  const named = (text: string) =>
    [...ROUTES, ...STAGE_KINDS].filter((name) => new RegExp(`\\b${name}\\b`).test(text));

  expect({
    states: announce.map((text) =>
      ["goal", "stages in order", "write scope"].every((part) => text.includes(part)),
    ),
    identifiers: announce.flatMap(named),
    questionsCite: section(await screens(), "## Questions").includes(
      "`.agents/rules/user-questions.md`",
    ),
  }).toEqual({ states: [true, true], identifiers: [], questionsCite: true });
});

it("TC-0018-0024 (TDD-0268): Read the qfai-run routing block and its shipped manifest entry", async () => {
  const routing = parseYaml(await shipped("manifest", "agent-routing.yml"));
  const entry = routing.routing.find((block: { skill: string }) => block.skill === "qfai-run");
  const agents = new Set<string>();
  for (const phase of entry.phases) {
    for (const key of ["mandatory_agents", "conditional_agents", "blocking_agents"]) {
      for (const agent of phase[key]) agents.add(agent);
    }
    for (const group of phase.parallel_groups) for (const agent of group) agents.add(agent);
  }

  expect({
    agents: [...agents],
    reviewProfile: entry.review_profile,
    issues: await validatorIssues("qfai-run"),
  }).toEqual({ agents: ["orchestrator"], reviewProfile: undefined, issues: [] });
});

it("TC-0018-0139 (TDD-0355): Read the recovery guidance of the shipped qfai-run", async () => {
  const texts = [await runSkill(), await screens(), await payloads()];
  const halt = section(await screens(), "## Halt notice");

  expect({
    reverseDiff: /reverse diff limited to the paths the run wrote/.test(halt),
    unsafe: texts.flatMap(
      (text) => text.match(/git (reset|stash|switch|checkout|worktree remove)\b/g) ?? [],
    ),
  }).toEqual({ reverseDiff: true, unsafe: [] });
});

it("TC-0018-0157 (TDD-0356): Read the request-kind guidance of the shipped qfai-run", async () => {
  const kinds = section(await runSkill(), "## Request kinds");
  const lineFor = (kind: string) =>
    kinds.split("\n").find((line) => line.includes(`\`${kind}\``)) ?? "";

  expect({
    change: /Only `change` calls `start`/.test(kinds),
    resume: /call `resume`/.test(lineFor("resume")),
    cancel: /call `decision` with `stop`/.test(lineFor("cancel")),
    byName: ["explicit_stage", "plan_only", "verify_only"].map((kind) =>
      /invoke the stage skill by name/i.test(lineFor(kind)),
    ),
    readOnly: /answer it in the conversation/i.test(lineFor("read_only")),
  }).toEqual({
    change: true,
    resume: true,
    cancel: true,
    byName: [true, true, true],
    readOnly: true,
  });
});

it("TC-0018-0166 (TDD-0366): Read the shipped qfai-maintain skill", async () => {
  const skill = await maintainSkill();
  const returns = section(skill, "## What the stage returns");

  expect({
    limits: /Edit nothing outside it/.test(section(skill, "## The edit")),
    nonNormative: /non-normative text and comments/.test(skill),
    returns: [
      "The diff",
      "no-behaviour-change judgement",
      "independent review",
      "lint and link checks",
    ].filter((part) => !returns.includes(part)),
    issues: await validatorIssues("qfai-maintain"),
  }).toEqual({ limits: true, nonNormative: true, returns: [], issues: [] });
});

it("TC-0018-0168 (TDD-0371): Read the shipped qfai-maintain guidance", async () => {
  const edit = section(await maintainSkill(), "## The edit");

  expect(edit).toMatch(
    /semantic effect[\s\S]*stop before editing and\s+return the run for reclassification/,
  );
});

it("TC-0018-0170 (TDD-0374): Read the mode guidance of the shipped qfai-run", async () => {
  const mode = section(await runSkill(), "## Mode");
  const row = (name: string) => mode.split("\n").find((line) => line.startsWith(`| \`${name}\``));

  expect({
    readsStatus: /Read the mode from `npx qfai workflow status`/.test(mode),
    // The route is proposed as its stages in plain words: the operator never sees a route name.
    shadow: /Propose the stages and the reason\. Call no write operation/.test(row("shadow") ?? ""),
    off: /invokes the stage skills by name/.test(row("off") ?? ""),
  }).toEqual({ readsStatus: true, shadow: true, off: true });
});

it("TC-0018-0229 (TDD-0446): Count the lines of the shipped qfai-run/SKILL", async () => {
  // A line is what an editor shows: the newline that ends the file opens no line of its own.
  const lineCount = (text: string) => countLines(text.replace(/\r?\n$/, ""));
  const withinBudget = (text: string) => lineCount(text) <= 150;
  const skill = await runSkill();
  const copy = skill + "x\n".repeat(151 - lineCount(skill));

  expect({
    shipped: withinBudget(skill),
    copyLines: lineCount(copy),
    copy: withinBudget(copy),
  }).toEqual({ shipped: true, copyLines: 151, copy: false });
});

it("TC-0018-0254 (TDD-0502): the per-kind write-scope list in the routing reference", async () => {
  const routing = section(await payloads(), "## Routing result");
  const perKind = routing.split("\n\n").find((block) => block.includes("narrowest")) ?? "";

  expect({
    perKind: [
      /`sdd_delta`[^;]*spec packs[^;]*`affectedSpecIds`/,
      /`sdd`[^;]*`\.qfai\/specs\/\*\*`[^;]*`_policies\/\*\*`[^;]*new capability/,
      /`discussion`[^;]*tracked records[^;]*`DESIGN\.md`[^;]*UI-bearing/,
      /UI-bearing `prototype`[^;]*`\.qfai\/contracts\/design\/\*\*`/,
    ].map((pattern) => pattern.test(perKind)),
    protectedPaths: [
      "`.git/`",
      "`.qfai/runs/`",
      "`.qfai/evidence/workflow/`",
      "`.qfai/decisions/`",
      "`.qfai/evidence/decisions/`",
      "`.qfai/evidence/change-request-*.md`",
      "`.qfai/evidence/decision-*.md`",
      "protected target",
    ].filter((part) => !routing.includes(part)),
  }).toEqual({ perKind: [true, true, true, true], protectedPaths: [] });
});

it("A change to several specs runs once per spec, and the announcement names the part left", async () => {
  const routing = section(await payloads(), "## Routing result").replace(/\s+/g, " ");
  const announcement = section(await screens(), "## The announcement").replace(/\s+/g, " ");

  expect({
    oneSpec: /`affectedSpecIds` names exactly one/.test(routing),
    oncePerSpec: /runs once per spec[^.]*`finish` reports that run, start the next/.test(routing),
    partLeft: /more than one spec, the part a later run makes/.test(announcement),
  }).toEqual({ oneSpec: true, oncePerSpec: true, partLeft: true });
});

// The tree `qfai init` writes, read once for both hosts.
let initRoot = "";

beforeAll(async () => {
  initRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-hosts-"));
  git(initRoot, ["init", "-q"]);
  await initQuietly(initRoot);
}, 120_000);

afterAll(async () => {
  if (initRoot) await removeTempTree(initRoot);
});

// `qfai-run` and every skill a built-in plan dispatches to.
async function entrySkills(): Promise<string[]> {
  const plans = Object.values(await loadBuiltInPlans());
  const skills = plans.flatMap((plan) => plan.stages.flatMap((stage) => stage.skills));
  return ["qfai-run", ...new Set(skills)];
}

function frontmatter(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const parsed: unknown = match ? parseYaml(match[1] ?? "") : undefined;
  return parsed !== null && typeof parsed === "object" ? { ...parsed } : {};
}

// The skills a host's skill directory resolves, by the `name` each SKILL.md declares.
async function discovered(skillDir: string, skills: string[]) {
  const names = await Promise.all(
    skills.map(async (skill) => {
      const file = path.join(initRoot, skillDir, skill, "SKILL.md");
      return existsSync(file) ? frontmatter(await readFile(file, "utf8")).name : undefined;
    }),
  );
  return skills.filter((skill, index) => names[index] !== skill);
}

async function wrappersFromOneSource(skillDir: string, skills: string[]) {
  const differing: string[] = [];
  for (const skill of skills) {
    const wrapper = await realpath(path.join(initRoot, skillDir, skill));
    const source = await realpath(path.join(initRoot, ".qfai", "assistant", "skills", skill));
    if (wrapper !== source) differing.push(skill);
  }
  return differing;
}

async function modelInvocationDisabled(skillDir: string, skills: string[]) {
  const disabled: string[] = [];
  for (const skill of skills) {
    const text = await readFile(path.join(initRoot, skillDir, skill, "SKILL.md"), "utf8");
    if ("disable-model-invocation" in frontmatter(text)) disabled.push(skill);
  }
  return disabled;
}

async function openAiYamlFiles(): Promise<string[]> {
  const entries = await readdir(initRoot, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.name === "openai.yaml" && !entry.parentPath.includes(".git"))
    .map((entry) => path.relative(initRoot, path.join(entry.parentPath, entry.name)));
}

async function entryDirective(file: string): Promise<boolean> {
  const text = await readFile(path.join(initRoot, file), "utf8");
  return text.includes("Send a first free-text change request to the `qfai-run` skill");
}

const hosts: [string, string, string, string][] = [
  ["TC-0018-0218", "claude-code", ".claude/skills", "CLAUDE.md"],
  ["TC-0018-0219", "codex", ".agents/skills", "AGENTS.md"],
];

const hostRows: Record<string, string[]> = {
  "claude-code": ["TDD-0429", "TDD-0430", "TDD-0431", "TDD-0432", "TDD-0433"],
  codex: ["TDD-0434", "TDD-0435", "TDD-0436", "TDD-0437", "TDD-0438"],
};

for (const [tc, host, skillDir, entryFile] of hosts) {
  const [discovery, directive, oneSource, noDisable, noOpenAi] = hostRows[host] ?? [];

  it(`${tc} (${discovery}): discovery`, async () => {
    expect(await discovered(skillDir, await entrySkills())).toEqual([]);
  });

  it(`${tc} (${directive}): entry-directive`, async () => {
    expect(await entryDirective(entryFile)).toBe(true);
  });

  it(`${tc} (${oneSource}): one-wrapper-source`, async () => {
    const skills = [...(await entrySkills()), "qfai-maintain"];

    expect(await wrappersFromOneSource(skillDir, [...new Set(skills)])).toEqual([]);
  });

  it(`${tc} (${noDisable}): no-disable-model-invocation`, async () => {
    expect(await modelInvocationDisabled(skillDir, await entrySkills())).toEqual([]);
  });

  it(`${tc} (${noOpenAi}): no-openai-yaml`, async () => {
    expect(await openAiYamlFiles()).toEqual([]);
  });
}

it("TC-0018-0219 (TDD-0439): reviewer-read-only", async () => {
  const catalog = parseYaml(
    await readFile(
      path.join(initRoot, ".qfai", "assistant", "manifest", "agent-catalog.yml"),
      "utf8",
    ),
  );
  const reviewers: string[] = catalog.agents
    .filter((agent: { kind: string }) => agent.kind === "reviewer")
    .map((agent: { id: string }) => agent.id);
  const writable: string[] = [];
  for (const reviewer of reviewers) {
    const profile = await readFile(
      path.join(initRoot, ".codex", "agents", `${reviewer}.toml`),
      "utf8",
    );
    if (!/^sandbox_mode = "read-only"$/m.test(profile)) writable.push(reviewer);
  }

  expect({ reviewers: reviewers.length > 0, writable }).toEqual({ reviewers: true, writable: [] });
});
