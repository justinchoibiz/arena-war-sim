import type { CSSProperties } from "react";
import { motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import {
  Play,
  ScanSearch,
  Footprints,
  RotateCcw,
} from "lucide-react";

const cardStyle: CSSProperties = {
  border: "1px solid var(--ws-border)",
  background: "var(--ws-panel)",
  borderRadius: 24,
  boxShadow: "var(--ws-shadow-1)",
  padding: 16,
  display: "grid",
  gap: 14,
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const separatorStyle: CSSProperties = {
  height: 1,
  width: "100%",
  background: "rgba(255,255,255,0.06)",
};

function actionButtonStyle(
  kind: "primary" | "secondary" | "quiet",
  disabled: boolean
): CSSProperties {
  const base: CSSProperties = {
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 650,
    letterSpacing: "-0.01em",
    transition: "opacity 140ms ease, transform 140ms ease, border-color 140ms ease, background 140ms ease",
    opacity: disabled ? 0.46 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  if (kind === "primary") {
    return {
      ...base,
      color: "#0e1522",
      background: disabled ? "rgba(230,237,255,0.56)" : "rgb(232,238,252)",
      border: "1px solid transparent",
      boxShadow: disabled ? "none" : "0 8px 30px rgba(188,205,255,0.10)",
    };
  }

  if (kind === "quiet") {
    return {
      ...base,
      color: "var(--ws-text)",
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
    };
  }

  return {
    ...base,
    color: "var(--ws-text)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
  };
}

function getHelperText(args: {
  hasScenario?: boolean;
  busy?: boolean;
  hasStepState?: boolean;
  isTerminal?: boolean;
}): string {
  if (!args.hasScenario) return "Load a validated scenario first.";
  if (args.busy) return "Engine execution in progress.";
  if (args.isTerminal) return "Terminal state reached. Reset to run again.";
  if (args.hasStepState) return "Step state is present and still uses the shared tick core.";
  return "Run validates first. Trace and step stay on the engine path.";
}

export function Controls(props: {
  onRun: () => void;
  onRunWithTrace: () => void;
  onStep: () => void;
  onReset: () => void;
  isRunDisabled: boolean;
  isTraceDisabled: boolean;
  isStepDisabled: boolean;
  isResetDisabled: boolean;
  busy?: boolean;
  hasScenario?: boolean;
  hasStepState?: boolean;
  isTerminal?: boolean;
}) {
  const helperText = getHelperText({
    hasScenario: props.hasScenario,
    busy: props.busy,
    hasStepState: props.hasStepState,
    isTerminal: props.isTerminal,
  });

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={cardStyle}
    >
      <div style={headerStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Controls
          </div>
          <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
            Thin operator actions over engine surfaces only
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "var(--ws-text-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          validate → execute
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <div style={buttonRowStyle}>
        <motion.button
          whileTap={props.isRunDisabled ? undefined : { scale: 0.985 }}
          style={actionButtonStyle("primary", props.isRunDisabled)}
          onClick={props.onRun}
          disabled={props.isRunDisabled}
        >
          <Play size={16} strokeWidth={2} />
          Run
        </motion.button>

        <motion.button
          whileTap={props.isTraceDisabled ? undefined : { scale: 0.985 }}
          style={actionButtonStyle("secondary", props.isTraceDisabled)}
          onClick={props.onRunWithTrace}
          disabled={props.isTraceDisabled}
        >
          <ScanSearch size={16} strokeWidth={2} />
          Run with Trace
        </motion.button>

        <motion.button
          whileTap={props.isStepDisabled ? undefined : { scale: 0.985 }}
          style={actionButtonStyle("secondary", props.isStepDisabled)}
          onClick={props.onStep}
          disabled={props.isStepDisabled}
        >
          <Footprints size={16} strokeWidth={2} />
          Step
        </motion.button>

        <motion.button
          whileTap={props.isResetDisabled ? undefined : { scale: 0.985 }}
          style={actionButtonStyle("quiet", props.isResetDisabled)}
          onClick={props.onReset}
          disabled={props.isResetDisabled}
        >
          <RotateCcw size={16} strokeWidth={2} />
          Reset
        </motion.button>
      </div>

      <div style={{ fontSize: 12, color: "var(--ws-text-soft)", lineHeight: 1.5 }}>
        {helperText}
      </div>
    </motion.section>
  );
}