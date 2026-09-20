# Traffic Control Pilot

Traffic Control Pilot is a deterministic governance protocol for autonomous
engineering execution. It answers one control question:

> Given the current authority, evidence, failure history, impact, and progress,
> is this runtime still entitled to continue with its approved strategy?

The pilot sits between governed intent and an execution runtime. It does not
replace ProofLoom, AgentFlow, or Decision Intelligence.

```text
ProofLoom approved handoff
          |
          v
AgentFlow execution evidence --> Governor --> deterministic decision
          |                         |
          v                         v
AgentFlow build receipt      intervention or proposal
          |
          v
ProofLoom outcome audit / reviewed learning
```

## What is implemented

- Existing ProofLoom `design-intelligence/governed-task-handoff@2.0.0`
  ingestion with canonical SHA-256 binding
- Fail-closed approval, contract, repository, base-commit, and authority-source
  verification
- Ordered execution-event reduction into a normalized observation
- Stable failure fingerprinting that preserves material numeric differences
- Evidence/progress delta and task-attributed repository-impact delta
- Versioned deterministic `governor.v1` policy
- Protective pause, integration block, delegated retry, bounded repair,
  proposal-only replan, and structural reconsideration decisions
- Verifiable hash-chained Governor decision records
- Mutation-free historical replay by explicit policy version
- Existing AgentFlow `agentflow/build-receipt@1.0.0` output with exact task,
  commit, evidence, and Governor-provenance reconciliation
- An inspectable scenario covering repeated no-progress failure, structural
  escalation, human-approved replacement handoff, successful execution, receipt
  audit, and deterministic replay

## Run it

Node.js 22 or newer is required. The project has no runtime dependencies.

```bash
npm test
npm run demo
npm run demo:json
```

The human-readable demo produces this decision sequence:

```text
PROPOSE_REPLAN
REQUEST_RECONSIDER
CONTINUE
```

Replay a normalized historical case with:

```bash
node src/cli.js replay --input normalized-history.json
```

## Design boundaries

AgentFlow remains the execution authority. It still owns planning, worktrees,
dispatch, retry timing, validation, integration, runtime state, repository
impact data, and build receipts. The Governor evaluates whether execution may
progress and returns an intervention; it does not perform the work itself.

ProofLoom remains the governed-intent and outcome-audit authority. Decision
Intelligence may propose structural alternatives but cannot approve them. Any
material change requires a newly approved handoff with a new identity and
digest; the original authority remains immutable.

## Current proof boundary

This repository is the tested protocol reference. A native implementation now
exists on isolated AgentFlow and ProofLoom integration branches: handoff v2
ingestion, automatic coordinator decision gates, durable interventions,
telemetry projection, exact receipt audit, and proposal-only supersession all
have focused local tests. Those branches are not yet merged, pushed, deployed,
or exercised against an owner-approved real consuming repository. Production,
customer, human-acceptance, and outcome claims remain outside the current
proof.

See [the protocol specification](docs/protocol.md) for rule precedence,
observation semantics, replay format, and the next AgentFlow integration slice.

See the [product intelligence system](docs/product-intelligence/README.md) for
the outcome contract, capability map, success metrics, telemetry schema,
baselines and targets, journey funnels, quality guardrails, and release and
experiment ledger.

The dependency-ordered [operationalization backlog](BACKLOG.md) translates
those product requirements into bounded cross-repository work. It is a planning
projection; approved governed handoffs remain execution authority.

## Project map

```text
src/contracts.js      Existing handoff binding and authority verification
src/observations.js   Event reduction, failure, evidence, and impact signals
src/governor.js       Versioned deterministic policy
src/history.js        Decision records, replay, and intervention guardrails
src/receipts.js       Existing AgentFlow receipt shape and bounded audit
src/demo.js           End-to-end governed replacement scenario
src/cli.js            Demo and replay commands
test/                 Authority, policy, replay, and receipt refusal proofs
```
