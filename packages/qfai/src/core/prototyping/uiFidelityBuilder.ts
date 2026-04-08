import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { parseStructuredContract } from "../contracts.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { UiFidelityStatus } from "./types.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { readSafe } from "../validators/utils.js";
import { buildUiObservationSummary, deriveMockPathFindingsFromBrowserQa } from "./uiObservation.js";

type ScreenContractEntry = {
  screenId: string;
  route: string;
  expectedStates: string[];
};

type ContractScreenSummary = {
  contractId: string;
  route: string;
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
      mockPaths: Array<{ id: string; status: string }>;
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
  const screenContracts = await readScreenContracts(latestPack);
  const contractSummaries = await collectUiContractScreens(input.root, input.config);

  const uiObservation = await buildUiObservationSummary(input.renderResult);
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

      // v1.7.15: Use DOM-derived observation from uiObservation.ts
      const domLabels = uiObservation.domLabelsFound;
      const browserFindingsCount =
        input.browserQaResult?.phases
          .flatMap((phase) => phase.findings)
          .filter((finding) => finding.route === undefined || finding.route === screen.route)
          .length ?? 0;

      // v1.7.15: mockPaths derived from browser QA findings only (no auto-pass)
      const screenMockPaths = mockPathFindings.filter(
        (f) => f.id.startsWith(screen.screenId) || f.id.includes(screen.route),
      );

      return {
        route: screen.route,
        uiContractId: contract.contractId,
        expected: contract.expected,
        ...(domLabels.length > 0 ? { found: { labels: domLabels } } : {}),
        // v1.7.15: observed reflects real measurement only.
        // domLabels = elements found in rendered HTML; browserFindingsCount = actions
        // detected by browser QA. No synthetic fallback from expected values.
        observed: {
          elementsPlaced: domLabels.length,
          actionsWired: browserFindingsCount > 0 ? browserFindingsCount : 0,
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

  return {
    uiFidelity: {
      mode: "interactive",
      screens,
    },
    status: {
      required: input.required,
      status: "completed",
    },
    missingRequiredEvidence: [],
  };
}

async function readScreenContracts(packDir: string | null): Promise<ScreenContractEntry[]> {
  if (!packDir) {
    return [];
  }
  const filePath = path.join(packDir, "uiux", "40_screen_contracts.md");
  const raw = await readSafe(filePath);
  if (!raw) {
    return [];
  }

  const lines = raw.split("\n");
  const screens: ScreenContractEntry[] = [];
  let current: ScreenContractEntry | null = null;
  let inStates = false;
  for (const line of lines) {
    const headingMatch = /^###\s+Screen:\s*(.+)$/.exec(line);
    if (headingMatch) {
      if (current?.route) {
        screens.push(current);
      }
      current = { screenId: (headingMatch[1] ?? "").trim(), route: "", expectedStates: [] };
      inStates = false;
      continue;
    }
    if (!current) {
      continue;
    }
    const fieldMatch = /^\s*-\s+(\w[\w_]*):\s*(.*)$/.exec(line);
    if (fieldMatch) {
      const key = fieldMatch[1];
      const value = (fieldMatch[2] ?? "").trim();
      if (key === "screen_id" && value) {
        current.screenId = value;
      } else if (key === "route" && value) {
        current.route = value;
      }
      inStates = key === "required_states" && value.length === 0;
      continue;
    }
    if (inStates) {
      const stateMatch = /^\s{2,}-\s+([^:]+):?/.exec(line);
      if (stateMatch?.[1]) {
        current.expectedStates.push(stateMatch[1].trim());
      } else if (line.trim() !== "") {
        inStates = false;
      }
    }
  }
  if (current?.route) {
    screens.push(current);
  }
  return screens;
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
