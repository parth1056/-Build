# Pipeline Lab

**Reducing CI Pipeline Build Time Using Dependency Caching, Parallel Stages and Docker BuildKit**

A live experiment console that runs real Docker builds, applies explicit pipeline changes, records elapsed times and verifies the exact output image. The demonstration is the build process, not taskboard buttons.

## Start

Open Docker Desktop and wait for its Linux container engine. In PowerShell:

```powershell
cd "C:\Users\parth\Desktop\CS\Devops Lab CA"
npm.cmd run demo
```

Open **http://127.0.0.1:4180**. Viewing saved results works without Docker; starting new experiments requires it. Ctrl+C stops the console; if it started an active experiment, it requests a stop and waits for cleanup.

The machine is already prepared. The console has no external npm dependencies. On a clean machine, install Node 22.21+ in the Node 22 family and Docker Desktop with Linux x64/containerd image store; run `node v2/setup.mjs`, then `node v2/prepare.mjs`. Initial setup requires internet. The prepared `.lab` inputs must remain at their configured paths; rerun setup after relocation. Stop other heavy applications for measurements.

## GitHub Actions

The CI platform is **GitHub Actions**. The committed workflow is `.github/workflows/pipeline-lab.yml`. Pushes run optimized CI with portable BuildKit caching and fresh parallel checks. Actions → Pipeline Lab → Run workflow starts a controlled experiment; choose an application and `3` observations. The `full` suite includes contrasting workloads, four configurations, a tuned control and failure/invalidation proofs. Each completed run has a summary and downloadable raw evidence. See [the concise Actions explanation](v2/GITHUB-ACTIONS.md) for what the two jobs demonstrate and what their timers include.

Local results and GitHub-hosted results identify their origin and are never pooled. Both execute the same coordinator; independent stages run as concurrent containers inside one Actions job so they share the same host. No Jenkins service is used.

## What to show

1. Select **Invoice engine**, conventional starting pipeline and source change. The screen shows exactly what changes: dependency installation moves before source copying; independent checks run together.
2. Click **Run before / after**. This runs real pipelines, with separate seed builds to establish the cache condition. Watch stage outcomes and raw logs. One observation each is a live demonstration, not a final performance estimate.
3. Select a **completed repeated experiment** in Saved experiment. Compare medians, ranges, source identity and actual stage timelines. All runs, including preparation/failures, remain inspectable.
4. Select **Already optimized** to see an identical before/after plan: no new optimization is proposed. Use its measured control experiment to explain variation.
5. Select Invoice engine and click **Prove broken code is blocked** to inject a calculation regression into an isolated source snapshot. Its original tests must catch the extra cent and block packaging. **Prove empty cache still works** checks correctness without reusable project work.

The other workloads are **Document publisher** (real compression/verification over a disclosed synthetic corpus) and **Release manifest validator** (small dependency-free control). Try them to explain why workloads behave differently. A dependency-upgrade scenario is available for Invoice engine only.

Run four-way study performs three observations each for Before, Cache only, Parallel only and After. It is substantially longer than a quick demo. Never run experiments concurrently; a shared lock prevents this. The browser and CLI use the same runner.

## Evidence and claims

- `v2/evidence/<experiment>/experiment.json`: complete experiment, environment, observations and status.
- Each run retains captured source, SHA-256 manifest, actual Dockerfile, raw stage logs, result record, runtime image ID and observed output.
- The console exports all raw observations as CSV. `npm.cmd run lab:audit` checks recorded source hashes, scheduling, invalidation and gate behavior.
- `v2/DESIGN.md`: problem, recovered assessment context, peer comparison, baseline justification, controls, tradeoffs, limitations and official references.
- `v2/RESULTS.md`: completed results and interpretation, generated after the experiments.
- `v2/DEMO.md`: short faculty demonstration and answers to likely challenges.

The source-first baseline is explicitly underoptimized; the tuned control and cache-only arm prevent treating it as the only comparison. BuildKit and npm cache mounts are common to all methods. We measure dependency-layer reuse and scheduling, **not Internet-download savings**. Small samples are descriptive; negative results remain visible. Release eligibility means checks passed, not production deployment. Whole GitHub-job duration includes cache transfer and setup beyond the controlled pipeline timer.

## Development checks

```powershell
npm.cmd test
npm.cmd run lab:audit
```

`v2/` is the redesigned implementation. On the original machine, `context/` contains re-extracted attachment context and `backup/` preserves the previous project. Those private reference files are excluded from GitHub. Legacy timings are not pooled with this project. Source and canonical lockfile inputs are self-contained; the preparation script generates all example workloads.
