/**
 * Prototyping completes on the user's confirmation.
 *
 * The loop is run by the `/qfai-prototyping` skill with the user, so the
 * shipped skill and its steps are the behaviour under test, together with the
 * one thing the CLI owes the loop: no `prototyping` command at all.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../../src/cli/lib/exitCodes.js";
import { run } from "../../src/cli/main.js";
import { loadConfig, readRejectedPrimaryUiContract } from "../../src/core/config.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

/** Wrap-tolerant text: a rule is matched as one sentence, not by its wrap column. */
const flat = (text: string): string => text.replace(/\s*\n\s*/g, " ");

/** The body of one `## Heading` section, up to the next level-2 heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf("\n## ", start + heading.length + 4);
  return text.slice(start, end < 0 ? undefined : end);
}

/** Runs the CLI with its output silenced and returns the exit code it set. */
async function exitCodeOf(argv: string[]): Promise<number | string | undefined> {
  const previous = process.exitCode;
  process.exitCode = undefined;
  const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    await run(argv, process.cwd());
    return process.exitCode;
  } finally {
    out.mockRestore();
    err.mockRestore();
    process.exitCode = previous;
  }
}

async function withConfig<T>(body: string, task: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-pin-"));
  try {
    await writeFile(path.join(root, "qfai.config.yaml"), body, "utf-8");
    return await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe.each(TREES)("%s", (tree) => {
  // QFAI:EX-0001-0228-01
  it("hands off on the user's confirmation, with no command or check certifying it", async () => {
    const skill = flat(await read(tree, "skill/qfai-prototyping/SKILL.md"));
    const loop = flat(await read(tree, "step/prototyping-loop/STEP.md"));
    const handoff = flat(await read(tree, "step/prototyping-handoff/STEP.md"));

    expect(skill).toContain("prototyping completes when the user confirms the prototype");
    expect(skill).toContain("no command or check certifies the result");
    expect(loop).toContain(
      "**Confirmed** — the user says the prototype is done — goes to `prototyping-handoff`.",
    );
    expect(handoff).toContain(
      "Copy the confirmed iteration to `.qfai/prototype/final/index.html`.",
    );
    expect(handoff).toContain("Write `.qfai/prototype/final/handoff.json`");
    expect(`${skill} ${loop} ${handoff}`).not.toMatch(/certificate|qfai prototyping/);
  });

  // QFAI:EX-0001-0228-02
  it("runs another iteration on a change and keeps the handoff waiting", async () => {
    const loop = flat(await read(tree, "step/prototyping-loop/STEP.md"));
    const handoff = flat(await read(tree, "step/prototyping-handoff/STEP.md"));

    expect(loop).toContain("until then it runs another iteration on the user's answer");
    expect(loop).toContain(
      "**A change** — the user asks for something this lineage can take — runs the next iteration",
    );
    expect(flat(section(await read(tree, "step/prototyping-loop/STEP.md"), "Gate"))).toContain(
      "The step passes when the user confirmed the prototype.",
    );
    expect(handoff).toContain("Runs only after the user confirmed the prototype");
  });

  // QFAI:EX-0001-0228-03
  it("completes with a blocking finding still open and names it in the report", async () => {
    const loop = flat(await read(tree, "step/prototyping-loop/STEP.md"));
    const gate = flat(section(await read(tree, "step/prototyping-handoff/STEP.md"), "Gate"));

    expect(loop).toContain(
      "A blocking finding the latest review still lists does not stop it; the final report names it.",
    );
    expect(gate).toContain(
      "every blocking finding, layout anti-pattern and `DESIGN.md` violation the latest review still lists",
    );
  });

  // QFAI:EX-0001-0228-04
  it("keeps every file the loop writes under .qfai/prototype", async () => {
    const skill = flat(await read(tree, "skill/qfai-prototyping/SKILL.md"));
    expect(skill).toContain("Every file the loop writes stays under `.qfai/prototype/`");
    expect(skill).toContain("No `qfai` command reads or writes that directory.");

    for (const step of [
      "prototyping-grill",
      "prototyping-loop",
      "prototyping-recover",
      "prototyping-handoff",
    ]) {
      const writes = section(await read(tree, `step/${step}/STEP.md`), "Writes");
      for (const target of writes.matchAll(/`(\.qfai\/[^`]+)`/g)) {
        expect(target[1], `${step} writes outside the prototype folder`).toMatch(
          /^\.qfai\/prototype\//,
        );
      }
    }
  });

  // QFAI:EX-0001-0138-01
  it("lets the request win over the configured pin and normalises neither", async () => {
    const skill = flat(await read(tree, "skill/qfai-prototyping/SKILL.md"));
    expect(skill).toContain("`qfai.config.yaml#prototyping.primaryUiContract`; the request wins.");
    expect(skill).toContain(
      "A value in another form is refused, naming the `UI-NNNN` shape and the value received, and is never normalised.",
    );
  });

  // QFAI:EX-0001-0138-02
  it("stops on a refused configured pin instead of picking another contract", async () => {
    const skill = flat(await read(tree, "skill/qfai-prototyping/SKILL.md"));
    expect(skill).toContain(
      "When the configured value is refused and the request names no contract, the run stops before writing anything, naming the key and the value; it does not pick another contract.",
    );
  });

  // QFAI:EX-0001-0114-02
  it("writes nothing and says so when no UI-bearing contract resolves", async () => {
    const preflight = flat(await read(tree, "step/prototyping-preflight/STEP.md"));
    expect(preflight).toContain(
      "With zero UI-bearing contracts the run ends here, writes nothing, and says that no UI-bearing UI contract was resolved.",
    );
  });

  // QFAI:EX-0001-0097-01
  it("names an owner for implementation, review scoring and build, with no fixed capture identity", async () => {
    const table = section(
      await read(tree, "step/prototyping-loop/STEP.md"),
      "Delegation Scope Table",
    );
    expect(table).toContain("| Generation and implementation ");
    expect(table).toContain("| Live Playwright review and evaluation scoring ");
    expect(table).toContain("| Build ");
    expect(table).not.toMatch(/\|\s*[^|]*capture[^|]*\|/i);
    expect(flat(table)).toContain("There is no fixed capture identity");
  });

  // QFAI:EX-0001-0097-02
  it("reports one identity assigned to both generation and review before either runs", async () => {
    const table = flat(
      section(await read(tree, "step/prototyping-loop/STEP.md"), "Delegation Scope Table"),
    );
    expect(table).toContain("Generation and review use two distinct sub-agent identities.");
    expect(table).toContain(
      "Report an assignment that gives generation and review to one identity before either runs.",
    );
  });

  // QFAI:EX-0001-0099-01
  // QFAI:EX-0001-0099-02
  it("records the execution plan before the first review", async () => {
    const table = flat(
      section(await read(tree, "step/prototyping-loop/STEP.md"), "Delegation Scope Table"),
    );
    expect(table).toContain(
      "Record `targetIterations`, `evaluationAxesSource`, `delegationMap` and `plannedAt` in `.qfai/prototype/progress.md` before the first review.",
    );
  });

  // QFAI:EX-0001-0102-01
  // QFAI:EX-0001-0103-01
  it("gives the reviewer its mandatory inputs and every DESIGN.md category to check", async () => {
    const prompt = flat(await read(tree, "skill/qfai-prototyping/references/reviewer-prompt.md"));
    expect(prompt).toContain(
      "A screenshot or HTML snapshot, only when one was taken. Name any mandatory input you did not receive in a finding.",
    );
    expect(prompt).toContain("The layout anti-pattern registry the package ships.");
    expect(prompt).toContain(
      "check the prototype against every category `DESIGN.md` declares, and name each mismatch in a finding or in `designMdViolations[]`.",
    );
  });
});

describe("the qfai command", () => {
  // QFAI:EX-0001-0228-01
  // QFAI:EX-0001-0228-04
  it("has no prototyping command group", async () => {
    for (const action of ["preflight", "iterate", "certify", "rescope", "show-ui-contract"]) {
      expect(await exitCodeOf(["prototyping", action])).toBe(EXIT_CODES.findings);
    }
  });

  // QFAI:EX-0001-0138-01
  it("accepts only a full UI-NNNN pin and keeps it unchanged", async () => {
    for (const value of ["0001", "UI-1"]) {
      await withConfig(`prototyping:\n  primaryUiContract: "${value}"\n`, async (root) => {
        const loaded = await loadConfig(root);
        expect(loaded.config.prototyping?.primaryUiContract).toBeUndefined();
        const message = readRejectedPrimaryUiContract(loaded);
        expect(message).toContain("UI-NNNN");
        expect(message).toContain(`"${value}"`);
      });
    }
    await withConfig("prototyping:\n  primaryUiContract: UI-0001\n", async (root) => {
      const loaded = await loadConfig(root);
      expect(loaded.config.prototyping?.primaryUiContract).toBe("UI-0001");
      expect(readRejectedPrimaryUiContract(loaded)).toBeUndefined();
    });
  });

  // QFAI:EX-0001-0138-02
  it("names the key and the value of a refused configured pin", async () => {
    await withConfig("prototyping:\n  primaryUiContract: CON-UI-0002\n", async (root) => {
      const loaded = await loadConfig(root);
      expect(loaded.config.prototyping?.primaryUiContract).toBeUndefined();
      const message = readRejectedPrimaryUiContract(loaded);
      expect(message).toContain("prototyping.primaryUiContract");
      expect(message).toContain('"CON-UI-0002"');
    });
  });
});
