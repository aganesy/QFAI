/**
 * Spec coverage measurement — v1.7.15
 *
 * Builds spec coverage summary from declared specs and runtime observations.
 * Zero-seeded coverage is prohibited.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SpecCoverageSummary } from "../harness/panelInputs.js";

type SpecDeclaration = {
  specId: string;
  uiRoutes: string[];
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
  const uiRoutes: string[] = [];
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
      uiRoutes.push(...extractDeclarations(content, "ui_route"));
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

export function collectObservedRuntimeArtifacts(runtimeGate?: {
  ui: Array<{ route: string; status: number }>;
  api: Array<{ method: string; path: string; status: number }>;
}): {
  uiOk: string[];
  apiNon404: string[];
} {
  if (!runtimeGate) return { uiOk: [], apiNon404: [] };

  const uiOk = runtimeGate.ui
    .filter((entry) => entry.status >= 200 && entry.status < 400)
    .map((entry) => entry.route);

  const apiNon404 = runtimeGate.api
    .filter((entry) => entry.status !== 404)
    .map((entry) => `${entry.method} ${entry.path}`);

  return { uiOk, apiNon404 };
}

export async function buildSpecCoverageSummary(
  specsDir: string,
  runtimeGate?: {
    ui: Array<{ route: string; status: number }>;
    api: Array<{ method: string; path: string; status: number }>;
  },
  evidenceDir?: string,
): Promise<SpecCoverageSummary> {
  const declared = await loadDeclaredSpecArtifacts(specsDir);
  const observed = collectObservedRuntimeArtifacts(runtimeGate);

  let totalUiRoutes = 0;
  let totalApiEndpoints = 0;
  let totalDbObjects = 0;
  let uiOk = 0;
  let apiNon404 = 0;
  const dbPresent = 0;
  const missingUiRoutes: string[] = [];
  const missingApiEndpoints: string[] = [];
  const missingDbObjects: string[] = [];

  for (const spec of declared) {
    totalUiRoutes += spec.uiRoutes.length;
    totalApiEndpoints += spec.apiEndpoints.length;
    totalDbObjects += spec.dbObjects.length;

    for (const route of spec.uiRoutes) {
      if (observed.uiOk.includes(route)) {
        uiOk++;
      } else {
        missingUiRoutes.push(route);
      }
    }

    for (const endpoint of spec.apiEndpoints) {
      if (observed.apiNon404.some((a) => a.includes(endpoint))) {
        apiNon404++;
      } else {
        missingApiEndpoints.push(endpoint);
      }
    }

    // DB objects: v1.7.15 fail-closed — declared DB objects with no observation is an error
    if (spec.dbObjects.length > 0) {
      throw new Error(
        `Spec coverage failure: spec "${spec.specId}" declares ${spec.dbObjects.length} DB objects ` +
          `but DB object observation is not implemented. ` +
          `Either implement DB observation or remove DB object declarations.`,
      );
    }
  }

  const evidenceRefs: string[] = [];
  if (evidenceDir) {
    evidenceRefs.push(evidenceDir);
  }
  if (declared.length > 0) {
    evidenceRefs.push(`specs: ${declared.map((d) => d.specId).join(", ")}`);
  }

  return {
    declared: {
      uiRoutes: totalUiRoutes,
      apiEndpoints: totalApiEndpoints,
      dbObjects: totalDbObjects,
    },
    checked: {
      uiOk,
      apiNon404,
      dbPresent,
    },
    missing: {
      uiRoutes: missingUiRoutes,
      apiEndpoints: missingApiEndpoints,
      dbObjects: missingDbObjects,
    },
    evidenceRefs,
  };
}

export type PerSpecCoverage = {
  specId: string;
  declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
  checked: { uiOk: number; apiNon404: number; dbPresent: number };
  missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
};

export async function buildPerSpecCoverage(
  specsDir: string,
  runtimeGate?: {
    ui: Array<{ route: string; status: number }>;
    api: Array<{ method: string; path: string; status: number }>;
  },
): Promise<PerSpecCoverage[]> {
  const declared = await loadDeclaredSpecArtifacts(specsDir);
  const observed = collectObservedRuntimeArtifacts(runtimeGate);

  return declared.map((spec) => {
    let uiOk = 0;
    let apiNon404 = 0;
    const missingUiRoutes: string[] = [];
    const missingApiEndpoints: string[] = [];

    for (const route of spec.uiRoutes) {
      if (observed.uiOk.includes(route)) {
        uiOk++;
      } else {
        missingUiRoutes.push(route);
      }
    }

    for (const endpoint of spec.apiEndpoints) {
      if (observed.apiNon404.some((a) => a.includes(endpoint))) {
        apiNon404++;
      } else {
        missingApiEndpoints.push(endpoint);
      }
    }

    return {
      specId: spec.specId,
      declared: {
        uiRoutes: spec.uiRoutes.length,
        apiEndpoints: spec.apiEndpoints.length,
        dbObjects: spec.dbObjects.length,
      },
      checked: {
        uiOk,
        apiNon404,
        dbPresent: 0,
      },
      missing: {
        uiRoutes: missingUiRoutes,
        apiEndpoints: missingApiEndpoints,
        dbObjects: [...spec.dbObjects],
      },
    };
  });
}
