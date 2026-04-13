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
import {
  assertConcreteArtifactRef,
  toConcreteArtifactRef,
  toRepoRelativeArtifactRef,
} from "./pathUtils.js";
import { isSpecDeclarationRef } from "./refSemantics.js";

type SpecDeclaration = {
  specId: string;
  uiRoutes: Array<{ route: string; declaredRef: string }>;
  apiEndpoints: string[];
  dbObjects: string[];
};

export async function loadDeclaredSpecArtifacts(specsDir: string): Promise<SpecDeclaration[]> {
  const declarations: SpecDeclaration[] = [];
  const repoRoot = inferRepoRootFromSpecsDir(specsDir);
  let entries: string[];
  try {
    entries = await readdir(specsDir);
  } catch {
    return [];
  }

  for (const entry of entries.filter((e) => e.startsWith("spec-")).sort()) {
    const specDir = path.join(specsDir, entry);
    const declaration = await parseSpecDeclaration(specDir, entry, repoRoot);
    if (declaration) {
      declarations.push(declaration);
    }
  }
  return declarations;
}

async function parseSpecDeclaration(
  specDir: string,
  specId: string,
  repoRoot: string,
): Promise<SpecDeclaration | null> {
  const uiRoutes: Array<{ route: string; declaredRef: string }> = [];
  const apiEndpoints: string[] = [];
  const dbObjects: string[] = [];

  // rev11: canonical declaration source is `01_Spec.md` only.
  // Broad directory scanning is intentionally removed so that `declaredRef`
  // points at the spec's single declaration file.
  const declarationPath = path.join(specDir, "01_Spec.md");
  let content: string;
  try {
    content = await readFile(declarationPath, "utf-8");
  } catch {
    return { specId, uiRoutes, apiEndpoints, dbObjects };
  }

  uiRoutes.push(...extractUiRouteDeclarations(content, declarationPath, repoRoot));
  apiEndpoints.push(...extractDeclarations(content, "api_endpoint"));
  dbObjects.push(...extractDeclarations(content, "db_object"));

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
  repoRoot: string,
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
      declaredRef: toRepoRelativeArtifactRef({
        repoRoot,
        absolutePath: filePath,
        line: lineNumber,
      }),
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

export async function buildSpecCoverageSummary(input: {
  root?: string;
  specsDir: string;
  runtimeObservation?: RuntimeObservation;
  declaredSpecRefs?: string[];
  observedEvidenceRefs?: string[];
}): Promise<SpecCoverageSummary> {
  const repoRoot = input.root
    ? path.resolve(input.root)
    : inferRepoRootFromSpecsDir(input.specsDir);
  const declared = await loadDeclaredSpecArtifacts(input.specsDir);
  const observed = collectObservedRuntimeArtifacts(input.runtimeObservation);

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

  const evidenceRefs: string[] = [
    ...(input.declaredSpecRefs ?? []).map((ref) => toConcreteArtifactRef(repoRoot, ref)),
    ...(input.observedEvidenceRefs ?? []).map((ref) => toConcreteArtifactRef(repoRoot, ref)),
  ];
  for (const spec of declared) {
    for (const route of spec.uiRoutes) {
      assertConcreteArtifactRef(route.declaredRef);
      if (!isSpecDeclarationRef(route.declaredRef)) {
        throw new Error(
          `Spec coverage failure: declaredRef must point to ` +
            `.qfai/specs/<specId>/01_Spec.md#L<line>. Got: ${route.declaredRef}`,
        );
      }
      evidenceRefs.push(route.declaredRef);
      for (const observedRef of observed.observedRefsByRoute.get(route.route) ?? []) {
        evidenceRefs.push(toConcreteArtifactRef(repoRoot, observedRef));
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
  const repoRoot = inferRepoRootFromSpecsDir(specsDir);
  const declared = await loadDeclaredSpecArtifacts(specsDir);
  const observed = collectObservedRuntimeArtifacts(runtimeObservation);

  return declared.map((spec) => {
    let uiOk = 0;
    const missingUiRoutes: string[] = [];

    const coverageRefs = spec.uiRoutes.map((route) => ({
      route: route.route,
      declaredRef: route.declaredRef,
      observedRefs: (observed.observedRefsByRoute.get(route.route) ?? []).map((ref) =>
        toConcreteArtifactRef(repoRoot, ref),
      ),
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

function inferRepoRootFromSpecsDir(specsDir: string): string {
  return path.resolve(specsDir, "..", "..");
}
