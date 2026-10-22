# Fresh two-app results

Generated from a completed, audited study. These are observed timings on the recorded execution host, not promised improvements. Setup, base downloads/preload, source snapshots, seed builds and cleanup are outside the pipeline timer. Workspace construction through exact-image verification is inside; custom Dockerfile dependency installation can use the network.

| Application | n per method | Before median | After median | Conclusion |
|---|---:|---:|---:|---|
| Inventory Reservations API | 3 | 14.50 s (14.44 s–14.52 s) | 9.03 s (9.01 s–9.06 s) | 37.7% reduction; 5.47 s difference |
| StatusLens Dashboard | 3 | 10.89 s (10.87 s–10.91 s) | 10.96 s (10.52 s–11.01 s) | Identical plans: no new optimization attributed |

Inventory changes dependency-layer placement and check scheduling. Dashboard Before/After use the same dependency-first Dockerfile and the same three-check concurrency; differences are repeated-measurement variation. Both use the same pinned BuildKit engine. This does not isolate BuildKit versus a legacy builder. Three observations per method are descriptive, not statistical significance.

## Correctness and integration

- inventory cold-cache check: completed; record [custom-1792652072658-693e8b0b-6a1](../evidence/records/custom-1792652072658-693e8b0b-6a1.json).
- inventory broken-change rejection: completed; record [custom-1792652135711-a9e3c76a-5c3](../evidence/records/custom-1792652135711-a9e3c76a-5c3.json).
- dashboard cold-cache check: completed; record [custom-1792652164791-48c200df-0c6](../evidence/records/custom-1792652164791-48c200df-0c6.json).
- dashboard broken-change rejection: completed; record [custom-1792652219373-c1defa8e-f62](../evidence/records/custom-1792652219373-c1defa8e-f62.json).
- Custom CLI engine: repository build: completed; record [custom-1792652255754-cea7060e-f6d](../evidence/records/custom-1792652255754-cea7060e-f6d.json).
- Custom CLI engine: portable-cache restore: completed; record [custom-1792652278549-7bda46d5-a8c](../evidence/records/custom-1792652278549-7bda46d5-a8c.json).
- dashboard repeated changed-source study: completed; record [custom-1792652298029-e773a34e-60d](../evidence/records/custom-1792652298029-e773a34e-60d.json).
- inventory repeated changed-source study: completed; record [custom-1792652527965-fc36f74c-3d7](../evidence/records/custom-1792652527965-fc36f74c-3d7.json).

All required checks gate packaging; runtime verification executes the exact image ID over loopback HTTP. The defined behavioral assertions are not exhaustive correctness. Tests use in-memory/sample data; the API has no production database, authentication or distributed transaction support, and the dashboard is not live monitoring.

All source, plan and summary audits passed for 34 pipelines. See [study manifest](../evidence/study.json). Raw evidence is in `evidence/raw/`. The tests/packaging details and timing limits are explained in [DESIGN.md](DESIGN.md).
