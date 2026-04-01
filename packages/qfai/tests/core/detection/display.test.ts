// QFAI:SPEC-0012:TC-0012-0008

import { describe, expect, it } from "vitest";

import { DisplayDetector } from "../../../src/core/detection/display.js";

describe("DisplayDetector", () => {
  const detector = new DisplayDetector();

  // TC-0012-0008
  it("detects JSX-only component as display-only with confidence", () => {
    const code = `
function WelcomeBanner({ title }) {
  return (
    <div className="banner">
      <h1>{title}</h1>
      <p>Welcome to the app</p>
    </div>
  );
}
`;

    const findings = detector.detect(code);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("display-only");
    expect(findings[0].confidence).toBeGreaterThan(0);
    expect(findings[0].confidence).toBeLessThanOrEqual(1);
    expect(findings[0].locations).toHaveLength(1);
    expect(findings[0].locations[0].functionName).toBe("WelcomeBanner");
    expect(findings[0].locations[0].pattern).toBe("jsx-only-component");
  });

  it("does not flag components with state hooks", () => {
    const code = `
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
`;

    const findings = detector.detect(code);
    expect(findings).toHaveLength(0);
  });

  it("does not flag components with useEffect", () => {
    const code = `
function DataLoader() {
  useEffect(() => { fetch('/api'); }, []);
  return (
    <Spinner />
  );
}
`;

    const findings = detector.detect(code);
    expect(findings).toHaveLength(0);
  });
});
