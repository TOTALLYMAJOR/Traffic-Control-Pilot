# Product Intelligence System

This folder defines how Traffic Control Pilot creates, measures, and protects
product value. The artifacts form one closed system rather than eight separate
documents:

```text
Product outcome
      -> capabilities
      -> user journey
      -> success metrics
      -> observable events
      -> baseline and targets
      -> quality guardrails
      -> release and experiment context
      -> reviewed outcome evidence
```

## Evidence classes

Every claim in this folder uses one of these classes:

| Class | Meaning |
| --- | --- |
| **Implemented** | Present in this repository and covered by local tests or the demonstration. |
| **Specified** | A required contract for the live AgentFlow integration, but not yet operational. |
| **Unknown** | Requires real consuming-repository, operator, hosted, or outcome evidence. |

Local protocol proof is not production proof. A synthetic demonstration is not
a user baseline, and a valid build receipt is not evidence of deployment,
customer acceptance, or business outcome.

## Artifact index

| # | Artifact | Governing question | Status |
| --- | --- | --- | --- |
| 1 | [Product Outcome Contract](01-product-outcome-contract.md) | Why does this exist, for whom, and what should improve? | Accepted for the pilot; real-user outcome unverified |
| 2 | [Capability / Functional Map](02-capability-map.md) | What must users and connected systems be able to do? | Current and target capabilities distinguished |
| 3 | [Success Metric Specification](03-success-metric-specification.md) | Which numbers demonstrate value or failure? | Metric definitions specified; production values unknown |
| 4 | [Instrumentation / Event Schema](04-instrumentation-event-schema.md) | Can those metrics be observed without inventing facts? | Projection contract specified; live adapter pending |
| 5 | [Baseline + Targets](05-baselines-and-targets.md) | What is the comparison point and what qualifies as good? | Local baseline recorded; pilot targets provisional |
| 6 | [User Journey / Funnel Model](06-user-journey-funnel.md) | Where does governed value creation succeed or fail? | Canonical journeys specified; live conversion unknown |
| 7 | [Quality / Reliability Guardrails](07-quality-reliability-guardrails.md) | Can apparent progress conceal unsafe or degraded behavior? | Local gates active; live SLOs specified |
| 8 | [Release / Experiment Ledger](08-release-experiment-ledger.md) | What changed that could explain a metric movement? | Ledger initialized; append-only operating rule specified |

The machine-readable event contract is
[`schemas/telemetry-event.schema.json`](schemas/telemetry-event.schema.json).

## Authority

- Product and repository truth outrank generated intelligence.
- ProofLoom / Design Intelligence owns governed intent and proof obligations.
- AgentFlow owns plans, execution state, validation, integration, and receipts.
- The Governor decides entitlement to continue but cannot rewrite authority.
- Decision Intelligence may propose structural changes but cannot approve them.
- Reviewed human or repository authority is required for material supersession.

These documents describe the product measurement contract. They do not become
execution authority, modify a governed handoff, or authorize deployment.
