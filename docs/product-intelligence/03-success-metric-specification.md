# Success Metric Specification

## Measurement principle

Traffic Control Pilot should not be optimized for completion volume alone.
Completion can be harmful when authority is stale, proof is contradicted, or
the strategy is no longer learning. The primary measure therefore rewards a
**correct governed disposition**, whether that disposition is verified
completion or a justified protective stop.

All metrics are scoped to **eligible governed runs**: runs that start with a
schema-valid, approved, hash-bound handoff that has passed repository and
authority-source verification. Rejected contracts are measured separately and
never counted as execution failures.

## Primary outcome metric

### M-01: Adjudicated Governed Resolution Rate

**Question:** Did the system route an eligible run to the correct outcome?

```text
eligible closed runs adjudicated as correctly resolved
-------------------------------------------------------
eligible closed runs with completed outcome review
```

A correctly resolved run is either:

- an integrated build with a valid audited receipt and no later authority,
  ownership, validation, or required-proof escape; or
- a block, pause, repair, retry delegation, reconsideration, or replan that a
  reviewer confirms was the correct protective disposition at that point.

This is a lagging metric because reviewer adjudication is required. Before
outcome review exists, report **Policy-Conformant Resolution Rate** as a
provisional proxy and label it as such.

## Safety and quality metrics

| ID | Metric | Formula | Why it matters |
| --- | --- | --- | --- |
| M-02 | Invalid Integration Escape Rate | Integrated runs later found to violate authority, ownership, validation, or required proof / audited integrations | Must remain zero; one escape can outweigh throughput gains. |
| M-03 | Deterministic Replay Agreement | Decision points whose replayed action, rule, authority effect, and signals exactly match / replayed decision points | Proves policy determinism and historical explainability. |
| M-04 | Authority Drift Containment Rate | Detected authority-drift cases blocked before runtime mutation or integration / detected drift cases | Shows stale authority does not reach execution. |
| M-05 | Ownership Violation Containment Rate | Runs with unauthorized changed paths blocked before integration / runs with unauthorized changed paths | Protects repository boundaries using actual file evidence. |
| M-06 | Required Proof Escape Rate | Integrated runs missing or contradicting contract-required evidence / audited integrations | Detects completion claims unsupported by proof. |
| M-07 | Receipt Audit Pass Rate | Issued receipts that pass exact contract, task, commit, validation, evidence, authority, and decision-chain audit / issued receipts | Measures integrity of completion evidence, not production success. |
| M-08 | Intervention Precision | Reviewed protective interventions adjudicated correct / reviewed protective interventions | Limits unnecessary pauses and operator fatigue. |
| M-09 | Intervention Recall | Reviewed cases requiring protection that received it before integration / reviewed cases requiring protection | Detects unsafe false negatives. |

## Efficiency and learning metrics

| ID | Metric | Formula | Why it matters |
| --- | --- | --- | --- |
| M-10 | Blind Continuation Prevention Rate | Repeated no-progress cases stopped or replanned at or before policy threshold / reviewed repeated no-progress cases | Measures the central promise: stop spending intelligence on the same invalid approach. |
| M-11 | Excess Attempts After Threshold | Sum of attempts after the repeated-failure threshold and before protective disposition / threshold-crossing runs | Lower is better; zero is ideal. |
| M-12 | Evidence-Producing Failure Rate | Failed attempts with positive evidence delta / failed attempts | Distinguishes useful learning from pure retry churn. This is diagnostic, not a target to maximize. |
| M-13 | Decision Latency | `governor.decision.occurredAt - triggering source event.occurredAt` | Detects control-plane delay that could permit unsafe work to continue. |
| M-14 | Time to Governed Disposition | Terminal governed disposition time - execution start time | Measures operational speed while preserving the disposition class. |
| M-15 | Structural Escalation Closure Time | Approved superseding contract time - structural concern time | Shows whether safe escalation becomes a dead end. |

## Adoption and operability metrics

| ID | Metric | Formula | Why it matters |
| --- | --- | --- | --- |
| M-16 | Native Contract Ingestion Rate | Eligible ProofLoom handoffs accepted without manual translation / eligible handoffs submitted | Reveals whether the cross-repository contract is actually operational. |
| M-17 | Telemetry Completeness Rate | Closed runs containing every required lifecycle event and binding / closed runs | Determines whether other metrics are trustworthy. |
| M-18 | Review Coverage | Closed runs receiving outcome review within the review window / closed runs | Protects M-01, M-08, and M-09 from selective-review bias. |
| M-19 | Operator Override Rate | Governor dispositions manually overridden / reviewed dispositions | Diagnostic signal for policy mismatch; segment by rule and override direction. |

## Required dimensions

Every metric must be segmentable by:

- repository and consuming project;
- Governor policy version;
- contract schema version;
- disposition action and rule;
- failure classification and fingerprint;
- task and ownership domain;
- execution adapter and runtime version;
- release or experiment exposure;
- reviewed versus provisional status.

Do not segment by personal identity unless operationally necessary. Prefer
stable role or authority class.

## Metric interpretation rules

- Never combine synthetic, local, hosted, and production populations.
- Never report provisional policy conformance as adjudicated correctness.
- Exclude duplicate events by `eventId` and exact source record identity.
- Preserve rejected-contract counts; do not silently remove them from
  operational health reporting.
- Report numerator, denominator, window, and coverage with every rate.
- A rate with fewer than the minimum pilot sample in the baseline specification
  is directional, not a release claim.
- Metric movement is not causal evidence until reconciled with the release and
  experiment ledger.
