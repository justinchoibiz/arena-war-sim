interface Position { x: number; y: number; }

export type Team = "A" | "B";
export type TargetingPolicy = "NEAREST";
export type FixedDt = 0.1 | 0.2;
export type ScenarioVersion = "0.1" | "0.2";
export type DamageFalloffMode = "NONE" | "INV_DISTANCE";

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

  /**
   * M2 fields are introduced here as optional first so that
   * Step 1 can widen the type surface without breaking current M1 callers.
   * Step 2 (validation) will hard-require and validate them.
   */
  moveSpeed?: number;
  activationRange?: number;
  isActive?: boolean;
  damageFalloff?: DamageFalloffMode;
  k?: number;
  minDistance?: number;
}

export interface SimSettings {
  dt: FixedDt;
  seed: number;
  targetingDefault: TargetingPolicy;
}

export interface NormalizedInputEvent {
  scheduledAtTick: number;
  type: string;
  payload?: unknown;
}

export interface Scenario {
  version: ScenarioVersion;
  name: string;
  createdAt: string;
  settings: SimSettings;
  units: Unit[];
  inputEvents?: unknown[];
}

export interface SimResult {
  winnerTeam: Team;
  timeToFinishSec: number;
  survivorIds: string[];
  attackCount: number;
}

export interface EngineContext {
  tick: number;
  dt: FixedDt;
  seed: number;
  inputEvents: NormalizedInputEvent[];
}

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

export interface TickStateSnapshot {
  tick: number;
  units: UnitStateSnapshot[];
}

export interface TickHashRecord {
  tick: number;
  snapshot: TickStateSnapshot;
  stateHash: string;
}

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

export interface DivergenceResult {
  firstDivergenceTick: number | null;
  unitDiffs: DivergenceUnitDiff[];
}