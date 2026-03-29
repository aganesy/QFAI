import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UiFidelityAutogenResult } from "../../core/prototyping/index.js";
import { autogenerateUiFidelity, emitUiFidelity } from "../../core/prototyping/index.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { normalizeRenderViewports } from "../../core/uiux/renderEvidenceTypes.js";
import { info, error, warn } from "../lib/logger.js";
import { resolveToolVersion } from "../../core/version.js";

export type PrototypingCommandOptions = {
  root: string;
  autogenUiFidelity: boolean;
  autogenOnly: boolean;
  baseUrl?: string;
  evidenceOut?: string;
  renderEvidence?: boolean;
  renderViewports?: string[];
  renderOut?: string;
  renderFailOpen?: boolean;
};

type ExistingEvidence = {
  meta?: Record<string, unknown>;
  uiFidelity?: Record<string, unknown>;
  [key: string]: unknown;
};

type RenderEvidenceRecord = {
  status: "requested" | "skipped";
  requested: true;
  autogenEnabled: boolean;
  viewports: string[];
  outputPath: string;
  reason: string;
  skippedReason?: string;
};

const ENV_AUTOGEN = "QFAI_PROTOTYPE_FIDELITY_AUTOGEN";
const DEFAULT_EVIDENCE_PATH = ".qfai/evidence/prototyping.json";

export async function runPrototyping(options: PrototypingCommandOptions): Promise<number> {
  const { config } = await loadConfig(options.root);
  const renderOptions = mergeRenderOptions(options, config.uiux?.renderEvidence);
  const autogenEnabled = options.autogenUiFidelity || process.env[ENV_AUTOGEN] === "1";

  if (!autogenEnabled) {
    if (options.autogenOnly) {
      error(
        `prototyping: --autogen-only が指定されていますが --autogen-ui-fidelity / ${ENV_AUTOGEN}=1 がありません。`,
      );
      return 2;
    }
    info(
      `prototyping: --autogen-ui-fidelity or ${ENV_AUTOGEN}=1 が指定されていません。何も実行しません。`,
    );

    // Write skipped status to evidence for doctor/report detectability
    const evidencePath = resolveEvidencePath(options.root, options.evidenceOut);
    const toolVersion = await resolveToolVersion();
    let existingEvidence: ExistingEvidence = {};
    try {
      const raw = await readFile(evidencePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existingEvidence = parsed as ExistingEvidence;
      }
    } catch {
      // evidence file does not exist - start fresh
    }
    const skippedEvidence = emitUiFidelity({
      evidence: existingEvidence,
      toolVersion,
      command: "qfai prototyping",
      baseUrl: "",
      status: "skipped",
      reason: "autogen not enabled (--autogen-ui-fidelity or env not set)",
    });
    const renderBundle = await maybeWriteRenderBundle(
      toolVersion,
      "qfai prototyping --render-evidence",
      renderOptions,
      false,
    );
    await writeEvidence(
      evidencePath,
      applyRenderEvidence(
        skippedEvidence,
        renderBundle?.renderEvidence ??
          (await buildRenderEvidenceRecord(
            renderOptions,
            false,
            resolveRenderOutPath(options.root, renderOptions.renderOut),
          )),
        renderOptions.renderEvidence === true,
      ),
    );
    return 0;
  }

  const baseUrl = resolveBaseUrl(renderOptions);
  if (!baseUrl) {
    error(`prototyping: --base-url または QFAI_PROTOTYPE_BASE_URL の指定が必要です。`);
    return 1;
  }

  const toolVersion = await resolveToolVersion();
  const evidencePath = resolveEvidencePath(options.root, options.evidenceOut);

  info(`prototyping: autogen uiFidelity を実行します (baseUrl=${baseUrl})`);

  let existingEvidence: ExistingEvidence = {};
  try {
    const raw = await readFile(evidencePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    // Validate that parsed JSON is an object (not null, array, or primitive)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      existingEvidence = parsed as ExistingEvidence;
    }
    // Otherwise keep the empty object default
  } catch {
    // evidence file does not exist or is invalid JSON - start fresh
  }

  // B1: Extract route hints from existing evidence runtimeGate
  const routeHints = extractRouteHintsFromEvidence(existingEvidence);

  let result: UiFidelityAutogenResult;
  try {
    result = await autogenerateUiFidelity(options.root, config, baseUrl, routeHints);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    warn(`prototyping: autogen failed - ${reason}`);

    const failedEvidence = emitUiFidelity({
      evidence: existingEvidence,
      toolVersion: toolVersion,
      command: "qfai prototyping --autogen-ui-fidelity",
      baseUrl,
      status: "failed",
      reason,
    });

    const renderBundle = await maybeWriteRenderBundle(
      toolVersion,
      "qfai prototyping --render-evidence",
      renderOptions,
      true,
    );
    await writeEvidence(
      evidencePath,
      applyRenderEvidence(
        failedEvidence,
        renderBundle?.renderEvidence ??
          (await buildRenderEvidenceRecord(
            renderOptions,
            true,
            resolveRenderOutPath(options.root, renderOptions.renderOut),
          )),
        renderOptions.renderEvidence === true,
      ),
    );
    info(`prototyping: wrote evidence with status=failed to ${evidencePath}`);
    return options.autogenOnly ? 1 : 0;
  }

  const hasScreens = result.screens.length > 0;
  const allRoutesFailed = result.crawled.every((r) => r.status === "failed");

  if (!hasScreens || allRoutesFailed) {
    const uiContractsPath = path.join(resolvePath(options.root, config, "contractsDir"), "ui");
    const reason = !hasScreens
      ? `no screens found in ${uiContractsPath}`
      : "all route crawls failed";
    warn(`prototyping: autogen produced no usable data - ${reason}`);

    const failedEvidence = emitUiFidelity({
      evidence: existingEvidence,
      toolVersion: toolVersion,
      command: "qfai prototyping --autogen-ui-fidelity",
      baseUrl,
      status: "failed",
      crawled: result.crawled,
      reason,
    });

    const renderBundle = await maybeWriteRenderBundle(
      toolVersion,
      "qfai prototyping --render-evidence",
      renderOptions,
      true,
    );
    await writeEvidence(
      evidencePath,
      applyRenderEvidence(
        failedEvidence,
        renderBundle?.renderEvidence ??
          (await buildRenderEvidenceRecord(
            renderOptions,
            true,
            resolveRenderOutPath(options.root, renderOptions.renderOut),
          )),
        renderOptions.renderEvidence === true,
      ),
    );
    info(`prototyping: wrote evidence with status=failed to ${evidencePath}`);
    return options.autogenOnly ? 1 : 0;
  }

  const successEvidence = emitUiFidelity({
    evidence: existingEvidence,
    toolVersion: toolVersion,
    command: "qfai prototyping --autogen-ui-fidelity",
    baseUrl,
    status: "success",
    screens: result.screens,
    crawled: result.crawled,
  });

  const renderBundle = await maybeWriteRenderBundle(
    toolVersion,
    "qfai prototyping --render-evidence",
    renderOptions,
    true,
  );
  await writeEvidence(
    evidencePath,
    applyRenderEvidence(
      successEvidence,
      renderBundle?.renderEvidence ??
        (await buildRenderEvidenceRecord(
          renderOptions,
          true,
          resolveRenderOutPath(options.root, renderOptions.renderOut),
        )),
      renderOptions.renderEvidence === true,
    ),
  );

  const routeOkCount = result.crawled.filter((r) => r.status === "ok").length;
  const routeFailCount = result.crawled.filter((r) => r.status === "failed").length;
  const avgCoverage =
    result.screens.length > 0
      ? (result.screens.reduce((sum, s) => sum + s.coverage, 0) / result.screens.length).toFixed(2)
      : "N/A";

  info(
    `prototyping: autogen success - ${result.screens.length} screens, routes ok=${routeOkCount} fail=${routeFailCount}, avg coverage=${avgCoverage}`,
  );
  info(`prototyping: wrote evidence to ${evidencePath}`);

  return 0;
}

function resolveBaseUrl(options: PrototypingCommandOptions): string | null {
  if (options.baseUrl) {
    return options.baseUrl;
  }
  const envUrl = process.env.QFAI_PROTOTYPE_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  return null;
}

function resolveEvidencePath(root: string, explicit?: string): string {
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(root, explicit);
  }
  return path.resolve(root, DEFAULT_EVIDENCE_PATH);
}

async function writeEvidence(filePath: string, evidence: Record<string, unknown>): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(evidence, null, 2) + "\n", "utf-8");
}

async function writeRenderBundle(filePath: string, bundle: Record<string, unknown>): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(bundle, null, 2) + "\n", "utf-8");
}

async function maybeWriteRenderBundle(
  toolVersion: string,
  command: string,
  options: PrototypingCommandOptions,
  autogenEnabled: boolean,
): Promise<
  | { path: string; bundle: Record<string, unknown>; renderEvidence: RenderEvidenceRecord }
  | undefined
> {
  if (!options.renderEvidence) {
    return undefined;
  }
  const renderBundle = await buildRenderBundle(toolVersion, command, options, autogenEnabled);
  await writeRenderBundle(renderBundle.path, renderBundle.bundle);
  return renderBundle;
}

function applyRenderEvidence(
  evidence: Record<string, unknown>,
  renderEvidence: RenderEvidenceRecord,
  includeRenderEvidence: boolean,
): Record<string, unknown> {
  if (!includeRenderEvidence) {
    return evidence;
  }
  return {
    ...evidence,
    renderEvidence,
  };
}

async function buildRenderBundle(
  toolVersion: string,
  command: string,
  options: PrototypingCommandOptions,
  autogenEnabled: boolean,
): Promise<{
  path: string;
  bundle: Record<string, unknown>;
  renderEvidence: RenderEvidenceRecord;
}> {
  const outPath = resolveRenderOutPath(options.root, options.renderOut);
  const renderEvidence = await buildRenderEvidenceRecord(options, autogenEnabled, outPath);
  return {
    path: outPath,
    bundle: {
      meta: {
        generatedAt: new Date().toISOString(),
        toolVersion,
        commands: [command],
      },
      renderEvidence,
    },
    renderEvidence,
  };
}

function mergeRenderOptions(
  options: PrototypingCommandOptions,
  configRenderEvidence?: {
    enabled?: boolean;
    viewports?: string[];
    out?: string;
    baseUrl?: string;
    failOpen?: boolean;
  },
): PrototypingCommandOptions {
  const cliViewportsSpecified = Array.isArray(options.renderViewports);
  const mergedViewports = cliViewportsSpecified
    ? normalizeRenderViewports(options.renderViewports)
    : normalizeRenderViewports(configRenderEvidence?.viewports);
  const renderOut = options.renderOut ?? configRenderEvidence?.out;
  const baseUrl = options.baseUrl ?? configRenderEvidence?.baseUrl;

  return {
    ...options,
    renderEvidence: options.renderEvidence || configRenderEvidence?.enabled === true,
    renderViewports: mergedViewports,
    renderFailOpen: options.renderFailOpen ?? configRenderEvidence?.failOpen === true,
    ...(renderOut ? { renderOut } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  };
}

function resolveRenderOutPath(root: string, explicit?: string): string {
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(root, explicit);
  }
  return path.resolve(root, ".qfai/evidence/render.json");
}

async function buildRenderEvidenceRecord(
  options: PrototypingCommandOptions,
  autogenEnabled: boolean,
  outputPath: string,
): Promise<RenderEvidenceRecord> {
  const viewports = normalizeRenderViewports(options.renderViewports);
  if (!autogenEnabled) {
    return {
      status: "skipped",
      requested: true,
      autogenEnabled: false,
      viewports,
      outputPath,
      reason: "render requested without autogen-ui-fidelity",
      skippedReason: "render requested without autogen-ui-fidelity",
    };
  }

  if (options.renderFailOpen) {
    try {
      await import("playwright");
    } catch (error) {
      const skippedReason = describeUnavailablePlaywright(error);
      return {
        status: "skipped",
        requested: true,
        autogenEnabled: true,
        viewports,
        outputPath,
        reason: skippedReason,
        skippedReason,
      };
    }
  }

  return {
    status: "requested",
    requested: true,
    autogenEnabled: true,
    viewports,
    outputPath,
    reason: "render evidence capture not implemented in this slice",
  };
}

function describeUnavailablePlaywright(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `playwright unavailable: ${error.message}`;
  }
  return `playwright unavailable: ${String(error)}`;
}

function extractRouteHintsFromEvidence(evidence: ExistingEvidence): string[] {
  const routes = new Set<string>();

  // Priority 1: runtimeGate.ui[].route
  const runtimeGate = evidence.runtimeGate;
  if (runtimeGate && typeof runtimeGate === "object" && !Array.isArray(runtimeGate)) {
    const gate = runtimeGate as Record<string, unknown>;
    const uiRows = gate.ui;
    if (Array.isArray(uiRows)) {
      for (const row of uiRows) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          const r = row as Record<string, unknown>;
          if (typeof r.route === "string" && r.route.trim().length > 0) {
            routes.add(r.route.trim());
          }
        }
      }
    }
  }

  // Priority 2: specs[].missing.uiRoutes
  const specs = evidence.specs;
  if (Array.isArray(specs)) {
    for (const spec of specs) {
      if (spec && typeof spec === "object" && !Array.isArray(spec)) {
        const s = spec as Record<string, unknown>;
        const missing = s.missing;
        if (missing && typeof missing === "object" && !Array.isArray(missing)) {
          const m = missing as Record<string, unknown>;
          const uiRoutes = m.uiRoutes;
          if (Array.isArray(uiRoutes)) {
            for (const route of uiRoutes) {
              if (typeof route === "string" && route.trim().length > 0) {
                routes.add(route.trim());
              }
            }
          }
        }
      }
    }
  }

  return Array.from(routes).sort((a, b) => a.localeCompare(b));
}
