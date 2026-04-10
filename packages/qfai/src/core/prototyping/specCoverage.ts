/**
 * Spec coverage measurement — v1.7.15
 *
 * Builds spec coverage summary from declared specs and runtime observations.
 * Zero-seeded coverage is prohibited.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SpecCoverageSummary } from "../harness/panelInputs.js";
import type { RuntimeObservation } from "./runtimeObservation.js";

type SpecDeclaration = {
  specId: string;
  uiRoutes: Array<{ route: string; declaredRef: string }>;
  apiEndpoints: string[];
  dbObjects: string[];
};

export async function loadDeclaredSpecArtifacts(specsDir: string): Promise<SpecDeclaration[]> {
  const declarations: SpecDeclaration[] = [];
  let entries: string[];
  try {
    entries = await readdir(specsDir);
  } catch {
    return [];
  }

  for (const entry of entries.filter((e) => e.startsWith("spec-")).sort()) {
    const specDir = path.join(specsDir, entry);
    const declaration = await parseSpecDeclaration(specDir, entry);
    if (declaration) {
      declarations.push(declaration);
    }
  }
  return declarations;
}

async function parseSpecDeclaration(
  specDir: string,
  specId: string,
): Promise<SpecDeclaration | null> {
  const uiRoutes: Array<{ route: string; declaredRef: string }> = [];
  const apiEndpoints: string[] = [];
  const dbObjects: string[] = [];

  let files: string[];
  try {
    files = await readdir(specDir);
  } catch {
    return { specId, uiRoutes, apiEndpoints, dbObjects };
  }

  for (const file of files) {
    const filePath = path.join(specDir, file);
    try {
      const content = await readFile(filePath, "utf-8");
      uiRoutes.push(...extractUiRouteDeclarations(content, filePath));
      apiEndpoints.push(...extractDeclarations(content, "api_endpoint"));
      dbObjects.push(...extractDeclarations(content, "db_object"));
    } catch {
      // skip unreadable files
    }
  }

  return { specId, uiRoutes, apiEndpoints, dbObjects };
}

function extractDeclarations(content: string, kind: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`^\\s*-\\s+${kind}:\\s*(.+)$`, "gm");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const value = match[1]?.trim();
    if (value) results.push(value);
  }
  return results;
}

function extractUiRouteDeclarations(
  content: string,
  filePath: string,
): Array<{ route: string; declaredRef: string }> {
  const results: Array<{ route: string; declaredRef: string }> = [];
  const regex = /^\s*-\s+ui_route:\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const route = match[1]?.trim();
    if (!route) {
      continue;
    }
    const lineNumber = content.slice(0, match.index).split("\n").length;
    results.push({
      route,
      declaredRef: `${filePath}#L${lineNumber}`,
    });
  }
  return results;
}

export function collectObservedRuntimeArtifacts(runtimeObservation?: RuntimeObservation): {
  uiOk: string[];
  observedRefsByRoute: Map<string, string[]>;
} {
  if (!runtimeObservation) return { uiOk: [], observedRefsByRoute: new Map() };

  const observedRefsByRoute = new Map<string, string[]>();
  for (const entry of runtimeObservation.ui) {
    observedRefsByRoute.set(
      entry.route,
      Array.from(new Set([...entry.renderEvidenceRefs, ...entry.browserQaEvidenceRefs])),
    );
  }
  const uiOk = runtimeObservation.ui.map((entry) => entry.route);
  return { uiOk, observedRefsByRoute };
}

export async function buildSpecCoverageSummary(
  specsDir: string,
  runtimeObservation?: RuntimeObservation,
  evidenceDir?: string,
): Promise<SpecCoverageSummary> {
  const declared = await loadDeclaredSpecArtifacts(specsDir);
  const observed = collectObservedRuntimeArtifacts(runtimeObservation);

  let totalUiRoutes = 0;
  let uiOk = 0;
  const missingUiRoutes: string[] = [];

  for (const spec of declared) {
    totalUiRoutes += spec.uiRoutes.length;

    for (const route of spec.uiRoutes) {
      if (observed.uiOk.includes(route.route)) {
        uiOk++;
      } else {
        missingUiRoutes.push(route.route);
      }
    }

    if (spec.apiEndpoints.length > 0 || spec.dbObjects.length > 0) {
      throw new Error(
        `Spec coverage failure: spec "${spec.specId}" declares non-UI prototyping coverage. ` +
          `packages/qfai prototyping supports UI route coverage only.`,
      );
    }
  }

  const evidenceRefs: string[] = [];
  if (evidenceDir) {
    evidenceRefs.push(evidenceDir);
  }
  for (const spec of declared) {
    for (const route of spec.uiRoutes) {
      evidenceRefs.push(route.declaredRef);
      for (const observedRef of observed.observedRefsByRoute.get(route.route) ?? []) {
        evidenceRefs.push(observedRef);
      }
    }
  }

  return {
    declared: {
      uiRoutes: totalUiRoutes,
    },
    checked: {
      uiOk,
    },
    missing: {
      uiRoutes: missingUiRoutes,
    },
    evidenceRefs: Array.from(new Set(evidenceRefs)),
  };
}

export type PerSpecCoverage = {
  specId: string;
  declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
  checked: { uiOk: number; apiNon404: number; dbPresent: number };
  missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
  coverageRefs: Array<{
    route: string;
    declaredRef: string;
    observedRefs: string[];
  }>;
};

export async function buildPerSpecCoverage(
  specsDir: string,
  runtimeObservation?: RuntimeObservation,
): Promise<PerSpecCoverage[]> {
  const declared = await loadDeclaredSpecArtifacts(specsDir);
  const observed = collectObservedRuntimeArtifacts(runtimeObservation);

  return declared.map((spec) => {
    let uiOk = 0;
    const missingUiRoutes: string[] = [];

    const coverageRefs = spec.uiRoutes.map((route) => ({
      route: route.route,
      declaredRef: route.declaredRef,
      observedRefs: observed.observedRefsByRoute.get(route.route) ?? [],
    }));

    for (const route of spec.uiRoutes) {
      if (observed.uiOk.includes(route.route)) {
        uiOk++;
      } else {
        missingUiRoutes.push(route.route);
      }
    }

    return {
      specId: spec.specId,
      declared: {
        uiRoutes: spec.uiRoutes.length,
        apiEndpoints: 0,
        dbObjects: 0,
      },
      checked: {
        uiOk,
        apiNon404: 0,
        dbPresent: 0,
      },
      missing: {
        uiRoutes: missingUiRoutes,
        apiEndpoints: [],
        dbObjects: [],
      },
      coverageRefs,
    };
  });
}
