import { useCallback, useState } from "react";
import "./App.css";

import type { Scenario, SimResult } from "@engine/types";
import { validateScenario } from "@engine/validate";
import { simulate } from "@engine/sim";

import { ScenarioPanel } from "./ScenarioPanel";
import { Controls } from "./Controls";
import { ResultPanel } from "./ResultPanel";
import { HPBars } from "./HPBars";
import { TargetLines } from "./TargetLines";

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onStart = useCallback(() => {
    try {
      if (!scenario) throw new Error("No scenario loaded");
      // Policy: always validate before simulate (even if scenario came from validateScenario already)
      const s = validateScenario(scenario);
      const r = simulate(s);
      setResult(r);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, [scenario]);

  const onReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>War Sim — M1 UI</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <ScenarioPanel
          scenario={scenario}
          setScenario={(s) => {
            setScenario(s);
            setResult(null); // scenario change invalidates result
          }}
          error={error}
          setError={setError}
        />

        <Controls onStart={onStart} onReset={onReset} isStartDisabled={!scenario} />

        <ResultPanel result={result} />
      </div>

      {scenario ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <HPBars scenario={scenario} />
          <TargetLines scenario={scenario} />
        </div>
      ) : (
        <div style={{ opacity: 0.7 }}>
          Load a scenario to render HP bars and target lines.
        </div>
      )}
    </div>
  );
}