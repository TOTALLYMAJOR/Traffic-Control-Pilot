# Traffic Control Protocol

Traffic Control Pilot is a provider-neutral reference implementation of the
decision between governed intent and an autonomous execution runtime:

```text
approved governed handoff
          +
normalized execution observation
          +
versioned Governor policy
          |
          v
deterministic entitlement-to-continue decision
          |
          v
runtime intervention or proposal-only escalation
```

It does not schedule work, manage worktrees, execute retries, own repository
graphs, or authorize architecture. AgentFlow remains responsible for those
runtime capabilities.

Participation is conditional. AgentFlow runs outside the pilot use AgentFlow's
native gates. The pilot never acts as a mandatory downstream stage after
AgentFlow execution.

## Existing contracts

The pilot consumes the existing ProofLoom and AgentFlow contract kinds without
introducing a second execution-intent or build-receipt format:

- `design-intelligence/governed-task-handoff`, schema `2.0.0`
- `agentflow/build-receipt`, schema `1.0.0`

`bindContract` keeps the handoff document unchanged and derives the same style
of canonical SHA-256 binding AgentFlow already uses. `createBuildReceipt`
produces the existing receipt document shape and places Governor provenance in
the receipt's allowed `evidence.events` collection. The returned binding is an
external digest envelope, not part of the receipt document.

## Authority

The contract verifier fails closed when:

- the handoff does not satisfy the supported identity, timestamp, task,
  ownership, proof, commit, and digest constraints;
- the handoff is not `APPROVED`;
- approval provenance is not classified by the adapter as human or repository
  authority;
- the handoff digest changed;
- the handoff identity or bound digest differs;
- repository identity or base commit differs; or
- any authority-source path/hash binding differs.

The current ProofLoom handoff schema identifies `approvedBy` but does not type
the authority class. The runtime adapter must resolve that field against the
repository's authority registry and supply `approvalAuthority`. Model output
alone must resolve to `ADVISORY_MODEL`, which the verifier rejects.

## Observation model

`reduceExecutionEvents` converts ordered provider-neutral events into one
normalized observation. Supported events are:

- `authority.observed`
- `execution.started`
- `attempt.started`
- `files.changed`
- `impact.assessed`
- `evidence.recorded`
- `validation.failed`
- `validation.passed`
- `integration.requested`
- `execution.integrated`
- `structural.concern`

Duplicate sequence numbers and unknown events fail closed. Runtime adapters
must obtain changed paths from repository evidence and impact/collision data
from AgentFlow's existing knowledge graph rather than agent statements.
`files.changed` carries the responsible `taskId`; only a single-task handoff
may omit it because attribution is unambiguous.

## Signals

Failure fingerprinting hashes normalized failure code, classification,
validation identity, error signature, affected files, and requirement identity.
Volatile run paths and source locations are removed before hashing. Other
numbers remain material, so status `401` and `500` cannot collapse into one
failure.

Evidence delta compares the current failure with the last occurrence of the
same fingerprint. Newly discovered evidence scores positively, newly satisfied
proof counts more strongly, and contradictions count negatively. Evidence
recorded after the failure updates the current delta.

Impact delta compares each changed path with the responsible task's ownership,
then compares broader impacted paths with the handoff's total ownership.
Unexpected changes, reverse-dependency expansion, and active-task collisions
remain separate signals.

## Policy `governor.v1`

Rules are evaluated in this order:

1. Authority drift: `PAUSE_FOR_REVIEW`
2. Unauthorized changed path: `BLOCK_INTEGRATION`
3. Structural concern: `REQUEST_RECONSIDER`
4. Contradicted required evidence: `BLOCK_INTEGRATION`
5. Missing integration evidence: `BLOCK_INTEGRATION`
6. Unexpected impact or active-task collision: `PAUSE_FOR_REVIEW`
7. Three repeated deterministic failures with no evidence gain:
   `PROPOSE_REPLAN`
8. Runtime-classified retryable failure with remaining attempts:
   `DELEGATE_RETRY`
9. Retryable failure with no remaining attempts: `PAUSE_FOR_REVIEW`
10. First bounded deterministic implementation failure: `REQUEST_REPAIR`
11. Any other unresolved failure: `PAUSE_FOR_REVIEW`
12. Otherwise: `CONTINUE`

The decision contains no clock or random value. Identical handoff, observation,
and policy inputs therefore produce an identical decision.

`DELEGATE_RETRY` deliberately delegates to AgentFlow's retry policy. The
Governor does not calculate backoff or maintain a second retry schedule.

`REQUEST_RECONSIDER` and `PROPOSE_REPLAN` are always `PROPOSAL_ONLY` and require
external approval. The intervention adapter refuses malformed structural
decisions that attempt to authorize their own change.

## Draft policy `governor.v2` — not implemented

This section specifies a proposed six-action pilot contract. It does not rename,
extend, or loosen `governor.v1`, its proposal-only `PROPOSE_REPLAN`, its replay
records, or existing receipt verification. The [draft JSON Schema](governor-v2-draft.schema.json)
describes the decision envelope shape, not proof that a live adapter enforces it.

### Admission and scope binding

AgentFlow explicitly admits a run only when its approved handoff and current
repository authority verify; the policy version and live adapter are supported;
and trusted run, attempt, changed-path, validation, impact, and relevant
external-effect observations are available. The decision binds the handoff ID
and digest, AgentFlow run ID, repository and base revision, approved scope
digest, policy version, and trusted observation digest. `scope_preserved` and
`scope_violation` are computed from AgentFlow and repository evidence, not an
agent's declaration. A schema-valid claim is not proof of that computation.

The approved scope comprises objectives, governed task IDs, dependency edges,
repository identity and owned surfaces, required validation and proof, limits,
and any explicitly authorized provider effects. The current handoff v2 does
not establish a complete provider-effect allowlist or monitoring. Until those
are approval-bound and trusted, the pilot must treat provider mutation as
outside its authorized scope.

An ineligible run never calls the pilot. A run admitted to the pilot pauses if
the Governor, adapter, policy, binding, or required observation fails; it may
not silently downgrade to an ungoverned run.

### Actions and authority effect

| Action | Permitted change | Required preservation |
| --- | --- | --- |
| `CONTINUE` | Let the same run proceed | Exact approval, task, scope, policy, and evidence obligations |
| `COMPACT` | Reduce or restructure agent context | Authority and scope bindings, run state, evidence pointers, and receipts; no evidence deletion |
| `REPLAN` | Change steps or order within the approved task DAG | Objective, governed task IDs and edges, owned surfaces, proof and validation requirements |
| `SPLIT` | Ask AgentFlow to divide work into subordinate execution units under an approved parent | Parent task identity and authorization; no new governed task, backlog adoption, or expanded combined write scope |
| `RESTART` | Ask AgentFlow recovery to begin a bounded new attempt | Same approved run and task, retained prior evidence, attempt limits, and safe external-effect handling |
| `ESCALATE` | Pause and present reason plus proposed scope delta | No further mutation or integration until human or repository authority resolves the issue |

Traffic Control returns a decision. AgentFlow validates it against its native
immutable plan and state and alone performs any permissible operation. `SPLIT`
units are execution detail, not new task IDs or dependencies. `RESTART` cannot
repeat a non-idempotent provider effect without separate trusted proof that the
effect is safe. `COMPACT` cannot erase the approval envelope, evidence, or
failure history needed to replay or audit a decision.

### Deterministic trigger precedence

For an admitted run, evaluate in this order using a fixed policy version and
canonical, trusted inputs:

1. Missing, stale, ambiguous, or changed authority, scope, policy, adapter, or
   required observation; any `scope_violation`; or an unclassified external
   effect -> `ESCALATE` and pause.
2. Continuation that needs a new objective, governed task, dependency,
   repository surface, provider mutation, weaker proof obligation, or changed
   approval -> `ESCALATE`. A proposal for a new binding may be recorded, never
   applied to the current run.
3. Exhausted attempt or repair limits, unsafe restart, repeated intervention
   oscillation, or inability to preserve evidence -> `ESCALATE`.
4. A recoverable failed attempt with a safe AgentFlow recovery path -> `RESTART`.
5. An oversized authorized task that AgentFlow can divide without creating a
   governed task or ownership expansion -> `SPLIT`.
6. A revised within-scope sequence that respects the approved dependency DAG
   and proof obligations -> `REPLAN`.
7. Context pressure with a lossless authority/evidence carry-forward ->
   `COMPACT`.
8. Otherwise -> `CONTINUE`.

No rule may turn `Task A` into `Task A + unapproved Task B`. Scope expansion is
always an authority transition, never an execution-topology intervention.
The above ordering is a draft policy to test and ratify; the current evaluator
continues to run `governor.v1` only.

## Persistence and replay

Decision records bind the contract hash, normalized observation hash, policy
version, decision, record time, and previous record hash into a verifiable
JSONL hash chain.

Historical replay evaluates event batches without invoking a runtime adapter
or writing decision history. The input selects an installed policy version;
unknown versions fail closed. `applyIntervention` rejects every mutation
attempt in replay mode.

Replay input uses this shape:

```json
{
  "policyVersion": "governor.v1",
  "handoff": {},
  "eventBatches": [
    [
      { "sequence": 1, "type": "authority.observed", "authority": {} }
    ]
  ]
}
```

Receipt creation and audit require the exact governed task set, completed build
and task integration commits, a matching base commit, hash-bound required
evidence, the adapter-supplied authority observation, and a valid embedded
Governor decision-record chain whose final decision and contract hash reconcile
with completion. Each task's changed files must stay inside its ownership roots,
and every governed validation command must have a passing result. Task
integration commits are validated independently because AgentFlow lands tasks
sequentially.

Run it with:

```bash
node src/cli.js replay --input normalized-history.json
```

## Proof boundary

A passing receipt audit proves only the receipt's declared local execution and
integration boundary. It does not prove deployment, provider behavior,
production readiness, customer acceptance, or business outcome.

## Integration boundary

This repository proves the Governor protocol and a synthetic end-to-end
scenario. It does not yet install a live adapter into AgentFlow or modify
ProofLoom. The next integration slice belongs in AgentFlow and should:

1. Join build events with task-attempt, validation, changed-file, authority,
   and knowledge-graph records into the normalized observation.
2. Persist Governor decisions through AgentFlow's existing event repository.
3. Apply decisions through AgentFlow's coordinator and existing retry policy.
4. Add Governor evidence to the existing build receipt route.
5. Render the decision records in AgentFlow's existing event timeline.
6. Run the deliberate repeated-failure acceptance scenario against a real
   consuming repository.

Decision Intelligence remains a proposal source during structural escalation.
It becomes actionable only after human or repository authority approves a new
ProofLoom handoff, represented as a new handoff identity and digest.
