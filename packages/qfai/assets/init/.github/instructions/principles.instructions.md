---
applyTo: "**/*"
excludeAgent: "coding-agent"
---

# Software Engineering Principles Review

Check whether a change is sound against established software design principles.
When you find a violation, name the principle and propose an improvement.

## Basic design principles

### SOLID

- **SRP**: Does a class, function or module change for more than one reason? Does its name state its responsibility?
- **OCP**: Can it be extended without rewriting existing code, through configuration, dependency injection or a strategy?
- **LSP**: Does a subtype break its parent's contract, by strengthening preconditions or weakening postconditions?
- **ISP**: Are clients forced to depend on methods they do not use? Are interfaces small and split by role?
- **DIP**: Does a high-level module depend on a concrete low-level one, rather than on an abstraction at the boundary?

### How much code — KISS, YAGNI, DRY

The ladder is in `.agents/rules/minimal-implementation.md`. Read it there and
report against it. It is not restated here, so there is one wording to disagree
with.

Two things the ladder does not decide, which stay a finding here:

- Cognitive load. Deep nesting, excess abstraction and implicit behaviour are
  worth reporting whatever the amount of code.
- The limit on sharing. Extract on the third occurrence. Earlier than that, code
  pulled in different directions by several callers costs more than the
  repetition did.

## Principles of relations between modules

### Separation of Concerns

- Are business logic, UI, data access and infrastructure mixed in one module?

### Law of Demeter

- Does the code reach a distant object through a chain such as `a.getB().getC().doSomething()`?

### Minimise Coupling / Maximise Cohesion

- Is coupling high enough that a change ripples into other modules?
- Do the elements of a module serve one responsibility?

### Composition over Inheritance

- Is inheritance used without an "is-a" relationship? Would composition fit better?

## Principles of robustness and safety

### Fail Fast

- Are invalid input and violated preconditions rejected at the start of a function?
- Can an invalid state propagate and fail obscurely later?

### Defensive Programming

- Are external input, API responses and user input validated?
- Are null/undefined handled and resources released (finally/using)?

### Principle of Least Privilege

- Does the code run with only the access it needs?

### Design by Contract

- Are preconditions, postconditions and invariants clear?

## Principles of readability and maintainability

### Principle of Least Astonishment

- Do names match behaviour, and can side effects be predicted from them?
- Does the code follow the idioms of its language and framework?

### Boy Scout Rule

- Was obvious room for improvement near the change (naming, types, dead code) taken?

### Avoid Premature Optimization

- Was anything optimized without measurement, or at the cost of readability outside the bottleneck?

## Principles of behaviour and interfaces

### Tell, Don't Ask

- Does the code tell an object what to do, rather than query its state and decide for it?

### Command Query Separation

- Are state-changing methods and value-returning methods mixed?

### Encapsulation

- Are implementation details exposed? Is the public API the necessary minimum?

## Notes on applying these principles

- Principles trade off (DRY vs YAGNI, KISS vs OCP). Weigh the balance in context.
- Give each violation a severity of [MAJOR] or [MINOR] and briefly say why it matters.

<!-- qfai:language-rules -->
