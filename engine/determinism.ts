// /engine/determinism.ts
/**
 * Determinism Rules (M1)
 *
 * - All unit iteration order must be derived from sortUnitsById (id ASC).
 * - Target selection:
 *   - nearest by dist^2 (no sqrt)
 *   - tie-break by target.id ASC
 * - Rounding:
 *   - Use roundHalfUp only (explicit, consistent)
 * - Never rely on JS engine quirks (Array.sort stability, float formatting, etc.)
 */

import type { Unit } from "./types";

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