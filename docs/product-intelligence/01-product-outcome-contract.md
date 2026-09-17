# Product Outcome Contract

## Contract identity

| Field | Value |
| --- | --- |
| Product | Traffic Control Pilot |
| Product category | Governance protocol for autonomous execution |
| Contract version | `1.0.0-pilot` |
| Status | Accepted product hypothesis; locally demonstrated, not production validated |
| Primary proof boundary | Local protocol behavior and synthetic execution scenario |

## Why the product exists

Autonomous engineering runtimes can continue spending attempts even after the
approved strategy has become stale, unsafe, structurally invalid, or unable to
produce new evidence. Existing systems may separately hold intent, execution,
and audit data without one deterministic control that decides whether the
runtime is still entitled to proceed.

Traffic Control Pilot exists to make continued execution conditional on current
authority, evidence, progress, and impact.

## Primary user

The primary user is the **repository owner or engineering operator accountable
for autonomous delivery**. They need agents to make useful progress without
silently exceeding approved scope, repeating a failed strategy, fabricating
completion, or self-authorizing architectural change.

Supporting actors are:

- product or design authority creating governed intent;
- execution operators supervising AgentFlow builds;
- reviewers approving structural change;
- auditors evaluating receipts and outcomes;
- maintainers improving Governor policy from reviewed evidence.

## Job to be done

> When autonomous execution is working against an approved objective, help me
> know and enforce whether it may continue, must repair, must stop integration,
> or must return for a new authorized strategy, while preserving an auditable
> explanation of what happened.

## Intended outcome

For governed autonomous runs, increase the proportion that reach a **correct
governed disposition**:

1. a valid, evidence-backed integration receipt; or
2. a timely protective intervention that prevents unauthorized or unproductive
   continuation and routes the work to the correct authority.

The outcome is not simply “more completed builds.” A safe block, pause, or
proposal-only escalation is successful when continuation would have violated
authority or proof requirements.

## Value mechanism

```text
approved, hash-bound intent
        +
normalized runtime evidence
        +
versioned deterministic policy
        ->
explainable entitlement decision
        ->
bounded runtime intervention
        ->
verified receipt or protective disposition
        ->
reviewed outcome evidence
```

The mechanism should reduce blind retries, invalid integrations, unbounded
blast-radius growth, and time spent reconstructing why an autonomous run acted
as it did.

## Product promises

Traffic Control Pilot must:

- fail closed when authoritative bindings drift;
- produce the same control decision for the same contract, observation, and
  policy version;
- distinguish repeated failure from failure that is producing new evidence;
- block unauthorized changed paths and missing or contradicted required proof;
- delegate retry timing to AgentFlow instead of creating a second retry engine;
- keep structural changes proposal-only until approved externally;
- preserve immutable, superseding authority rather than rewriting history;
- issue auditable decisions and receipts with explicit proof boundaries.

## Non-promises

The pilot does not promise that:

- an agent will successfully complete every task;
- a local test pass proves deployment or production readiness;
- a receipt proves customer acceptance or business outcome;
- model output is authoritative;
- every runtime is already integrated;
- policy will improve autonomously without review.

## Acceptance condition

The product hypothesis is supported when a live AgentFlow pilot shows that
governed runs are deterministically routed to valid completion or the correct
protective disposition, with zero known authority or proof escapes and with
less repeated no-progress work than the pre-Governor baseline.

## Current evidence and unknowns

**Implemented:** contract binding, authority verification, event reduction,
failure/evidence/impact signals, deterministic `governor.v1`, protective
decisions, chained decision history, replay, and receipt audit in a local
reference implementation.

**Specified:** a native AgentFlow adapter, durable product telemetry projection,
operator-facing history, and real ProofLoom receipt audit.

**Unknown:** real operator adoption, production failure distribution, time or
cost saved, false-positive intervention rate, and downstream delivery outcomes.
