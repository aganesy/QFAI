import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { parseStructuredContract } from "../contracts.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { UiFidelityStatus } from "../review/prototyping.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { readSafe } from "../validators/utils.js";
import { readCanonicalScreenContracts } from "../contracts/screenContracts.js";
import { buildUiObservationSummary, deriveMockPathFindingsFromBrowserQa } from "./uiObservation.js";

type ContractScreenSummary = {
  contractId: string;
  route: string;
  screenId: string;
  expected: {
    elements: number;
    actions: number;
    labels?: string[];
    ids?: string[];
  };
};

export type BuiltUiFidelity = {
  uiFidelity?: {
    mode: "interactive";
    screens: Array<{
      screenId: string;
      route: string;
      uiContractId: string;
      expected: {
        elements: number;
        actions: number;
        labels?: string[];
        ids?: string[];
      };
      found?: {
        labels?: string[];
        markers?: string[];
      };
      observed: {
        elementsPlaced: number;
        actionsWired: number;
      };
      mockPaths: Array<{ id: string; status: "fail" | "finding" }>;
      renders: Array<{
        viewport: string;
        status: "captured" | "skipped" | "failed";
        width: number;
        height: number;
        imagePath?: string;
        htmlPath?: string;
        skippedReason?: string;
        error?: string;
      }>;
    }>;
  };
  status: UiFidelityStatus;
  missingRequiredEvidence: string[];
};

export async function buildUiFidelity(input: {
  root: string;
  config: QfaiConfig;
  required: boolean;
  renderResult?: RenderRunnerResult;
  browserQaResult?: BrowserQaRunResult;
}): Promise<BuiltUiFidelity> {
  const discussionRoot = resolvePath(input.root, input.config, "discussionDir");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  // Anchor generated sourceRefs at the configured discussion dir so custom
  // paths.discussionDir values produce non-dangling refs.
  const screenContracts = await readCanonicalScreenContracts(
    latestPack,
    input.config.paths.discussionDir,
  );
  const contractSummaries = await collectUiContractScreens(input.root, input.config);
  const enrichedScreenContracts = screenContracts.map((screen) => {
    const contract = contractSummaries.find((candidate) => candidate.route === screen.route);
    return {
      ...screen,
      actionIds: contract?.expected.ids ?? [],
    };
  });

  // v1.7.15: screen-level observation from uiObservation.ts
  const uiObservation = await buildUiObservationSummary(
    input.renderResult,
    input.browserQaResult,
    enrichedScreenContracts,
  );
  const mockPathFindings = deriveMockPathFindingsFromBrowserQa(input.browserQaResult);

  const screens = screenContracts
    .map((screen) => {
      const contract = contractSummaries.find((candidate) => candidate.route === screen.route);
      if (!contract) {
        return null;
      }

      const renderEntries = (input.renderResult?.entries ?? []).filter(
        (entry) => entry.target === screen.route || entry.target === screen.screenId,
      );

      // v1.7.15: screen-level observation — find the specific screen's observation
      const screenObs = uiObservation.screens.find(
        (obs) => obs.route === screen.route || obs.screenId === screen.screenId,
      );
      const domLabels = screenObs?.domLabelsFound ?? [];
      const actionsWired = screenObs?.actionsWired ?? 0;

      // v1.7.15: mockPaths derived from browser QA findings only (no auto-pass)
      const screenMockPaths =
        screenObs?.mockPathFindings ??
        mockPathFindings.filter(
          (f) => f.id.startsWith(screen.screenId) || f.id.includes(screen.route),
        );

      return {
        screenId: screen.screenId,
        route: screen.route,
        uiContractId: contract.contractId,
        expected: contract.expected,
        ...(domLabels.length > 0 ? { found: { labels: domLabels } } : {}),
        observed: {
          elementsPlaced: domLabels.length,
          actionsWired,
        },
        mockPaths: screenMockPaths,
        renders: renderEntries.map((entry) => ({
          viewport: entry.viewport,
          status: entry.status,
          width: 1440,
          height: 900,
          ...(entry.screenshot_path ? { imagePath: entry.screenshot_path } : {}),
          ...(entry.html_path ? { htmlPath: entry.html_path } : {}),
          ...(entry.status === "skipped" ? { skippedReason: entry.reason ?? "not captured" } : {}),
          ...(entry.status === "failed" ? { error: entry.reason ?? "capture failed" } : {}),
        })),
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (screens.length === 0) {
    return {
      status: input.required
        ? {
            required: true,
            status: "failed",
            reason: "screen contracts or UI contracts could not be resolved",
          }
        : {
            required: false,
            status: "failed",
            reason: "screen contracts or UI contracts could not be resolved",
          },
      missingRequiredEvidence: input.required ? ["uiFidelity"] : [],
    };
  }

  // v1.7.15: check for insufficient evidence per screen
  const insufficientScreens = screens.filter((screen) => {
    const hasCapturedRender = screen.renders.some((render) => render.status === "captured");
    const hasHtmlCapture = screen.renders.some(
      (render) => render.status === "captured" && typeof render.htmlPath === "string",
    );
    const screenObservation = uiObservation.screens.find(
      (obs) => obs.screenId === screen.screenId || obs.route === screen.route,
    );
    const hasBrowserQaObservation =
      screenObservation?.browserQaObserved === true ||
      (screenObservation?.browserQaEvidenceRefs.length ?? 0) > 0;
    const hasCompletedScreenEvidence =
      hasCapturedRender &&
      hasHtmlCapture &&
      Boolean(screenObservation) &&
      hasBrowserQaObservation &&
      screenObservation?.screenId === screen.screenId;
    return !hasCompletedScreenEvidence;
  });
  const hasInsufficientEvidence = insufficientScreens.length > 0;

  return {
    uiFidelity: {
      mode: "interactive",
      screens,
    },
    // Execution is fail-closed: callers must treat any non-completed status as execution failure.
    status: {
      required: input.required,
      status: hasInsufficientEvidence ? "insufficient-evidence" : "completed",
      ...(hasInsufficientEvidence
        ? {
            reason: `${insufficientScreens.length} screen(s) lack render/observation evidence: ${insufficientScreens.map((s) => s.route).join(", ")}`,
          }
        : {}),
    },
    missingRequiredEvidence: hasInsufficientEvidence
      ? insufficientScreens.map((s) => `uiFidelity:${s.route}`)
      : [],
  };
}

async function collectUiContractScreens(
  root: string,
  config: QfaiConfig,
): Promise<ContractScreenSummary[]> {
  const contractIndex = await buildContractIndex(root, config);
  const screens: ContractScreenSummary[] = [];

  for (const [contractId, files] of contractIndex.idToFiles.entries()) {
    if (!contractId.startsWith("CON-UI-")) {
      continue;
    }
    const filePath = Array.from(files).sort((left, right) => left.localeCompare(right))[0];
    if (!filePath) {
      continue;
    }
    const raw = await readSafe(filePath);
    if (!raw) {
      continue;
    }
    const doc = parseStructuredContract(filePath, stripContractDeclarationLines(raw));
    if (!Array.isArray(doc.screens)) {
      continue;
    }
    for (const screen of doc.screens) {
      if (!screen || typeof screen !== "object") {
        continue;
      }
      const route =
        typeof (screen as { route?: unknown }).route === "string"
          ? (screen as { route: string }).route.trim()
          : "";
      if (!route) {
        continue;
      }
      const elements = Array.isArray((screen as { elements?: unknown[] }).elements)
        ? (screen as { elements: Array<{ id?: string; label?: string }> }).elements
        : [];
      const actions = Array.isArray((screen as { actions?: unknown[] }).actions)
        ? (screen as { actions: Array<{ id?: string }> }).actions
        : [];
      screens.push({
        contractId,
        route,
        screenId:
          typeof (screen as { id?: unknown }).id === "string"
            ? (screen as { id: string }).id.trim()
            : route,
        expected: {
          elements: elements.filter(
            (item) => typeof item.id === "string" && item.id.trim().length > 0,
          ).length,
          actions: actions.filter(
            (item) => typeof item.id === "string" && item.id.trim().length > 0,
          ).length,
          labels: elements
            .map((item) => (typeof item.label === "string" ? item.label.trim() : ""))
            .filter((item) => item.length > 0),
          ids: actions
            .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
            .filter((item) => item.length > 0),
        },
      });
    }
  }

  return screens;
}
