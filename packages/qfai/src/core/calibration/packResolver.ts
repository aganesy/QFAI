import path from "node:path";

import { CalibrationLoader } from "./loader.js";
import type { CalibrationPack } from "./types.js";

export type ResolvedCalibrationPack = {
  pack: CalibrationPack;
  packPath: string;
  thresholds: CalibrationPack["thresholds"];
  maxIterations: number;
  plateauDelta: number;
  plateauLookback: number;
};

export async function resolveCalibrationPack(input: {
  root: string;
  packPath: string;
}): Promise<ResolvedCalibrationPack> {
  const absolutePackPath = path.isAbsolute(input.packPath)
    ? input.packPath
    : path.join(input.root, input.packPath);
  const loader = new CalibrationLoader(absolutePackPath);
  const pack = await loader.load();
  return {
    pack,
    packPath: input.packPath,
    thresholds: pack.thresholds,
    maxIterations: pack.maxIterations,
    plateauDelta: pack.plateauDelta,
    plateauLookback: pack.plateauLookback,
  };
}
