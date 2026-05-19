/**
 * TC-0012-0381 (TDD-0398) — `qfai prototyping certify` rejects when any
 * spec in the cycle-0 frozen set lacks any declared screen's
 * `<screen>.review.json` at the accepted iter; stderr names the missing
 * `(spec, screen)` pair.
 *
 * Scope: integration. Lives at the path specified in TC-0012-0381's
 * "Test file" field (`packages/qfai/tests/cli/commands/prototypingCertify.test.ts`)
 * so the spec → test traceability is structurally stable. The
 * pre-existing flat-iter certify integration suite remains under
 * `packages/qfai/tests/cli/prototypingCertify.test.ts` (TC-3.6.x +
 * earlier multi-screen HTML / lock / stale-iter cases).
 *
 * Simplification documented in the task brief: UI contracts are
 * project-wide today (one `screens:` list under `.qfai/contracts/ui/`),
 * so the same declared-screen set applies to every spec in the frozen
 * set. Per-spec screen contracts (a per-(spec × screen) declaration
 * surface) are deferred to Wave 1's reviewerDispatch work.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingCertify } from "../../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../../src/core/design/designMd.js";

// Canonical DESIGN.md that satisfies the brand-SSOT parse + final-iter
// violation scan. Copied verbatim from the legacy fixture so the
// completion-certificate flow runs end-to-end here.
const CERT_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
  "Restrained.",
  "",
].join("\n");

const CLEAN_FINAL_HTML =
  "<!doctype html>\n<html><head><style>body { font-family: Inter, system-ui, sans-serif; }</style></head>" +
  "<body><main><h1>Acme</h1></main></body></html>\n";

// Minimal qualitative review payload — the certify presence check only
// cares about file existence at the expected path, not the schema.
const REVIEW_JSON_STUB = JSON.stringify({ ok: true });

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-cmd-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedMinimalProject(root: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0012"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n",
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/02_User-stories.md"),
    "# stories\n",
    "utf-8",
  );
}

async function seedAllGatesPass(
  root: string,
  options: { specsCovered?: string[]; frozenSpecsCovered?: string[] } = {},
): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), CERT_DESIGN_MD, "utf-8");
  // Accepted iter index = 1 (iterations: [{0}, {1}]). seedAllGatesPass
  // seeds iter-00 + iter-01 with a clean index.html so the existing
  // HTML / violation gates pass; per-spec subdirs are added by the
  // individual tests.
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
  await mkdir(iter00, { recursive: true });
  await mkdir(iter01, { recursive: true });
  await writeFile(path.join(iter01, "index.html"), CLEAN_FINAL_HTML, "utf-8");

  await mkdir(path.join(root, ".qfai/report"), { recursive: true });
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  const validateJson = JSON.stringify({ counts: { error: 0, warning: 0, info: 0 } });
  await writeFile(path.join(root, ".qfai/report/validate.json"), validateJson, "utf-8");
  await writeFile(path.join(root, ".qfai/output/validate.json"), validateJson, "utf-8");
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS" }),
    "utf-8",
  );
  const protoBody: Record<string, unknown> = {
    mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    surface: "web",
    runId: "run-cert-test",
    designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
    specsCovered: options.specsCovered ?? ["0012"],
    reviewerGate: {
      result: "PASS",
      signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
    },
    iterations: [{ index: 0 }, { index: 1 }],
  };
  if (options.frozenSpecsCovered !== undefined) {
    protoBody.frozenSpecsCovered = options.frozenSpecsCovered;
  }
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify(protoBody),
    "utf-8",
  );
}

async function seedUiScreens(root: string, screenIds: string[]): Promise<void> {
  await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
  const screensYaml = ["screens:"]
    .concat(screenIds.map((id) => `  - id: ${id}\n    route: "/${id}"`))
    .join("\n");
  await writeFile(path.join(root, ".qfai/contracts/ui/main.yaml"), `${screensYaml}\n`, "utf-8");
  // The existing accepted-iter HTML gate requires one html per declared
  // screen; seed those so the test isolates the new review.json gate.
  const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
  for (const id of screenIds) {
    await writeFile(path.join(iter01, `${id}.html`), CLEAN_FINAL_HTML, "utf-8");
  }
}

async function seedReviewJson(
  root: string,
  specDirName: string,
  screenId: string,
  iterIndex = 1,
): Promise<void> {
  const dir = path.join(
    root,
    `.qfai/evidence/prototyping/iter-${String(iterIndex).padStart(2, "0")}/${specDirName}`,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${screenId}.review.json`), REVIEW_JSON_STUB, "utf-8");
}

describe("qfai prototyping certify (TC-0012-0381: per-(spec × screen) review.json presence)", () => {
  it("exits non-zero and names the missing (spec, screen) pair in stderr when a frozen-set spec lacks a declared screen's review.json", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { specsCovered: ["0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    // Seed only `home.review.json`; `settings.review.json` is the
    // missing pair we expect certify to name.
    await seedReviewJson(root, "spec-0012", "home");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      // Stderr must explicitly name the (spec, screen) pair that is
      // missing. Match on both tokens jointly to lock the diagnostic
      // shape — a refactor that drops either half loses operator
      // pinpointability.
      const namesPair = messages.some((m) => m.includes("spec-0012") && m.includes("settings"));
      expect(namesPair).toBe(true);
      // Defensive: the present (home) pair must NOT appear in the
      // missing-list section. If the diagnostic is grouped, the same
      // logged line may contain both as part of a path label; we only
      // require that `settings` appear at all. The negative side is
      // checked by the AC-0012-0047 unit test (TC-0012-0382).
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 0 when every (spec × screen) pair in the frozen set has its review.json at the accepted iter", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { specsCovered: ["0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "spec-0012", "home");
    await seedReviewJson(root, "spec-0012", "settings");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  it("rejects across multiple frozen specs — names the (spec, screen) pair for the spec whose subdir is entirely missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Frozen set has two specs; only spec-0012 has any review.jsons
    // (every screen present). spec-0007's entire subdir is absent at
    // the accepted iter — both its (spec, screen) pairs must be flagged.
    await seedAllGatesPass(root, { specsCovered: ["0012", "0007"] });
    // spec-0007 must exist on disk so `validateSpecIdLinkage`-style
    // wiring (used elsewhere) does not pre-empt this gate; certify
    // does not invoke that validator directly, but seed for parity
    // with the other multi-spec fixture in the legacy suite.
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "spec-0012", "home");
    await seedReviewJson(root, "spec-0012", "settings");
    // spec-0007: nothing seeded → both (spec-0007, home) and
    // (spec-0007, settings) are missing.

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      const namesHome = messages.some((m) => m.includes("spec-0007") && m.includes("home"));
      const namesSettings = messages.some(
        (m) => m.includes("spec-0007") && m.includes("settings"),
      );
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  // Moved out into a separate describe block below per the
  // traceability review (TC-0012-0381 owns only the per-(spec × screen)
  // presence axis; the frozenSpecsCovered preference / fallback axes
  // live under their own TCs).
});

describe("qfai prototyping certify (TC-0012-0399: frozenSpecsCovered preferred over legacy specsCovered)", () => {
  // QFAI:SPEC-0012:TC-0012-0399
  it("iterates the cycle-0-frozen multi-spec set (frozenSpecsCovered) — not the legacy single-spec specsCovered — when both fields are present", async () => {
    // Regression for the Wave-3 multi-spec write: `iterate --cycle 0`
    // persists the FULL UI-bearing set under `frozenSpecsCovered` and
    // leaves `specsCovered` populated with only the resolved primary
    // spec. Pre-fix, the certify per-(spec × screen) gate read
    // `specsCovered` and therefore only enforced presence for the
    // primary spec; a frozen-set secondary spec could be entirely
    // missing review.json files and certify still sealed the
    // certificate. Post-fix, certify reads `frozenSpecsCovered` first
    // (falling back to `specsCovered` only when the multi-spec field
    // is absent).
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Seed spec-0007 on disk for parity with the multi-spec fixture in
    // the previous test (`validateSpecIdLinkage`-style preconditions
    // are project-wide, not certify-direct).
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    // Mimic the Wave-3 production shape: specsCovered = [primary],
    // frozenSpecsCovered = [primary, secondary]. Pre-fix the certify
    // gate iterated only specsCovered = ["0001"] and silently passed
    // even though spec-0007 has zero review.json files.
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001", "0007"],
    });
    await seedUiScreens(root, ["home", "settings"]);
    // Seed review.json for the primary spec only; the secondary
    // (spec-0007) is the silent gap pre-fix.
    await seedReviewJson(root, "spec-0001", "home");
    await seedReviewJson(root, "spec-0001", "settings");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      // Stderr MUST name the missing (spec-0007, *) pairs — pre-fix
      // these messages were absent because the gate iterated only
      // specsCovered=["0001"].
      const namesHome = messages.some((m) => m.includes("spec-0007") && m.includes("home"));
      const namesSettings = messages.some(
        (m) => m.includes("spec-0007") && m.includes("settings"),
      );
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

});

describe("qfai prototyping certify (TC-0012-0400: legacy specsCovered fallback when frozenSpecsCovered absent)", () => {
  // QFAI:SPEC-0012:TC-0012-0400
  it("falls back to specsCovered for pre-Wave-3 evidence that lacks frozenSpecsCovered", async () => {
    // Backward-compat sentinel: when `frozenSpecsCovered` is entirely
    // absent (pre-Wave-3 prototyping.json), the gate continues to
    // iterate `specsCovered`. Pin this so the fallback path is not
    // accidentally regressed by a future refactor that hard-removes
    // the legacy read.
    const root = await newTempDir();
    await seedMinimalProject(root);
    // No frozenSpecsCovered key at all; specsCovered carries the
    // multi-spec set in this pre-Wave-3 shape.
    await seedAllGatesPass(root, { specsCovered: ["0012", "0007"] });
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await seedUiScreens(root, ["home", "settings"]);
    // spec-0012 fully covered; spec-0007 has nothing → both
    // (spec-0007, *) pairs missing.
    await seedReviewJson(root, "spec-0012", "home");
    await seedReviewJson(root, "spec-0012", "settings");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      const namesHome = messages.some((m) => m.includes("spec-0007") && m.includes("home"));
      const namesSettings = messages.some(
        (m) => m.includes("spec-0007") && m.includes("settings"),
      );
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
