// /engine/sim.ts
/**
 * Tick Order (M1 — DO NOT MODIFY)
 *
 * Fixed timestep simulation. Determinism depends on this exact order.
 *
 * 1) Acquire/Update Targets (NEAREST, tie-break by target.id ASC)
 * 2) Move (M1: no-op slot preserved)
 * 3) Attack (cooldown/interval based) -> compute pendingDamage only
 * 4) Apply Pending Damage (apply in targetId ASC)
 * 5) Resolve Deaths (hp <= 0 removed)
 * 6) Emit Result (winner/time/survivors/attackCount)
 *
 * Notes:
 * - All unit iteration must use id ASC ordering (see determinism.ts helpers).
 * - All rounding must go through roundHalfUp(..., 3).
 * - Any "silent correction" is forbidden in M1 gates.
 */

import type { Scenario, SimResult, Team, Unit } from "./types";
import {
  sortUnitsById,
  roundHalfUp,
  dist2,
  pickNearestTargetId,
} from "./determinism";

const MAX_TICKS = 10000;

// --------- (A) Scenario normalization / init ---------

function isBadNumber(x: unknown): boolean {
  return typeof x !== "number" || Number.isNaN(x) || !Number.isFinite(x);
}

function initUnit(u: Unit): Unit {
  const defaultMaxHp = 100;
  const defaultDps = 10;
  const defaultRange = 1000000; // "infinite-ish" so early demos don't stall due to range
  const defaultAttackInterval = 1; // M1 default: 1초
  const defaultCooldown = 0;  

  const maxHp = isBadNumber(u.maxHp) ? defaultMaxHp : u.maxHp;
  const hp = isBadNumber(u.hp) ? maxHp : u.hp;
  const dps = isBadNumber(u.dps) ? defaultDps : u.dps;
  const range = isBadNumber(u.range) ? defaultRange : u.range;
  const cooldownRemaining = isBadNumber(u.cooldownRemaining) ? defaultCooldown : u.cooldownRemaining;
  const attackIntervalSec = isBadNumber(u.attackIntervalSec) ? defaultAttackInterval : u.attackIntervalSec;

  const targetId = u.targetId ?? null;

  return {
    ...u,
    maxHp: roundHalfUp(maxHp, 3),
    hp: roundHalfUp(hp, 3),
    dps: roundHalfUp(dps, 3),
    range: roundHalfUp(range, 3),
    attackIntervalSec: roundHalfUp(attackIntervalSec, 3),
    cooldownRemaining: roundHalfUp(cooldownRemaining, 3),
    targetId,
  };
}

function deepCopyUnits(units: readonly Unit[]): Unit[] {
  return units.map((u) => ({
    ...u,
    position: { x: u.position.x, y: u.position.y },
  }));
}

// --------- (B) Tick loop ---------

function tickOnce( unitsIn: readonly Unit[], dt: number): { units: Unit[]; attacksThisTick: number } {
  let units = deepCopyUnits(unitsIn);

  const unitsSorted = sortUnitsById(units);
  const teamA = unitsSorted.filter((u) => u.team === "A");
  const teamB = unitsSorted.filter((u) => u.team === "B");

  for (const u of unitsSorted) {
    const enemiesSorted = u.team === "A" ? teamB : teamA;
    u.targetId = pickNearestTargetId(u, enemiesSorted);
  }

  const pendingDamage = new Map<string, number>();
  const byId = new Map<string, Unit>();
  for (const u of unitsSorted) byId.set(u.id, u);

  let attacksThisTick = 0;

  for (const attacker of unitsSorted) {
    attacker.cooldownRemaining = roundHalfUp(attacker.cooldownRemaining - dt, 3);

    if (attacker.cooldownRemaining > 0) continue;

    const tid = attacker.targetId;
    if (!tid) continue;

    const target = byId.get(tid);
    if (!target || target.hp <= 0) continue;

    const d2 = dist2(attacker.position, target.position);
    const r2 = attacker.range * attacker.range;
    if (d2 > r2) continue;

    const damage = roundHalfUp(attacker.dps * attacker.attackIntervalSec, 3);
    if (damage <= 0) continue;

    attacksThisTick++;

    pendingDamage.set(
      tid,
      roundHalfUp((pendingDamage.get(tid) ?? 0) + damage, 3)
    );

    attacker.cooldownRemaining = attacker.attackIntervalSec;
  }

  const targetIdsAsc = Array.from(pendingDamage.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const tid of targetIdsAsc) {
    const dmg = pendingDamage.get(tid)!;
    const target = byId.get(tid);
    if (!target || target.hp <= 0) continue;
    target.hp = roundHalfUp(target.hp - dmg, 3);
  }

  units = unitsSorted.filter((u) => u.hp > 0);

  return { units: sortUnitsById(units), attacksThisTick };
}

// --------- (C) Simulation wrapper / result ---------

function computeWinner(units: readonly Unit[]): Team | null {
  let hasA = false;
  let hasB = false;
  for (const u of units) {
    if (u.team === "A") hasA = true;
    else if (u.team === "B") hasB = true;
    if (hasA && hasB) return null;
  }
  if (!hasA && hasB) return "B";
  if (!hasB && hasA) return "A";
  // Edge-case: no units at all -> treat as error
  return null;
}

export function simulate(scenario: Scenario): SimResult {
  const dt = scenario.settings.dt;
  let units = sortUnitsById(deepCopyUnits(scenario.units)).map(initUnit);

  for (const u of units) {
    const ratio = roundHalfUp(u.attackIntervalSec / dt, 6);
    if (Math.abs(ratio - Math.round(ratio)) > 1e-6) {
      throw new Error(`attackIntervalSec must be integer multiple of dt: ${u.id}`);
    }
  }

  {
    const seen = new Set<string>();
    for (const u of units) {
      if (seen.has(u.id)) throw new Error(`Duplicate unit.id detected: ${u.id}`);
      seen.add(u.id);
    }
  }

  let tickCount = 0;
  let attackCount = 0;
  let winner: Team | null = computeWinner(units);

  while (winner === null) {
    tickCount++;

    const r = tickOnce(units, dt);
    units = r.units;
    attackCount += r.attacksThisTick;

    winner = computeWinner(units);

    if (tickCount > MAX_TICKS) throw new Error("Simulation timed out");
  }

  const timeToFinishSec = roundHalfUp(tickCount * dt, 3);
  const survivorIds = sortUnitsById(units).map((u) => u.id);

  return {
    winnerTeam: winner,
    timeToFinishSec,
    survivorIds,
    attackCount,
  };
}