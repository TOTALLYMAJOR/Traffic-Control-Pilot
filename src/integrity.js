import { createHash } from "node:crypto";

function normalize(value) {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Canonical JSON does not support non-finite numbers");
  }

  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function sha256(value) {
  const source = typeof value === "string" ? value : canonicalJson(value);
  return createHash("sha256").update(source, "utf8").digest("hex");
}
