import { useMemo, useState } from "react";
import type { Scenario } from "@engine/types";
import { validateScenario } from "@engine/validate";

const LS_KEY = "ws_scenario_v0_1";

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

export function ScenarioPanel(props: {
  scenario: Scenario | null;
  setScenario: (s: Scenario | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const { scenario, setScenario, error, setError } = props;
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => {
    if (!scenario) return null;
    return {
      version: scenario.version,
      dt: scenario.settings.dt,
      units: scenario.units.length,
      intervals: summarizeIntervals(scenario),
    };
  }, [scenario]);

  function setScenarioSafe(raw: unknown) {
    const validated = validateScenario(raw); // throws on fail
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
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Scenario</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Import</span>
          <input
            type="file"
            accept="application/json"
            disabled={busy}
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button onClick={onExport} disabled={!scenario || busy}>
          Export
        </button>
        <button onClick={onSave} disabled={!scenario || busy}>
          Save
        </button>
        <button onClick={onLoad} disabled={busy}>
          Load
        </button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {!scenario ? (
          <div style={{ opacity: 0.7 }}>
            No scenario loaded. Import a JSON scenario (must pass validateScenario).
          </div>
        ) : (
          <>
            <div>
              <b>version</b>: {summary!.version}
            </div>
            <div>
              <b>dt</b>: {summary!.dt}
            </div>
            <div>
              <b>unit count</b>: {summary!.units}
            </div>
            <div>
              <b>attackIntervalSec</b>: {summary!.intervals}
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Gate: Import/Load always runs validateScenario() and FAILs hard (no auto-fix).
            </div>
          </>
        )}

        {error ? (
          <div style={{ marginTop: 6, padding: 10, background: "#2a0f0f", border: "1px solid #7f1d1d", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}