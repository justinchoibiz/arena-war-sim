import { describe, expect, it } from "vitest";
import { validateScenario } from "@engine/validate";
import type { Scenario } from "@engine/types";

function makeValidM2Scenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_valid",
    createdAt: "2026-03-20T00:00:00.000Z",
    settings: {
      dt: 0.1,
      seed: 1,
      targetingDefault: "NEAREST",
    },
    units: [
      {
        id: "A1",
        name: "Alpha",
        team: "A",
        level: 1,
        position: { x: 0, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 10,
        range: 5,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 3,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 10, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 10,
        range: 5,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 3,
        isActive: false,
        damageFalloff: "INV_DISTANCE",
        k: 2,
        minDistance: 1,
      },
    ],
  };
}

describe("M2 scenario validation", () => {
  it("passes for a valid M2 scenario", () => {
    const s = makeValidM2Scenario();
    expect(validateScenario(s)).toEqual(s);
  });

  it("fails when moveSpeed is negative", () => {
    const s = makeValidM2Scenario();
    s.units[0].moveSpeed = -1;

    expect(() => validateScenario(s)).toThrow(/moveSpeed must be >= 0/);
  });

  it("fails when activationRange is negative", () => {
    const s = makeValidM2Scenario();
    s.units[0].activationRange = -1;

    expect(() => validateScenario(s)).toThrow(/activationRange must be >= 0/);
  });

  it("fails when damageFalloff is unsupported", () => {
    const s = makeValidM2Scenario();
    (s.units[0] as any).damageFalloff = "LINEAR";

    expect(() => validateScenario(s)).toThrow(/damageFalloff must be "NONE" \| "INV_DISTANCE"/);
  });

  it("fails when k is missing under INV_DISTANCE", () => {
    const s = makeValidM2Scenario();
    delete (s.units[1] as any).k;

    expect(() => validateScenario(s)).toThrow(/k must be finite number/);
  });

  it("fails when minDistance is missing under INV_DISTANCE", () => {
    const s = makeValidM2Scenario();
    delete (s.units[1] as any).minDistance;

    expect(() => validateScenario(s)).toThrow(/minDistance must be finite number/);
  });

  it("fails when minDistance is non-positive under INV_DISTANCE", () => {
    const s = makeValidM2Scenario();
    s.units[1].minDistance = 0;

    expect(() => validateScenario(s)).toThrow(/minDistance must be > 0/);
  });

  it("fails when inputEvents is not an array", () => {
    const s: any = makeValidM2Scenario();
    s.inputEvents = { bad: true };

    expect(() => validateScenario(s)).toThrow(/inputEvents must be array if provided/);
  });

  it("fails when duplicate unit id exists", () => {
    const s = makeValidM2Scenario();
    s.units[1].id = "A1";

    expect(() => validateScenario(s)).toThrow(/duplicate units\[\].id: A1/);
  });

  it("passes when inputEvents uses scheduledAtTick", () => {
    const s = makeValidM2Scenario();
    s.inputEvents = [
      {
        scheduledAtTick: 3,
        type: "DEPLOY_UNIT",
        payload: { unitId: "A2" },
      },
    ];

    const validated = validateScenario(s);
    expect(validated.inputEvents).toHaveLength(1);
  });

  it("passes when inputEvents uses normalizable timeSec", () => {
    const s = makeValidM2Scenario();
    s.inputEvents = [
      {
        timeSec: 0.3,
        type: "CAST_SKILL",
      },
    ];

    const validated = validateScenario(s);
    expect(validated.inputEvents).toHaveLength(1);
  });

  it("fails when inputEvents.timeSec is not normalizable by dt", () => {
    const s = makeValidM2Scenario();
    s.inputEvents = [
      {
        timeSec: 0.35,
        type: "CAST_SKILL",
      },
    ];

    expect(() => validateScenario(s)).toThrow(/must be normalizable to scheduledAtTick by dt/);
  });

  it("fails when input event has neither scheduledAtTick nor timeSec", () => {
    const s = makeValidM2Scenario();
    s.inputEvents = [
      {
        type: "DEPLOY_UNIT",
      },
    ];

    expect(() => validateScenario(s)).toThrow(/must include scheduledAtTick or timeSec/);
  });
});