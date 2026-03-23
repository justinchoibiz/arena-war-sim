import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import {
  Trophy,
  Clock3,
  Sword,
  Users,
  Layers3,
  Hash,
  Flag,
  Orbit,
} from "lucide-react";
import type {
  SimResult,
  StepExecutionState,
} from "@engine/types";

type OperatorMode = "idle" | "ready" | "stepped" | "traced" | "finished";

const cardStyle: CSSProperties = {
  border: "1px solid var(--ws-border)",
  background: "var(--ws-panel)",
  borderRadius: 24,
  boxShadow: "var(--ws-shadow-1)",
  padding: 16,
  display: "grid",
  gap: 14,
};

const separatorStyle: CSSProperties = {
  height: 1,
  width: "100%",
  background: "rgba(255,255,255,0.06)",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const metricCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 18,
  padding: 12,
  minWidth: 0,
  display: "grid",
  gap: 5,
};

const heroStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.07)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
  borderRadius: 22,
  padding: 14,
  display: "grid",
  gap: 5,
};

const emptyStyle: CSSProperties = {
  color: "var(--ws-text-soft)",
  fontSize: 14,
  lineHeight: 1.55,
};

export function ResultPanel(props: {
  result: SimResult | null;
  mode: OperatorMode;
  traceSummary: { traceLength: number; finalStateHash: string | null } | null;
  stepState: StepExecutionState | null;
}) {
  const { result, mode, traceSummary, stepState } = props;

  const stepTick = stepState?.ctx.tick ?? 0;
  const hasStepState = stepState !== null;
  const isTerminal = stepState?.winner !== null || mode === "finished";

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={cardStyle}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Result Summary
        </div>
        <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
          Engine-derived execution state only
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="empty-result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            style={emptyStyle}
          >
            No execution result yet. Run, trace, or step the validated scenario to surface the latest engine result here.
          </motion.div>
        ) : (
          <motion.div
            key={`${result.winnerTeam}-${result.timeToFinishSec}-${result.attackCount}-${mode}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            style={{ display: "grid", gap: 12 }}
          >
            <div style={heroStyle}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                <Trophy size={14} strokeWidth={2} />
                Winner
              </div>
              <div style={{ fontSize: 26, fontWeight: 760, letterSpacing: "-0.04em" }}>
                {result.winnerTeam}
              </div>
            </div>

            <div style={metricGridStyle} className="ws-responsive-metric-grid">
              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Clock3 size={14} strokeWidth={2} />
                  Time to Finish
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {result.timeToFinishSec.toFixed(3)}s
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Sword size={14} strokeWidth={2} />
                  Attack Count
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {result.attackCount}
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Orbit size={14} strokeWidth={2} />
                  Mode
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {mode}
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Flag size={14} strokeWidth={2} />
                  Terminal
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {isTerminal ? "yes" : "no"}
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Layers3 size={14} strokeWidth={2} />
                  Trace Length
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {traceSummary ? traceSummary.traceLength : "(none)"}
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  <Hash size={14} strokeWidth={2} />
                  Final Hash
                </div>
                <div style={{ fontSize: 14, fontWeight: 680 }} className="ws-mono">
                  {traceSummary?.finalStateHash ?? "(none)"}
                </div>
              </div>
            </div>

            <div style={metricCardStyle}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                <Users size={14} strokeWidth={2} />
                Survivors
              </div>
              <div style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.55 }} className="ws-mono">
                {result.survivorIds.length > 0 ? result.survivorIds.join(", ") : "(none)"}
              </div>
            </div>

            <div style={metricGridStyle} className="ws-responsive-metric-grid">
              <div style={metricCardStyle}>
                <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Step State
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {hasStepState ? "present" : "absent"}
                </div>
              </div>

              <div style={metricCardStyle}>
                <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Step Tick
                </div>
                <div style={{ fontSize: 15, fontWeight: 680 }}>
                  {hasStepState ? stepTick : "(none)"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}