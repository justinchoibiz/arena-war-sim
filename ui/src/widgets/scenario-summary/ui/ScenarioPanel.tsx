import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import {
  FileJson,
  Download,
  Save,
  FolderOpen,
  ShieldCheck,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import type { Scenario } from "@engine/types";
import { validateScenario } from "@engine/validate";

const LS_KEY = "ws_scenario_v0_1";

interface SampleScenarioItem {
  id: string;
  label: string;
  path: string;
}

function summarizeIntervals(s: Scenario): string {
  const m = new Map<number, number>();
  for (const u of s.units) {
    const k = u.attackIntervalSec;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const entries = Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  if (entries.length === 0) return "(none)";
  return entries.map(([sec, n]) => `${sec} × ${n} units`).join(", ");
}

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

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const summaryCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 18,
  padding: 12,
  minWidth: 0,
  display: "grid",
  gap: 5,
};

function plainButtonStyle(disabled: boolean): CSSProperties {
  return {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--ws-text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 650,
    opacity: disabled ? 0.46 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "opacity 140ms ease, border-color 140ms ease, background 140ms ease",
  };
}

const selectStyle: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--ws-text)",
  fontSize: 13,
  fontWeight: 650,
  minWidth: 240,
};

export function ScenarioPanel(props: {
  scenario: Scenario | null;
  setScenario: (s: Scenario | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const { scenario, setScenario, error, setError } = props;
  const [busy, setBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [samples, setSamples] = useState<SampleScenarioItem[]>([]);
  const [selectedSamplePath, setSelectedSamplePath] = useState("");

  const summary = useMemo(() => {
    if (!scenario) return null;
    return {
      version: scenario.version,
      name: scenario.name,
      dt: scenario.settings.dt,
      units: scenario.units.length,
      intervals: summarizeIntervals(scenario),
    };
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        const res = await fetch("/scenarios/manifest.json", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load scenario manifest: ${res.status}`);
        }

        const data = (await res.json()) as SampleScenarioItem[];
        if (!cancelled) {
          setSamples(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0) {
            setSelectedSamplePath(data[0].path);
          }
        }
      } catch {
        if (!cancelled) {
          setSamples([]);
          setSelectedSamplePath("");
        }
      }
    }

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  function setScenarioSafe(raw: unknown) {
    const validated = validateScenario(raw);
    setScenario(validated);
    setError(null);
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      setScenarioSafe(raw);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onLoadSample() {
    if (!selectedSamplePath) return;
    setSampleBusy(true);
    try {
      const res = await fetch(selectedSamplePath, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load sample scenario: ${res.status}`);
      }

      const raw = await res.json();
      setScenarioSafe(raw);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSampleBusy(false);
    }
  }

  function onExport() {
    if (!scenario) return;
    try {
      const text = JSON.stringify(scenario, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${scenario.name}.v0_1.json`;
      a.click();

      URL.revokeObjectURL(url);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  function onSave() {
    if (!scenario) return;
    try {
      const text = JSON.stringify(scenario, null, 2);
      localStorage.setItem(LS_KEY, text);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  function onLoad() {
    setBusy(true);
    try {
      const text = localStorage.getItem(LS_KEY);
      if (!text) throw new Error(`No scenario in LocalStorage: key=${LS_KEY}`);
      const raw = JSON.parse(text);
      setScenarioSafe(raw);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
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
          Scenario Summary
        </div>
        <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
          Import, sample-load, persist, and validate before execution
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <div style={actionRowStyle}>
        <label
          style={{
            ...plainButtonStyle(busy),
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          <FileJson size={15} strokeWidth={2} />
          Import
          <input
            type="file"
            accept="application/json"
            disabled={busy}
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />
        </label>

        <button
          style={plainButtonStyle(!scenario || busy)}
          onClick={onExport}
          disabled={!scenario || busy}
        >
          <Download size={15} strokeWidth={2} />
          Export
        </button>

        <button
          style={plainButtonStyle(!scenario || busy)}
          onClick={onSave}
          disabled={!scenario || busy}
        >
          <Save size={15} strokeWidth={2} />
          Save
        </button>

        <button
          style={plainButtonStyle(busy)}
          onClick={onLoad}
          disabled={busy}
        >
          <FolderOpen size={15} strokeWidth={2} />
          Load
        </button>
      </div>

      <div
        style={{
          ...summaryCardStyle,
          gap: 10,
          background: "rgba(255,255,255,0.018)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "var(--ws-text-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          <FlaskConical size={14} strokeWidth={2} />
          Quick Sample Load
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedSamplePath}
            onChange={(e) => setSelectedSamplePath(e.target.value)}
            disabled={sampleBusy || samples.length === 0}
            style={selectStyle}
          >
            {samples.length === 0 ? (
              <option value="">No sample manifest found</option>
            ) : (
              samples.map((sample) => (
                <option key={sample.id} value={sample.path}>
                  {sample.label}
                </option>
              ))
            )}
          </select>

          <button
            style={plainButtonStyle(sampleBusy || !selectedSamplePath)}
            onClick={onLoadSample}
            disabled={sampleBusy || !selectedSamplePath}
          >
            <FolderOpen size={15} strokeWidth={2} />
            Load Sample
          </button>
        </div>

        <div style={{ fontSize: 12, color: "var(--ws-text-soft)", lineHeight: 1.5 }}>
          Public sample scenarios are served from <code className="ws-mono">/public/scenarios</code> so visitors can try the app immediately without preparing their own JSON first.
        </div>
      </div>

      {!scenario ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 18,
            padding: 14,
            fontSize: 14,
            color: "var(--ws-text-soft)",
            lineHeight: 1.55,
          }}
        >
          No scenario loaded. Import, load from local storage, or use a public sample scenario. Validation always runs before the scenario enters the app state.
        </div>
      ) : (
        <div style={summaryGridStyle} className="ws-responsive-metric-grid">
          <div style={summaryCardStyle}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Scenario Name
            </div>
            <div style={{ fontSize: 15, fontWeight: 680, lineHeight: 1.45 }}>
              {summary?.name}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Version
            </div>
            <div style={{ fontSize: 15, fontWeight: 680 }}>
              {summary?.version}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              dt
            </div>
            <div style={{ fontSize: 15, fontWeight: 680 }}>
              {summary?.dt}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Unit Count
            </div>
            <div style={{ fontSize: 15, fontWeight: 680 }}>
              {summary?.units}
            </div>
          </div>

          <div style={{ ...summaryCardStyle, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: "var(--ws-text-soft)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              attackIntervalSec
            </div>
            <div style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.55 }}>
              {summary?.intervals}
            </div>
          </div>

          <div
            style={{
              ...summaryCardStyle,
              gridColumn: "1 / -1",
              background: "rgba(110,219,160,0.07)",
              border: "1px solid rgba(110,219,160,0.16)",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgb(192,241,214)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <ShieldCheck size={14} strokeWidth={2} />
              Validation Gate
            </div>
            <div style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.55 }}>
              Import, local load, and sample load all pass through <code className="ws-mono">validateScenario()</code>.
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {error ? (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{
              border: "1px solid rgba(255,106,106,0.22)",
              background: "rgba(255,92,92,0.07)",
              borderRadius: 18,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
              <AlertCircle size={15} strokeWidth={2} />
              Error
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--ws-text)",
              }}
            >
              {error}
            </pre>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}