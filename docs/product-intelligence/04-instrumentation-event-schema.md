# Instrumentation / Event Schema

## Objective

The instrumentation contract must make the success metrics observable without
creating a competing execution store. AgentFlow's durable runtime events,
ProofLoom contracts and audits, Governor decision records, and reviewed outcome
records remain authoritative. The telemetry layer is an idempotent projection
of those sources.

The machine-readable envelope is
[`schemas/telemetry-event.schema.json`](schemas/telemetry-event.schema.json).

## Event envelope

Every projected event contains:

| Field | Requirement | Meaning |
| --- | --- | --- |
| `schemaVersion` | Required | Instrumentation schema version, currently `1.0.0` |
| `kind` | Required | `traffic-control/telemetry-event` |
| `eventId` | Required | Stable idempotency key; the same source fact must always produce the same ID |
| `eventType` | Required | One of the governed lifecycle event names below |
| `occurredAt` | Required | Time the authoritative source transition occurred |
| `recordedAt` | Required | Time the projection was persisted |
| `sequence` | Required | Monotonic sequence within a governed run |
| `source` | Required | Authoritative system, component, record ID, and optional source digest |
| `correlation` | Required | Repository, run, handoff, contract digest, and optional build/task/policy identifiers |
| `proofBoundary` | Required | What the source fact proves, such as local execution or reviewed outcome |
| `payload` | Required | Event-specific facts; never unverified narrative claims |

## Event catalog

| Event type | Authoritative source | Required payload | Metrics enabled |
| --- | --- | --- | --- |
| `contract.verification_completed` | ProofLoom handoff + AgentFlow verifier | `result`, `violationCode`, `baseCommit`, `authoritySourceDigests` | M-04, M-16, M-17 |
| `execution.started` | AgentFlow build state | `maxAttempts`, `planId`, `runtimeVersion` | M-14, M-17 |
| `attempt.started` | AgentFlow attempt state | `attempt`, `maxAttempts`, `taskId` | M-11, M-12 |
| `files.changed` | Repository evidence | `taskId`, `paths`, `commit` | M-02, M-05 |
| `impact.assessed` | AgentFlow repository graph | `impactedPaths`, `activeTaskCollisions`, `expanded` | M-02, M-09 |
| `validation.completed` | AgentFlow validation record | `taskId`, `command`, `status`, `evidenceId`, `artifactSha256` | M-06, M-07, M-12 |
| `evidence.recorded` | Evidence store | `items`, `satisfied`, `contradicted`, `artifactDigests` | M-06, M-10, M-12 |
| `governor.decision` | Hash-chained Governor record | `action`, `ruleId`, `authorityEffect`, `requiresApproval`, `signals`, `observationSha256`, `recordHash` | M-03 through M-15, M-19 |
| `intervention.completed` | AgentFlow runtime adapter | `action`, `status`, `triggerRecordHash`, `latencyMs` | M-10, M-13, M-19 |
| `integration.completed` | AgentFlow integration state | `integrationCommit`, `taskIntegrationCommits` | M-02, M-06, M-14 |
| `integration.blocked` | AgentFlow integration state | `reason`, `triggerRecordHash` | M-04 through M-06, M-10 |
| `receipt.audit_completed` | ProofLoom receipt audit | `result`, `receiptSha256`, `violationCodes` | M-02, M-06, M-07, M-14 |
| `structural.concern_recorded` | Governor / execution evidence | `reason`, `sourceEvidenceIds` | M-15 |
| `contract.superseded` | Approved ProofLoom authority | `priorHandoffId`, `newHandoffId`, `approvalId` | M-15, M-16 |
| `outcome.reviewed` | Human or repository outcome authority | `correctDisposition`, `invalidEscape`, `outcomeClass`, `reviewerAuthority`, `reviewedAt` | M-01, M-08, M-09, M-18, M-19 |

## Projection from current runtime events

The current reducer accepts provider-neutral events such as
`authority.observed`, `attempt.started`, `files.changed`, `impact.assessed`,
`evidence.recorded`, and validation or integration transitions. A live adapter
should project those existing facts into this envelope; it should not make the
analytics event the source of execution truth.

Current decision records already provide policy version, contract hash,
observation hash, rule, action, signals, prior record hash, and record hash.
Those fields become the authoritative payload for `governor.decision`.

## Identity and ordering

- `runId` identifies one governed lifecycle, including supersession links.
- `buildId` identifies an AgentFlow build and may change after supersession.
- `handoffId` and `contractSha256` identify the exact authority for the event.
- `taskId` is required for task-scoped changes, validation, and attempts.
- `sequence` orders events within a run; timestamps never resolve ordering
  conflicts by themselves.
- Replayed decisions use a distinct analysis run ID and reference the original
  source record. They must not be emitted as live interventions.

## Corrections and late events

Events are append-only. A correction emits a new event containing
`correctionOfEventId` and the reason; it never edits historical telemetry.
Late-arriving events retain the original `occurredAt`, receive a later
`recordedAt`, and cause affected aggregates to be recomputed.

## Data quality controls

Reject or quarantine events when:

- the schema version or event type is unsupported;
- the source record cannot be identified;
- handoff identity or contract digest is missing;
- sequence is duplicated within the run;
- a task-scoped event lacks a task identity in a multi-task run;
- a proof artifact lacks its digest;
- `occurredAt` is after `recordedAt` beyond the configured clock-skew window;
- a model-derived classification is presented as human or repository
  authority.

## Privacy and security

- Do not include source code, prompts, secrets, tokens, raw environment values,
  or full error logs in product telemetry.
- Store hashes and bounded classifications; keep detailed artifacts in their
  authoritative evidence store.
- Treat repository identifiers, task names, changed paths, and failure
  signatures as potentially sensitive.
- Apply repository retention and access policy before exporting telemetry.
- Outcome review must record authority class, not unnecessary personal data.

## Current implementation boundary

The local reference produces normalized observations, decisions, decision
records, receipts, and JSON demo output. It does **not** yet persist this
telemetry envelope or operate a metrics pipeline. Consequently, production
metric values remain unknown.
