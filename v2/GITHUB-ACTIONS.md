# Running it on GitHub

Open your repository → **Actions → Pipeline Lab → Run workflow**. Choose `pilot`, `invoice`, and `3` observations for a repeated before/after comparison. Start it on `main`. GitHub runs the commands on its Linux machine; your laptop can be off. Expand the running job to see real commands and check outcomes. Open the completed run's summary for the table, then download **study-evidence** for sources, executable Dockerfiles, stage timings, CSV and raw logs.

Two jobs serve different purposes:

- **Optimized CI** runs on pushes, pull requests and manual starts. It builds Invoice engine once with dependency-first layers and concurrent checks, then verifies the exact output image. The portable BuildKit cache is restored from Actions cache and saved after success. The first run can miss; later runs can reuse layers. All lint/type/unit checks still execute in fresh containers. This job has no before/after percentage claim.
- **Controlled comparison** runs on manual starts, or a push whose commit message includes `[study]`. It compares configurations on one runner, one after another, rotating their order between observations. Warm scenarios create the preceding revision using the same configuration before each measurement. These are real seed builds representing a previous commit; their time is retained separately. It does not restore the regular CI job's cache. Different jobs may use different machines, so their times are never pooled.

For different applications select `publisher` or `lean`. `four-way` isolates Cache only, Parallel only and both. `tuned` applies no new optimization to an already tuned pipeline. `failure` changes real invoice code by one cent and expects the original tests to block packaging. `cache-miss`, `dependency-change`, `cold` and `unchanged` challenge invalidation/correctness. `full` runs all three applications, the four configurations, tuned control and scenario proofs; allow substantially more time.

## Why this execution design

GitHub Actions is the CI platform. The job invokes an inspectable Node coordinator, which schedules the three independent validation stages in parallel Docker containers on the **same runner**. They are parallel stages inside a job, rather than three separate hosted jobs. Separate hosted jobs would each reinstall/import inputs and use potentially different hardware; that would add another intervention to this controlled study. Stage start/end times and live logs prove actual overlap. Final artifact build waits for all checks.

BuildKit provides layer caching, cache mounts and portable cache export/import. Both comparison methods use BuildKit: we isolate dependency placement and scheduling, not BuildKit versus the retired legacy builder. The conventional source-first baseline is an explicit, documented cache invalidation mistake. Cache-only and the already-tuned control keep the conclusions honest about better starting points.

The normal CI job exports BuildKit layers to a local OCI cache, then `actions/cache` transports that cache between ephemeral runners. A unique key permits a new cache on each successful run; restore prefixes find a compatible prior cache. BuildKit checks inputs before reuse. Old lockfile caches are permitted as fallbacks, but do not force reuse of invalid dependency layers. The npm download cache mount itself is **not** exported; dependency installation layers are. A cold miss still installs the same integrity-verified local package archives.

## What the numbers mean

The pipeline timer starts at workspace image creation and ends after checking the exact runtime image. It includes checks, compilation/compression, packaging, export/load and verification. In regular CI it also includes BuildKit cache import/export during that build. The session timer additionally includes builder setup, seeding and cleanup. GitHub's full job duration additionally includes runner/tool setup and Actions cache/artifact transfer; judge practical CI latency there as well. Do not claim that saving 5 seconds in the pipeline saves 5 seconds across a whole GitHub job.

All generated records identify `github-actions` or `local`; GitHub records also retain repository, commit, run URL and attempt. The original desktop results remain local observations, not hosted results. A private repository's available runner CPUs can be lower than our 4-CPU builder ceiling; that ceiling is not a guarantee of four dedicated CPUs. Actual CPU/memory/OS and versions are recorded per experiment. Parallel work may be slower under contention.

Node, base image, builder image and action commit SHAs are pinned. Docker Engine is pinned to 28.0.4 in the workflow; the local engine version is recorded independently. Setup requires network access, then dependency installation and checks run without network access. No npm-download performance claim is made. Source fixtures are generated deterministically from this repository's code and canonical lockfiles. Generated documents are disclosed as synthetic.

No registry publishing or production deployment is required. Evidence artifacts expire after 14 days: download those needed for the report. Never upload `.lab`, the original chat, classmates' sheet or the legacy backup; the workflow uploads only its explicit evidence paths. Workflows have read-only repository permissions and no custom secrets.

To inspect downloaded hosted records in the local console, run `python v2/import-hosted.py <artifact.zip>`, then `node v2/audit.mjs`. The importer copies only experiment evidence, rejects unsafe paths and requires hosted provenance. Existing differing evidence is never overwritten. The console labels each experiment's platform and links back to its GitHub run; it does not pool machines into one percentage.

Mechanism references: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data), [Docker cache backends](https://docs.docker.com/build/cache/backends/), [Docker GitHub cache management](https://docs.docker.com/build/ci/github-actions/cache/). These explain mechanisms; they do not establish a performance gain for our workloads.
