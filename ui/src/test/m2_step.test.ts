import { describe, expect, it } from "vitest";
import { roundHalfUp } from "@engine/determinism";
import {
  createStepExecutionState,
  runStep,
  simulate,
  simulateWithTrace,
} from "@engine/sim";
import type { Scenario, StepExecutionState } from "@engine/types";

function makeScenario(withScheduledInput = false): Scenario {
  return {
    version: "0.1",
    name: withScheduledInput ? "m2_step_with_input" : "m2_step_plain",
    createdAt: "2026-03-23T00:00:00.000Z",
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
        range: 10,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 10,
        isActive: false,
        damageFalloff: "INV_DISTANCE",
        k: 2,
        minDistance: 1,
      },
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 4, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 0,
        range: 10,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 0,
        activationRange: 10,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
    inputEvents: withScheduledInput
      ? [
          {
            timeSec: 0.2,
            type: "SET_UNIT_HP",
            payload: {
              unitId: "B1",
              hp: 40,
            },
          },
          {
            scheduledAtTick: 3,
            type: "SET_UNIT_COOLDOWN",
            payload: {
              unitId: "A1",
              cooldownRemaining: 0,
            },
          },
        ]
      : undefined,
  };
}

function runAllSteps(
  initial: StepExecutionState,
  emitTrace: boolean
): StepExecutionState {
  let state = initial;

  while (state.winner === null) {
    state = runStep(state, { emitTrace }).state;
  }

  return state;
}

describe("M2 step execution and schedule normalization", () => {
  it("schedule normalization converts timeSec to scheduledAtTick", () => {
    const state = createStepExecutionState(makeScenario(true));

    expect(state.ctx.inputEvents[0].scheduledAtTick).toBe(2);
    expect(state.ctx.inputEvents[0].order).toBe(0);
    expect(state.ctx.inputEvents[1].scheduledAtTick).toBe(3);
    expect(state.ctx.inputEvents[1].order).toBe(1);
  });

  it("step/full-speed final-result equivalence", () => {
    const scenario = makeScenario(false);

    const full = simulate(scenario);
    const stepped = runAllSteps(createStepExecutionState(scenario), false);

    expect(stepped.winner).toBe(full.winnerTeam);
    expect(stepped.attackCount).toBe(full.attackCount);
    expect(roundHalfUp(stepped.ctx.tick * stepped.ctx.dt, 3)).toBe(full.timeToFinishSec);    
    expect(stepped.units.map((u) => u.id)).toEqual(full.survivorIds);
  });

  it("step/full-speed tick-hash equivalence", () => {
    const scenario = makeScenario(false);

    const full = simulateWithTrace(scenario);
    const stepped = runAllSteps(createStepExecutionState(scenario), true);

    expect(stepped.trace.map((t) => t.stateHash)).toEqual(
      full.trace.map((t) => t.stateHash)
    );
  });

  it("step equivalence with scheduled inputs", () => {
    const scenario = makeScenario(true);

    const full = simulateWithTrace(scenario);
    const stepped = runAllSteps(createStepExecutionState(scenario), true);

    expect(stepped.winner).toBe(full.result.winnerTeam);
    expect(stepped.attackCount).toBe(full.result.attackCount);
    expect(stepped.trace.map((t) => t.stateHash)).toEqual(
      full.trace.map((t) => t.stateHash)
    );
    expect(stepped.units.map((u) => u.id)).toEqual(full.result.survivorIds);
  });
});