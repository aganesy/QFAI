import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

type SpecSeed = { specNumber: string; usIds: string[]; uiBearing?: boolean };

async function seed(root: string, specs: SpecSeed[]): Promise<void> {
  for (const spec of specs) {
    const specDir = path.join(root, ".qfai", "specs", `spec-${spec.specNumber}`);
    await mkdir(specDir, { recursive: true });
    await writeFile(
      path.join(specDir, "01_Spec.md"),
      ["# 01 Spec", "", ...(spec.uiBearing ? ["- surface_type: ui-bearing"] : []), ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      [
        "# 02 User stories",
        "",
        ...spec.usIds.flatMap((id) => [`## ${id}: title`, "- Parent: CAP-0001", ""]),
      ].join("\n"),
      "utf-8",
    );
  }
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-surface-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const missingUsRefs = (
  issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>,
): string[] => issues.find((entry) => entry.code === "QFAI-ATDD-111")?.refs ?? [];

describe("QFAI-ATDD-111 is scoped by surface type", () => {
  it("exempts a non-UI spec once the project uses surface typing", async () => {
    await withProject(async (root) => {
      await seed(root, [
        { specNumber: "0001", usIds: ["US-0001"], uiBearing: true },
        { specNumber: "0002", usIds: ["US-0001"] },
      ]);

      const refs = missingUsRefs(await validateAtddCodeTraceability(root, defaultConfig));
      expect(refs.some((ref) => ref.includes("0001"))).toBe(true);
      expect(refs.some((ref) => ref.includes("SPEC-0002"))).toBe(false);
    });
  });

  it("keeps the obligation project-wide when no spec declares a surface", async () => {
    await withProject(async (root) => {
      await seed(root, [
        { specNumber: "0001", usIds: ["US-0001"] },
        { specNumber: "0002", usIds: ["US-0001"] },
      ]);

      // Nothing opted into surface typing, so this change relaxes nothing.
      const refs = missingUsRefs(await validateAtddCodeTraceability(root, defaultConfig));
      expect(refs.some((ref) => ref.includes("SPEC-0001"))).toBe(true);
      expect(refs.some((ref) => ref.includes("SPEC-0002"))).toBe(true);
    });
  });

  it("still fires for a UI-bearing spec with no E2E reference", async () => {
    await withProject(async (root) => {
      await seed(root, [{ specNumber: "0003", usIds: ["US-0001"], uiBearing: true }]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-111");
      expect(finding?.severity).toBe("error");
    });
  });

  it("keeps a spec pinned by prototyping.primarySpecId inside the scope", async () => {
    await withProject(async (root) => {
      // The strict frontmatter-only resolver would drop spec-0002 as soon as
      // spec-0001 declared a surface, silently passing its unreferenced US.
      await seed(root, [
        { specNumber: "0001", usIds: ["US-0001"], uiBearing: true },
        { specNumber: "0002", usIds: ["US-0002"] },
      ]);

      const pinnedConfig = {
        ...defaultConfig,
        prototyping: { ...defaultConfig.prototyping, primarySpecId: "0002" },
      };
      const refs = missingUsRefs(await validateAtddCodeTraceability(root, pinnedConfig));
      expect(refs.some((ref) => ref.includes("SPEC-0002"))).toBe(true);
    });
  });

  it("keeps a spec whose only surface signal is a UI contract inside the scope", async () => {
    await withProject(async (root) => {
      // `resolveAllUiBearingSpecs` admits `.qfai/contracts/ui/<spec-id>*.yaml`,
      // so a project that declares surfaces only through contracts is in scope.
      await seed(root, [
        { specNumber: "0001", usIds: ["US-0001"], uiBearing: true },
        { specNumber: "0002", usIds: ["US-0002"] },
      ]);
      const uiDir = path.join(root, ".qfai", "contracts", "ui");
      await mkdir(uiDir, { recursive: true });
      await writeFile(path.join(uiDir, "ui-0002-screen.yaml"), "screens: []\n", "utf-8");

      const refs = missingUsRefs(await validateAtddCodeTraceability(root, defaultConfig));
      expect(refs.some((ref) => ref.includes("SPEC-0002"))).toBe(true);
    });
  });

  it("scopes the user-facing wording of the finding and its expected text", async () => {
    await withProject(async (root) => {
      await seed(root, [{ specNumber: "0003", usIds: ["US-0001"], uiBearing: true }]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-111");
      // "全 US" would send the operator to annotate the exempted non-UI specs
      // too, re-introducing the annotation-only E2E tree this scope prevents.
      expect(finding?.suggested_action ?? "").not.toContain("全 US");
      expect(finding?.suggested_action ?? "").toContain("user-facing surface を宣言した spec のみ");
    });
  });

  it("keeps a legacy title-marker spec inside the scope", async () => {
    await withProject(async (root) => {
      await seed(root, [{ specNumber: "0001", usIds: ["US-0001"], uiBearing: true }]);

      const specDir = path.join(root, ".qfai", "specs", "spec-0002");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "01_Spec.md"),
        ["# 01 Spec prototyping surface", ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "02_User-stories.md"),
        ["# 02 User stories", "", "## US-0002: title", "- Parent: CAP-0001", ""].join("\n"),
        "utf-8",
      );

      const refs = missingUsRefs(await validateAtddCodeTraceability(root, defaultConfig));
      expect(refs.some((ref) => ref.includes("SPEC-0002"))).toBe(true);
    });
  });
});
