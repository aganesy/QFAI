/**
 * Tests for `qfai prototyping certify` and `qfai prototyping show-ui-contract`
 * (v1.8.4 Phase 5).
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  findStaleIterDirs,
  runPrototypingCertify,
  runPrototypingShowUiContract,
} from "../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../src/core/design/designMd.js";
import { COMPLETION_CERTIFICATE_REL_PATH } from "../../src/core/prototyping/certificate.js";
import { reviewPayload } from "../helpers/reviewPayload.js";

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

async function seedDesignMdAndFinalHtml(
  root: string,
  options: { iterIndex?: number; html?: string; designMd?: string } = {},
): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), options.designMd ?? CERT_DESIGN_MD, "utf-8");
  const iterIndex = options.iterIndex ?? 1;
  const iterDir = path.join(
    root,
    `.qfai/evidence/prototyping/iter-${String(iterIndex).padStart(2, "0")}`,
  );
  await mkdir(iterDir, { recursive: true });
  await writeFile(path.join(iterDir, "index.html"), options.html ?? CLEAN_FINAL_HTML, "utf-8");
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-cert-"));
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

async function seedMinimalProject(root: string, opts?: { specMarker?: boolean }): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/spec/03_contract",
      "  specsDir: .qfai/spec",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skill",
      "  promptsDir: .qfai/assistant/prompt",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
    "# QFAI-CONTRACT-ID: CON-UI-0012\nscreens: [{id: index, route: /}]\n",
    "utf-8",
  );
  void opts;
}

async function seedAllGatesPass(root: string): Promise<void> {
  // DESIGN.md compliance gate added in Phase 3b — every passing-gates
  // fixture seeds a parseable DESIGN.md plus a final-iter HTML free of
  // violations.
  await seedDesignMdAndFinalHtml(root);
  // v1.8.4 Phase 11.7+: certify now reads validate.json from
  // config.output.validateJsonPath (default: .qfai/report/validate.json),
  // not hardcoded .qfai/output/. Seed both locations so tests work
  // regardless of the default.
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
  await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify({
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      surface: "web",
      runId: "run-test-2026",
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
      uiContractsCovered: ["CON-UI-0012"],
      frozenSurfaceUnion: ["CON-UI-0012"],
      reviewerGate: {
        result: "PASS",
        signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
      },
      iterations: [{ index: 0 }, { index: 1 }],
    }),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
    "{}\n",
    "utf-8",
  );
  const reviewDir = path.join(root, ".qfai/evidence/prototyping/iter-01/CON-UI-0012");
  await mkdir(reviewDir, { recursive: true });
  await writeFile(
    path.join(reviewDir, "index.review.json"),
    reviewPayload("CON-UI-0012", "index"),
    "utf-8",
  );
}

describe("qfai prototyping certify (generate)", () => {
  it("writes completion-certificate.json when all gates pass", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);

    const exit = await runPrototypingCertify({ root, check: false });

    expect(exit).toBe(0);
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as {
      runId: string;
      uiContractsCovered: string[];
      reviewerSignoff: { reviewerId: string };
      iterationCount: number;
    };
    expect(body.runId).toBe("run-test-2026");
    expect(body.uiContractsCovered).toEqual(["CON-UI-0012"]);
    expect(body.reviewerSignoff.reviewerId).toBe("test-reviewer");
    expect(body.iterationCount).toBe(2);
  });

  it("exits 2 when prototyping.json is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when runId is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({ mode: { effective: "standard", source: "test", rationale: "x" } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when validate.json reports errors", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Override the validate.json that certify actually reads (default
    // config.output.validateJsonPath = .qfai/report/validate.json).
    await writeFile(
      path.join(root, ".qfai/report/validate.json"),
      JSON.stringify({ counts: { error: 3, warning: 0, info: 0 } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when verify.json status is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "FAIL" }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  // A missing file is not a failing verify. Without its own branch the run
  // reached the `status must be PASS` message, sending the operator to inspect
  // a status in a file that is not there.
  it("reports verify.json as missing rather than as a failing status", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Clear both locations the reader looks at.
    for (const rel of [".qfai/report/verify.json", ".qfai/output/verify.json"]) {
      await rm(path.join(root, rel), { force: true });
    }

    const logger = await import("../../src/cli/lib/logger.js");
    const errors: string[] = [];
    const errorSpy = vi.spyOn(logger, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    let exit: number;
    try {
      exit = await runPrototypingCertify({ root, check: false });
    } finally {
      errorSpy.mockRestore();
    }
    expect(exit).toBe(2);

    const joined = errors.join("\n");
    expect(joined).toContain("verify.json is missing");
    expect(joined).toContain("/qfai-verify");
    expect(joined).not.toContain("status must be PASS");
  });

  it("exits 2 on a broken canonical verify.json instead of certifying from the legacy one", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // `seedAllGatesPass` leaves a passing legacy `.qfai/output/verify.json`.
    await seedAllGatesPass(root);
    // A corrupt canonical file must NOT be treated as absent: falling back
    // would certify from the stale legacy PASS while the real gate result was
    // never readable.
    await writeFile(path.join(root, ".qfai/report/verify.json"), "{ not json", "utf-8");

    const logger = await import("../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
      const logged = errorSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain(".qfai/report/verify.json exists but is not a usable verify result");
      expect(logged).toContain("invalid JSON");
      expect(logged).not.toContain("read .qfai/output/verify.json (legacy)");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 2 when prototyping.json#iterations[] is empty (and identifies the empty-iterations branch in the error log)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Override prototyping.json to have an empty iterations[] while
    // every other gate stays passing. This locks the SPECIFIC
    // exit-2 branch — without the log assertion, a refactor of
    // validator order could let the test stay green by failing on a
    // different precondition.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "explicit-request", rationale: "test" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        uiContractsCovered: ["CON-UI-0012"],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [],
      }),
      "utf-8",
    );
    const logger = await import("../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("prototyping.json#iterations is empty"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 2 when reviewerGate is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Re-seed prototyping.json without reviewerGate.result === PASS
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        runId: "run-x",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        reviewerGate: { result: "REVISE" },
      }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("rejects a UI contract added after the cycle-0 scope was frozen", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/contracts/ui/extra.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens:\n  - id: extra\n",
      "utf-8",
    );

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
    await expect(readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("exits 2 when prototyping.json#uiContractsCovered is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Re-write prototyping.json without the uiContractsCovered slot.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("exits 2 when prototyping.json#uiContractsCovered is malformed (empty array)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        uiContractsCovered: [],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("accepts legacy reviewer signoff fields when issuing the certificate", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-x",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        uiContractsCovered: ["CON-UI-0012"],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewer: "legacy-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as { reviewerSignoff: { reviewerId: string } };
    expect(body.reviewerSignoff.reviewerId).toBe("legacy-reviewer");
  });
});

describe("qfai prototyping certify (multi-screen accepted-iter HTML check)", () => {
  it("exits 2 when accepted iter is missing HTML for a declared screen contract", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Plant a UI contract declaring two screens; the seeded
    // accepted-iter (iter-01) has only `index.html`, not
    // `home.html` / `settings.html`.
    await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
      [
        "# QFAI-CONTRACT-ID: CON-UI-0012",
        "screens:",
        "  - id: home",
        '    route: "/home"',
        "  - id: settings",
        '    route: "/settings"',
        "",
      ].join("\n"),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  // The recovery hint has to name a route an operator can actually take.
  // "Re-run the accepted cycle with --capture" was not one: the iteration is
  // already in prototyping.json#iterations, so iterate exits on the
  // expected-next-cycle gate before capture runs.
  it("points the missing-HTML failure at a reachable recovery path", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
      '# QFAI-CONTRACT-ID: CON-UI-0012\nscreens:\n  - id: home\n    route: "/home"\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );

    const logger = await import("../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      const recovery = messages.find((m) => m.includes("Recovery:"));
      expect(recovery).toBeDefined();
      expect(recovery).toContain("re-run the loop from cycle 0");
      expect(recovery).toContain("expected-next-cycle gate");
      expect(recovery).toContain(".qfai/spec/03_contract/ui/");

      // --force is not a backup of the loop: it renames iter-00 only, and the
      // reset then deletes iter-01+ and clears iterations / reviewerGate.
      const destructive = messages.find((m) => m.includes("DESTRUCTIVE"));
      expect(destructive).toBeDefined();
      expect(destructive).toContain("renames only iter-00");
      expect(destructive).toContain("iter-01 and up are deleted outright");
      expect(destructive).toContain("Copy the whole");
      // The unreachable instruction must not come back.
      expect(messages.some((m) => m.includes("Re-run the accepted cycle with --capture"))).toBe(
        false,
      );

      // Retiring a screen must not read as a way around the gate: certify
      // recomputes the declared-screen set per run, so a bare contract
      // deletion would drop that screen's HTML / review.json checks while
      // re-using validate.json, verify.json and reviewerGate from the old
      // scope.
      expect(recovery).toContain("AND still re-run the loop from cycle 0");
      expect(recovery).toContain("deleting alone is not a shortcut past this gate");
      expect(recovery).toContain("recomputes the declared-screen set from the contracts");
      expect(recovery).toContain("are re-used as they are");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 2 when accepted iter has only an older screen file's name (anchored to accepted iter)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // UI contracts declare home + settings.
    await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
      '# QFAI-CONTRACT-ID: CON-UI-0012\nscreens:\n  - id: home\n    route: "/home"\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    // Plant settings.html in an OLDER iter dir; certify must not
    // accept it as evidence for the accepted iter.
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(path.join(iter00, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // Accepted iter (iter-01) only has index.html (seeded by
    // seedAllGatesPass), not home.html or settings.html.
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("succeeds when accepted iter has HTML for every declared screen", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
      '# QFAI-CONTRACT-ID: CON-UI-0012\nscreens:\n  - id: home\n    route: "/home"\n  - id: settings\n    route: "/settings"\n',
      "utf-8",
    );
    // Add the two screen HTML files into the accepted iter dir.
    const acceptedDir = path.join(root, ".qfai/evidence/prototyping/iter-01");
    await writeFile(path.join(acceptedDir, "home.html"), CLEAN_FINAL_HTML, "utf-8");
    await writeFile(path.join(acceptedDir, "settings.html"), CLEAN_FINAL_HTML, "utf-8");
    // AC-0012-0047: certify also requires
    // `iter-NN/spec-NNNN/<screen>.review.json` for every frozen spec ×
    // declared screen pair. The fixture's frozen spec set is
    // `["CON-UI-0012"]` (seeded by seedAllGatesPass), and the UI contracts
    // above declare home + settings, so seed both review.jsons.
    const specDir = path.join(acceptedDir, "CON-UI-0012");
    await mkdir(specDir, { recursive: true });
    // certify parses each payload against the shipped closed reviewer
    // schema, so the fixtures must be schema-valid, not merely present.
    await writeFile(
      path.join(specDir, "home.review.json"),
      `${reviewPayload("CON-UI-0012", "home")}\n`,
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "settings.review.json"),
      `${reviewPayload("CON-UI-0012", "settings")}\n`,
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });
});

describe("qfai prototyping certify --check", () => {
  it("exits 0 when certificate matches current evidence", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    expect(await runPrototypingCertify({ root, check: true })).toBe(0);
  });

  it("exits 2 when certificate is absent", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });

  it("exits 2 when evidence has been modified after certify", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await runPrototypingCertify({ root, check: false });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
      '{"modified":true}\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });
});

describe("qfai prototyping show-ui-contract", () => {
  async function seedShowRecord(root: string, record: Record<string, unknown>): Promise<void> {
    const dir = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(record), "utf-8");
  }

  it("shows the frozen and live UI contract IDs with a full primary descriptor", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedShowRecord(root, {
      runId: "test-run-id",
      uiContractsCovered: ["CON-UI-0012"],
      frozenSurfaceUnion: ["CON-UI-0012"],
    });
    const logger = await import("../../src/cli/lib/logger.js");
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    try {
      expect(await runPrototypingShowUiContract({ root })).toBe(0);
      const payload = JSON.parse(infoSpy.mock.calls.map((c) => String(c[0])).join("\n")) as Record<
        string,
        unknown
      >;
      expect(payload.uiContractsCovered).toEqual(["CON-UI-0012"]);
      expect(payload.frozenSurfaceUnion).toEqual(["CON-UI-0012"]);
      expect(payload.liveUiBearing).toEqual(["CON-UI-0012"]);
      expect(payload.primary).toEqual({
        uiContractId: "CON-UI-0012",
        contractPath: ".qfai/spec/03_contract/ui/home.yaml",
        source: "contract-scan",
      });
    } finally {
      infoSpy.mockRestore();
    }
  });

  it.each([
    { label: "missing", record: { frozenSurfaceUnion: ["CON-UI-0012"] } },
    { label: "legacy", record: { specsCovered: ["0012"], frozenSpecsCovered: ["0012"] } },
    {
      label: "malformed",
      record: { uiContractsCovered: null, frozenSurfaceUnion: ["CON-UI-0012"] },
    },
    {
      label: "invalid ID",
      record: { uiContractsCovered: ["0012"], frozenSurfaceUnion: ["CON-UI-0012"] },
    },
  ])("rejects $label scope with exit 2", async ({ record }) => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedShowRecord(root, record);
    expect(await runPrototypingShowUiContract({ root })).toBe(2);
  });

  it("rejects a missing frozen surface union", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedShowRecord(root, { uiContractsCovered: ["CON-UI-0012"] });
    expect(await runPrototypingShowUiContract({ root })).toBe(2);
  });
});
// ─────────────────────────────────────────────────────────────────────────
// TC-3.6.x — DESIGN.md compliance gate + cert designMd binding
// ─────────────────────────────────────────────────────────────────────────

describe("qfai prototyping certify (TC-3.6.x DESIGN.md gate)", () => {
  it("TC-3.6.2: final HTML with one DESIGN.md violation → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Overwrite the final HTML with a violating color literal.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/index.html"),
      '<div style="color:#abcdef">x</div>\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.3: no final iteration HTML → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Remove the seeded final HTML directory entirely.
    await rm(path.join(root, ".qfai/evidence/prototyping/iter-01"), {
      recursive: true,
      force: true,
    });
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.4: empty violations array (clean HTML) → exit 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("fails fast (exit 2) when a stale higher iter-NN dir would be sealed into evidenceDigests", async () => {
    // Simulates a `qfai prototyping iterate --cycle 0` restart that left
    // a stale iter-14 directory on disk from a prior loop. The HTML scan
    // is correctly anchored to iter-01, but `buildCompletionCertificate`
    // would still digest every file under `evidenceRoot`, sealing the
    // stale iter-14 contents into the certificate. A later
    // `certify --check` would then fail when the operator cleans up the
    // stale dir even though the accepted iteration is unchanged. So
    // certify fails fast here and forces the operator to rerun cycle 0
    // (which deletes stale iter-NN dirs as part of the hard reset) or
    // remove them manually before sealing.
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // The fresh loop has 2 recorded iterations → accepted index = 1.
    // Plant a stale iter-14 with violating HTML.
    const staleDir = path.join(root, ".qfai/evidence/prototyping/iter-14");
    await mkdir(staleDir, { recursive: true });
    await writeFile(
      path.join(staleDir, "index.html"),
      '<span style="color:#abcdef">stale</span>\n',
      "utf-8",
    );
    const logger = await import("../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("stale iteration directories found"))).toBe(true);
      expect(messages.some((m) => m.includes("iter-14"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns 2 with 'could not be read' error when DESIGN.md.lock.yaml is unreadable", async () => {
    // Pin the new `unreadable` LockGateResult branch added to loadLockGate
    // for the lock fail-closed posture. Symmetric with the
    // iterate test of the same name. Trigger the unreadable branch
    // portably by creating the lock path as a *directory* — Node raises
    // EISDIR on `readFile`, which routes through the new `unreadable`
    // kind exactly as EACCES / EPERM / EIO would. Works cross-platform.
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await mkdir(path.join(root, ".qfai/contracts/design/DESIGN.md.lock.yaml"), {
      recursive: true,
    });

    const logger = await import("../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("could not be read"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("findStaleIterDirs propagates non-ENOENT readdir errors", async () => {
    // Symmetric pin with the lock-unreadable test: verify the
    // fail-closed posture in findStaleIterDirs's readdir catch
    // (`if (isEnoent(err)) return []; throw err;`). A future revert
    // to a bare `catch { return []; }` would let a permission flip
    // silently bypass the stale-iter guard — the same vector the
    // round-9 lock fix closed. Trigger a non-ENOENT readdir error
    // portably by passing a path that is a file, not a directory:
    // Node raises ENOTDIR which is non-ENOENT and must propagate.
    const root = await newTempDir();
    const filePath = path.join(root, "not-a-dir");
    await writeFile(filePath, "x", "utf-8");
    await expect(findStaleIterDirs(filePath, 0)).rejects.toThrow();
  });

  it("findStaleIterDirs returns [] on ENOENT (legitimate fresh-project case)", async () => {
    // Companion test: confirm the ENOENT branch still returns []
    // (legitimate absence on a fresh project that has not yet
    // captured an iteration). Without this, a future tightening
    // could over-rotate to a hard error on every fs miss.
    const root = await newTempDir();
    const missing = path.join(root, "does-not-exist");
    await expect(findStaleIterDirs(missing, 0)).resolves.toEqual([]);
  });

  it("anchors final HTML scan to prototyping.json#iterations[] (no stale dirs)", async () => {
    // Confirm the round-4 anchoring still works when no stale higher
    // iter dirs are present: certify uses iter-01 (the recorded final)
    // and ignores iter-00.
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // No stale dirs planted; iter-00 and iter-01 are both seeded clean
    // by seedAllGatesPass.
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("exits 2 when the recorded final iter dir has no HTML (despite older iters with HTML)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Wipe the recorded final iter (iter-01) but leave iter-00 with HTML.
    await rm(path.join(root, ".qfai/evidence/prototyping/iter-01"), {
      recursive: true,
      force: true,
    });
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(path.join(iter00, "index.html"), CLEAN_FINAL_HTML, "utf-8");
    // Certify must NOT fall back to iter-00 — that iter is not the
    // accepted iteration in prototyping.json.
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.5: only the LAST iter is evaluated (older dirty iters ignored)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Add an older iter-00 with violating HTML; iter-01 (final) is clean.
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(
      path.join(iter00, "index.html"),
      '<span style="color:#abcdef">old</span>\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("TC-3.6.7: certificate.json includes designMd { path, sha256 }", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    const certBody = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH), "utf-8"),
    ) as { designMd: { path: string; sha256: string } };
    expect(certBody.designMd.path).toBe("DESIGN.md");
    expect(certBody.designMd.sha256).toBe(hashDesignMd(CERT_DESIGN_MD));
  });

  it("TC-3.6.8: designMd.sha256 is 64-char lowercase hex", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    const certBody = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH), "utf-8"),
    ) as { designMd: { sha256: string } };
    expect(certBody.designMd.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TC-3.6.9: --check fails when DESIGN.md mutated after certify", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    // Mutate DESIGN.md by 1 byte → sha mismatch.
    await writeFile(path.join(root, "DESIGN.md"), `${CERT_DESIGN_MD}\n`, "utf-8");
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });
});
