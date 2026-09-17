import { ContractViolation, verifyContract } from "./contracts.js";

export const GOVERNOR_POLICY_V1 = Object.freeze({
  version: "governor.v1",
  repeatedFailureThreshold: 3,
});

const GOVERNOR_POLICIES = new Map([
  [GOVERNOR_POLICY_V1.version, GOVERNOR_POLICY_V1],
]);

export function resolveGovernorPolicy(version) {
  const policy = GOVERNOR_POLICIES.get(version);
  if (!policy) {
    throw new TypeError(`Unsupported Governor policy version: ${version ?? "missing"}`);
  }
  return policy;
}

function decision(policy, action, ruleId, options = {}) {
  return {
    policyVersion: policy.version,
    action,
    ruleId,
    authorityEffect: options.authorityEffect ?? "NONE",
    requiresApproval: options.requiresApproval ?? false,
    signals: options.signals ?? {},
  };
}

export function evaluateGovernor({ contract, observation, policy }) {
  try {
    verifyContract(contract, observation.authority ?? {});
  } catch (error) {
    if (!(error instanceof ContractViolation)) {
      throw error;
    }
    return decision(policy, "PAUSE_FOR_REVIEW", "authority-drift", {
      signals: { violationCode: error.code },
    });
  }

  if (observation.impactDelta.unexpectedChangedPaths.length > 0) {
    return decision(policy, "BLOCK_INTEGRATION", "ownership-violation", {
      signals: {
        unauthorizedPaths: observation.impactDelta.unexpectedChangedPaths,
      },
    });
  }

  if (observation.structuralConcern) {
    return decision(policy, "REQUEST_RECONSIDER", "structural-concern", {
      authorityEffect: "PROPOSAL_ONLY",
      requiresApproval: true,
      signals: { concern: observation.structuralConcern },
    });
  }

  const missingEvidence = contract.document.proof.requiredEvidence.filter(
    (requirement) => !observation.evidence.satisfied.includes(requirement),
  );
  const contradictedEvidence = contract.document.proof.requiredEvidence.filter(
    (requirement) => observation.evidence.contradictory.includes(requirement),
  );
  if (
    ["INTEGRATING", "INTEGRATED"].includes(observation.phase) &&
    contradictedEvidence.length > 0
  ) {
    return decision(
      policy,
      "BLOCK_INTEGRATION",
      "required-evidence-contradicted",
      { signals: { contradictedEvidence } },
    );
  }
  if (
    ["INTEGRATING", "INTEGRATED"].includes(observation.phase) &&
    missingEvidence.length > 0
  ) {
    return decision(
      policy,
      "BLOCK_INTEGRATION",
      "required-evidence-missing",
      { signals: { missingEvidence } },
    );
  }

  if (
    observation.impactDelta.unexpectedImpactedPaths.length > 0 ||
    observation.impactDelta.activeTaskCollisions.length > 0
  ) {
    return decision(policy, "PAUSE_FOR_REVIEW", "impact-expansion", {
      signals: {
        unexpectedImpactedPaths:
          observation.impactDelta.unexpectedImpactedPaths,
        activeTaskCollisions: observation.impactDelta.activeTaskCollisions,
      },
    });
  }

  if (
    observation.failure?.classification === "deterministic" &&
    observation.failureRepeatCount >= policy.repeatedFailureThreshold &&
    observation.evidenceDelta.score <= 0
  ) {
    return decision(
      policy,
      "PROPOSE_REPLAN",
      "repeated-no-progress-failure",
      {
        authorityEffect: "PROPOSAL_ONLY",
        requiresApproval: true,
        signals: {
          failureFingerprint: observation.failure.fingerprint,
          repeatCount: observation.failureRepeatCount,
          evidenceDelta: observation.evidenceDelta.direction,
        },
      },
    );
  }

  if (
    observation.failure?.retryable === true &&
    observation.attempt < observation.maxAttempts
  ) {
    return decision(policy, "DELEGATE_RETRY", "runtime-retry-eligible", {
      signals: {
        attemptsRemaining: observation.maxAttempts - observation.attempt,
      },
    });
  }

  if (
    observation.failure?.retryable === true &&
    observation.attempt >= observation.maxAttempts
  ) {
    return decision(policy, "PAUSE_FOR_REVIEW", "retry-budget-exhausted", {
      signals: {
        attempt: observation.attempt,
        maxAttempts: observation.maxAttempts,
        failureFingerprint: observation.failure.fingerprint,
      },
    });
  }

  if (observation.failure?.classification === "deterministic") {
    return decision(policy, "REQUEST_REPAIR", "bounded-implementation-failure", {
      signals: { failureFingerprint: observation.failure.fingerprint },
    });
  }

  if (observation.failure) {
    return decision(policy, "PAUSE_FOR_REVIEW", "unclassified-failure", {
      signals: {
        classification: observation.failure.classification ?? null,
        failureFingerprint: observation.failure.fingerprint ?? null,
      },
    });
  }

  return decision(policy, "CONTINUE", "entitled-to-continue");
}
