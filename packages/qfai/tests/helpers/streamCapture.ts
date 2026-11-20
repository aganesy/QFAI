/**
 * Output capture that keeps overlapping captures apart.
 *
 * A capture that swaps the stream's `write` for its own mock and puts back what it found breaks
 * as soon as two captures overlap and finish out of nesting order: the first to finish restores
 * the real writer while the second is still waiting, so the second's output reaches the console,
 * and the second's cleanup then re-installs the first's mock. One wrapper is installed instead,
 * while any capture is active, and each write goes to the collector of the capture whose async
 * context made it. A write made outside every capture goes to the stream's own `write`. The last
 * capture to finish puts that original function back, so its identity survives.
 */
import { AsyncLocalStorage } from "node:async_hooks";

type WriteCallback = (err?: Error) => void;

type CaptureState = {
  readonly collectors: AsyncLocalStorage<string[]>;
  active: number;
  original: NodeJS.WriteStream["write"] | null;
};

export function createStreamCapture(
  stream: NodeJS.WriteStream,
): (task: () => Promise<void>) => Promise<string> {
  const state: CaptureState = { collectors: new AsyncLocalStorage(), active: 0, original: null };

  const dispatch = (
    ...args: [
      chunk: string | Uint8Array,
      encoding?: BufferEncoding | WriteCallback,
      cb?: WriteCallback,
    ]
  ): boolean => {
    const output = state.collectors.getStore();
    if (output === undefined) {
      const written: unknown = Reflect.apply(state.original ?? stream.write, stream, args);
      return written !== false;
    }
    const [chunk, encoding, cb] = args;
    output.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
    const callback = typeof encoding === "function" ? encoding : cb;
    if (callback) {
      callback();
    }
    return true;
  };

  return async (task) => {
    const output: string[] = [];
    if (state.active === 0) {
      state.original = stream.write;
      stream.write = dispatch;
    }
    state.active += 1;

    try {
      await state.collectors.run(output, task);
    } finally {
      state.active -= 1;
      if (state.active === 0 && state.original !== null) {
        stream.write = state.original;
        state.original = null;
      }
    }

    return output.join("");
  };
}
