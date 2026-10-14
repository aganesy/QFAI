import { cp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";

async function sourceUpdateFixture() {
  const fixture = await completedCodeSnapshotFixture();
  await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
  await writeFile(
    path.join(fixture.analysis, "checkout.ts"),
    "export function checkout() { return 3; }\n",
  );
  await rm(fixture.candidate, { recursive: true });
  const generation = localCodeGenerationProcess(fixture);
  const run: GraphProcess = async (command, args, options) => {
    const result = await generation(command, args, options);
    if (!args.includes("status") || args[2] !== fixture.analysis) return result;
    const status: Record<string, unknown> = JSON.parse(result.stdout);
    return {
      ...result,
      stdout: JSON.stringify({ ...status, pendingChanges: { added: 0, modified: 1, removed: 0 } }),
    };
  };
  return { ...fixture, run };
}

// QFAI:EX-0001-0236-06
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `if (await inspectCurrentCodeAnalysis(root, run))` -> `if (true)` fails "updates an uncommitted indexed edit before accepting fresh native analysis"
it("updates an uncommitted indexed edit before accepting fresh native analysis", async () => {
  const fixture = await sourceUpdateFixture();
  try {
    const changed = "export function checkout() { return 8; }\n";
    await writeFile(path.join(fixture.root, "checkout.ts"), changed);
    expect(await prepareCodeAnalysis(fixture.root, fixture.run, fixture.environment)).toMatchObject(
      { status: "prepared", source: "generated" },
    );
    expect(await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8")).toBe(changed);
    expect(
      fixture.observed.filter((args) => args.includes("status")).length,
    ).toBeGreaterThanOrEqual(2);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-07
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `if (await inspectCurrentCodeAnalysis(root, run))` -> `if (true)` fails "includes a newly added source in native freshness and replacement analysis"
it("includes a newly added source in native freshness and replacement analysis", async () => {
  const fixture = await sourceUpdateFixture();
  try {
    const added = "export function calculateTotal() { return 9; }\n";
    await writeFile(path.join(fixture.root, "total.ts"), added);
    expect(await prepareCodeAnalysis(fixture.root, fixture.run, fixture.environment)).toMatchObject(
      { status: "prepared", source: "generated" },
    );
    expect(await readFile(path.join(fixture.analysis, "total.ts"), "utf8")).toBe(added);
    expect(
      fixture.observed.filter((args) => args.includes("status")).length,
    ).toBeGreaterThanOrEqual(2);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-08
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `if (await inspectCurrentCodeAnalysis(root, run))` -> `if (true)` fails "removes deleted source evidence before accepting replacement analysis"
it("removes deleted source evidence before accepting replacement analysis", async () => {
  const fixture = await sourceUpdateFixture();
  try {
    await rm(path.join(fixture.root, "checkout.ts"));
    expect(await prepareCodeAnalysis(fixture.root, fixture.run, fixture.environment)).toMatchObject(
      { status: "prepared", source: "generated" },
    );
    await expect(readFile(path.join(fixture.analysis, "checkout.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      fixture.observed.filter((args) => args.includes("status")).length,
    ).toBeGreaterThanOrEqual(2);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-09
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `if (await inspectCurrentCodeAnalysis(root, run))` -> `if (true)` fails "reconciles old and new source paths after an uncommitted rename"
it("reconciles old and new source paths after an uncommitted rename", async () => {
  const fixture = await sourceUpdateFixture();
  try {
    await rename(path.join(fixture.root, "checkout.ts"), path.join(fixture.root, "purchase.ts"));
    expect(await prepareCodeAnalysis(fixture.root, fixture.run, fixture.environment)).toMatchObject(
      { status: "prepared", source: "generated" },
    );
    await expect(readFile(path.join(fixture.analysis, "checkout.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await readFile(path.join(fixture.analysis, "purchase.ts"), "utf8")).toContain(
      "function checkout",
    );
    expect(
      fixture.observed.filter((args) => args.includes("status")).length,
    ).toBeGreaterThanOrEqual(2);
  } finally {
    await fixture.dispose();
  }
});
