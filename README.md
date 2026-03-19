# **ARENA War Simulation**

> **Deterministic Simulation Infrastructure (M1 Baseline)**
> 

Deterministic combat simulation baseline.

Part of the **ARENA project**, building:

```
Deterministic Simulation Infrastructure
→ Experimentation Platform
→ Decision System
```

---

## **⚡ Overview**

This repository implements:

> **M1 — Deterministic Simulation Baseline**
> 

The system guarantees:

- ⏱️ Fixed timestep execution (dt = 0.1 | 0.2)
- 🔢 Deterministic ordering (unit.id ASC)
- 🎯 Deterministic targeting (nearest + id tie-break)
- 💥 Deterministic damage resolution (pending damage model)
- 🔁 Reproducible outputs for identical inputs
- 📏 Explicit numeric policy (round-half-up)
- ✅ Strict scenario validation

> This is
> 
> 
> **not a game prototype**
> 

> This is the
> 
> 
> **foundation of deterministic simulation infrastructure**
> 

---

## **🧱 System Structure**

```
arena-war-sim/
├── engine/        # deterministic simulation core
├── scenarios/     # scenario inputs (JSON)
├── reports/       # sample outputs
├── ui/            # React + Vite visualization
└── README.md
```

### **engine/**

Core execution layer:

- sim.ts → tick loop, combat resolution
- determinism.ts → ordering, rounding, targeting rules
- types.ts → schema contracts
- validate.ts → scenario validation

---

### **scenarios/**

Predefined inputs:

- smoke_1v1
- hog64_vs_dragon12
- interval_barbarian

All scenarios:

- must be validatable
- must follow strict schema
- must produce deterministic results

---

### **reports/**

- m1_run_summary.json

Represents:

> deterministic simulation output artifact
> 

---

### **ui/**

- React + Vite
- direct engine integration via @engine
- minimal visualization:
    - HP bars
    - targeting lines
    - scenario selector
    - result panel

---

## **🔒 Determinism Contract (M1)**

Determinism is enforced at multiple layers:

### **Execution**

- fixed timestep loop
- no randomness (seed reserved for future)

### **Ordering**

- all iteration sorted by unit.id ASC

### **Targeting**

- nearest distance (dist²)
- tie → smallest id

### **Damage**

- pending damage aggregation
- applied in deterministic order

### **Numeric Policy**

- round-half-up
- explicit precision control

---

## **🚀 How to Run**

### **UI**

```
cd ui
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

### **Test**

```
cd ui
npm run test
```

Includes:

- determinism smoke tests

---

### **Build**

```
cd ui
npm run build
```

---

## **📦 Example Scenario**

```
{
  "version": "0.1",
  "name": "smoke_1v1",
  "settings": {
    "dt": 0.1,
    "seed": 42,
    "targetingDefault": "NEAREST"
  },
  "units": [...]
}
```

Running the same scenario will **always produce identical**:

- winnerTeam
- timeToFinishSec
- survivorIds
- attackCount

---

## **⚠️ Current Limitations**

This is **M1 only**.

Not implemented yet:

- state hashing (M2)
- divergence detection
- replay event log
- reproducible bundle
- experiment system
- batch simulation
- heatmap / diff / analytics

---

## **🔜 Next Milestone**

### **M2 — State Hashing + Divergence Detection**

Planned:

- full-state hashing per tick
- per-system hashing
- first divergence detection
- debug infrastructure layer

> M2 upgrades the system into:
> 

```
Debuggable Deterministic Infrastructure
```

---

## **🧭 Project Evolution**

```
Phase 1 → Deterministic Engine + Debug Infrastructure
Phase 2 → Experimentation Infrastructure
Phase 3 → Strategy Lifecycle Platform
```

Final objective:

```
Reproducible Simulation
→ Reproducible Experiments
→ Decision System
```

---

## **🧠 Philosophy**

- determinism is a **contract**, not a feature
- reproducibility > visual polish
- debugging surface > raw performance
- infrastructure first, features later

---

## **📌 Status**

- ✅ M1 implemented
- ✅ baseline validated
- 🚧 ready for M2