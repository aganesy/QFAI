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
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  it("exits 64 (coverage rejection class) and names the missing (spec, screen) pair in stderr when a frozen-set spec lacks a declared screen's review.json", async () => {
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
      // 11th-wave Fix (codex r3265482136, P2): the per-spec layout
      // coverage gap returns exit 64 — same class as the flat-iter
      // multi-spec coverage rejection — not exit 2 (input error).
      // Lock the exit code so a future regression to exit 2 fails
      // here.
      expect(exit).toBe(64);
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
      const namesSettings = messages.some((m) => m.includes("spec-0007") && m.includes("settings"));
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
      const namesSettings = messages.some((m) => m.includes("spec-0007") && m.includes("settings"));
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// Regression for codex review r3264630513 (P1): the per-(spec × screen)
// review.json presence gate is opt-in based on actual per-spec layout
// presence at the accepted iter. Flat-iter projects (the legacy
// `iter-NN/index.html` shape that prototypingIterate + SKILL.md still
// emit) must NOT have the gate enforced for SINGLE-spec frozen sets;
// pre-fix the gate ran unconditionally and would fail every (spec,
// screen) pair on a normal run that followed the shipped plan. The
// per-spec layout migration is tracked under OQ-0012-0006 / TDD-0384.
//
// Tightened in the 6th late-review wave (codex r3264798065, P1): the
// flat-iter skip is now CONDITIONAL on `frozenSpecsCovered.length <= 1`.
// Multi-spec frozen sets on a flat iter ERROR (see TC-0012-0403 below) —
// the legacy flat layout structurally cannot host per-spec review.json
// files for secondary specs and the skip would re-open the TDD-0387
// vulnerability.
describe("qfai prototyping certify (codex r3264630513: flat-iter layout skips the per-(spec × screen) gate)", () => {
  // QFAI:SPEC-0012:TC-0012-0402
  it("exits 0 on a single-spec flat-iter project (no per-spec subdirs at the accepted iter)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Single-spec frozen set on a flat iter — only `iter-01/index.html`
    // exists, no `iter-01/spec-*/` subdirs. The gate must skip with an
    // info note and let the run succeed. Multi-spec flat-iter is
    // covered separately by TC-0012-0403.
    await seedAllGatesPass(root, {
      specsCovered: ["0012"],
      frozenSpecsCovered: ["0012"],
    });
    // Seed a single UI screen contract so the gate would otherwise
    // trigger (`screenContracts.length > 0`).
    await seedUiScreens(root, ["home"]);
    // Crucially: NO `seedReviewJson` calls. The flat iter has just
    // `index.html` (seeded by seedAllGatesPass) + `home.html` (seeded
    // by seedUiScreens). No per-spec subdir exists, so the gate skips.

    const logger = await import("../../../src/cli/lib/logger.js");
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(0);
      // The skip path must surface an operator-facing info note so the
      // deferred migration stays visible. Match on the canonical tokens
      // (`per-spec`, `layout not detected`, `skipping`).
      const infoMessages = infoSpy.mock.calls.map((c) => String(c[0]));
      const noteEmitted = infoMessages.some(
        (m) => /per-spec/i.test(m) && /not detected/i.test(m) && /skipping/i.test(m),
      );
      expect(noteEmitted).toBe(true);
    } finally {
      infoSpy.mockRestore();
    }
  });

  // QFAI:SPEC-0012:TC-0012-0403
  // codex review r3264798065 (P1): tighten the flat-iter skip. Pre-fix
  // the skip was unconditional, so a multi-spec frozen set on a flat
  // iter (no per-spec subdir) silently passed certify — re-opening
  // TDD-0387's vulnerability (a frozen secondary spec ships a sealed
  // cert with zero review.json evidence). Post-fix certify ERRORs
  // non-zero with a message naming the incompatibility and pointing at
  // the deferred migration.
  it("exits non-zero on a multi-spec flat-iter project (no per-spec subdirs at the accepted iter)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Multi-spec frozen set on a flat iter — pre-fix this short-circuited
    // the per-(spec × screen) gate via the unconditional info-skip and
    // sealed a cert with zero review.json for spec-0007.
    await seedAllGatesPass(root, {
      specsCovered: ["0012"],
      frozenSpecsCovered: ["0012", "0007"],
    });
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await seedUiScreens(root, ["home"]);
    // Crucially: NO `seedReviewJson` calls and NO per-spec subdir.

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      // Exit 64 = coverage rejection (at least one spec lacks a
      // review.json for a declared screen) per the prototyping CLI
      // contract. The multi-spec flat-iter incompatibility falls into
      // that same class — splitting it across 2 (input error) and 64
      // would break operator workflows that key on 64 for missing
      // review.json gaps.
      expect(exit).toBe(64);
      // The error message must name the multi-spec incompatibility
      // (so the operator knows the run is structurally blocked) and
      // the deferred-migration hint (so the operator knows the path
      // forward). Internal IDs (TDD-/OQ-) are intentionally not in the
      // runtime string; they stay in 09_delta.md only.
      const errorMessages = errorSpy.mock.calls.map((c) => String(c[0]));
      const namesMultiSpec = errorMessages.some((m) =>
        /multi-spec frozen set requires per-spec/i.test(m),
      );
      const namesMigration = errorMessages.some((m) =>
        /flat-iter layout migration is deferred/i.test(m),
      );
      expect(namesMultiSpec).toBe(true);
      expect(namesMigration).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("qfai prototyping certify (TC-0012-0405: frozenSpecsCovered drives sealed cert.specsCovered when both fields are populated)", () => {
  // QFAI:SPEC-0012:TC-0012-0405
  it("seals the completion certificate with the multi-spec frozen set (frozen wins over legacy specsCovered) when both fields are populated and every (spec, screen) pair has its review.json", async () => {
    // 7th late-review wave (codex r3264968439, LOW): TC-0012-0399 (the
    // existing precedence test) is a NEGATIVE assertion — it confirms
    // the multi-spec read by observing certify reject when the
    // secondary spec's review.json is missing. This complementary
    // POSITIVE assertion confirms the *sealed certificate* records the
    // full frozen set (not just the legacy primary spec) when every
    // pair is present. Pre-fix this happy-path was uncovered at the
    // certify call-site; only the unit-level `specsCovered.ts` tests
    // exercised the precedence directly.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    // Legacy single-spec field carries only the primary; frozen field
    // carries the multi-spec set. Production write shape circa Wave-3.
    await seedAllGatesPass(root, {
      specsCovered: ["0007"],
      frozenSpecsCovered: ["0007", "0012"],
    });
    await seedUiScreens(root, ["home"]);
    // Every (spec, screen) pair seeded so the gate exits clean.
    await seedReviewJson(root, "spec-0007", "home");
    await seedReviewJson(root, "spec-0012", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    // Read the sealed cert and assert the recorded scope reflects the
    // multi-spec frozen set, not the legacy single-spec primary.
    const certRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/completion-certificate.json"),
      "utf-8",
    );
    const cert = JSON.parse(certRaw) as { specsCovered: string[] };
    expect(cert.specsCovered).toEqual(["0007", "0012"]);
  });
});

describe("qfai prototyping certify (TC-0012-0406: legacy-only specsCovered fallback seals cleanly when frozenSpecsCovered absent)", () => {
  // QFAI:SPEC-0012:TC-0012-0406
  it("seals the completion certificate with the legacy specsCovered single-spec scope when frozenSpecsCovered is entirely absent (pre-Wave-3 evidence)", async () => {
    // 7th late-review wave (codex r3264968439, LOW): companion to
    // TC-0012-0405. TC-0012-0400 (the existing fallback test) is a
    // NEGATIVE assertion (certify rejects when a fallback-scoped spec
    // is missing review.json). This POSITIVE assertion confirms the
    // sealed certificate records the legacy single-spec scope when the
    // multi-spec field is entirely absent. Pre-Wave-3 evidence must
    // still round-trip cleanly without spurious zero-spec certificates.
    const root = await newTempDir();
    await seedMinimalProject(root);
    // No frozenSpecsCovered field at all — pre-Wave-3 prototyping.json
    // shape. Legacy specsCovered carries the single resolved primary.
    await seedAllGatesPass(root, { specsCovered: ["0007"] });
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await seedUiScreens(root, ["home"]);
    // Single (spec, screen) pair seeded — gate exits clean via fallback.
    await seedReviewJson(root, "spec-0007", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    const certRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/completion-certificate.json"),
      "utf-8",
    );
    const cert = JSON.parse(certRaw) as { specsCovered: string[] };
    expect(cert.specsCovered).toEqual(["0007"]);
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
      const namesSettings = messages.some((m) => m.includes("spec-0007") && m.includes("settings"));
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("qfai prototyping certify (TC-0012-0407: per-spec UI contracts scope the (spec × screen) gate)", () => {
  // QFAI:SPEC-0012:TC-0012-0407
  // 9th late-review wave (codex r3265157640, P1): when per-spec UI
  // contracts declare a non-uniform screen set (spec-0001 → home only;
  // spec-0002 → settings only), the per-(spec × screen) gate must use
  // each spec's OWN contract — not the cross-product of every spec
  // against the union project-wide screen list. Pre-fix the cross-product
  // demanded `spec-0001/settings.review.json` + `spec-0002/home.review.json`
  // that should never exist per the per-spec contract.
  it("uses each spec's per-spec UI contract instead of demanding the project-wide cross-product", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai/specs/spec-0002"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0002/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0002\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001", "0002"],
    });

    // Per-spec UI contracts: spec-0001 declares ONLY "home"; spec-0002
    // declares ONLY "settings". The legacy project-wide cross-product
    // would have demanded `spec-0001/settings.review.json` +
    // `spec-0002/home.review.json` — neither should be required.
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n',
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0002.yaml"),
      'screens:\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    // Also seed HTML for the accepted iter (declared-screen HTML gate
    // requires one html per UNION declared screen; the project-wide
    // discovery still pools `home` + `settings`).
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await writeFile(path.join(iter01, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // Per-spec review.json — only the screens scoped by each spec's
    // own contract:
    await seedReviewJson(root, "spec-0001", "home");
    await seedReviewJson(root, "spec-0002", "settings");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  // 11th late-review wave (codex r3265376163, P2): the per-spec
  // UI contract resolver `readPerSpecScreens` supports 5 file-naming
  // candidates but only candidate #1 (`spec-NNNN.yaml`) was exercised
  // by tests. Add explicit coverage for #2 (`<bare>.yaml`) and #3
  // (`ui-<bare>.yaml`) so the alternate canonical layouts have
  // present-path assertions matching the README documentation.
  // QFAI:SPEC-0012:TC-0012-0418 — wave-11 traceability stitch for the
  // four canonical-layout `it` blocks below (#2 bare-numeric / #3
  // ui-prefixed / #5 recursive subdir / #1 first-hit-wins). Closes
  // the missing TC annotation flagged by codex r3265811711 (MAJOR).
  it("respects the bare-numeric canonical layout (candidate #2: <bare>.yaml)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    // Candidate #2: bare-numeric per-spec contract file.
    await writeFile(
      path.join(root, ".qfai/contracts/ui/0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await seedReviewJson(root, "spec-0001", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  it("respects the ui-prefixed canonical layout (candidate #3: ui-<bare>.yaml)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    // Candidate #3: ui-prefixed bare-numeric per-spec contract file.
    await writeFile(
      path.join(root, ".qfai/contracts/ui/ui-0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await seedReviewJson(root, "spec-0001", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  // Fix D regression: recursive subdir layout
  // `<contractsDir>/ui/<spec-id>/<sub>.yaml` is now a supported per-spec
  // layout (candidate #5). Pre-fix the per-spec reader missed this
  // shape, fell through to the project-wide list, and re-opened the
  // 9th-wave cross-product false-positive.
  it("respects the recursive subdir layout (candidate #5: <spec-id>/<sub>.yaml)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    // Per-spec subdir layout: each screen in its own file under
    // `.qfai/contracts/ui/spec-0001/`.
    await mkdir(path.join(root, ".qfai/contracts/ui/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0001/home.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await seedReviewJson(root, "spec-0001", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  // Fix C regression: true first-hit-wins precedence. When both
  // candidate #1 (`spec-NNNN.yaml`) and candidate #3 (`ui-NNNN.yaml`)
  // exist on disk, only #1 is used. Pre-fix the reader unioned both
  // files which produced surprising cross-file behaviour on authoring
  // forks.
  it("uses candidate #1 only when both #1 and #3 exist on disk (true first-hit-wins)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    // Candidate #1: declares only `home`.
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n',
      "utf-8",
    );
    // Candidate #3 also on disk: declares `settings`. With true first-hit
    // wins, this file MUST be ignored — only `home` should be required.
    await writeFile(
      path.join(root, ".qfai/contracts/ui/ui-0001.yaml"),
      'screens:\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    // Seed HTML for both screens because the project-wide `readUiContractScreenContracts`
    // still pools both files (the HTML gate is project-wide). The per-spec
    // gate scopes to `spec-0001.yaml` only.
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await writeFile(path.join(iter01, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // Only seed home.review.json — if true first-hit-wins is honored,
    // settings.review.json should not be required for spec-0001.
    await seedReviewJson(root, "spec-0001", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  // Negative companion: per-spec scope still enforces presence WITHIN
  // each spec's declared set. spec-0001 declares two screens; missing
  // one of them must still fail.
  // 11th-wave Fix (codex r3265482136, P2): per-spec layout missing-
  // review returns exit 64 (coverage class), not exit 2 (input error).
  it("returns exit 64 (coverage rejection) when per-spec layout is missing a declared review.json", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await writeFile(path.join(iter01, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // Seed only home.review.json under the per-spec subdir; settings is
    // missing → drives the per-spec coverage gap branch.
    await seedReviewJson(root, "spec-0001", "home");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("still enforces presence within a per-spec contract's declared screens", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
      "utf-8",
    );
    await seedAllGatesPass(root, {
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
    });
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/spec-0001.yaml"),
      'screens:\n  - id: home\n    route: "/home"\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    const iter01 = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(iter01, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await writeFile(path.join(iter01, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // Seed only `home.review.json`; `settings.review.json` is missing
    // WITHIN this spec's declared set — must still fail.
    await seedReviewJson(root, "spec-0001", "home");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      const namesMissing = messages.some((m) => m.includes("spec-0001") && m.includes("settings"));
      expect(namesMissing).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("qfai prototyping certify (TC-0012-0425: frozenSpecsCovered canonical id validation)", () => {
  // codex r3270776268 (P2, chatgpt-codex-connector): when a hand-edited
  // `prototyping.json` carries non-canonical spec ids in
  // `frozenSpecsCovered[]` (`/`, `..`, whitespace, etc.), certify must
  // reject the record up-front rather than feed the string to
  // `path.join(root, "iter-NN", <id>, "<screen>.review.json")`. Without
  // this gate, the per-(spec × screen) gate could probe files outside
  // the intended `iter-NN/spec-NNNN/` subtree and falsely "satisfy"
  // missing-review checks with unrelated files.
  it.each<[string, string]>([
    ["path-traversal", "../../../etc/passwd"],
    ["slash-injected", "spec-0001/../../escape"],
    ["whitespace", "0001 "],
    ["non-numeric", "spec-abcd"],
    ["wrong-digit-count", "spec-001"],
  ])(
    "exits 2 and names the malformed id (%s) without constructing any review path",
    async (_label, malformed) => {
      const root = await newTempDir();
      await seedMinimalProject(root);
      await seedAllGatesPass(root, {
        specsCovered: ["0012"],
        frozenSpecsCovered: [malformed],
      });
      await seedUiScreens(root, ["home"]);

      const logger = await import("../../../src/cli/lib/logger.js");
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      try {
        const exit = await runPrototypingCertify({ root, check: false });
        expect(exit).toBe(2);
        const messages = errorSpy.mock.calls.map((c) => String(c[0]));
        // The malformed id must be echoed verbatim in the diagnostic
        // so operators can find the offending record line.
        const echoesMalformed = messages.some((m) => m.includes(JSON.stringify(malformed)));
        expect(echoesMalformed).toBe(true);
        // And the diagnostic must point operators at the canonical
        // shape — not just say "invalid".
        const namesShape = messages.some((m) => m.includes("spec-NNNN") || m.includes("4-digit"));
        expect(namesShape).toBe(true);
      } finally {
        errorSpy.mockRestore();
      }
    },
  );

  it("accepts canonical bare 4-digit and fully-qualified spec-NNNN ids in the same frozen set", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, {
      specsCovered: ["0012"],
      frozenSpecsCovered: ["0012", "spec-0007"],
    });
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "spec-0012", "home");
    await seedReviewJson(root, "spec-0007", "home");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });
});
