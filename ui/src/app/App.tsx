import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import {
  Activity,
  Box,
  Hash,
  Layers3,
  PlayCircle,
} from "lucide-react";
import "./styles/app.css";

import type {
  Scenario,
  SimResult,
  StepExecutionState,
  TickHashRecord,
} from "@engine/types";
import { validateScenario } from "@engine/validate";
import {
  createStepExecutionState,
  runStep,
  simulate,
  simulateWithTrace,
} from "@engine/sim";

import { clampTickIndex, formatHashCompact } from "../entities/trace/lib/replayUtils";
import { ScenarioPanel } from "../widgets/scenario-summary/ui/ScenarioPanel";
import { Controls } from "../widgets/controls-panel/ui/ControlsPanel";
import { ResultPanel } from "../widgets/result-summary/ui/ResultPanel";
import { HPBars } from "../widgets/battlefield-static-view/ui/HPBars";
import { TargetLines } from "../widgets/battlefield-static-view/ui/TargetLines";
import { TickPlaybackPanel } from "../widgets/replay-player/ui/TickPlaybackPanel";

type OperatorMode = "idle" | "ready" | "stepped" | "traced" | "finished";

interface TraceSummary {
  traceLength: number;
  finalStateHash: string | null;
}

function getModeTone(mode: OperatorMode): {
  label: string;
  bg: string;
  border: string;
  fg: string;
} {
  switch (mode) {
    case "idle":
      return {
        label: "idle",
        bg: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.10)",
        fg: "var(--ws-text)",
      };
    case "ready":
      return {
        label: "ready",
        bg: "rgba(110,168,255,0.10)",
        border: "rgba(110,168,255,0.20)",
        fg: "rgb(208,225,255)",
      };
    case "stepped":
      return {
        label: "stepped",
        bg: "rgba(255,208,102,0.12)",
        border: "rgba(255,208,102,0.20)",
        fg: "rgb(255,231,173)",
      };
    case "traced":
      return {
        label: "traced",
        bg: "rgba(170,130,255,0.12)",
        border: "rgba(170,130,255,0.20)",
        fg: "rgb(228,214,255)",
      };
    case "finished":
      return {
        label: "finished",
        bg: "rgba(110,219,160,0.12)",
        border: "rgba(110,219,160,0.20)",
        fg: "rgb(203,245,223)",
      };
  }
}

const shellStyle: CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: 24,
  display: "grid",
  gap: 16,
};

const cardStyle: CSSProperties = {
  border: "1px solid var(--ws-border)",
  background: "var(--ws-panel)",
  borderRadius: 24,
  boxShadow: "var(--ws-shadow-1)",
};

const statusStripStyle: CSSProperties = {
  ...cardStyle,
  padding: 18,
  display: "grid",
  gap: 16,
};

const statusTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const productLockupStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const statusGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 10,
};

const statusCellStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 18,
  padding: "12px 14px",
  minWidth: 0,
  display: "grid",
  gap: 4,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
};

const visualGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
};

const emptyPanelStyle: CSSProperties = {
  ...cardStyle,
  padding: 18,
  color: "var(--ws-text-soft)",
  fontSize: 14,
  lineHeight: 1.55,
};

const separatorStyle: CSSProperties = {
  height: 1,
  width: "100%",
  background: "rgba(255,255,255,0.06)",
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [stepState, setStepState] = useState<StepExecutionState | null>(null);
  const [traceSummary, setTraceSummary] = useState<TraceSummary | null>(null);
  const [mode, setMode] = useState<OperatorMode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trace, setTrace] = useState<TickHashRecord[]>([]);
  const [currentTickIndex, setCurrentTickIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMsPerTick, setPlaybackMsPerTick] = useState(500);

  const scenarioLoaded = scenario !== null;
  const scenarioName = scenario?.name ?? "(unloaded)";
  const isTerminal = stepState?.winner !== null;
  const modeTone = useMemo(() => getModeTone(mode), [mode]);

  useEffect(() => {
    setCurrentTickIndex((prev) => clampTickIndex(prev, trace.length));
    if (trace.length === 0) {
      setIsPlaying(false);
    }
  }, [trace.length]);

  const syncTraceState = useCallback((nextTrace: TickHashRecord[]) => {
    setTrace(nextTrace);
    setCurrentTickIndex(nextTrace.length > 0 ? 0 : 0);
    setIsPlaying(false);
    setTraceSummary({
      traceLength: nextTrace.length,
      finalStateHash: nextTrace.length > 0 ? nextTrace[nextTrace.length - 1].stateHash : null,
    });
  }, []);

  const clearReplayState = useCallback(() => {
    setTrace([]);
    setCurrentTickIndex(0);
    setIsPlaying(false);
    setTraceSummary(null);
  }, []);

  const onScenarioChange = useCallback((s: Scenario | null) => {
    setScenario(s);
    setResult(null);
    setStepState(null);
    clearReplayState();
    setError(null);
    setMode(s ? "ready" : "idle");
  }, [clearReplayState]);

  const onRun = useCallback(() => {
    try {
      if (!scenario) throw new Error("No scenario loaded");
      setBusy(true);

      const validated = validateScenario(scenario);
      const nextResult = simulate(validated);

      setResult(nextResult);
      setStepState(null);
      clearReplayState();
      setError(null);
      setMode("finished");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [scenario, clearReplayState]);

  const onRunWithTrace = useCallback(() => {
    try {
      if (!scenario) throw new Error("No scenario loaded");
      setBusy(true);

      const validated = validateScenario(scenario);
      const traced = simulateWithTrace(validated);

      setResult(traced.result);
      setStepState(null);
      syncTraceState(traced.trace);
      setError(null);
      setMode("traced");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [scenario, syncTraceState]);

  const onStep = useCallback(() => {
    try {
      if (!scenario) throw new Error("No scenario loaded");
      setBusy(true);

      if (stepState === null) {
        const validated = validateScenario(scenario);
        const initial = createStepExecutionState(validated);
        const stepped = runStep(initial, { emitTrace: true });

        setStepState(stepped.state);
        setResult(stepped.result);
        syncTraceState(stepped.state.trace);
        setCurrentTickIndex(stepped.state.trace.length > 0 ? stepped.state.trace.length - 1 : 0);
        setError(null);
        setMode(stepped.state.winner === null ? "stepped" : "finished");
        return;
      }

      const stepped = runStep(stepState, { emitTrace: true });

      setStepState(stepped.state);
      setResult(stepped.result);
      syncTraceState(stepped.state.trace);
      setCurrentTickIndex(stepped.state.trace.length > 0 ? stepped.state.trace.length - 1 : 0);
      setError(null);
      setMode(stepped.state.winner === null ? "stepped" : "finished");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [scenario, stepState, syncTraceState]);

  const onReset = useCallback(() => {
    setResult(null);
    setStepState(null);
    clearReplayState();
    setError(null);
    setMode(scenario ? "ready" : "idle");
  }, [scenario, clearReplayState]);

  const replayStateLabel =
    trace.length === 0 ? "absent" : isPlaying ? "playing" : "paused";

  return (
    <div style={shellStyle}>
      <motion.header
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={statusStripStyle}
      >
        <div style={statusTopStyle}>
          <div style={productLockupStyle}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              <Box size={18} strokeWidth={2} />
              <span>War Sim</span>
            </div>
            <div
              style={{
                color: "var(--ws-text-soft)",
                fontSize: 12,
                letterSpacing: "0.01em",
              }}
            >
              Quiet operator console for deterministic execution
            </div>
          </div>

          <motion.div
            key={mode}
            initial={{ opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.16 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: modeTone.bg,
              border: `1px solid ${modeTone.border}`,
              color: modeTone.fg,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Activity size={14} strokeWidth={2} />
            {modeTone.label}
          </motion.div>
        </div>

        <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

        <div style={statusGridStyle} className="ws-responsive-status-grid">
          <div style={statusCellStyle}>
            <div className="ws-status-label">Scenario</div>
            <div className="ws-status-value">{scenarioName}</div>
          </div>

          <div style={statusCellStyle}>
            <div className="ws-status-label">Readiness</div>
            <div className="ws-status-value">
              {scenarioLoaded ? "validated-on-run" : "unloaded"}
            </div>
          </div>

          <div style={statusCellStyle}>
            <div className="ws-status-label">Trace Presence</div>
            <div className="ws-status-value" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Layers3 size={14} strokeWidth={2} />
              {traceSummary ? `${traceSummary.traceLength} ticks` : "(none)"}
            </div>
          </div>

          <div style={statusCellStyle}>
            <div className="ws-status-label">Replay State</div>
            <div className="ws-status-value" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <PlayCircle size={14} strokeWidth={2} />
              {replayStateLabel}
            </div>
          </div>

          <div style={statusCellStyle}>
            <div className="ws-status-label">Final Hash</div>
            <div className="ws-status-value ws-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Hash size={14} strokeWidth={2} />
              {formatHashCompact(traceSummary?.finalStateHash ?? null)}
            </div>
          </div>
        </div>
      </motion.header>

      <Controls
        onRun={onRun}
        onRunWithTrace={onRunWithTrace}
        onStep={onStep}
        onReset={onReset}
        isRunDisabled={!scenarioLoaded || busy}
        isTraceDisabled={!scenarioLoaded || busy}
        isStepDisabled={!scenarioLoaded || busy || isTerminal === true}
        isResetDisabled={busy || (!result && !stepState && !traceSummary && !error)}
        busy={busy}
        hasScenario={scenarioLoaded}
        hasStepState={stepState !== null}
        isTerminal={isTerminal === true}
      />

      <AnimatePresence mode="popLayout">
        {trace.length > 0 ? (
          <motion.div
            key="replay-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            <TickPlaybackPanel
              trace={trace}
              currentTickIndex={currentTickIndex}
              isPlaying={isPlaying}
              playbackMsPerTick={playbackMsPerTick}
              onTickIndexChange={setCurrentTickIndex}
              onPlayToggle={setIsPlaying}
              onPlaybackMsPerTickChange={setPlaybackMsPerTick}
              onReset={() => {
                setIsPlaying(false);
                setCurrentTickIndex(0);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div style={summaryGridStyle} className="ws-responsive-summary-grid">
        <ScenarioPanel
          scenario={scenario}
          setScenario={onScenarioChange}
          error={error}
          setError={setError}
        />

        <ResultPanel
          result={result}
          mode={mode}
          traceSummary={traceSummary}
          stepState={stepState}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {scenario ? (
          <motion.div
            key="visual-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            style={visualGridStyle}
            className="ws-responsive-summary-grid"
          >
            <HPBars scenario={scenario} />
            <TargetLines scenario={scenario} />
          </motion.div>
        ) : (
          <motion.div
            key="empty-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            style={emptyPanelStyle}
          >
            Load a scenario to inspect the static HP bars and target lines. These remain imported scenario views, not replay surfaces.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}