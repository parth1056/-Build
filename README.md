# -Build

**Reducing CI Pipeline Build Time Using Dependency Caching, Parallel Stages and Docker BuildKit**

## Documentation

- [System design and demonstration](docs/DESIGN.md) — application behaviour, pipeline mechanisms, controls and limitations.
- [Measured results](docs/RESULTS.md) — verified timings and interpretations, with links to all campaign records.
- [Custom-project CLI reference](custom/README.md) — adapter requirements and supported options.

## Applications

| Application | Actual functionality | Starting pipeline |
|---|---|---|
| Inventory Reservations API | Validates stock reservations, prevents overselling and repeated-request double counting, exposes low-stock products. TypeScript, Hono and Zod. | Simple source-first dependency layer and sequential lint/type/test checks. Other sensible practices are already present. |
| StatusLens Dashboard | React dashboard classifying service observations using configurable latency/error limits. Vite production assets and generated status data. | Dependency-first layers, package cache mount, concurrent checks, bounded build context and minimal runtime artifacts already present. Before/After plans are identical. |

These are realistic authored lab applications, not sampled production repositories. There are no artificial waits, repeated benchmark loops or dependencies added solely to inflate savings. Optimization refers to their **build pipelines**, not faster API responses or browser rendering. The control is well configured for this scope, not a claim that no future optimization anywhere is possible.

## Implemented and measured

Both app sources, tests, exact lockfiles and build adapters are committed. The project includes the Docker/BuildKit coordinator, required correctness gates, exact-image HTTP verification, a local comparison website, standalone app launch command, custom-project CLI, GitHub Actions CI, full-study automation and retained raw evidence. The interface groups repeated experiments into **Sample 1, Sample 2 and Sample 3** panels rather than listing twelve builds together.

| Recorded condition | Before | After | Meaning |
|---|---:|---:|---|
| Inventory changed source, median of 3 | 14.50 s | 9.03 s | **37.7% reduction**, 5.47 s saved |
| Inventory cold, one pair | 21.46 s | 18.46 s | 13.94% reduction in this preview |
| StatusLens changed source, median of 3 | 10.89 s | 10.96 s | Identical plans; no new optimization attributed |

The [34-pipeline study](evidence/study.json) ran on one GitHub Actions host on **22 October 2026**, using source commit `75d1d0350dcd639242ef9b5f1eefce730ca38c81`. [Actual study run](https://github.com/parth1056/-Build/actions/runs/39736698836). Later report and interface updates do not relabel those measurements as new builds. Three observations are descriptive; no universal speedup, separate BuildKit contribution, or cost/energy reduction is claimed.

Inventory changes dependency-layer ordering and check scheduling together. Both methods already use BuildKit and an npm download-cache mount. The runner does not automatically discover an app's best configuration. StatusLens is a deliberately supplied identical-plan control, not proof of global optimality. No completed external-project benchmark is claimed in the formal study.

Repository: [github.com/parth1056/-Build](https://github.com/parth1056/-Build).

## Start after cloning

This is a private repo; teammates need collaborator access. With Git, Node 24 LTS (host Node 22.21+ also runs the console) and Docker Desktop installed:

```powershell
git clone https://github.com/parth1056/-Build.git build-time-lab
cd build-time-lab
npm.cmd test
npm.cmd run demo
```

Open **http://127.0.0.1:4180**. Viewing committed results needs only Node. For new builds, start Docker Desktop with a Linux x64 engine, Buildx and **Use containerd for pulling and storing images** enabled. Docker must have enough memory for a 3 GiB builder plus up to three 1 GiB check containers and its own overhead. Initial base/dependency downloads need internet. No root `npm install` is needed: application sources, locks and recorded evidence are included. On Linux use `npm` instead of `npm.cmd`.

The first build downloads pinned images/dependencies and may take longer. The runner pulls/prepares bases before its pipeline timer; dependency operations in the app Dockerfile are inside it. Keep the terminal running. Ctrl+C requests cancellation and cleanup if a web experiment is active.

## Run just the two sample applications

From the project folder, run:

```powershell
npm.cmd run samples
```

This installs each app's locked dependencies, builds its current source normally and starts both apps. You need Node and internet for dependency installation; Docker and the pipeline console are unnecessary. It does not run a timing comparison or change saved study results. Every launch rebuilds current source; these startup durations are not benchmark evidence.

- **http://127.0.0.1:4301/inventory** — Inventory API: lists products and stock/reservations as JSON. This application is a backend API, so JSON is its actual interface.
- **http://127.0.0.1:4301/reorder** — products with available stock below the configured reorder threshold.
- **http://127.0.0.1:4302** — StatusLens: the actual React dashboard with four service observations and their health classifications. These are sample observations, not live monitoring.

To demonstrate reserving two USB-C cables, run this in a second PowerShell terminal:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4301/reservations -ContentType 'application/json' -Body '{"sku":"USB-C","quantity":2,"key":"demo-1"}'
```

Refresh `/inventory`: USB-C reserved stock increases from 7 to 9, leaving 3 available. Repeat the exact command: the same result returns without reserving another two cables. Change the quantity to 4 **and use a new key** (`demo-2`): the API rejects it because only 3 remain. Reusing a key with a different quantity is also rejected, as a conflicting retry. Stop with **Ctrl+C** in the launcher terminal; both servers stop. Inventory is in memory and resets on restart. Ports 4301/4302 must be free.

These are the same original app sources used as build samples. The experiment separately modifies copied configuration to measure changed-source rebuilds; running these apps directly does not apply that experiment's threshold changes. Their app code and historical evidence remain untouched by this launcher.

## Demonstrate

Choose **Inventory Reservations API → Compare builds**. The default is one warm source-change observation per method: four actual pipelines including separate seeds. Open **See how the builds ran** to inspect dependency reuse, overlapping checks, the exact Dockerfiles, original/changed configuration, raw logs and observed runtime output. One pair is a preview. Choose three observations for a longer comparison.

The API change raises the reorder threshold from 20 to 25. Its built HTTP endpoint must report three low-stock products instead of two. Tests also exercise real reservations and retries. **Test a broken change** injects an incorrect available-stock calculation; required checks must reject it before packaging.

Choose **StatusLens Dashboard** to show the already-optimized control. Its error-rate threshold changes from 2% to 1%, causing its built status data to flag two services instead of one. Both plans already use the same caching and check concurrency. The UI reports **No new optimization**, even if one set of measurements happens to be quicker. Its injected fault incorrectly requires both latency and error thresholds to be exceeded; tests must catch that.

More settings select one/three observations, source change, unchanged source or cold project cache. Open a Sample panel to inspect its own preparation and measured builds. One warm observation uses four pipelines; three use twelve. Seeds create each method's independent cache and are excluded from the displayed medians. Cold runs have no seeds and no prior project cache, although pinned base preparation remains outside timing. Unchanged mode is available, but has no recorded formal comparison in this snapshot.

Saved-history selection does not launch builds and is independent of the next-build app selector. Stage links open real logs; the CSV exports retained demo observations, including seeds/fault proofs. The website has no arbitrary-app path, upload or custom-command input.

Read [design, justification and faculty questions](docs/DESIGN.md), [results](docs/RESULTS.md), [custom CLI instructions](custom/README.md), and the [study manifest](evidence/study.json). The committed evidence is historical, labelled by platform and source commit; new builds use your own machine and may differ.

## Other apps: CLI only

```powershell
npm.cmd run custom:build -- --project "C:/path/to/your-app" --trust-project
```

The app must provide an explicit `pipeline-lab.json` adapter and Dockerfiles. Both included apps provide complete examples. The runner is language-independent through Docker; it does not automatically discover every app's requirements. It verifies the exact final image and retains separate custom results under `.lab/custom-evidence/`. Custom CLI results do not appear in the demo website.

## Reproduce the complete study

```powershell
npm.cmd run study
node scripts/export-evidence.mjs
npm.cmd run audit
```

The study executes 34 real pipelines: cold comparisons and fault proofs for both apps, two repository-mode cache checks, and three warm observations per method for each app. It keeps every declared case and stops on unexpected failures. Export refuses an incomplete study, audits its evidence and writes new results; the formal study is kept as one dataset. Reproduction overwrites the exported study snapshot with your new completed study, so retain a commit/copy if you want both. Local campaign records are retained independently of the exported study.

## GitHub Actions

The workflow runs the coordinator tests and a real optimized build for **both apps**, restores/saves portable BuildKit layers and retains exact-image verification evidence. It also checks both fault fixtures using explicit expected assertions, so an unrelated Docker failure cannot pass as a successful bug rejection. This is ordinary CI, distinct from the controlled before/after study. Checks rerun on every candidate. GitHub cache transport and runner setup add workflow time outside the pipeline measurement. Production deployment is outside the project scope.

The controlled study was executed on one GitHub Actions runner. **Actions → -Build CI → Run workflow → select main** runs CI plus a complete new study and publishes audited evidence back to `main`. A source commit whose message contains `[study]` also requests that full study. Ordinary pushes run CI only. Publishing study results requires the study job's repository-scoped write token; it targets only `main` and uses a non-forced push. Local reproduction commands above remain available.

## Folders

- `apps/`: both real applications, tests, exact dependency locks, Dockerfiles and adapters.
- `engine/`: shared Docker runner, configuration validator, utilities and pinned toolchain.
- `custom/`: generic trusted-project CLI and its guide.
- `ui/`, `server.mjs`, `demo.mjs`: local console and its registered sample applications.
- `scripts/`: controlled study, CI, audit and export tools.
- `tests/`: coordinator/adapter/control tests.
- `docs/`, `evidence/`: system design, measured results and raw study evidence.
- `.lab/`: ignored local caches, snapshots, artifacts and custom results.

## Command summary and common setup questions

| Command | What it does |
|---|---|
| `npm.cmd run demo` | Serve the comparison website at port 4180; saved results need no Docker. |
| `npm.cmd run samples` | Install/build and run the actual apps at ports 4301 and 4302. |
| `npm.cmd test` | Run the 12 coordinator/adapter tests; does not launch full app pipelines. |
| `npm.cmd run audit` | Validate the retained formal study and its evidence files. |
| `npm.cmd run custom:build -- --help` | Show trusted custom-project CLI options. |
| `npm.cmd run study` | Run the full controlled study locally; this is substantially longer than opening the website. |
| `npm.cmd run ci` | Build/verify both After apps and exercise both fault proofs, as the CI script does. |

Application lint/type/test checks run inside the Docker pipeline; a green coordinator test run alone is not a substitute. Generated `dist/`, installed `node_modules/`, local Docker images and caches are intentionally not committed: lockfiles and launch/build commands recreate them. The committed raw source/log/plan evidence is available without rebuilding.

If new builds fail, first check that Docker Desktop is running with the documented Linux/containerd settings, the required ports are free, and dependency registries are reachable. A timeout or download failure is not a valid speedup or a successfully caught application bug. Build logs and the complete record identify the failing stage. Closing the terminal stops its server; use Ctrl+C for the launchers and cooperative experiment shutdown.

The pipeline creates final images under `labca-custom/<app>:<run-id>` and keeps them for inspection. Check/build containers, temporary workspace images and the owned builder are cleaned. A failed verification image may remain but is explicitly ineligible. This is a trusted local development tool, not a hostile-code upload service.

For a local eligible image, copy its `imageTag` or `imageId` from the run record and run `docker run --rm -p 127.0.0.1:3001:3000 <image>`. StatusLens opens at `http://127.0.0.1:3001`; the API exposes `/inventory` and `/reorder` there. Stop that container after inspecting it. Hosted image IDs exist only on their ephemeral runner; build locally first to obtain a local image. Hosted artifact payloads are retained in the workflow download for its stated retention period, while source/plan/log evidence is committed independently of that expiry.
