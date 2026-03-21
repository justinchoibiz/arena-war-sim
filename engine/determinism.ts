import type { DamageFalloffMode, FixedDt, Unit } from "./types";

/**
 * Determinism policy (M1):
 * - All "iteration order" must be derived from deterministic ordering (id ASC).
 * - Distance comparisons must use dist^2 (no sqrt) to reduce float noise.
 * - Ties MUST be broken by target.id ASC.
 * - Rounding MUST be explicit and consistent (round half up).
 */

/**
 * Stable sort by unit.id ASC.
 * - Returns a NEW array (never mutates input).
 * - Explicitly stable even if JS engine sort stability is not relied upon.
 */
export function sortUnitsById(units: readonly Unit[]): Unit[] {
  return units
    .map((u, idx) => ({ u, idx }))
    .sort((a, b) => {
      const c = a.u.id.localeCompare(b.u.id);
      if (c !== 0) return c;
      // Stable tie-break for identical ids (should not happen in valid scenarios)
      return a.idx - b.idx;
    })
    .map((x) => x.u);
}

/**
 * Round-half-up with decimal places.
 *
 * Why this implementation:
 * - JS floating point makes 1.005 tricky (often 1.004999...).
 * - We add a small epsilon relative to magnitude before rounding to reduce "binary rep" edge cases.
 * - Still deterministic across runs in the same JS engine. (Cross-engine exactness is improved but not mathematically perfect.)
 */
export function roundHalfUp(value: number, decimals = 3): number {
  if (!Number.isFinite(value)) return value;

  const factor = 10 ** decimals;
  // Epsilon scaled by magnitude to avoid under/over for large numbers.
  const eps = Number.EPSILON * Math.max(1, Math.abs(value)) * factor;

  // half-up: sign-aware
  const scaled = value * factor;

  if (scaled >= 0) {
    return Math.floor(scaled + 0.5 + eps) / factor;
  } else {
    return -Math.floor(Math.abs(scaled) + 0.5 + eps) / factor;
  }
}

/**
 * Squared distance between two positions. (No sqrt)
 */
export function dist2(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Pick nearest target among enemiesSorted (must be sorted by id ASC already).
 * Rule:
 * - distance^2 ASC
 * - tie -> target.id ASC (since enemiesSorted is id-asc, first match wins)
 *
 * Returns target.id or null if no enemies.
 */
export function pickNearestTargetId(
  unit: Unit,
  enemiesSorted: readonly Unit[]
): string | null {
  if (enemiesSorted.length === 0) return null;

  let bestId: string | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;

  for (const enemy of enemiesSorted) {
    // Skip dead enemies defensively (engine should filter earlier, but don't assume)
    if (enemy.hp <= 0) continue;

    const d2 = dist2(unit.position, enemy.position);

    if (d2 < bestD2) {
      bestD2 = d2;
      bestId = enemy.id;
      continue;
    }

    if (d2 === bestD2) {
      // Tie-break by id ASC
      // Since enemiesSorted is already sorted by id ASC,
      // the first encountered at this distance is the smallest id.
      // But keep explicit comparison to be robust if caller violates sorting.
      if (bestId === null || enemy.id.localeCompare(bestId) < 0) {
        bestId = enemy.id;
      }
    }
  }

  return bestId;
}

/**
 * Clamp effective move step to current distance.
 * - distance <= step => exact clamp to distance
 * - step < distance => keep step
 *
 * Returned value is rounded through the active numeric policy.
 */
export function clampStep(distance: number, step: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(step)) {
    throw new Error("clampStep requires finite distance and step");
  }
  if (distance < 0) {
    throw new Error("clampStep distance must be >= 0");
  }
  if (step < 0) {
    throw new Error("clampStep step must be >= 0");
  }

  return roundHalfUp(Math.min(distance, step), 3);
}

/**
 * Compute true distance magnitude and snap immediately.
 * This is the only allowed sqrt-based distance path in M2 helpers.
 */
export function computeDistanceRounded(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const d = Math.sqrt(dist2(from, to));
  return roundHalfUp(d, 3);
}

/**
 * Deterministic movement helper.
 * Policy:
 * - normalized vector movement only
 * - overshoot => exact target clamp
 * - all returned coordinates are snapped through roundHalfUp(..., 3)
 */
export function moveToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  step: number
): { x: number; y: number } {
  if (!Number.isFinite(step)) {
    throw new Error("moveToward step must be finite");
  }
  if (step < 0) {
    throw new Error("moveToward step must be >= 0");
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const distance = computeDistanceRounded(from, to);

  if (distance === 0 || step === 0) {
    return {
      x: roundHalfUp(from.x, 3),
      y: roundHalfUp(from.y, 3),
    };
  }

  const effectiveStep = clampStep(distance, step);

  if (effectiveStep >= distance) {
    return {
      x: roundHalfUp(to.x, 3),
      y: roundHalfUp(to.y, 3),
    };
  }

  const invDistance = 1 / distance;
  const nx = roundHalfUp(dx * invDistance, 6);
  const ny = roundHalfUp(dy * invDistance, 6);

  return {
    x: roundHalfUp(from.x + nx * effectiveStep, 3),
    y: roundHalfUp(from.y + ny * effectiveStep, 3),
  };
}

/**
 * Deterministic damage computation helper.
 * - NONE: return rounded baseDamage
 * - INV_DISTANCE: return rounded(baseDamage * (k / max(distance, minDistance)))
 */
export function computeEffectiveDamage(
  baseDamage: number,
  distance: number,
  mode: DamageFalloffMode,
  k: number,
  minDistance: number
): number {
  if (!Number.isFinite(baseDamage) || !Number.isFinite(distance) || !Number.isFinite(k) || !Number.isFinite(minDistance)) {
    throw new Error("computeEffectiveDamage requires finite inputs");
  }
  if (baseDamage < 0) {
    throw new Error("computeEffectiveDamage baseDamage must be >= 0");
  }
  if (distance < 0) {
    throw new Error("computeEffectiveDamage distance must be >= 0");
  }
  if (minDistance <= 0) {
    throw new Error("computeEffectiveDamage minDistance must be > 0");
  }

  if (mode === "NONE") {
    return roundHalfUp(baseDamage, 3);
  }

  const effectiveDistance = roundHalfUp(Math.max(distance, minDistance), 3);
  const scaled = baseDamage * (k / effectiveDistance);
  return roundHalfUp(scaled, 3);
}

/**
 * Normalize timeSec into scheduledAtTick.
 * Policy:
 * - tick-based normalization only
 * - invalid/non-normalizable time must hard-fail
 */
export function normalizeScheduledTick(
  timeSec: number,
  dt: FixedDt
): number {
  if (!Number.isFinite(timeSec)) {
    throw new Error("normalizeScheduledTick timeSec must be finite");
  }
  if (timeSec < 0) {
    throw new Error("normalizeScheduledTick timeSec must be >= 0");
  }

  const ratio = timeSec / dt;
  const nearest = Math.round(ratio);

  if (Math.abs(ratio - nearest) > 1e-6) {
    throw new Error("normalizeScheduledTick timeSec must align to dt");
  }

  return nearest;
}