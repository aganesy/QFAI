/**
 * Echo provider — returns a predefined critique response for testing
 * and demonstration purposes (BR-0029-0006).
 */

import type { CritiqueInput, CritiqueProvider, CritiqueResponse } from "./types.js";

export class EchoProvider implements CritiqueProvider {
  readonly name = "echo-provider";

  request(_input: CritiqueInput, _signal?: AbortSignal): Promise<CritiqueResponse> {
    return Promise.resolve({
      scores: { quality: 5, correctness: 5, completeness: 5 },
      dimensions: ["quality", "correctness", "completeness"],
      suggestions: ["This is an echo provider response for testing purposes"],
    });
  }
}
