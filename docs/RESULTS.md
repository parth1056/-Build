# Fresh two-app results

Generated from a completed, audited study. These are observed timings on the recorded execution host, not promised improvements. Setup, base downloads/preload, source snapshots, seed builds and cleanup are outside the pipeline timer. Workspace construction through exact-image verification is inside; custom Dockerfile dependency installation can use the network.

| Application | n per method | Before median | After median | Conclusion |
|---|---:|---:|---:|---|
| Inventory Reservations API | 3 | 14.50 s (14.44 s–14.52 s) | 9.03 s (9.01 s–9.06 s) | 37.7% reduction; 5.47 s difference |
| StatusLens Dashboard | 3 | 10.89 s (10.87 s–10.91 s) | 10.96 s (10.52 s–11.01 s) | Identical plans: no new optimization attributed |

Inventory changes dependency-layer placement and check scheduling. Dashboard Before/After use the same dependency-first Dockerfile and the same three-check concurrency; differences are repeated-measurement variation. Both use the same pinned BuildKit engine. This does not isolate BuildKit versus a legacy builder. Three observations per method are descriptive, not statistical significance.

The study ran on **GitHub Actions, Ubuntu 24.04.5 LTS, 2 host CPUs and about 7.75 GiB RAM**, using source commit `75d1d0350dcd639242ef9b5f1eefce730ca38c81`. [Actual successful workflow](https://github.com/parth1056/-Build/actions/runs/39736698836). Local preflight measurements were excluded. Each repeated pair used the same changed source and produced an identical artifact-content hash across all six measured builds of that application; Docker image IDs can still differ because image metadata is separate from artifact bytes.

## Where the time changed

These are the actual representative runs matching each method's median, not separately pooled stage medians. Check-block time is first check start to last check finish, so concurrent durations are not added together. Small coordinator gaps mean components need not sum exactly to the total.

| App / method | Workspace | Check block | Artifact build | Package image | Verify image | Total |
|---|---:|---:|---:|---:|---:|---:|
| Inventory Before | 6.12 s | 5.86 s | 0.59 s | 1.54 s | 0.35 s | 14.50 s |
| Inventory After | 2.24 s | 4.31 s | 0.57 s | 1.53 s | 0.35 s | 9.03 s |
| StatusLens Before | 3.01 s | 5.07 s | 0.97 s | 1.51 s | 0.30 s | 10.89 s |
| StatusLens After | 2.93 s | 5.25 s | 0.96 s | 1.48 s | 0.31 s | 10.96 s |

Inventory's installation layer executed on all three Before measurements and was reused on all three After measurements. Its check block shortened while retaining every required gate. Build/package/verify work largely remained. These representative differences support the proposed mechanisms but are not an isolated causal estimate of each technique; no four-way ablation was performed in this fresh study.

StatusLens reused installation in all six measurements and ran the same three checks concurrently in both methods. The approximately 0.07 s median difference is variation between identical plans, not a newly applied optimization or evidence of a universal performance limit.

Independent Python verification rehashed **660 source files across all 34 pipelines** and checked plan hashes, build gates, runtime output, medians, ranges and percentages. The Node audit additionally checks evidence-file integrity, the intended fault assertion logs and deterministic demo artifact identities. The later fault-proof guard requires the named test's expected application exit code and assertion marker; it changes fault acceptance, not these recorded successful-build timings.

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
