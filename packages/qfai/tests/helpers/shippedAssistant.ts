/**
 * Reading the assistant tree `qfai init` ships, and the package defaults beside it, for tests that
 * assert what a shipped rule, skill or plan says.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { readRoutingDefaultsFiles } from "../../src/core/routingDefaults.js";
import { nextHeadingAt } from "./recordProse.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SHIPPED_ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

export const PACKAGE_DEFAULTS = path.join(packageRoot, "assets", "defaults");

/** Whether the shipped assistant tree holds `relativePath`. */
export function shippedExists(relativePath: string): boolean {
  return existsSync(path.join(SHIPPED_ASSISTANT, relativePath));
}

/** A file under the shipped assistant tree, by its path relative to that tree. */
export function readShipped(relativePath: string): Promise<string> {
  return readFile(path.join(SHIPPED_ASSISTANT, relativePath), "utf-8");
}

/** A file under the package defaults, by its path relative to `assets/defaults`. */
export function readDefault(relativePath: string): Promise<string> {
  return readFile(path.join(PACKAGE_DEFAULTS, relativePath), "utf-8");
}

/** Every routing defaults file's text, joined in the order the package reads them. */
export async function readDefaultRoutingText(): Promise<string> {
  return (await readRoutingDefaultsFiles()).map((file) => file.text).join("\n");
}

function isEntry(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The package's routing defaults as the one `routing:` list the package reads them as. */
export async function defaultRoutingEntries(): Promise<Record<string, unknown>[]> {
  return (await readRoutingDefaultsFiles()).flatMap((file) => {
    const parsed: unknown = parse(file.text);
    const routing: unknown = isEntry(parsed) ? parsed.routing : undefined;
    if (!Array.isArray(routing)) throw new Error(`${file.rel} holds no routing list`);
    return routing.filter(isEntry);
  });
}

/**
 * The section a heading opens, subsections included, up to the next heading of the same or a
 * higher level. `heading` matches the start of the heading line, so `## Stage 0` finds
 * `## Stage 0 - Steering completion refresh`. Headings inside a fence are not headings.
 */
export function sectionOf(text: string, heading: string): string {
  const level = headingLevel(heading);
  let start = text.startsWith(heading) ? 0 : nextHeadingAt(text, 0);
  while (start > 0 && !text.startsWith(heading, start)) start = nextHeadingAt(text, start);
  if (level === 0 || start === -1) return "";
  let end = nextHeadingAt(text, start);
  while (end !== -1 && headingLevel(text.slice(end)) > level) end = nextHeadingAt(text, end);
  return text.slice(start, end === -1 ? text.length : end);
}

function headingLevel(line: string): number {
  return /^#+/.exec(line)?.[0].length ?? 0;
}

/**
 * Every skill owning a step a built-in workflow plan runs, held literally so a change to the set is
 * a change to the tests that read it.
 */
export const PLAN_STEP_OWNERS = [
  "qfai-sdd",
  "qfai-atdd",
  "qfai-implement",
  "qfai-verify",
  "qfai-discussion",
  "qfai-prototyping",
  "qfai-maintain",
  "qfai-triage",
] as const;

/** The built-in plans, one per route of the catalog. */
export const PLAN_ROUTES = [
  "close-no-change",
  "answer-question",
  "investigate-question",
  "request-info",
  "close-duplicate",
  "cluster-reports",
  "decide-acceptance",
  "decide-design",
  "decompose-epic",
  "retriage-bundle",
  "repair-consistency",
  "sweep-guard",
  "retire-mechanism",
  "restate-records",
  "add-feature",
  "prototype-feature",
  "change-compatibility",
  "apply-settled-spec",
  "apply-settled-build",
  "refactor-code",
  "edit-text",
  "fix-defect",
  "fix-regression",
  "improve-performance",
  "fix-vulnerability",
  "fix-crash",
  "fix-intermittent",
  "fix-env-bound",
  "fix-conformance",
  "quarantine-flaky",
  "repair-test",
  "fix-red-main",
  "change-tooling",
  "bump-dependency",
  "revert-culprit",
  "hand-off-operation",
  "backport-fix",
  "draft-release-notes",
  "verify-manually",
] as const;

/** One step of a built-in plan stage, whether the plan marks it pass-through, and its mode. */
export interface ShippedPlanStep {
  name: string;
  passThrough?: boolean;
  mode?: string;
}

function planStepOf(entry: unknown): ShippedPlanStep[] {
  if (typeof entry === "string") return [{ name: entry }];
  if (typeof entry !== "object" || entry === null || !("step" in entry)) return [];
  const { step } = entry;
  const passThrough = "passThrough" in entry ? entry.passThrough : undefined;
  const mode = "mode" in entry ? entry.mode : undefined;
  if (typeof step !== "string") return [];
  return [
    {
      name: step,
      ...(passThrough === true ? { passThrough } : {}),
      ...(typeof mode === "string" ? { mode } : {}),
    },
  ];
}

/** Each stage of a built-in plan: its ID and kind, and its steps in order. */
export async function planStageSteps(
  route: string,
): Promise<{ id: string; kind: string; steps: ShippedPlanStep[] }[]> {
  const parsed: unknown = parse(await readDefault(`workflows/${route}.yml`));
  const stages: unknown[] =
    typeof parsed === "object" && parsed !== null && "stages" in parsed
      ? Array.isArray(parsed.stages)
        ? parsed.stages
        : []
      : [];
  return stages.flatMap((stage) => {
    if (typeof stage !== "object" || stage === null) return [];
    const record = Object.fromEntries(Object.entries(stage));
    const steps: unknown[] = Array.isArray(record.steps) ? record.steps : [];
    return [
      {
        id: String(record.id),
        kind: String(record.kind),
        steps: steps.flatMap(planStepOf),
      },
    ];
  });
}

/** The `steps:` a shipped skill's `SKILL.md` front matter lists, in order. */
export async function skillSteps(skill: string): Promise<string[]> {
  const steps = frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`)).steps;
  return Array.isArray(steps) ? steps.map(String) : [];
}

/** The YAML front matter of a shipped `SKILL.md`, parsed; `{}` when there is none. */
export function frontMatterOf(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  const body = match?.[1];
  const parsed: unknown = body === undefined ? null : parse(body);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed));
}

/** The first table row of `text` whose cells hold `token`, or `""`. */
export function rowOf(text: string, token: string): string {
  return text.split("\n").find((line) => line.startsWith("|") && line.includes(token)) ?? "";
}

/** Text with every run of whitespace collapsed to one space, so a pattern can span a wrapped line. */
export function flat(text: string): string {
  return text.replace(/\s+/g, " ");
}
