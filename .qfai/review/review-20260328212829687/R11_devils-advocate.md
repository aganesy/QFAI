# R11: Devil's Advocate

## Reviewer: devils-advocate (Devil's Advocate)
## Scope: discussion
## Target: `.qfai/discussion/discussion-20260328212829687/`

## Behavioral Premise: 「現状すべてが間違っている」

## Checklist

- [x] Challenge every assumption, conclusion, and design decision as if fundamentally wrong
- [x] Provide concrete alternative for every issue raised

## Challenges

### Challenge 1: "Standard pipeline is over-engineering"
**Objection**: 8-stage pipeline (search→rank→fetch→extract→sanitize→cache→verify→cite) is too rigid. Real-world research is iterative, not linear. Developers will bypass it.

**Alternative (あるべき姿)**: Instead of a fixed linear pipeline, define a minimal 3-stage core (search→extract→cite) with optional enhancement stages (sanitize, cache, verify) as pluggable middleware. This reduces adoption friction while maintaining extensibility.

**Assessment**: The pipeline definition in REQ-0001 already specifies "each stage shall have defined inputs, outputs, and failure modes" — this implies composability. The 8 stages are definitions, not a forced execution order. The discussion pack is adequate as-is because downstream SDD can define stage optionality.

### Challenge 2: "MCP dependency is a single point of failure"
**Objection**: Building on MCP locks QFAI to a protocol that may not survive. If MCP loses momentum, the entire framework becomes tech debt.

**Alternative (あるべき姿)**: Define tool interfaces as abstract contracts (input/output schemas) independent of MCP wire protocol. MCP becomes one implementation of the contract, not the only one.

**Assessment**: REQ-0016 (MCP failure recovery) and the fallback chain (MCP → built-in → manual) already address this. The interface abstraction is a valid SDD concern but not a discussion-phase blocker. Adequate.

### Challenge 3: "Conservative sub-agent defaults will make research too slow"
**Objection**: max_threads=2, max_depth=2 means sequential research for most tasks. Developers need answers fast. They'll override defaults immediately, defeating the purpose.

**Alternative (あるべき姿)**: Set defaults to max_threads=3, max_depth=3 with a cost-estimation preview before execution. Show "This research will make ~N API calls, estimated cost $X. Proceed?" rather than silently throttling.

**Assessment**: This is a valid UX improvement, but it's implementation-level detail appropriate for SDD, not discussion. The conservative default (OQ-0006) was chosen for safety with explicit override. The cost-estimation idea should be captured as an enhancement candidate.

## Verdict: PASS

The discussion pack withstands adversarial scrutiny. Challenges raised are valid enhancement paths but do not constitute structural flaws at the discussion level. All objections have downstream resolution paths (SDD/implementation).
