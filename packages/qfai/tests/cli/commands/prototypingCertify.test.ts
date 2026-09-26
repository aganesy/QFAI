/** Certify requires accepted-iteration review evidence for each frozen UI contract screen. */
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingCertify } from "../../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../../src/core/design/designMd.js";
import { reviewPayload } from "../../helpers/reviewPayload.js";

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
}

async function seedAllGatesPass(
  root: string,
  options: { uiContractsCovered?: string[] } = {},
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
  const validateJson = JSON.stringify({
    profile: "prototyping",
    counts: { error: 0, warning: 0, info: 0 },
  });
  await writeFile(path.join(root, ".qfai/report/validate-prototyping.json"), validateJson, "utf-8");
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
    uiContractsCovered: options.uiContractsCovered ?? ["CON-UI-0012"],
    frozenSurfaceUnion: options.uiContractsCovered ?? ["CON-UI-0012"],
    reviewerGate: {
      result: "PASS",
      signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
    },
    iterations: [{ index: 0 }, { index: 1 }],
  };
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify(protoBody),
    "utf-8",
  );
}

async function seedUiScreens(root: string, screenIds: string[]): Promise<void> {
  await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
  const screensYaml = ["# QFAI-CONTRACT-ID: CON-UI-0012", "screens:"]
    .concat(screenIds.map((id) => `  - id: ${id}\n    route: "/${id}"`))
    .join("\n");
  await writeFile(
    path.join(root, ".qfai/spec/03_contract/ui/main.yaml"),
    `${screensYaml}\n`,
    "utf-8",
  );
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
  body = reviewPayload(specDirName, screenId),
): Promise<void> {
  const dir = path.join(
    root,
    `.qfai/evidence/prototyping/iter-${String(iterIndex).padStart(2, "0")}/${specDirName}`,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${screenId}.review.json`), body, "utf-8");
}

/**
 * Write a payload at an arbitrary path under one iteration directory —
 * the nested / non-per-spec shapes the declared-pair sweep never names
 * but the certificate's recursive digest walk still seals.
 */
async function seedPayloadAt(
  root: string,
  relUnderIter: string,
  body: string,
  iterIndex = 1,
): Promise<void> {
  const abs = path.join(
    root,
    `.qfai/evidence/prototyping/iter-${String(iterIndex).padStart(2, "0")}`,
    relUnderIter,
  );
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/**
 * Rewrite one evidence file and re-stamp its digest inside an already
 * sealed certificate — the shape a certificate written by a
 * presence-only gate has on disk today: digests that match, contents
 * that are not review evidence.
 */
async function reseal(root: string, evidenceRel: string, body: string): Promise<void> {
  const abs = path.join(root, ".qfai/evidence/prototyping", evidenceRel);
  await writeFile(abs, body, "utf-8");
  const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
  const cert = JSON.parse(await readFile(certPath, "utf-8")) as {
    evidenceDigests: Array<{ path: string; sha256: string }>;
  };
  const sha256 = createHash("sha256")
    .update(await readFile(abs))
    .digest("hex");
  for (const entry of cert.evidenceDigests) {
    if (entry.path === evidenceRel) entry.sha256 = sha256;
  }
  await writeFile(certPath, `${JSON.stringify(cert, null, 2)}\n`, "utf-8");
}

describe("qfai prototyping certify UI contract screen review coverage", () => {
  // QFAI:EX-0001-0122-05
  it("exits 64 and names the missing UI contract and screen when a frozen screen lacks review.json", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    // Seed only `home.review.json`; `settings.review.json` is the
    // missing pair we expect certify to name.
    await seedReviewJson(root, "CON-UI-0012", "home");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      // the per-spec layout
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
      const namesPair = messages.some((m) => m.includes("CON-UI-0012") && m.includes("settings"));
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

  it("exits 0 when every frozen UI contract screen has review.json at the accepted iteration", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  // The shipped reviewer payload reference declares `<screen>.review.json`
  // a CLOSED schema whose violation is a hard failure. Before this gate
  // certify only stat()-ed the file, so `{}` or truncated JSON sealed a
  // certificate with unusable review evidence.
  it("exits 64 and names the schema violations when a present review.json does not parse against the closed payload schema", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    // `settings` exists but carries an empty object — every required
    // field is missing.
    await seedReviewJson(root, "CON-UI-0012", "settings", 1, "{}\n");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("CON-UI-0012/settings.review.json"))).toBe(true);
      expect(messages.some((m) => m.includes("missing field: uiContractId"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when a present review.json is not valid JSON at all", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings", 1, "{ truncated");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("invalid JSON"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("rejects when a frozen UI contract has no review directory", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Both contracts declare the same screen IDs. Each requires its own reviews.
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012", "CON-UI-0007"] });
    await seedUiScreens(root, ["home", "settings"]);
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/secondary.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: [{id: home, route: /home}, {id: settings, route: /settings}]\n",
      "utf-8",
    );
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");
    // CON-UI-0007 has no review payloads.

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).not.toBe(0);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      const namesHome = messages.some((m) => m.includes("CON-UI-0007") && m.includes("home"));
      const namesSettings = messages.some(
        (m) => m.includes("CON-UI-0007") && m.includes("settings"),
      );
      expect(namesHome).toBe(true);
      expect(namesSettings).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// Parsing a payload proves it is well-formed, not that it reviewed the
// pair it is filed under, nor that what it found supports the summary
// PASS. Both gaps sealed a certificate over evidence that does not
// back it.
describe("qfai prototyping certify (per-screen payload identity + convergence)", () => {
  it("exits 64 when a schema-valid payload was copied from another screen", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    // `settings.review.json` holds a valid payload for `home` — the
    // settings surface was never reviewed.
    await seedReviewJson(root, "CON-UI-0012", "settings", 1, reviewPayload("CON-UI-0012", "home"));

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("CON-UI-0012/settings.review.json"))).toBe(true);
      expect(messages.some((m) => m.includes('screenId "home"'))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when a payload was copied from another spec", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home", 1, reviewPayload("CON-UI-0007", "home"));
    await seedReviewJson(root, "CON-UI-0012", "settings");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes('uiContractId "CON-UI-0007"'))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when a payload reviews an earlier cycle than the accepted iteration", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    // Stored under iter-01 (the accepted iteration) but recorded at
    // cycle 0 — stale evidence carried forward.
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "settings",
      1,
      reviewPayload("CON-UI-0012", "settings", { cycle: 0 }),
    );

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(
        messages.some((m) => m.includes("cycle 0 is not the accepted iteration index 1")),
      ).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when reviewerGate says PASS but a payload has a finding open", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "settings",
      1,
      reviewPayload("CON-UI-0012", "settings", {
        blockingFindings: ["settings: the empty state is not represented"],
      }),
    );

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("contradict convergence"))).toBe(true);
      expect(messages.some((m) => m.includes("blockingFindings is non-empty"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it.each(["retryExhausted", "launchFailed"] as const)(
    "exits 64 when a payload reports sessionStatus '%s' even with nothing open",
    async (status) => {
      // `retryExhausted` / `launchFailed` are the Reviewer Playwright
      // hard-stop: every attempt failed, or the Reviewer never
      // started. Such a pair is supposed to leave no payload at all,
      // so a file that carries a failed status reviewed nothing — an
      // empty finding list there is not evidence and must not seal a
      // certificate.
      const root = await newTempDir();
      await seedMinimalProject(root);
      await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
      await seedUiScreens(root, ["home", "settings"]);
      await seedReviewJson(root, "CON-UI-0012", "home");
      await seedReviewJson(
        root,
        "CON-UI-0012",
        "settings",
        1,
        reviewPayload("CON-UI-0012", "settings", { sessionStatus: status }),
      );

      const logger = await import("../../../src/cli/lib/logger.js");
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      try {
        const exit = await runPrototypingCertify({ root, check: false });
        expect(exit).toBe(64);
        const messages = errorSpy.mock.calls.map((c) => String(c[0]));
        expect(messages.some((m) => m.includes("contradict convergence"))).toBe(true);
        expect(messages.some((m) => m.includes(`sessionStatus is "${status}"`))).toBe(true);
      } finally {
        errorSpy.mockRestore();
      }
    },
  );

  it("exits 64 when an undeclared screen's payload left in the accepted iteration is unparsable", async () => {
    // `buildCompletionCertificate` digests every file under the
    // evidence root, so a payload left behind by a since-deleted
    // screen would be sealed into the certificate. The declared-pair
    // sweep never opens it — certify must enumerate the per-spec
    // directory itself.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");
    // `old` is not a declared screen any more; the file is corrupt.
    await seedReviewJson(root, "CON-UI-0012", "old", 1, "{ truncated");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("CON-UI-0012/old.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when an undeclared screen's payload contradicts convergence", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "old",
      1,
      reviewPayload("CON-UI-0012", "old", {
        blockingFindings: ["settings: the empty state is not represented"],
      }),
    );

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("contradict convergence"))).toBe(true);
      expect(messages.some((m) => m.includes("CON-UI-0012/old.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when a corrupt payload sits under a UI contract directory outside the frozen set", async () => {
    // The frozen-set loop does not require CON-UI-9999, but the
    // certificate audits canonical UI contract evidence found on disk.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");
    await seedReviewJson(root, "CON-UI-9999", "old", 1, "{ truncated");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("CON-UI-9999/old.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("still seals the certificate when an undeclared screen's payload is itself valid and converged", async () => {
    // A stray file is audited, not banned outright: per-spec UI
    // contracts can narrow the declared set, and a schema-valid,
    // converged payload for an extra screen is not an evidence gap.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0012", "settings");
    await seedReviewJson(root, "CON-UI-0012", "extra");

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  it("exits 64 when a payload still carries layout anti-patterns or DESIGN.md violations", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home", "settings"]);
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "home",
      1,
      reviewPayload("CON-UI-0012", "home", {
        layoutAntiPatternsDetected: ["lap-008-no-back-affordance"],
      }),
    );
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "settings",
      1,
      reviewPayload("CON-UI-0012", "settings", {
        designMdViolations: [{ kind: "color", found: "#FF00FF" }],
      }),
    );

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("lap-008-no-back-affordance"))).toBe(true);
      expect(messages.some((m) => m.includes("designMdViolations is non-empty"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("qfai prototyping certify (recursive payload sweep + --check re-audit)", () => {
  it("exits 64 when a NESTED payload under the per-spec directory is unparsable", async () => {
    // The certificate's evidence walk is recursive, so
    // `CON-UI-0012/archive/old.review.json` is digested and sealed. A
    // shallow `readdir` in the audit sweep left it unread — a corrupt
    // Reviewer artifact shipped inside a certificate at exit 0.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedPayloadAt(root, "CON-UI-0012/archive/old.review.json", "{ truncated");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("CON-UI-0012/archive/old.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exits 64 when a payload parked outside any per-spec directory contradicts convergence", async () => {
    // Same digest reasoning one level out: a payload under a
    // non-`spec-NNNN` folder is sealed too. Its spec cannot be read off
    // the path, so it is held to the screen / cycle its path claims plus
    // schema and convergence.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedPayloadAt(
      root,
      "misc/old.review.json",
      reviewPayload("CON-UI-0012", "old", {
        blockingFindings: ["settings: the empty state is not represented"],
      }),
    );

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      const exit = await runPrototypingCertify({ root, check: false });
      expect(exit).toBe(64);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("misc/old.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  // Over-correction pin: a nested payload is AUDITED, not banned. A
  // schema-valid, converged leftover is not an evidence gap.
  it("still seals the certificate when the nested payload is valid and converged", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedPayloadAt(
      root,
      "CON-UI-0012/archive/old.review.json",
      reviewPayload("CON-UI-0012", "old"),
    );

    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("--check re-audits the sealed payloads and exits 2 when one no longer satisfies the schema", async () => {
    // A certificate sealed by a presence-only gate carries `{}` where
    // review evidence should be. Its digests still match, so the old
    // `--check` reported OK forever — and the shipped skill reads
    // `--check` exit 0 as DONE.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    await reseal(root, "iter-01/CON-UI-0012/home.review.json", "{}\n");

    const logger = await import("../../../src/cli/lib/logger.js");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    try {
      expect(await runPrototypingCertify({ root, check: true })).toBe(2);
      const messages = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("iter-01/CON-UI-0012/home.review.json"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("--check exits 2 when a sealed payload was re-stamped with another pair's review", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    await reseal(
      root,
      "iter-01/CON-UI-0012/home.review.json",
      `${reviewPayload("CON-UI-0012", "settings")}\n`,
    );

    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });

  // Over-correction pin: the re-audit must not reject a certificate
  // whose payloads are exactly what certify sealed, and must not hold
  // EARLIER cycles to the convergence rule — those are legitimately
  // non-converged, which is why the loop ran again.
  it("--check still exits 0 on an untampered certificate whose earlier cycle was not converged", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(
      root,
      "CON-UI-0012",
      "home",
      0,
      reviewPayload("CON-UI-0012", "home", {
        cycle: 0,
        blockingFindings: ["home: the empty state is not represented"],
      }),
    );

    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    expect(await runPrototypingCertify({ root, check: true })).toBe(0);
  });
});

describe("qfai prototyping certify UI contract coverage", () => {
  async function addSecondContract(root: string): Promise<void> {
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/secondary.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: [{id: settings, route: /settings}]\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/settings.html"),
      CLEAN_FINAL_HTML,
      "utf-8",
    );
  }

  it("seals only after every contract and declared screen has a converged review", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0007", "CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await addSecondContract(root);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedReviewJson(root, "CON-UI-0007", "settings");
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    const cert = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/completion-certificate.json"),
        "utf-8",
      ),
    ) as {
      uiContractsCovered: string[];
      convergedUiContracts: string[];
      laggingUiContracts: string[];
    };
    expect(cert.uiContractsCovered).toEqual(["CON-UI-0007", "CON-UI-0012"]);
    expect(cert.convergedUiContracts).toEqual(cert.uiContractsCovered);
    expect(cert.laggingUiContracts).toEqual([]);
  });

  it("returns coverage exit 64 when the second contract lacks a review", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root, { uiContractsCovered: ["CON-UI-0007", "CON-UI-0012"] });
    await seedUiScreens(root, ["home"]);
    await addSecondContract(root);
    await seedReviewJson(root, "CON-UI-0012", "home");
    expect(await runPrototypingCertify({ root, check: false })).toBe(64);
  });

  // QFAI:EX-0001-0122-03
  it("rejects legacy scope fields and malformed full IDs with exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await seedUiScreens(root, ["home"]);
    const file = path.join(root, ".qfai/evidence/prototyping/prototyping.json");
    const original = JSON.parse(await readFile(file, "utf-8")) as Record<string, unknown>;
    for (const variant of [
      { ...original, specsCovered: ["0012"] },
      { ...original, uiContractsCovered: ["0012"] },
      { ...original, uiContractsCovered: ["CON-UI-0012", "CON-UI-0012"] },
    ]) {
      await writeFile(file, JSON.stringify(variant), "utf-8");
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
    }
  });

  it("rejects live UI contract drift after the frozen cycle", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await seedUiScreens(root, ["home"]);
    await rm(path.join(root, ".qfai/spec/03_contract/ui/main.yaml"));
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("preserves historical spec review directories while sealing canonical evidence", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await seedUiScreens(root, ["home"]);
    await seedReviewJson(root, "CON-UI-0012", "home");
    await seedPayloadAt(root, "spec-0012/home.review.json", "historical payload");
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    expect(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/iter-01/spec-0012/home.review.json"),
        "utf-8",
      ),
    ).toBe("historical payload");
  });
});
