import { sha256 } from "./integrity.js";

function sortedUnique(values = []) {
  return [...new Set(values)].sort();
}

function difference(current = [], previous = []) {
  const existing = new Set(previous);
  return sortedUnique(current.filter((value) => !existing.has(value)));
}

function normalizeSignature(signature = "") {
  return signature
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "<uuid>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/\/tmp\/[^/\s]+/g, "/tmp/<run>")
    .replace(/:\d+(?::\d+)?\b/g, ":<line>")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintFailure(failure) {
  return sha256({
    code: failure.code ?? "UNKNOWN",
    classification: failure.classification ?? "unknown",
    validation: failure.validation ?? null,
    signature: normalizeSignature(failure.signature),
    files: sortedUnique(failure.files),
    requirementId: failure.requirementId ?? null,
  });
}

export function computeEvidenceDelta(previous = {}, current = {}) {
  const newItems = difference(current.items, previous.items);
  const newlySatisfied = difference(current.satisfied, previous.satisfied);
  const newContradictions = difference(
    current.contradictory,
    previous.contradictory,
  );
  const score = newItems.length + newlySatisfied.length * 2 - newContradictions.length * 2;
  return {
    newItems,
    newlySatisfied,
    newContradictions,
    score,
    direction: score > 0 ? "POSITIVE" : score < 0 ? "NEGATIVE" : "ZERO",
  };
}

function pathAllowed(path, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.replace(/\/+$/, "");
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

export function computeImpactDelta({
  plannedPaths = [],
  actualChangedPaths = [],
  impactedPaths = [],
  activeTaskCollisions = [],
}) {
  const unexpectedChangedPaths = sortedUnique(
    actualChangedPaths.filter((path) => !pathAllowed(path, plannedPaths)),
  );
  const unexpectedImpactedPaths = sortedUnique(
    impactedPaths.filter((path) => !pathAllowed(path, plannedPaths)),
  );
  const collisions = sortedUnique(activeTaskCollisions);
  return {
    unexpectedChangedPaths,
    unexpectedImpactedPaths,
    activeTaskCollisions: collisions,
    expanded:
      unexpectedChangedPaths.length > 0 ||
      unexpectedImpactedPaths.length > 0 ||
      collisions.length > 0,
  };
}

function evidenceSnapshot(evidence) {
  return {
    items: sortedUnique(evidence.items),
    satisfied: sortedUnique(evidence.satisfied),
    contradictory: sortedUnique(evidence.contradictory),
  };
}

export function reduceExecutionEvents(events, { contract }) {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  if (new Set(ordered.map((event) => event.sequence)).size !== ordered.length) {
    throw new TypeError("Duplicate execution event sequence numbers are invalid");
  }
  const state = {
    schema: "traffic-control/execution-observation@1",
    buildId: null,
    phase: "PENDING",
    attempt: 0,
    maxAttempts: 0,
    authority: null,
    evidence: {
      items: [],
      satisfied: [],
      contradictory: [],
    },
    changedPaths: [],
    impactedPaths: [],
    activeTaskCollisions: [],
    failure: null,
    failureHistory: [],
    failureRepeatCount: 0,
    evidenceDelta: computeEvidenceDelta({}, {}),
    impactDelta: computeImpactDelta({}),
    structuralConcern: null,
  };
  const taskChanges = [];
  let currentFailureEvidenceBaseline = null;

  for (const event of ordered) {
    switch (event.type) {
      case "authority.observed":
        state.authority = structuredClone(event.authority);
        break;
      case "execution.started":
        state.buildId = event.buildId;
        state.maxAttempts = event.maxAttempts;
        state.phase = "RUNNING";
        break;
      case "attempt.started":
        state.attempt = event.attempt;
        state.phase = "RUNNING";
        break;
      case "files.changed":
        state.changedPaths = sortedUnique([
          ...state.changedPaths,
          ...(event.paths ?? []),
        ]);
        taskChanges.push({
          taskId: event.taskId ?? null,
          paths: sortedUnique(event.paths ?? []),
        });
        break;
      case "impact.assessed":
        state.impactedPaths = sortedUnique(event.impactedPaths);
        state.activeTaskCollisions = sortedUnique(event.activeTaskCollisions);
        break;
      case "evidence.recorded":
        state.evidence = {
          items: sortedUnique([...state.evidence.items, ...(event.items ?? [])]),
          satisfied: sortedUnique([
            ...state.evidence.satisfied,
            ...(event.satisfied ?? []),
          ]),
          contradictory: sortedUnique([
            ...state.evidence.contradictory,
            ...(event.contradictory ?? []),
          ]),
        };
        if (state.failure && currentFailureEvidenceBaseline) {
          state.evidenceDelta = computeEvidenceDelta(
            currentFailureEvidenceBaseline,
            evidenceSnapshot(state.evidence),
          );
        }
        break;
      case "validation.failed": {
        const fingerprint = fingerprintFailure(event.failure);
        const prior = [...state.failureHistory]
          .reverse()
          .find((failure) => failure.fingerprint === fingerprint);
        const snapshot = evidenceSnapshot(state.evidence);
        currentFailureEvidenceBaseline = prior?.evidence ?? snapshot;
        state.evidenceDelta = computeEvidenceDelta(currentFailureEvidenceBaseline, snapshot);
        state.failure = { ...structuredClone(event.failure), fingerprint };
        state.failureHistory.push({ fingerprint, evidence: snapshot });
        state.failureRepeatCount = state.failureHistory.filter(
          (failure) => failure.fingerprint === fingerprint,
        ).length;
        break;
      }
      case "validation.passed":
        state.failure = null;
        state.failureRepeatCount = 0;
        currentFailureEvidenceBaseline = null;
        if (event.evidenceId) {
          state.evidence.satisfied = sortedUnique([
            ...state.evidence.satisfied,
            event.evidenceId,
          ]);
        }
        break;
      case "integration.requested":
        state.phase = "INTEGRATING";
        break;
      case "execution.integrated":
        state.phase = "INTEGRATED";
        break;
      case "structural.concern":
        state.structuralConcern = {
          reason: event.reason,
          source: event.source ?? "execution-evidence",
        };
        break;
      default:
        throw new TypeError(`Unsupported execution event: ${event.type}`);
    }
  }

  const taskById = new Map(
    contract.document.tasks.map((task) => [task.id, task]),
  );
  const onlyTask = contract.document.tasks.length === 1
    ? contract.document.tasks[0]
    : null;
  const taskOwnershipViolations = taskChanges.flatMap((change) => {
    const task = change.taskId ? taskById.get(change.taskId) : onlyTask;
    return task
      ? change.paths.filter((changedPath) => !pathAllowed(changedPath, task.owns ?? []))
      : change.paths;
  });
  const impactDelta = computeImpactDelta({
    plannedPaths: contract.document.tasks.flatMap((task) => task.owns ?? []),
    actualChangedPaths: state.changedPaths,
    impactedPaths: state.impactedPaths,
    activeTaskCollisions: state.activeTaskCollisions,
  });
  impactDelta.unexpectedChangedPaths = sortedUnique([
    ...impactDelta.unexpectedChangedPaths,
    ...taskOwnershipViolations,
  ]);
  impactDelta.expanded =
    impactDelta.expanded || impactDelta.unexpectedChangedPaths.length > 0;
  state.impactDelta = impactDelta;
  return state;
}
