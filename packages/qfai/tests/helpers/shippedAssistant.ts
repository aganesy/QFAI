/**
 * Reading the assistant tree `qfai init` ships, and the package defaults beside it, for tests that
 * assert what a shipped rule, skill or plan says.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

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
] as const;

/** The five built-in plans, one per route. */
export const PLAN_ROUTES = ["direct", "bugfix", "bounded-change", "feature", "discovery"] as const;

/** One step of a built-in plan stage, with the predicate of its own it carries, if any. */
export interface ShippedPlanStep {
  name: string;
  when?: string;
}

function planStepOf(entry: unknown): ShippedPlanStep[] {
  if (typeof entry === "string") return [{ name: entry }];
  if (typeof entry !== "object" || entry === null || !("step" in entry)) return [];
  const { step } = entry;
  const when = "when" in entry ? entry.when : undefined;
  if (typeof step !== "string") return [];
  return [typeof when === "string" ? { name: step, when } : { name: step }];
}

/** Each stage of a built-in plan: its ID, kind and predicate, and its steps in order. */
export async function planStageSteps(
  route: string,
): Promise<{ id: string; kind: string; when: string; steps: ShippedPlanStep[] }[]> {
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
        when: String(record.when),
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
