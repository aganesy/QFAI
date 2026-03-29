// QFAI:SPEC-0033:TC-0033-0009
// QFAI:SPEC-0033:TC-0033-0010
// QFAI:SPEC-0033:TC-0033-0011
// QFAI:SPEC-0033:TC-0033-0012
// QFAI:SPEC-0033:TC-0033-0015

import { describe, expect, it } from "vitest";

import { StubDetector } from "../../../src/core/detection/stub.js";

describe("StubDetector", () => {
  const detector = new StubDetector();

  // TC-0033-0009
  it("detects class with all methods throwing 'not implemented' as stub-only", () => {
    const code = `
class PaymentService {
  charge(amount) {
    throw new Error('not implemented');
  }

  refund(id) {
    throw 'not implemented';
  }

  getBalance() {
    throw new Error('not implemented');
  }
}
`;

    const findings = detector.detect(code);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("stub-only");
    expect(findings[0].confidence).toBeGreaterThanOrEqual(0.9);
    expect(findings[0].locations.length).toBeGreaterThanOrEqual(3);

    const names = findings[0].locations.map((l) => l.functionName);
    expect(names).toContain("charge");
    expect(names).toContain("refund");
    expect(names).toContain("getBalance");
  });

  // TC-0033-0010
  it("detects module with all empty function bodies as stub-only", () => {
    const code = `
class DataAccess {
  save(entity) {
  }

  load(id) {
  }

  delete(id) {
  }
}
`;

    const findings = detector.detect(code);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("stub-only");
    expect(findings[0].locations.length).toBeGreaterThanOrEqual(3);
  });

  // TC-0033-0011
  it("detects partial-stub when 9 real methods and 1 TODO stub", () => {
    const realMethods = Array.from({ length: 9 }, (_, i) => `
  method${i}(arg) {
    return arg * ${i + 1};
  }`).join("\n");

    const code = `
class MixedService {
${realMethods}

  incompleteMethod(data) {
    // TODO: implement this
  }
}
`;

    const findings = detector.detect(code);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("partial-stub");
    expect(findings[0].locations.length).toBe(1);
    expect(findings[0].locations[0].functionName).toBe("incompleteMethod");
  });

  // TC-0033-0012
  it("produces identical results on repeated detection (idempotent)", () => {
    const code = `
class Service {
  doWork() {
    throw new Error('not implemented');
  }

  realWork() {
    return 42;
  }
}
`;

    const first = detector.detect(code);
    const second = detector.detect(code);

    expect(first).toEqual(second);
  });

  // TC-0033-0015
  it("includes stub locations with function names and patterns in findings", () => {
    const code = `
class Processor {
  validate(input) {
    return input.length > 0;
  }

  transform(data) {
    throw new Error('not implemented');
  }

  format(result) {
  }
}
`;

    const findings = detector.detect(code);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("partial-stub");

    for (const location of findings[0].locations) {
      expect(location.functionName).toBeDefined();
      expect(location.pattern).toBeDefined();
      expect(typeof location.functionName).toBe("string");
      expect(typeof location.pattern).toBe("string");
    }

    const stubNames = findings[0].locations.map((l) => l.functionName);
    expect(stubNames).toContain("transform");
    expect(stubNames).toContain("format");
    expect(stubNames).not.toContain("validate");

    const patterns = findings[0].locations.map((l) => l.pattern);
    expect(patterns).toContain("throw-not-implemented");
    expect(patterns).toContain("empty-body");
  });
});
