# Verified GitHub Actions observations

These are hosted measurements, separate from the local three-application study. Sources, plans, stage logs, image IDs and output records were downloaded and audited locally.

## [GitHub run 39629666103](https://github.com/parth1056/-Build/actions/runs/39629666103)

Commit: de1acefe5a67a31d7182641226f874570a87b280. Experiment: experiment-1792598006520-78a549. Status: completed. Machine: 2 reported CPUs, 7.75 GiB RAM, Ubuntu 24.04.5 LTS.

Scenario: source-change; 3 observations per method, plus separate preparation builds.

| Method | n | Median s | Min–max s | Reduction |
|---|---:|---:|---:|---:|
| invoice: Before | 3 | 13.60 | 13.31–14.92 | 0.0% |
| invoice: After | 3 | 8.39 | 8.26–8.44 | 38.3% |

The conventional baseline is source-first with sequential checks; After uses dependency-first layers and concurrent independent checks. Both use BuildKit and identical verified package archives. Source identity matches within each comparison. These are descriptive small samples, not universal or statistically established effects.

## [GitHub run 39629666103](https://github.com/parth1056/-Build/actions/runs/39629666103)

Commit: de1acefe5a67a31d7182641226f874570a87b280. Experiment: experiment-1792598015814-822983. Status: completed. Machine: 2 reported CPUs, 7.75 GiB RAM, Ubuntu 24.04.5 LTS.

Regular CI: passed; 19.30 pipeline seconds; external cache available: false; dependency-install layer reused: false; every required check reran; release eligible: true. No controlled speedup is attributed to this single CI build.

## [GitHub run 39630612177](https://github.com/parth1056/-Build/actions/runs/39630612177)

Commit: 73bf8ac93d0339e68dfa6eddcc4bd6fdd8aca2b5. Experiment: experiment-1792598386923-2b60e5. Status: completed. Machine: 2 reported CPUs, 7.75 GiB RAM, Ubuntu 24.04.5 LTS.

Regular CI: passed; 18.74 pipeline seconds; external cache available: true; dependency-install layer reused: true; every required check reran; release eligible: true. No controlled speedup is attributed to this single CI build.

## How to interpret this

Pipeline time covers workspace build through exact-image verification. Runner setup, initial input downloads, seed builds, cleanup and Actions cache/artifact transfer are excluded and must not be silently included in a speedup claim. Regular CI includes its BuildKit cache import/export within the build; a controlled warm comparison does not include cross-job cache transport. Full job durations are visible on GitHub. A cache hit proves reuse, not necessarily net time saved after transport.

The optimization addresses repeated installation and independent validation work. It cannot remove required compilation/serialization, sequential bottlenecks or queue delays. An already optimized starting point has no new technique to gain from. CPU contention and cache transfer can offset savings.
