import { useEffect, type CSSProperties } from "react";
import { motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import * as Slider from "@radix-ui/react-slider";
import * as Select from "@radix-ui/react-select";
import {
  ChevronDown,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";

import type { TickHashRecord } from "@engine/types";
import { ReplayViewport } from "../../../features/replay-playback/ui/ReplayViewport";
import {
  clampTickIndex,
  formatHashCompact,
  getSnapshotUnitCount,
} from "../../../entities/trace/lib/replayUtils";

export interface TickPlaybackPanelProps {
  trace: TickHashRecord[];
  currentTickIndex: number;
  isPlaying: boolean;
  playbackMsPerTick: number;
  onTickIndexChange: (nextIndex: number) => void;
  onPlayToggle: (nextPlaying: boolean) => void;
  onPlaybackMsPerTickChange?: (nextMs: number) => void;
  onReset?: () => void;
  width?: number;
  height?: number;
}

const SPEED_OPTIONS = [
  { label: "250 ms", value: 250 },
  { label: "500 ms", value: 500 },
  { label: "750 ms", value: 750 },
  { label: "1000 ms", value: 1000 },
];

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

const controlShellStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
  background: "rgba(255,255,255,0.02)",
  padding: 12,
  display: "grid",
  gap: 12,
};

const viewportGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
  gap: 14,
};

function playbackButtonStyle(disabled: boolean, primary = false): CSSProperties {
  return {
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 999,
    border: primary
      ? "1px solid transparent"
      : "1px solid rgba(255,255,255,0.10)",
    background: primary ? "rgb(232,238,252)" : "rgba(255,255,255,0.04)",
    color: primary ? "#0f172a" : "var(--ws-text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 650,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function TickPlaybackPanel(props: TickPlaybackPanelProps) {
  const trace = props.trace ?? [];
  const totalTicks = trace.length;
  const safeIndex = clampTickIndex(props.currentTickIndex, totalTicks);
  const currentRecord = totalTicks > 0 ? trace[safeIndex] : null;
  const currentSnapshot = currentRecord?.snapshot ?? null;
  const currentTick = currentRecord?.tick ?? null;
  const currentHash = currentRecord?.stateHash ?? null;
  const isAtStart = safeIndex <= 0;
  const isAtEnd = totalTicks === 0 || safeIndex >= totalTicks - 1;

  useEffect(() => {
    if (!props.isPlaying) return;
    if (totalTicks === 0) return;
    if (isAtEnd) {
      props.onPlayToggle(false);
      return;
    }

    const id = window.setInterval(() => {
      props.onTickIndexChange(clampTickIndex(safeIndex + 1, totalTicks));
    }, props.playbackMsPerTick);

    return () => window.clearInterval(id);
  }, [
    props.isPlaying,
    props.playbackMsPerTick,
    props.onTickIndexChange,
    props.onPlayToggle,
    safeIndex,
    totalTicks,
    isAtEnd,
  ]);

  function goFirst() {
    if (totalTicks === 0) return;
    props.onTickIndexChange(0);
  }

  function goPrev() {
    if (totalTicks === 0) return;
    props.onTickIndexChange(clampTickIndex(safeIndex - 1, totalTicks));
  }

  function togglePlay() {
    if (totalTicks === 0) return;
    if (isAtEnd && !props.isPlaying) {
      props.onTickIndexChange(0);
      props.onPlayToggle(true);
      return;
    }
    props.onPlayToggle(!props.isPlaying);
  }

  function goNext() {
    if (totalTicks === 0) return;
    props.onTickIndexChange(clampTickIndex(safeIndex + 1, totalTicks));
  }

  function goLast() {
    if (totalTicks === 0) return;
    props.onTickIndexChange(totalTicks - 1);
  }

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
          Tick Playback
        </div>
        <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
          Pure replay viewer over precomputed trace
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusPill label="State" value={props.isPlaying ? "playing" : "paused"} />
        <StatusPill label="Tick" value={totalTicks > 0 ? `${safeIndex + 1}/${totalTicks}` : "(none)"} />
        <StatusPill label="Units" value={String(getSnapshotUnitCount(currentSnapshot))} />
        <StatusPill label="Hash" value={formatHashCompact(currentHash)} mono />
      </div>

      <div style={controlShellStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button style={playbackButtonStyle(totalTicks === 0 || isAtStart)} onClick={goFirst} disabled={totalTicks === 0 || isAtStart}>
            <SkipBack size={14} strokeWidth={2} />
            First
          </button>

          <button style={playbackButtonStyle(totalTicks === 0 || isAtStart)} onClick={goPrev} disabled={totalTicks === 0 || isAtStart}>
            <StepBack size={14} strokeWidth={2} />
            Prev
          </button>

          <button style={playbackButtonStyle(totalTicks === 0, true)} onClick={togglePlay} disabled={totalTicks === 0}>
            {props.isPlaying ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
            {props.isPlaying ? "Pause" : "Play"}
          </button>

          <button style={playbackButtonStyle(totalTicks === 0 || isAtEnd)} onClick={goNext} disabled={totalTicks === 0 || isAtEnd}>
            <StepForward size={14} strokeWidth={2} />
            Next
          </button>

          <button style={playbackButtonStyle(totalTicks === 0 || isAtEnd)} onClick={goLast} disabled={totalTicks === 0 || isAtEnd}>
            <SkipForward size={14} strokeWidth={2} />
            Last
          </button>

          {props.onReset ? (
            <button style={playbackButtonStyle(false)} onClick={props.onReset}>
              <RotateCcw size={14} strokeWidth={2} />
              Reset
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 150px",
            gap: 14,
            alignItems: "center",
          }}
          className="ws-responsive-playback-controls"
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Tick index
            </div>

            <Slider.Root
              value={[safeIndex]}
              min={0}
              max={Math.max(totalTicks - 1, 0)}
              step={1}
              onValueChange={(value) => {
                const next = value[0] ?? 0;
                props.onTickIndexChange(next);
              }}
              disabled={totalTicks === 0}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                width: "100%",
                height: 18,
                opacity: totalTicks === 0 ? 0.45 : 1,
              }}
            >
              <Slider.Track
                style={{
                  position: "relative",
                  flexGrow: 1,
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                }}
              >
                <Slider.Range
                  style={{
                    position: "absolute",
                    height: "100%",
                    borderRadius: 999,
                    background: "rgba(183,204,255,0.92)",
                  }}
                />
              </Slider.Track>

              <Slider.Thumb
                aria-label="Tick index"
                style={{
                  display: "block",
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "#ffffff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                  border: "1px solid rgba(0,0,0,0.10)",
                }}
              />
            </Slider.Root>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Speed
            </div>

            <Select.Root
              value={String(props.playbackMsPerTick)}
              onValueChange={(value) => props.onPlaybackMsPerTickChange?.(Number(value))}
            >
              <Select.Trigger
                aria-label="Playback speed"
                style={{
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--ws-text)",
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown size={14} strokeWidth={2} />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={6}
                  style={{
                    overflow: "hidden",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "#11161f",
                    boxShadow: "0 16px 50px rgba(0,0,0,0.35)",
                    zIndex: 1000,
                  }}
                >
                  <Select.Viewport style={{ padding: 6 }}>
                    {SPEED_OPTIONS.map((option) => (
                      <Select.Item
                        key={option.value}
                        value={String(option.value)}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ws-text)",
                          borderRadius: 10,
                          padding: "9px 10px",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
      </div>

      <div style={viewportGridStyle} className="ws-responsive-replay-grid">
        <ReplayViewport
          snapshot={currentSnapshot}
          stateHash={currentHash}
          width={props.width}
          height={props.height}
        />

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 18,
            padding: 14,
            display: "grid",
            gap: 10,
            alignContent: "start",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Frame Summary</div>
            <div style={{ fontSize: 12, color: "var(--ws-text-soft)", marginTop: 2 }}>
              Current replay frame only
            </div>
          </div>

          <SummaryRow label="Current Tick" value={currentTick ?? "(none)"} />
          <SummaryRow label="Tick Index" value={totalTicks > 0 ? safeIndex : "(none)"} />
          <SummaryRow label="Total Ticks" value={totalTicks} />
          <SummaryRow label="Playing" value={props.isPlaying ? "yes" : "no"} />
          <SummaryRow label="Playback Speed" value={`${props.playbackMsPerTick} ms`} />
          <SummaryRow label="Unit Count" value={getSnapshotUnitCount(currentSnapshot)} />
          <SummaryRow label="State Hash" value={currentHash ?? "(none)"} mono />

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              color: "var(--ws-text-soft)",
              lineHeight: 1.55,
            }}
          >
            Playback advances only the trace index. No simulation, hash generation,
            targeting, damage, or movement computation happens here.
          </div>
        </section>
      </div>
    </motion.section>
  );
}

function StatusPill(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 12,
        padding: "8px 10px",
        display: "grid",
        gap: 2,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--ws-text-soft)",
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: props.mono
            ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            : undefined,
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function SummaryRow(props: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--ws-text-soft)",
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
          fontFamily: props.mono
            ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            : undefined,
        }}
      >
        {props.value}
      </div>
    </div>
  );
}