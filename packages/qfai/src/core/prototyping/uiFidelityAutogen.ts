import { readFile } from "node:fs/promises";
import path from "node:path";

import { JSDOM } from "jsdom";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import { collectUiContractFiles } from "../discovery.js";

type CrawlStatus = "ok" | "failed";

type ContractScreenInput = {
  route: string;
  uiContractId: string;
  expectedLabels: string[];
  elementIds: string[];
  elementPairs: Array<{ id: string; label: string }>;
  elementCount: number;
  actionIds: string[];
  mockPathIds: string[];
  navigateTargets: string[];
};

export type UiFidelityAutogenExpected = {
  route: string;
  uiContractId: string;
  labels: string[];
  elementIds: string[];
  elementPairs: Array<{ id: string; label: string }>;
  elementCount: number;
  actionIds: string[];
  mockPathIds: string[];
  navigateTargets: string[];
};

export type UiFidelityAutogenCrawlResult = {
  route: string;
  status: CrawlStatus;
  httpStatus: number | null;
  labels: string[];
  markers: string[];
  error?: string;
};

export type UiFidelityAutogenMockPathResult = {
  route: string;
  uiContractId: string;
  entries: Array<{ id: string; status: string; note?: string }>;
};

export type UiFidelityLabelCoverage = {
  found: string[];
  missing: string[];
  coverage: number;
};

export type UiFidelityGeneratedScreen = {
  route: string;
  uiContractId: string;
  expected: {
    elements: number;
    actions: number;
    labels: string[];
    ids: string[];
  };
  found: {
    labels: string[];
    markers: string[];
  };
  missing: {
    labels: string[];
    markers: string[];
  };
  coverage: number;
  observed: {
    elementsPlaced: number;
    actionsWired: number;
  };
  mockPaths: Array<{ id: string; status: string; note?: string }>;
};

export type UiFidelityAutogenResult = {
  expected: UiFidelityAutogenExpected[];
  crawled: UiFidelityAutogenCrawlResult[];
  mockPaths: UiFidelityAutogenMockPathResult[];
  screens: UiFidelityGeneratedScreen[];
};

export async function collectExpectedFromContracts(
  root: string,
  config: QfaiConfig,
): Promise<UiFidelityAutogenExpected[]> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const files = await collectUiContractFiles(uiRoot);
  const screens: ContractScreenInput[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const doc = parseContractSafe(filePath, raw);
    if (!doc) {
      continue;
    }
    const contractId = resolveUiContractId(raw, doc);
    if (contractId.length === 0) {
      continue;
    }

    const mockPathIds = collectPrototypeMockPathIds(doc);
    const contractScreens = collectContractScreens(contractId, doc, mockPathIds);
    screens.push(...contractScreens);
  }

  const deduped = dedupeExpectedScreens(screens);
  return deduped.sort((left, right) => {
    const byRoute = left.route.localeCompare(right.route);
    if (byRoute !== 0) {
      return byRoute;
    }
    return left.uiContractId.localeCompare(right.uiContractId);
  });
}

export async function crawlRoutesAndCollectFoundLabels(
  baseUrl: string,
  routes: string[],
): Promise<UiFidelityAutogenCrawlResult[]> {
  const targetRoutes = Array.from(
    new Set(routes.map((route) => normalizeRoute(route)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const results: UiFidelityAutogenCrawlResult[] = [];
  for (const route of targetRoutes) {
    const targetUrl = resolveRouteUrl(baseUrl, route);
    if (!targetUrl) {
      results.push({
        route,
        status: "failed",
        httpStatus: null,
        labels: [],
        markers: [],
        error: `invalid baseUrl or route: baseUrl=${baseUrl}, route=${route}`,
      });
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      try {
        const response = await fetch(targetUrl, {
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const html = await response.text();
        const labels = extractDomLabels(html);
        const markers = extractDomMarkers(html);
        results.push({
          route,
          status: response.ok ? "ok" : "failed",
          httpStatus: response.status,
          labels,
          markers,
          ...(response.ok ? {} : { error: `http status ${response.status} for ${targetUrl}` }),
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      results.push({
        route,
        status: "failed",
        httpStatus: null,
        labels: [],
        markers: [],
        error: formatError(error),
      });
    }
  }

  return results;
}

export function runMockPaths(
  expectedScreens: UiFidelityAutogenExpected[],
  crawledRoutes: UiFidelityAutogenCrawlResult[],
): UiFidelityAutogenMockPathResult[] {
  const crawlByRoute = new Map(crawledRoutes.map((row) => [normalizeRoute(row.route), row]));

  return expectedScreens.map((screen) => {
    const routeResult = crawlByRoute.get(normalizeRoute(screen.route));
    const routeReachable = routeResult?.status === "ok";
    const hasNavigateTarget =
      screen.navigateTargets.length > 0 &&
      screen.navigateTargets.some((target) => {
        const targetResult = crawlByRoute.get(normalizeRoute(target));
        return targetResult?.status === "ok";
      });
    const interactionObservable =
      routeReachable && (screen.navigateTargets.length === 0 || hasNavigateTarget);

    const baseIds =
      screen.mockPathIds.length > 0
        ? [...screen.mockPathIds]
        : screen.actionIds.length > 0
          ? [`autogen:${screen.uiContractId}:${screen.route}:primary`]
          : [];

    const entries = baseIds.map((id) => ({
      id,
      status: "skip",
      note: "autogen could not verify interaction",
    }));

    const firstEntry = entries[0];
    if (interactionObservable && firstEntry) {
      entries[0] = {
        id: firstEntry.id,
        status: "pass",
        note:
          screen.navigateTargets.length > 0
            ? "autogen heuristic: source route + navigate target are reachable"
            : "autogen heuristic: route reachable and action exists",
      };
    } else if (firstEntry && !interactionObservable) {
      entries[0] = {
        id: firstEntry.id,
        status: "fail",
        note: "autogen could not confirm route/action reachability",
      };
    }

    return {
      route: screen.route,
      uiContractId: screen.uiContractId,
      entries,
    };
  });
}

export function computeLabelCoverage(
  expectedLabels: string[],
  foundLabelsFromDom: string[],
): UiFidelityLabelCoverage {
  const expected = dedupeLabels(expectedLabels);
  const foundDom = dedupeLabels(foundLabelsFromDom);
  const found = expected.filter((label) => hasLabelMatch(foundDom, label));
  const missing = expected.filter((label) => !hasLabelMatch(foundDom, label));
  const coverage = expected.length === 0 ? 1 : Number((found.length / expected.length).toFixed(4));

  return { found, missing, coverage };
}

export function buildUiFidelityScreens(
  expectedScreens: UiFidelityAutogenExpected[],
  crawledRoutes: UiFidelityAutogenCrawlResult[],
  mockPathResults: UiFidelityAutogenMockPathResult[],
): UiFidelityGeneratedScreen[] {
  const crawlByRoute = new Map(crawledRoutes.map((row) => [normalizeRoute(row.route), row]));
  const mockPathByKey = new Map(
    mockPathResults.map((row) => [toContractRouteKey(row.uiContractId, row.route), row]),
  );

  return expectedScreens.map((screen) => {
    const crawl = crawlByRoute.get(normalizeRoute(screen.route));
    const coverage = computeLabelCoverage(screen.labels, crawl?.labels ?? []);
    const mockPath = mockPathByKey.get(toContractRouteKey(screen.uiContractId, screen.route));
    const hasPass =
      mockPath?.entries.some((entry) => entry.status.toLowerCase() === "pass") ?? false;

    // Compute marker coverage: expected markers = contractId:elementId for each element
    // Use element IDs (stable identifiers from contract) for deterministic marker generation
    // Also accept legacy label-based markers (contractId:label) for backward compatibility
    const expectedMarkers = screen.elementIds.map((id) => `${screen.uiContractId}:${id}`);
    const crawledMarkersSet = new Set(crawl?.markers ?? []);

    // Build a label→id lookup from pairs for backward-compat matching
    const labelToIdMarker = new Map<string, string>();
    for (const pair of screen.elementPairs) {
      const labelMarker = `${screen.uiContractId}:${pair.label}`;
      const idMarker = `${screen.uiContractId}:${pair.id}`;
      if (labelMarker !== idMarker) {
        labelToIdMarker.set(labelMarker, idMarker);
      }
    }

    const foundMarkers = expectedMarkers.filter((marker) => {
      if (crawledMarkersSet.has(marker)) return true;
      // Backward compat: check if the legacy label-based marker exists in DOM
      for (const [labelMarker, idMarker] of labelToIdMarker) {
        if (idMarker === marker && crawledMarkersSet.has(labelMarker)) {
          return true;
        }
      }
      return false;
    });
    const missingMarkers = expectedMarkers.filter((marker) => !foundMarkers.includes(marker));

    return {
      route: screen.route,
      uiContractId: screen.uiContractId,
      expected: {
        elements: screen.elementCount,
        actions: screen.actionIds.length,
        labels: screen.labels,
        ids: screen.elementIds,
      },
      found: {
        labels: coverage.found,
        markers: foundMarkers,
      },
      missing: {
        labels: coverage.missing,
        markers: missingMarkers,
      },
      coverage: coverage.coverage,
      observed: {
        elementsPlaced: coverage.found.length,
        actionsWired: hasPass ? Math.max(screen.actionIds.length, 1) : 0,
      },
      mockPaths: mockPath?.entries ?? [],
    };
  });
}

export async function autogenerateUiFidelity(
  root: string,
  config: QfaiConfig,
  baseUrl: string,
  routeHints: string[],
): Promise<UiFidelityAutogenResult> {
  const expected = await collectExpectedFromContracts(root, config);
  const routes = Array.from(new Set([...expected.map((screen) => screen.route), ...routeHints]));
  const crawled = await crawlRoutesAndCollectFoundLabels(baseUrl, routes);
  const mockPaths = runMockPaths(expected, crawled);
  const screens = buildUiFidelityScreens(expected, crawled, mockPaths);

  return {
    expected,
    crawled,
    mockPaths,
    screens,
  };
}

export function emitUiFidelity(input: {
  evidence: Record<string, unknown>;
  toolVersion: string;
  command: string;
  baseUrl: string;
  status: "success" | "failed" | "skipped";
  screens?: UiFidelityGeneratedScreen[];
  crawled?: UiFidelityAutogenCrawlResult[];
  reason?: string;
}): Record<string, unknown> {
  const now = new Date().toISOString();
  const currentMeta = readRecord(input.evidence.meta);
  const currentCommands = Array.isArray(currentMeta?.commands)
    ? currentMeta.commands.filter((entry): entry is string => typeof entry === "string")
    : [];
  const nextCommands = Array.from(new Set([...currentCommands, input.command]));

  const next: Record<string, unknown> = {
    ...input.evidence,
    meta: {
      ...currentMeta,
      generatedAt:
        typeof currentMeta?.generatedAt === "string" && currentMeta.generatedAt.trim().length > 0
          ? currentMeta.generatedAt
          : now,
      toolVersion: input.toolVersion,
      commands: nextCommands,
    },
    uiFidelityAutogen: {
      status: input.status,
      generatedAt: now,
      baseUrl: input.baseUrl,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.crawled
        ? {
            routes: input.crawled.map((row) => ({
              route: row.route,
              status: row.status,
              httpStatus: row.httpStatus,
              ...(row.error ? { error: row.error } : {}),
            })),
          }
        : {}),
    },
  };

  if (input.status === "success" && input.screens) {
    next.uiFidelity = {
      version: "0.1",
      mode: "interactive",
      screens: input.screens,
    };
  }

  return next;
}

function parseContractSafe(filePath: string, raw: string): Record<string, unknown> | null {
  try {
    return parseStructuredContract(filePath, stripContractDeclarationLines(raw));
  } catch {
    return null;
  }
}

function resolveUiContractId(docRaw: string, doc: Record<string, unknown>): string {
  const fromDeclaration = /QFAI-CONTRACT-ID:\s*(CON-UI-\d{4})/i.exec(docRaw)?.[1];
  if (fromDeclaration) {
    return fromDeclaration.trim().toUpperCase();
  }
  const fromId = typeof doc.id === "string" ? doc.id.trim().toUpperCase() : "";
  return /^CON-UI-\d{4}$/.test(fromId) ? fromId : "";
}

function collectPrototypeMockPathIds(doc: Record<string, unknown>): string[] {
  const prototype = readRecord(doc.prototype);
  const mockPaths = Array.isArray(prototype?.mockPaths) ? prototype.mockPaths : [];
  const ids = mockPaths
    .map((entry) => readRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => (typeof entry.id === "string" ? entry.id.trim() : ""))
    .filter((id) => id.length > 0);
  return Array.from(new Set(ids)).sort((left, right) => left.localeCompare(right));
}

function collectContractScreens(
  contractId: string,
  doc: Record<string, unknown>,
  mockPathIds: string[],
): ContractScreenInput[] {
  const screens = Array.isArray(doc.screens) ? doc.screens : [];
  const result: ContractScreenInput[] = [];

  for (const screen of screens) {
    const screenRecord = readRecord(screen);
    if (!screenRecord) {
      continue;
    }
    const route = normalizeRoute(readText(screenRecord.route));
    if (!route) {
      continue;
    }
    const elements = collectElements(screenRecord.elements);
    const actionIds = collectActionIds(screenRecord.actions);
    const navigateTargets = collectNavigateTargets(screenRecord.actions);

    result.push({
      route,
      uiContractId: contractId,
      expectedLabels: elements.labels,
      elementIds: elements.ids,
      elementPairs: elements.pairs,
      elementCount: elements.count,
      actionIds,
      mockPathIds,
      navigateTargets,
    });
  }

  return result;
}

type CollectElementsResult = {
  ids: string[];
  labels: string[];
  pairs: Array<{ id: string; label: string }>;
  count: number;
};

function collectElements(value: unknown): CollectElementsResult {
  const entries = Array.isArray(value) ? value : [];
  const validEntries = entries
    .map((entry) => readRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const ids = validEntries.map((entry) => readText(entry.id)).filter((id) => id.length > 0);
  const labels = validEntries
    .map((entry) => readText(entry.label))
    .filter((label) => label.length > 0);
  const pairs = validEntries
    .map((entry) => ({ id: readText(entry.id), label: readText(entry.label) }))
    .filter((pair) => pair.id.length > 0 && pair.label.length > 0);
  return {
    ids: Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b)),
    labels: dedupeLabels(labels),
    pairs,
    count: validEntries.length,
  };
}

function collectActionIds(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [];
  const ids = entries
    .map((entry) => readRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => readText(entry.id))
    .filter((id) => id.length > 0);
  return Array.from(new Set(ids)).sort((left, right) => left.localeCompare(right));
}

function collectNavigateTargets(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [];
  const targets: string[] = [];

  for (const entry of entries) {
    const action = readRecord(entry);
    if (!action) {
      continue;
    }
    const kind = readText(action.kind).toLowerCase();
    if (kind !== "navigate") {
      continue;
    }
    const effect = readText(action.effect);
    if (!effect) {
      continue;
    }
    for (const route of effect.match(/\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?#]*/g) ?? []) {
      const normalized = normalizeRoute(route);
      if (normalized) {
        targets.push(normalized);
      }
    }
  }

  return Array.from(new Set(targets)).sort((left, right) => left.localeCompare(right));
}

function dedupeExpectedScreens(screens: ContractScreenInput[]): UiFidelityAutogenExpected[] {
  const map = new Map<string, UiFidelityAutogenExpected>();

  for (const screen of screens) {
    const key = toContractRouteKey(screen.uiContractId, screen.route);
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        route: screen.route,
        uiContractId: screen.uiContractId,
        labels: dedupeLabels(screen.expectedLabels),
        elementIds: Array.from(new Set(screen.elementIds)).sort((a, b) => a.localeCompare(b)),
        elementPairs: [...screen.elementPairs],
        elementCount: screen.elementCount,
        actionIds: Array.from(new Set(screen.actionIds)).sort((a, b) => a.localeCompare(b)),
        mockPathIds: Array.from(new Set(screen.mockPathIds)).sort((a, b) => a.localeCompare(b)),
        navigateTargets: Array.from(new Set(screen.navigateTargets)).sort((a, b) =>
          a.localeCompare(b),
        ),
      });
      continue;
    }
    current.labels = dedupeLabels([...current.labels, ...screen.expectedLabels]);
    current.elementIds = Array.from(new Set([...current.elementIds, ...screen.elementIds])).sort(
      (a, b) => a.localeCompare(b),
    );
    // Merge pairs, deduplicating by id
    const existingIds = new Set(current.elementPairs.map((p) => p.id));
    for (const pair of screen.elementPairs) {
      if (!existingIds.has(pair.id)) {
        current.elementPairs.push(pair);
        existingIds.add(pair.id);
      }
    }
    current.elementCount += screen.elementCount;
    current.actionIds = Array.from(new Set([...current.actionIds, ...screen.actionIds])).sort(
      (a, b) => a.localeCompare(b),
    );
    current.mockPathIds = Array.from(new Set([...current.mockPathIds, ...screen.mockPathIds])).sort(
      (a, b) => a.localeCompare(b),
    );
    current.navigateTargets = Array.from(
      new Set([...current.navigateTargets, ...screen.navigateTargets]),
    ).sort((a, b) => a.localeCompare(b));
  }

  return Array.from(map.values());
}

function extractDomLabels(html: string): string[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const labels: string[] = [];

  const textSelectors = [
    "label",
    "button",
    "a",
    "option",
    "legend",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "th",
    "td",
    "[data-qfai]",
  ].join(", ");

  for (const element of document.querySelectorAll(textSelectors)) {
    const text = normalizeDomLabel(element.textContent || "");
    if (text) {
      labels.push(text);
    }
  }

  const attributeSelectors = [
    "[aria-label]",
    "[placeholder]",
    "[alt]",
    "[title]",
    "input[value]",
    "textarea[placeholder]",
  ].join(", ");

  for (const element of document.querySelectorAll(attributeSelectors)) {
    const node = element;
    for (const attr of ["aria-label", "placeholder", "alt", "title", "value"]) {
      const value = normalizeDomLabel(node.getAttribute(attr) ?? "");
      if (value) {
        labels.push(value);
      }
    }
  }

  // Body text tokenization is opt-in via QFAI_AUTOGEN_BODY_TOKENS=1
  // Default: disabled to prevent coverage over-estimation
  if (process.env.QFAI_AUTOGEN_BODY_TOKENS === "1") {
    const rawBodyText = document.body.textContent || "";
    const bodyTokens = rawBodyText.split(/\s{2,}|\n+/);
    for (const token of bodyTokens) {
      const trimmed = normalizeDomLabel(token);
      if (trimmed) {
        labels.push(trimmed);
      }
    }
  }

  return dedupeLabels(labels);
}

export function extractDomMarkers(html: string): string[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const markers: string[] = [];

  for (const element of document.querySelectorAll("[data-qfai]")) {
    const value = element.getAttribute("data-qfai") ?? "";
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      markers.push(trimmed);
    }
  }

  return Array.from(new Set(markers)).sort((a, b) => a.localeCompare(b));
}

function normalizeDomLabel(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return "";
  }
  if (normalized.length > 120) {
    return "";
  }
  return normalized;
}

function hasLabelMatch(foundLabels: string[], expectedLabel: string): boolean {
  const normalizedExpected = normalizeComparableText(expectedLabel);
  if (!normalizedExpected) {
    return false;
  }
  return foundLabels.some((label) => {
    const normalizedFound = normalizeComparableText(label);
    return normalizedFound === normalizedExpected;
  });
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function dedupeLabels(labels: string[]): string[] {
  return Array.from(
    new Set(
      labels.map((label) => label.replace(/\s+/g, " ").trim()).filter((label) => label.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function resolveRouteUrl(baseUrl: string, route: string): string | null {
  try {
    return new URL(route, baseUrl).toString();
  } catch {
    return null;
  }
}

function normalizeRoute(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return normalizeRoute(url.pathname);
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/${trimmed}`;
}

function toContractRouteKey(contractId: string, route: string): string {
  return `${contractId.toUpperCase()}|${normalizeRoute(route)}`;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
