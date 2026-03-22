// /engine/sim.ts
/**
 * Tick Order (M2 shared executor)
 *
 * Shared deterministic tick structure:
 *
 * 1) Apply scheduled inputs for current tick
 * 2) Acquire / Update Targets
 * 3) Move
 * 4) Resolve Activation
 * 5) Attack
 * 6) Apply Pending Damage
 * 7) Resolve Deaths
 * 8) Emit optional tick trace
 */

import type {
  EngineContext,
  MatchOutcome,
  NormalizedInputEvent,
  Scenario,
  SimResult,
  TickHashRecord,
  Unit,
  SimTraceResult
} from "./types";
import {
  normalizeScheduledTick,
  sortUnitsById,
  roundHalfUp,
  dist2,
  pickNearestTargetId,
  moveToward,
  computeDistanceRounded,
  computeEffectiveDamage,
} from "./determinism";
import {
  hashTickStateSnapshot,
  makeTickStateSnapshot,
} from "./hash";

const MAX_TICKS = 10000;

// Trace를 계산할건지
interface TickExecutionOptions {
  emitTrace?: boolean;
}

// tickOnce를 한 후 SimTraceResult를 생성하기 위한 객체
interface TickExecutionResult {
  units: Unit[];
  attacksThisTick: number;
  traceRecord?: TickHashRecord;
}

function isBadNumber(x: unknown): boolean {
  return typeof x !== "number" || Number.isNaN(x) || !Number.isFinite(x);
}

// 시나리오의 inputEvents field를 NormalizedInputEvent[] 타입으로 변환하는 함수
function normalizeInputEvents(
  scenario: Scenario
): NormalizedInputEvent[] {
  const raw = scenario.inputEvents ?? [];
  const dt = scenario.settings.dt;

  return raw.map((event, idx) => {
    if (typeof event !== "object" || event === null) {
      throw new Error(`inputEvents[${idx}] must be object`);
    }

    const e = event as Record<string, unknown>;
    const type = e["type"];
    if (typeof type !== "string") {
      throw new Error(`inputEvents[${idx}].type must be string`);
    }

    let scheduledAtTick: number;

    if (typeof e["scheduledAtTick"] === "number") {
      if (!Number.isInteger(e["scheduledAtTick"]) || e["scheduledAtTick"] < 0) {
        throw new Error(`inputEvents[${idx}].scheduledAtTick must be integer >= 0`);
      }
      scheduledAtTick = e["scheduledAtTick"];
    } else if (typeof e["timeSec"] === "number") {
      scheduledAtTick = normalizeScheduledTick(e["timeSec"], dt);
    } else {
      throw new Error(`inputEvents[${idx}] must include scheduledAtTick or timeSec`);
    }

    return {
      scheduledAtTick,
      type,
      payload: e["payload"],
    };
  });
}

// Unit 의 field 중 bad number 인 경우 디폴드 값으로 초기화하는 함수
function initUnit(u: Unit): Unit {
  const defaultMaxHp = 100;
  const defaultDps = 10;
  const defaultRange = 1000000;
  const defaultAttackInterval = 1;
  const defaultCooldown = 0;

  const maxHp = isBadNumber(u.maxHp) ? defaultMaxHp : u.maxHp;
  const hp = isBadNumber(u.hp) ? maxHp : u.hp;
  const dps = isBadNumber(u.dps) ? defaultDps : u.dps;
  const range = isBadNumber(u.range) ? defaultRange : u.range;
  const cooldownRemaining = isBadNumber(u.cooldownRemaining)
    ? defaultCooldown
    : u.cooldownRemaining;
  const attackIntervalSec = isBadNumber(u.attackIntervalSec)
    ? defaultAttackInterval
    : u.attackIntervalSec;

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

    moveSpeed: roundHalfUp(u.moveSpeed ?? 0, 3),
    activationRange: roundHalfUp(u.activationRange ?? 0, 3),
    isActive: Boolean(u.isActive ?? false),
    damageFalloff: u.damageFalloff ?? "NONE",
    k: roundHalfUp(u.k ?? 1, 3),
    minDistance: roundHalfUp(u.minDistance ?? 1, 3),
  };
}

// 유닛들의 positoin까지 깊은 복사
function deepCopyUnits(units: readonly Unit[]): Unit[] {
  return units.map((u) => ({
    ...u,
    position: { x: u.position.x, y: u.position.y },
  }));
}

// 시나리오의 units filed를 초기화하는 함수.
function createInitialUnits(scenario: Scenario): Unit[] {
  return sortUnitsById(deepCopyUnits(scenario.units)).map(initUnit);
}

// 시나리오로 첫번째 tick의 EngineContext 타입을 생성하는 함수
function createEngineContext(scenario: Scenario): EngineContext {
  return {
    tick: 0,
    dt: scenario.settings.dt,
    seed: scenario.settings.seed,
    inputEvents: normalizeInputEvents(scenario),
  };
}

function applyScheduledInputsForTick(
  _units: readonly Unit[],
  _ctx: EngineContext
): void {
  // Step 8 scope:
  // input normalization exists, but input mutation is still not enabled.
}

// Unit을 Team 별로 분리 한후에 가장 가까운 적의 TargetId 를 할당하는 함수
function acquireTargetsPhase(units: Unit[]): void {
  const unitsSorted = sortUnitsById(units);
  const teamA = unitsSorted.filter((u) => u.team === "A");
  const teamB = unitsSorted.filter((u) => u.team === "B");

  for (const u of unitsSorted) {
    const enemiesSorted = u.team === "A" ? teamB : teamA;
    u.targetId = pickNearestTargetId(u, enemiesSorted);
  }
}

// Id 별 포지션 → 유닛별로 적을 향해 moveSpeed * dt 반큼 진행한다.
function movePhase(units: Unit[], ctx: EngineContext): void {
  const unitsSorted = sortUnitsById(units);

  const startOfPhase = new Map<string, Unit>();
  for (const u of unitsSorted) {
    startOfPhase.set(u.id, {
      ...u,
      position: { x: u.position.x, y: u.position.y },
    });
  }

  for (const unit of unitsSorted) {
    const source = startOfPhase.get(unit.id)!;
    const tid = source.targetId;
    if (!tid) continue;

    const target = startOfPhase.get(tid);
    if (!target || target.hp <= 0) continue;

    const moveSpeed = source.moveSpeed ?? 0;
    const step = roundHalfUp(moveSpeed * ctx.dt, 3);
    if (step <= 0) continue;

    const moved = moveToward(source.position, target.position, step);

    unit.position = {
      x: moved.x,
      y: moved.y,
    };
  }
}

// target이 있고, 거리가 activationRange보다 작아야지 active 된다.
function activationPhase(units: Unit[]): void {
  const unitsSorted = sortUnitsById(units);
  const byId = new Map<string, Unit>();
  for (const u of unitsSorted) {
    byId.set(u.id, u);
  }

  for (const unit of unitsSorted) {
    const tid = unit.targetId;
    if (!tid) {
      unit.isActive = false;
      continue;
    }

    const target = byId.get(tid);
    if (!target || target.hp <= 0) {
      unit.isActive = false;
      continue;
    }

    const activationRange = unit.activationRange ?? 0;
    const activationRangeSq = activationRange * activationRange;
    unit.isActive = dist2(unit.position, target.position) <= activationRangeSq;
  }
}

// 유닛 별로 쿨다운을 감소시키고, 쿨다운이 찬 유닛은 상대가 사정거리 내에 있을 때 pendingDamage에 추가한다.그리고 쿨다운은 초기화시킨다.
function attackPhaseM2(
  units: readonly Unit[],
  ctx: EngineContext
): {
  pendingDamage: Map<string, number>;
  attacksThisTick: number;
} {
  const unitsSorted = sortUnitsById(units);
  const byId = new Map<string, Unit>();
  for (const u of unitsSorted) byId.set(u.id, u);

  const pendingDamage = new Map<string, number>();
  let attacksThisTick = 0;

  for (const attacker of unitsSorted) {
    attacker.cooldownRemaining = roundHalfUp(
      attacker.cooldownRemaining - ctx.dt,
      3
    );

    if (attacker.cooldownRemaining > 0) continue;
    if (attacker.isActive !== true) continue;

    const tid = attacker.targetId;
    if (!tid) continue;

    const target = byId.get(tid);
    if (!target || target.hp <= 0) continue;

    const d2 = dist2(attacker.position, target.position);
    const r2 = attacker.range * attacker.range;
    if (d2 > r2) continue;

    const baseDamage = roundHalfUp(attacker.dps * attacker.attackIntervalSec, 3);
    if (baseDamage <= 0) continue;

    const distance = computeDistanceRounded(attacker.position, target.position);
    const effectiveDamage = computeEffectiveDamage(
      baseDamage,
      distance,
      attacker.damageFalloff!,
      attacker.k!,
      attacker.minDistance!
    );
    if (effectiveDamage <= 0) continue;

    attacksThisTick++;

    pendingDamage.set(
      tid,
      roundHalfUp((pendingDamage.get(tid) ?? 0) + effectiveDamage, 3)
    );

    attacker.cooldownRemaining = attacker.attackIntervalSec;
  }

  return { pendingDamage, attacksThisTick };
}

// Id 순으로 PendingDamage 를 적용시킨다.
function applyDamagePhase(
  units: readonly Unit[],
  pendingDamage: ReadonlyMap<string, number>
): void {
  const byId = new Map<string, Unit>();
  for (const u of units) byId.set(u.id, u);

  const targetIdsAsc = Array.from(pendingDamage.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const tid of targetIdsAsc) {
    const dmg = pendingDamage.get(tid)!;
    const target = byId.get(tid);
    if (!target || target.hp <= 0) continue;
    target.hp = roundHalfUp(target.hp - dmg, 3);
  }
}

// hp가 남아있는 유닛을 반환한다.
function resolveDeathsPhase(units: readonly Unit[]): Unit[] {
  return sortUnitsById(units.filter((u) => u.hp > 0));
}

// tick 별 units로 Hash화한다.
function buildTickTraceRecord(
  tick: number,
  units: readonly Unit[]
): TickHashRecord {
  const snapshot = makeTickStateSnapshot(tick, units);
  return {
    tick,
    snapshot,
    stateHash: hashTickStateSnapshot(snapshot),
  };
}

// 한번에 Tick에 적용한 Units를 공격횟수, Hash와 함꼐 저장한다.
function tickOnce(
  unitsIn: readonly Unit[],
  ctx: EngineContext,
  options: TickExecutionOptions = {}
): TickExecutionResult {
  const units = deepCopyUnits(unitsIn);

  applyScheduledInputsForTick(units, ctx);
  acquireTargetsPhase(units);
  movePhase(units, ctx);
  activationPhase(units);

  const { pendingDamage, attacksThisTick } = attackPhaseM2(units, ctx);
  applyDamagePhase(units, pendingDamage);

  const nextUnits = resolveDeathsPhase(units);

  const traceRecord = options.emitTrace
    ? buildTickTraceRecord(ctx.tick, nextUnits)
    : undefined;

  return {
    units: nextUnits,
    attacksThisTick,
    traceRecord,
  };
}

// 남아있는 Team으로 승자를 정한다.
function computeWinner(units: readonly Unit[]): MatchOutcome | null {
  let hasA = false;
  let hasB = false;

  for (const u of units) {
    if (u.team === "A") hasA = true;
    else if (u.team === "B") hasB = true;

    if (hasA && hasB) return null;
  }

  if (hasA && !hasB) return "A";
  if (!hasA && hasB) return "B";
  if (!hasA && !hasB) return "DRAW";

  return null;
}

// 각 unit이 tick의 정수배 주기로 공격하는지 확인
function assertAttackIntervalContract(units: readonly Unit[], dt: number): void {
  for (const u of units) {
    const ratio = roundHalfUp(u.attackIntervalSec / dt, 6);
    if (Math.abs(ratio - Math.round(ratio)) > 1e-6) {
      throw new Error(`attackIntervalSec must be integer multiple of dt: ${u.id}`);
    }
  }
}

// Id 가 중복되는지 확인
function assertUniqueIds(units: readonly Unit[]): void {
  const seen = new Set<string>();
  for (const u of units) {
    if (seen.has(u.id)) {
      throw new Error(`Duplicate unit.id detected: ${u.id}`);
    }
    seen.add(u.id);
  }
}

// 모든 유닛의 포지션 일치 확인
function positionsEqual(a: readonly Unit[], b: readonly Unit[]): boolean {
  const aSorted = sortUnitsById(a);
  const bSorted = sortUnitsById(b);

  if (aSorted.length !== bSorted.length) return false;

  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i].id !== bSorted[i].id) return false;
    if (aSorted[i].position.x !== bSorted[i].position.x) return false;
    if (aSorted[i].position.y !== bSorted[i].position.y) return false;
  }

  return true;
}

// 이전 Tick과 Position 동일 시 Stalemate
function isStalemateTick(
  beforeUnits: readonly Unit[],
  afterUnits: readonly Unit[],
  attacksThisTick: number
): boolean {
  if (attacksThisTick !== 0) return false;
  if (!positionsEqual(beforeUnits, afterUnits)) return false;
  if (afterUnits.some((u) => u.isActive === true)) return false;
  return true;
}

// 시나리오로써 winner가 나올 때까지 Tick을 진행하면서 SimResult 계산
function runSimulationInternal(
  scenario: Scenario,
  options: TickExecutionOptions
): SimTraceResult {
  const ctx = createEngineContext(scenario);
  let units = createInitialUnits(scenario);

  assertAttackIntervalContract(units, ctx.dt);
  assertUniqueIds(units);

  let tickCount = 0;
  let attackCount = 0;
  let winner: MatchOutcome | null = computeWinner(units);
  const trace: TickHashRecord[] = [];

  while (winner === null) {
    tickCount++;
    ctx.tick = tickCount;

    const beforeTickUnits = deepCopyUnits(units);
    const tickResult = tickOnce(units, ctx, options);
    units = tickResult.units;
    attackCount += tickResult.attacksThisTick;

    if (tickResult.traceRecord) {
      trace.push(tickResult.traceRecord);
    }

    winner = computeWinner(units);

    if (
      winner === null &&
      isStalemateTick(beforeTickUnits, units, tickResult.attacksThisTick)
    ) {
      winner = "DRAW";
    }

    if (tickCount > MAX_TICKS) {
      throw new Error("Simulation timed out");
    }
  }

  const timeToFinishSec = roundHalfUp(tickCount * ctx.dt, 3);
  const survivorIds = sortUnitsById(units).map((u) => u.id);

  return {
    result: {
      winnerTeam: winner,
      timeToFinishSec,
      survivorIds,
      attackCount,
    },
    trace,
  };
}

// Trace 없이 Scenario 실행
export function simulate(scenario: Scenario): SimResult {
  return runSimulationInternal(scenario, { emitTrace: false }).result;
}

// Trace 있이 Scenario 실행
export function simulateWithTrace(scenario: Scenario): SimTraceResult {
  return runSimulationInternal(scenario, { emitTrace: true });
}