/**
 * Integration: the exploration-mode relaxation reports itself.
 *
 * `prototyping.mode: exploration` downgrades the soft-rubric gates
 * (QFAI-CRIT-008, QFAI-DCON-030..032) from error to warning. Weakening
 * a gate is the same act as waiving one, so it must be as auditable:
 * `validate.json` has to say that the downgrade happened, which file on
 * disk caused it, and which codes it touched. Before this wiring the
 * only difference between an exploration run and a convergence run was
 * the `severity` field of the affected findings.
 *
 * Fixture: a UI-bearing project (a `contracts/ui/*.yaml` exists) with no
 * root DESIGN.md, so `validatePrototypingDesignContractReadiness` emits
 * QFAI-DCON-030 / QFAI-DCON-031 at error. Flipping
 * `prototyping.json#iterations[0].mode` is the only variable.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

const UI_CONTRACT = `screens:
  - id: orders
    title: Orders
`;

let root: string;

async function seedProject(mode: "convergence" | "exploration"): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  const protoDir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(uiDir, { recursive: true });
  await mkdir(protoDir, { recursive: true });
  await writeFile(path.join(uiDir, "orders.yaml"), UI_CONTRACT, "utf-8");
  await writeFile(
    path.join(protoDir, "prototyping.json"),
    `${JSON.stringify({ iterations: [{ index: 0, mode }] }, null, 2)}\n`,
    "utf-8",
  );
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-exploration-audit-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("exploration relaxation is recorded in the validate result", () => {
  it("convergence keeps the soft gate at error and emits no relaxation notice", async () => {
    await seedProject("convergence");
    const result = await validateProject(root, undefined, { profile: "prototyping" });
    const dcon030 = result.issues.find((i) => i.code === "QFAI-DCON-030");
    expect(dcon030?.severity).toBe("error");
    expect(dcon030?.relaxedFrom).toBeUndefined();
    expect(result.issues.some((i) => i.code === "QFAI-PROT-337")).toBe(false);
  });

  it("exploration downgrades the gate, stamps relaxedFrom and emits the notice", async () => {
    await seedProject("exploration");
    const result = await validateProject(root, undefined, { profile: "prototyping" });
    const dcon030 = result.issues.find((i) => i.code === "QFAI-DCON-030");
    expect(dcon030?.severity).toBe("warning");
    expect(dcon030?.relaxedFrom).toBe("error");

    const notices = result.issues.filter((i) => i.code === "QFAI-PROT-337");
    expect(notices.length).toBe(1);
    const notice = notices[0];
    expect(notice?.severity).toBe("info");
    expect(notice?.file).toBe(".qfai/evidence/prototyping/prototyping.json");
    expect(notice?.message).toContain("exploration");
    expect(notice?.message).toContain("QFAI-DCON-030");
    // A downgraded gate must never be mistaken for an authored warning:
    // the notice is the human-readable half of the same audit trail.
    expect(notice?.rule).toBe("prototypingMode.explorationRelaxation");
  });
});
