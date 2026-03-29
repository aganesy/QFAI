/**
 * Evidence handler — conditional capture logic based on capability config.
 *
 * When capability is not registered: all elements are skipped.
 * When registered: each element is captured independently; failures are isolated.
 */

import {
  createRenderEvidenceRecord,
  type RenderEvidenceRecord,
  type ViewportElement,
} from "./captureStatus.js";

export type EvidenceCapability = {
  registered: boolean;
  captureScreenshot?: () => Promise<string>;
  captureViewport?: () => Promise<{ width: number; height: number }>;
  captureDom?: () => Promise<string>;
};

export type EvidenceCaptureResult = {
  record: RenderEvidenceRecord;
  errors: string[];
};

export async function captureRenderEvidence(
  capability: EvidenceCapability,
): Promise<EvidenceCaptureResult> {
  const errors: string[] = [];

  if (!capability.registered) {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "skipped", reason: "capability not registered" },
      viewport: { status: "skipped", reason: "capability not registered" },
      domRef: { status: "skipped", reason: "capability not registered" },
    });
    return { record, errors };
  }

  const screenshot = await captureElement("screenshot", capability.captureScreenshot, (path) => ({
    status: "captured" as const,
    path,
  }));
  if (screenshot.error) errors.push(screenshot.error);

  const viewport = await captureViewportElement(capability.captureViewport);
  if (viewport.error) errors.push(viewport.error);

  const domRef = await captureElement("domRef", capability.captureDom, (path) => ({
    status: "captured" as const,
    path,
  }));
  if (domRef.error) errors.push(domRef.error);

  const record = createRenderEvidenceRecord({
    screenshot: screenshot.element,
    viewport: viewport.element,
    domRef: domRef.element,
  });

  return { record, errors };
}

type PathBasedElement =
  | { status: "captured"; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

type ElementResult<T> = { element: T; error?: string };

async function captureElement<T extends PathBasedElement>(
  name: string,
  fn: (() => Promise<string>) | undefined,
  onSuccess: (result: string) => T & { status: "captured" },
): Promise<ElementResult<T>> {
  if (!fn) {
    return {
      element: { status: "skipped", reason: `${name} capture function not provided` } as T,
    };
  }
  try {
    const result = await fn();
    return { element: onSuccess(result) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      element: { status: "failed", error: msg } as T,
      error: `${name}: ${msg}`,
    };
  }
}

async function captureViewportElement(
  fn: (() => Promise<{ width: number; height: number }>) | undefined,
): Promise<ElementResult<ViewportElement>> {
  if (!fn) {
    return { element: { status: "skipped", reason: "viewport capture function not provided" } };
  }
  try {
    const { width, height } = await fn();
    return { element: { status: "captured", width, height } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { element: { status: "failed", error: msg }, error: `viewport: ${msg}` };
  }
}
