---
applyTo: "**/*"
excludeAgent: "coding-agent"
---

# Software Engineering Principles Review

Check whether a change is sound against the principles and established theory of software development and design.
When you find a violation, name the principle it violates and propose an improvement.

## Basic design principles

### SOLID

- **SRP (Single Responsibility)**: Is a class, function or module designed so that it changes for more than one reason? Can its responsibility be read unambiguously from its name?
- **OCP (Open-Closed)**: Can the design be extended without rewriting existing code? Can behaviour be switched through configuration values, dependency injection, the strategy pattern and the like?
- **LSP (Liskov Substitution)**: Does a derived type or subtype break the contract of its parent? Does it strengthen preconditions or weaken postconditions?
- **ISP (Interface Segregation)**: Are clients forced to depend on methods they do not use? Are interfaces small and split by role?
- **DIP (Dependency Inversion)**: Does a high-level module depend directly on a concrete low-level one? Do modules depend on abstractions (interfaces) at their boundaries?

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

- Are different concerns, such as business logic, UI, data access and infrastructure, mixed in one module?

### Law of Demeter (Principle of Least Knowledge)

- Does the code depend on a distant object through a method chain such as `a.getB().getC().doSomething()`?
- Does an object talk only to its direct collaborators?

### Minimise Coupling / Maximise Cohesion

- Is the coupling between modules unnecessarily high? Is the design one where a change is unlikely to ripple into other modules?
- Do the elements within a module work together toward the same responsibility (high cohesion)?

### Composition over Inheritance

- Is inheritance used where there is no "is-a" relationship? Should a combination of behaviours be achieved through composition (delegation, mixins) instead?

## Principles of robustness and safety

### Fail Fast

- Are invalid input and violated preconditions detected at the start of a function, with an error returned immediately?
- Does the design let an invalid state propagate and cause an obscure failure in later processing?

### Defensive Programming

- Is there appropriate validation of external input, API responses and user input?
- Are null/undefined handled safely, and are resources released properly (finally/using)?

### Principle of Least Privilege

- Does the code run with the minimum necessary access rights and scope? Does it request excessive privileges?

### Design by Contract

- Are a function's preconditions (constraints on arguments), postconditions (guarantees on return values) and invariants clear?

## Principles of readability and maintainability

### Principle of Least Astonishment

- Do the names of APIs and functions match their actual behaviour? Can side effects be predicted from the name?
- Does the code follow the idioms of the language and framework?

### Boy Scout Rule (leave it cleaner than you found it)

- Where there is obvious room for improvement around the changed code (naming, type safety, unnecessary code), has it been improved along with the change?

### Avoid Premature Optimization

- Has anything been optimized without measurement? Has an optimization that sacrifices readability been applied outside the bottleneck?

## Principles of behaviour and interfaces

### Tell, Don't Ask

- Does the code delegate behaviour to an object, rather than querying its internal state from outside and deciding for it?

### Command Query Separation (CQS)

- Are methods that change state (commands) and methods that return values (queries) mixed?

### Encapsulation

- Are internal implementation details exposed to the outside unnecessarily? Is the public API kept to the necessary minimum?

## Notes on applying these principles

- Principles can trade off against each other (DRY vs YAGNI, KISS vs OCP and so on). Weigh the balance in context.
- Give each violation you report a severity of [MAJOR] or [MINOR], and briefly explain why the principle matters.

<!-- qfai:language-rules -->
