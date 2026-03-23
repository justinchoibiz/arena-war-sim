interface Position { x: number; y: number; }

export type Team = "A" | "B";
export type MatchOutcome = Team | "DRAW";
export type TargetingPolicy = "NEAREST";
export type FixedDt = 0.1 | 0.2;
export type ScenarioVersion = "0.1" | "0.2";
export type DamageFalloffMode = "NONE" | "INV_DISTANCE";

// 유닛
export interface Unit {
  id: string;
  name: string;
  team: Team;
  level: number;
  position: Position;
  targetingPolicy: TargetingPolicy;

  hp: number;
  maxHp: number;
  dps: number;
  range: number;

  attackIntervalSec: number;
  cooldownRemaining: number;
  targetId: string | null;

  moveSpeed?: number;
  activationRange?: number;
  isActive?: boolean;
  damageFalloff?: DamageFalloffMode;
  k?: number;
  minDistance?: number;
}

// dt, seed 등 Simulation에 필요한 정적 설정
export interface SimSettings {
  dt: FixedDt;
  seed: number;
  targetingDefault: TargetingPolicy;
}

// 어느 Tick에 들어올 어느 Event Input이 들어올건지
export interface NormalizedInputEvent {
  scheduledAtTick: number;
  order: number;
  type: string;
  payload?: unknown;
}

// 세팅, Input, Units등 Simulation을 결정할 객체
export interface Scenario {
  version: ScenarioVersion;
  name: string;
  createdAt: string;
  settings: SimSettings;
  units: Unit[];
  inputEvents?: unknown[];
}

// 승리팀, 얼마나 공격하는지 등 확인하고 싶은 결과.
export interface SimResult {
  winnerTeam: MatchOutcome;
  timeToFinishSec: number;
  survivorIds: string[];
  attackCount: number;
}

// 결과 + Tick 별 State
export interface SimTraceResult {
  result: SimResult;
  trace: TickHashRecord[];
}

// M2 run validation surface: SimTraceResult 자세한 버전
export interface RunValidationResult {
  result: SimResult;
  traceLength: number;
  tickHashes: string[];
  finalStateHash: string | null;
}

// 실행 중 바뀌는 엔진 문맥
export interface EngineContext {
  tick: number;
  dt: FixedDt;
  seed: number;
  inputEvents: NormalizedInputEvent[];
}

// step execution public surface
export interface StepExecutionState {
  ctx: EngineContext;
  units: Unit[];
  attackCount: number;
  trace: TickHashRecord[];
  winner: MatchOutcome | null;
}

export interface StepExecutionRunResult {
  state: StepExecutionState;
  traceRecord: TickHashRecord | null;
  result: SimResult | null;
}

// Unit은 optional field, rouding 안된 field 섞여 있음
export interface UnitStateSnapshot {
  id: string;
  team: Team;
  hp: number;
  position: Position;
  targetId: string | null;
  cooldownRemaining: number;
  isActive: boolean;
  damageFalloff: DamageFalloffMode;
  k: number;
  minDistance: number;
}

// 특정 Tick의 UnitSnapshots
export interface TickStateSnapshot {
  tick: number;
  units: UnitStateSnapshot[];
}

// 특정 Tick의 UnitSnapshots를 Hash 화
export interface TickHashRecord {
  tick: number;
  snapshot: TickStateSnapshot;
  stateHash: string;
}

// 비교할 2개의 Trace 
export interface DivergenceTraceInput {
  baseline: TickHashRecord[];
  candidate: TickHashRecord[];
}

// 특정 tick에서 baseline/ candidate 가 어떤 부분이 다른지.
export interface DivergenceUnitDiff {
  id: string;
  before: Partial<{
    hp: number;
    position: Position;
    targetId: string | null;
    isActive: boolean;
    computedDamage: number;
  }>;
  after: Partial<{
    hp: number;
    position: Position;
    targetId: string | null;
    isActive: boolean;
    computedDamage: number;
  }>;
}

// 비교 결과
export interface DivergenceResult {
  firstDivergenceTick: number | null;
  unitDiffs: DivergenceUnitDiff[];
}