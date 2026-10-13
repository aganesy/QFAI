/**
 * What triggers the session review: the end of the run, never a hook.
 *
 * A stop hook cannot see whether the user's work is done, so one that asks for the review has to
 * block every stop, and each blocked stop is one more model call. The hook files therefore carry
 * no `Stop` group, and `qfai-run`'s final report asks for the review once, when it closes the
 * user's last task and nothing waits on the user.
 */
// QFAI:AC-0001-0231-01
// QFAI:AC-0001-0231-04
// QFAI:AC-0001-0231-06

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo } from "./upgradeStates.js";
import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

// tests/integration/init/<this file> -> integration -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);

const HOOK_FILES = [".claude/settings.json", ".codex/hooks.json"];
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const RUN_SKILL = "skill/qfai-run/SKILL.md";
const RULE = "`.agents/rules/session-feedback.md`";

/** The `hooks` table of a hook file, refusing any other shape. */
function hooksOf(text: string, what: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  const hooks: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "hooks") : undefined;
  if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) {
    throw new Error(`${what} has no hooks table`);
  }
  return { ...hooks };
}

// QFAI:EX-0001-0231-01
// QFAI:EX-0001-0231-02
// QFAI:EX-0001-0231-03
describe("init and the stop event", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it.each(HOOK_FILES)("the shipped %s carries no Stop group", async (rel) => {
    const shipped = path.join(repoRoot, "packages", "qfai", "assets", "init", rel);
    expect(Object.keys(hooksOf(await readFile(shipped, "utf-8"), rel))).not.toContain("Stop");
  });

  it("writes no Stop group on a fresh project", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      for (const rel of HOOK_FILES) {
        const written = await readFile(path.join(root, rel), "utf-8");
        expect(Object.keys(hooksOf(written, rel)), rel).not.toContain("Stop");
      }
    });
  });

  it.each(HOOK_FILES)("leaves the project's own Stop group in %s as the only one", async (rel) => {
    await withEmptyRepo(async (root) => {
      const own = { hooks: [{ type: "command", command: "./own-stop.sh" }] };
      await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await writeFile(path.join(root, rel), JSON.stringify({ hooks: { Stop: [own] } }), "utf-8");

      await initQuietly(root);
      const merged = await readFile(path.join(root, rel), "utf-8");
      expect(hooksOf(merged, rel).Stop, rel).toEqual([own]);

      await initQuietly(root);
      expect(await readFile(path.join(root, rel), "utf-8"), rel).toBe(merged);
    });
  });
});

// QFAI:EX-0001-0231-11
// QFAI:EX-0001-0231-14
// QFAI:EX-0001-0231-15
// QFAI:EX-0001-0231-16
describe("the end of the run triggers the review", () => {
  it("the final report follows the rule once when it closes the user's last task", async () => {
    const report = flat(sectionOf(await readShipped(SCREENS), "## Final report"));
    expect(report).toContain(
      `When the report closes the user's last task and nothing waits on the user, with no question, approval or choice open, follow ${RULE} once, after the report.`,
    );
  });

  it("a report with a task unfinished, the turn waiting on the user, or a review already run, runs no review", async () => {
    const report = flat(sectionOf(await readShipped(SCREENS), "## Final report"));
    const trigger = /When the report (.+?), follow /.exec(report)?.[1] ?? "";
    expect(trigger, "a task is unfinished").toContain("closes the user's last task");
    expect(trigger, "the turn waits on the user").toContain(
      "nothing waits on the user, with no question, approval or choice open",
    );
    const pause = /A report (.+?) is a pause and runs no review/.exec(report)?.[1] ?? "";
    for (const kind of [
      "at a chosen scope",
      "at a halt",
      "with a gate failing",
      "CI pending",
      "with a question",
    ]) {
      expect(pause, kind).toContain(kind);
    }
    expect(report).toContain(
      "neither does a report after the review already ran for the user's latest instruction",
    );
  });

  it("one step of qfai-run names the rule for the closing final report", async () => {
    const steps = sectionOf(await readShipped(RUN_SKILL), "## The work")
      .split("\n")
      .filter((line) => /^\d+\. /.test(line) && line.includes(RULE));
    expect(steps).toEqual([
      `10. **Session feedback.** When the final report closes the user's last task and nothing waits on them, follow ${RULE} once.`,
    ]);
  });
});
