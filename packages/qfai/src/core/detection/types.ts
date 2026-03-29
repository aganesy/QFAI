export type DetectionLocation = {
  functionName?: string;
  lineRange?: [number, number];
  pattern: string;
};

export type DetectionFinding = {
  type: "display-only" | "stub-only" | "partial-stub";
  confidence: number;
  locations: DetectionLocation[];
  context?: string;
};
