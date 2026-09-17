# Quality / Reliability Guardrails

## Purpose

Guardrails prevent improving throughput or completion metrics by degrading
authority, safety, proof quality, compatibility, or operator trust. They are
release gates, not optional diagnostic charts.

## Hard guardrails

| ID | Guardrail | Threshold | Required response |
| --- | --- | --- | --- |
| G-01 | Invalid integration escape | 0 confirmed cases | Stop rollout, contain affected integrations, audit lineage |
| G-02 | Authority drift escape | 0 mutations or integrations after detected drift | Pause execution and verify all active bindings |
| G-03 | Ownership escape | 0 unauthorized changed paths integrated | Block integration and inspect task attribution |
| G-04 | Required proof escape | 0 integrations with missing or contradicted proof | Invalidate receipt and block release |
| G-05 | Replay disagreement | 0 decision mismatches for the same inputs and policy | Block policy publication |
| G-06 | Structural self-authorization | 0 | Stop execution; require human or repository decision |
| G-07 | Replay side effect | 0 | Disable replay path until isolated and reviewed |
| G-08 | Receipt integrity failure | 0 invalid receipts accepted | Treat as proof-integrity incident |
| G-09 | Unsupported schema or policy accepted | 0 | Fail closed and require explicit migration |
| G-10 | Secret or raw sensitive content in telemetry | 0 | Quarantine export, rotate exposed credentials if applicable |

## Reliability guardrails

| ID | Guardrail | Pilot threshold | Interpretation |
| --- | --- | --- | --- |
| G-11 | Decision availability | At least 99.9% for eligible decision points | Missing control is not implicit permission to continue. |
| G-12 | Decision latency | 95th percentile below 2 seconds | Measure from triggering source event to decision persistence. |
| G-13 | Telemetry completeness | At least 98% of closed runs | Missing authority or intervention facts invalidates affected metrics. |
| G-14 | Intervention acknowledgement | 100% for block/pause/cancel actions | Lack of acknowledgement keeps the run unresolved. |
| G-15 | Decision history verification | 100% of audited histories | Mutation or reordering must be detectable. |
| G-16 | Receipt audit availability | 100% before completion is reported | An unaudited receipt is not a verified completion. |

## Product-quality guardrails

| ID | Guardrail | Pilot threshold | Why |
| --- | --- | --- | --- |
| G-17 | Intervention precision | At least 90% after review | Prevents safety controls from becoming operator noise. |
| G-18 | Critical intervention recall | 100% after review | Authority, ownership, and proof misses are unacceptable. |
| G-19 | Review coverage | At least 90% within 7 days | Prevents selective adjudication from flattering the primary metric. |
| G-20 | Structural review dead ends | Fewer than 5% unresolved after 7 days | A safe pause must still lead somewhere useful. |
| G-21 | AgentFlow success degradation | No material decline versus matched baseline | Governance must not break healthy bounded execution. |
| G-22 | Operator comprehension | At least 90% of reviewed decisions rated understandable and actionable | Explainability is an operational requirement. |

G-11 through G-22 are provisional until the first live baseline. Hard safety
guardrails remain zero-tolerance regardless of sample size.

## Release gates

Every Governor policy or adapter release must provide:

1. supported contract and receipt schema compatibility tests;
2. deterministic golden cases for every decision rule and precedence conflict;
3. negative tests for authority, ownership, proof, retry exhaustion, structural
   self-authorization, and replay mutation;
4. adversarial receipt tests covering tasks, commits, changed paths,
   validations, evidence, authority, and decision-chain integrity;
5. replay comparison against the prior policy on a representative frozen event
   corpus;
6. event-schema compatibility and telemetry completeness checks;
7. an entry in the release and experiment ledger;
8. explicit proof of the environment tested: local, CI, hosted, production, or
   reviewed outcome.

## Degradation and rollback rules

- A hard-guardrail violation blocks expansion immediately.
- Policy rollback restores the last verified policy version; it does not edit
  historical decision records.
- Contract or schema rollback requires explicit compatibility review because
  previously issued authority and receipts remain immutable.
- If the Governor is unavailable, the fail-safe behavior must be an explicit
  AgentFlow policy. Absence of a decision must never silently equal `CONTINUE`.
- Metrics affected by missing or corrupt telemetry are marked unavailable, not
  estimated from partial favorable evidence.

## Incident severity

| Severity | Example | Response |
| --- | --- | --- |
| Critical | Invalid integration, authority escape, replay mutation, structural self-authorization | Stop affected execution and rollout; preserve evidence; owner review required |
| High | Decision mismatch, invalid receipt accepted, block not acknowledged | Pause affected policy/adapter; investigate before resuming |
| Moderate | Missing telemetry, excessive latency, review backlog | Contain metric claims; repair within the pilot window |
| Low | Non-material presentation or diagnostic issue | Record and address through normal release process |

## Current guardrail evidence

The local suite covers 44 contract, policy, replay, observation, and receipt
cases, including adversarial refusal behavior. The synthetic demo produces the
expected protective and completion sequence. No claim is made yet for live
availability, latency, operator comprehension, production containment, or
outcome quality.
