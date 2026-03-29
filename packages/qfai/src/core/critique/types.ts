/**
 * Critique adapter types for external critique providers.
 *
 * Provider interface is minimal (BR-0029-0001). Each provider implements
 * `request()` and the adapter wraps it with fail-open semantics (NFR-0002).
 */

export type CritiqueInput = {
  output: string;
  context: string;
  iteration: number;
};

export type CritiqueResponse = {
  scores: Record<string, number>;
  dimensions: string[];
  suggestions: string[];
};

export type CritiqueProvider = {
  name: string;
  request: (input: CritiqueInput) => Promise<CritiqueResponse>;
};

export type CritiqueResult =
  | { failOpen: false; response: CritiqueResponse }
  | { failOpen: true; response: undefined; reason: string };
