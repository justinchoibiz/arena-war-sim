import { describe, expect, test } from "vitest";

import type { Scenario, Unit } from "@engine/types";
import { simulate } from "@engine/sim";
import { validateScenario } from "@engine/validate";
import { roundHalfUp } from "@engine/determinism";

/**
 * Helper: deep clone via JSON (ok for Scenario test fixtures)
 */
function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/**
 * Helper: deterministic shuffle (LCG) so test itself is deterministic
 */
function shuffleDeterministic<T>(arr: T[], seed = 123456): T[] {
  let s = seed >>> 0;
  function nextU32() {
    // LCG: Numerical Recipes
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s;
  }

  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = nextU32() % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Minimal unit factory (all required fields present)
 */
function makeUnit(p: {
  id: string;
  team: "A" | "B";
  x: number;
  y: number;
  attackIntervalSec: number;
  dps?: number;
  hp?: number;
  maxHp?: number;
  range?: number;
  cooldownRemaining?: number;
  targetId?: string | null;
}): Unit {
  return {
    id: p.id,
    name: p.id,
    team: p.team,
    level: 1,
    position: { x: p.x, y: p.y },
    targetingPolicy: "NEAREST",

    hp: p.hp ?? 100,
    maxHp: p.maxHp ?? 100,
    dps: p.dps ?? 10,
    range: p.range ?? 1_000_000,

    attackIntervalSec: p.attackIntervalSec,
    cooldownRemaining: p.cooldownRemaining ?? 0,
    targetId: p.targetId ?? null,
  };
}

/**
 * Base scenario used across tests (dt, 1v1, infinite range)
 */
function makeScenarioBase(dt: 0.1 | 0.2, units: Unit[]): Scenario {
  return {
    version: "0.1",
    name: `test_scenario_dt_${dt}`,
    createdAt: "2026-03-03T00:00:00+09:00",
    settings: {
      dt,
      seed: 42,
      targetingDefault: "NEAREST",
    },
    units,
    inputEvents: [],
  };
}

/**
 * Scenario for Attack interval determinism gate:
 * - dt=0.1, attackIntervalSec=0.5
 * - Two units in range, symmetric-ish
 */
function makeAttackIntervalGateScenario_valid(): Scenario {
  const dt = 0.1;
  const units: Unit[] = [
    // A가 B를 1회 공격으로 바로 죽이도록
    makeUnit({
      id: "uA1",
      team: "A",
      x: 0,
      y: 0,
      attackIntervalSec: 0.5,
      dps: 1000,           // damage = 1000 * 0.5 = 500
      hp: 100,
      maxHp: 100,
      range: 1_000_000,
      cooldownRemaining: 0,
    }),
    makeUnit({
      id: "uB1",
      team: "B",
      x: 10,
      y: 0,
      attackIntervalSec: 0.5,
      dps: 1,
      hp: 100,
      maxHp: 100,
      range: 1_000_000,
      cooldownRemaining: 0,
    }),
  ];
  return makeScenarioBase(dt, units);
}

/**
 * Scenario for invalid interval gate:
 * - dt=0.1, attackIntervalSec=0.55 (must FAIL)
 */
function makeAttackIntervalGateScenario_invalid(): Scenario {
  const dt = 0.1;
  const units: Unit[] = [
    makeUnit({ id: "uA1", team: "A", x: 0, y: 0, attackIntervalSec: 0.55 }),
    makeUnit({ id: "uB1", team: "B", x: 10, y: 0, attackIntervalSec: 0.55 }),
  ];
  return makeScenarioBase(dt, units);
}

describe("M1 Determinism Test Suite (engine-only)", () => {
  // 1) Repeatability
  test("1) Repeatability: same scenario run 3 times => identical result", () => {
    const s = makeScenarioBase(0.1, [
      makeUnit({ id: "uA1", team: "A", x: 0, y: 0, attackIntervalSec: 0.5, dps: 12 }),
      makeUnit({ id: "uB1", team: "B", x: 10, y: 0, attackIntervalSec: 0.5, dps: 10 }),
    ]);

    const r1 = simulate(s);
    const r2 = simulate(s);
    const r3 = simulate(s);

    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  // 2) Input Order Invariance
  test("2) Input Order Invariance: shuffle units[] => identical result", () => {
    const s = makeScenarioBase(0.1, [
      makeUnit({ id: "uA1", team: "A", x: 0, y: 0, attackIntervalSec: 0.5, dps: 12 }),
      makeUnit({ id: "uA2", team: "A", x: 0, y: 10, attackIntervalSec: 0.5, dps: 8 }),
      makeUnit({ id: "uB1", team: "B", x: 10, y: 0, attackIntervalSec: 0.5, dps: 10 }),
      makeUnit({ id: "uB2", team: "B", x: 10, y: 10, attackIntervalSec: 0.5, dps: 9 }),
    ]);

    const r0 = simulate(s);

    const s2 = clone(s);
    s2.units = shuffleDeterministic(s2.units, 999);

    const r1 = simulate(s2);

    expect(r1).toEqual(r0);
  });

  // 3) Save/Load Roundtrip (stringify/parse/validate/simulate)
  test("3) Save/Load Roundtrip: JSON stringify/parse/validate => identical result", () => {
    const s = makeScenarioBase(0.2, [
      makeUnit({
        id: "uA1",
        team: "A",
        x: 0,
        y: 0,
        attackIntervalSec: 0.4, // dt=0.2의 정수배
        dps: 1000,
        hp: 100,
        maxHp: 100,
        range: 1_000_000,
        cooldownRemaining: 0,
      }),
      makeUnit({
        id: "uB1",
        team: "B",
        x: 50,
        y: 0,
        attackIntervalSec: 0.4,
        dps: 1,
        hp: 100,
        maxHp: 100,
        range: 1_000_000,
        cooldownRemaining: 0,
      }),
    ]);

    const r0 = simulate(s);

    const text = JSON.stringify(s, null, 2);
    const parsed = JSON.parse(text);
    const validated = validateScenario(parsed);

    const r1 = simulate(validated);

    expect(r1).toEqual(r0);
  });

  // 4) Time Rounding Policy
  test("4) Time rounding policy: timeToFinishSec is roundHalfUp(tickCount*dt,3)", () => {
    // Construct scenario that ends in exactly 1 attack:
    // - dt=0.1
    // - attackInterval=0.1, cooldown=0
    // - dps=1000 so 1 hit kills (damage = dps*interval = 100)
    // - tickCount expected: 1 (first tick produces attack, then death resolved, winner)
    const dt = 0.1;
    const s = makeScenarioBase(dt, [
      makeUnit({ id: "uA1", team: "A", x: 0, y: 0, attackIntervalSec: 0.1, dps: 1000, hp: 100, maxHp: 100 }),
      makeUnit({ id: "uB1", team: "B", x: 1, y: 0, attackIntervalSec: 0.1, dps: 1, hp: 100, maxHp: 100 }),
    ]);

    const r = simulate(s);

    // Under current sim loop, winner check happens AFTER tickOnce,
    // so if it ends in one tick, tickCount should be 1.
    const expectedTickCount = 1;
    const expectedTime = roundHalfUp(expectedTickCount * dt, 3);

    expect(r.timeToFinishSec).toBe(expectedTime);
  });

  // 5) Attack Interval Determinism (HARD GATE)
  test("5) Attack interval determinism gate: dt=0.1, interval=0.5 => winner/time/survivors/attackCount identical across 3 runs", () => {
    const s = makeAttackIntervalGateScenario_valid();

    const r1 = simulate(s);
    const r2 = simulate(s);
    const r3 = simulate(s);

    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);

    // Explicitly assert the four key fields as well (gate clarity)
    expect(r1.winnerTeam).toBe(r2.winnerTeam);
    expect(r1.timeToFinishSec).toBe(r2.timeToFinishSec);
    expect(r1.survivorIds).toEqual(r2.survivorIds);
    expect(r1.attackCount).toBe(r2.attackCount);
  });

  // 6) Interval Validation FAIL (HARD GATE)
  test("6) Interval validation FAIL gate: dt=0.1, interval=0.55 => simulate throws (no auto-rounding)", () => {
    const s = makeAttackIntervalGateScenario_invalid();
    expect(() => simulate(s)).toThrow();
  });
});