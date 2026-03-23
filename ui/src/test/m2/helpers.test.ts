import { describe, expect, it } from "vitest";
import {
  clampStep,
  computeDistanceRounded,
  computeEffectiveDamage,
  moveToward,
  normalizeScheduledTick,
} from "@engine/determinism";

describe("M2 deterministic helpers", () => {
  it("clampStep returns step when step is smaller than distance", () => {
    expect(clampStep(5, 1.25)).toBe(1.25);
  });

  it("clampStep returns distance when overshoot would occur", () => {
    expect(clampStep(1.2, 5)).toBe(1.2);
  });

  it("moveToward performs deterministic normalized-vector movement", () => {
    const moved = moveToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 2);

    expect(moved).toEqual({ x: 1.2, y: 1.6 });
  });

  it("moveToward clamps exactly to target on overshoot", () => {
    const moved = moveToward({ x: 0, y: 0 }, { x: 1, y: 1 }, 10);

    expect(moved).toEqual({ x: 1, y: 1 });
  });

  it("computeDistanceRounded returns rounded sqrt distance", () => {
    expect(computeDistanceRounded({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computeEffectiveDamage("NONE") returns rounded base damage', () => {
    expect(computeEffectiveDamage(12.3456, 5, "NONE", 2, 1)).toBe(12.346);
  });

  it('computeEffectiveDamage("INV_DISTANCE") applies deterministic falloff', () => {
    expect(computeEffectiveDamage(10, 4, "INV_DISTANCE", 2, 1)).toBe(5);
  });

  it('computeEffectiveDamage("INV_DISTANCE") respects minDistance floor', () => {
    expect(computeEffectiveDamage(10, 0.2, "INV_DISTANCE", 2, 1)).toBe(20);
  });

  it("normalizeScheduledTick converts timeSec to integer tick", () => {
    expect(normalizeScheduledTick(0.3, 0.1)).toBe(3);
    expect(normalizeScheduledTick(0.4, 0.2)).toBe(2);
  });

  it("normalizeScheduledTick fails when timeSec is not aligned to dt", () => {
    expect(() => normalizeScheduledTick(0.35, 0.1)).toThrow(/must align to dt/);
  });
});