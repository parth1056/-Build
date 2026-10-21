# Recorded results — Pipeline Lab

Generated from retained run records. A displayed value is a measurement, not a target. The old taskboard results are not pooled here.

Both methods receive identical local package inputs; npm installation has no network access. Timing covers workspace build through exact-image verification, excluding setup, seed preparation and cleanup. Source-first is an explicitly underoptimized baseline; the cache-only arm and tuned control test stronger starting points.

## experiment-1792574104341-7cb5db

Platform: **local**. Status: **aborted**. Workloads: invoice. Starting pipeline: conventional. Scenario: source-change. Repetitions: 1.

Excluded from performance conclusions. runtime is not defined

## experiment-1792574288567-950243

Platform: **local**. Status: **aborted**. Workloads: invoice, publisher, lean. Starting pipeline: conventional. Scenario: source-change. Repetitions: 3.

Excluded from performance conclusions. Windows EPERM during atomic journal replacement while console was reading; process exited. Diagnostic only; excluded from completed comparisons.

## experiment-1792574880156-10204d

Platform: **local**. Status: **aborted**. Workloads: invoice, publisher, lean. Starting pipeline: conventional. Scenario: source-change. Repetitions: 3.

Excluded from performance conclusions. Preparation build failed; no measured comparison attempted

## experiment-1792575246980-da6adb

Platform: **local**. Status: **completed**. Workloads: invoice, publisher, lean. Starting pipeline: conventional. Scenario: source-change. Repetitions: 3.

### Invoice engine

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 35.31 | 33.20–35.70 | 0.0% |
| After | 3 | 29.65 | 28.59–29.87 | 16.0% |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The combined method saved about 5.66 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

### Document publisher

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 30.80 | 29.63–32.18 | 0.0% |
| After | 3 | 28.30 | 27.78–30.44 | 8.1% |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The combined method saved about 2.50 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

### Release manifest validator

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 25.56 | 24.40–26.82 | 0.0% |
| After | 3 | 23.06 | 22.16–23.21 | 9.8% |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The combined method saved about 2.50 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

## experiment-1792576777871-ca9361

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: source-change. Repetitions: 3.

### Invoice engine

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 33.36 | 33.25–36.09 | 0.0% |
| Cache only | 3 | 30.34 | 28.62–31.97 | 9.1% |
| Parallel only | 3 | 29.88 | 29.35–31.52 | 10.4% |
| After | 3 | 26.60 | 25.05–27.47 | 20.3% |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The combined method saved about 6.77 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

## experiment-1792577810571-6d9e9b

Platform: **local**. Status: **completed**. Workloads: lean. Starting pipeline: tuned. Scenario: source-change. Repetitions: 3.

### Release manifest validator

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 21.11 | 19.43–22.18 | not comparable |
| After | 3 | 22.72 | 21.99–26.09 | not comparable |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The executable before/after plans are identical. Any timing difference is variability, not an additional optimization effect.

## experiment-1792578206449-1c74c0

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: failure. Repetitions: 1.

- failure: expected outcome verified; pipeline failed, release blocked, packaging not attempted.

## experiment-1792578287435-0fb2dd

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: cache-miss. Repetitions: 1.

- cache-miss: expected outcome verified; pipeline passed, release eligible, packaging attempted.

## experiment-1792578351369-dcef83

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: dependency-change. Repetitions: 1.

### Invoice engine

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| After | 1 | 39.27 | 39.27–39.27 | not comparable |

Single-observation scenario check; preliminary, not a repeated performance estimate. Source hashes match.

## experiment-1792578480189-8e1a8c

Platform: **local**. Status: **completed**. Workloads: lean. Starting pipeline: conventional. Scenario: unchanged. Repetitions: 1.

### Release manifest validator

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 1 | 32.19 | 32.19–32.19 | 0.0% |
| After | 1 | 20.03 | 20.03–20.03 | 37.8% |

Single-observation scenario check; preliminary, not a repeated performance estimate. Source hashes match.

The combined method saved about 12.16 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

## experiment-1792578627195-602bb1

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: cold. Repetitions: 1.

### Invoice engine

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 1 | 44.19 | 44.19–44.19 | 0.0% |
| After | 1 | 40.44 | 40.44–40.44 | 8.5% |

Single-observation scenario check; preliminary, not a repeated performance estimate. Source hashes match.

The combined method saved about 3.75 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

## experiment-1792597608170-ca028c

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: repository. Repetitions: 1.

Regular optimized CI, not a controlled before/after comparison. Cache transport and all fresh checks are retained in each run record. No reduction percentage is attributed.

- invoice: passed; 34.09 seconds; imported cache available: false; dependency install layer reused: false; release eligible: true.

## experiment-1792597670336-fe565b

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: repository. Repetitions: 1.

Regular optimized CI, not a controlled before/after comparison. Cache transport and all fresh checks are retained in each run record. No reduction percentage is attributed.

- invoice: passed; 42.35 seconds; imported cache available: true; dependency install layer reused: true; release eligible: true.

## experiment-1792598006520-78a549

Platform: **github-actions**. [GitHub run](https://github.com/parth1056/-Build/actions/runs/39629666103), commit de1acefe5a67a31d7182641226f874570a87b280. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: source-change. Repetitions: 3.

### Invoice engine

| Method | Observations | Median seconds | Min–max seconds | Reduction vs before |
| --- | ---: | ---: | --- | ---: |
| Before | 3 | 13.60 | 13.31–14.92 | 0.0% |
| After | 3 | 8.39 | 8.26–8.44 | 38.3% |

Three observations per method: descriptive local evidence, not statistical significance. Source hashes match.

The combined method saved about 5.21 seconds at the median. A cache hit or concurrent schedule does not itself establish an end-to-end benefit.

## experiment-1792598009542-8271c3

Platform: **local**. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: failure. Repetitions: 1.

- failure: expected outcome verified; pipeline failed, release blocked, packaging not attempted.

## experiment-1792598015814-822983

Platform: **github-actions**. [GitHub run](https://github.com/parth1056/-Build/actions/runs/39629666103), commit de1acefe5a67a31d7182641226f874570a87b280. Status: **completed**. Workloads: invoice. Starting pipeline: conventional. Scenario: repository. Repetitions: 1.

Regular optimized CI, not a controlled before/after comparison. Cache transport and all fresh checks are retained in each run record. No reduction percentage is attributed.

- invoice: passed; 19.30 seconds; imported cache available: false; dependency install layer reused: false; release eligible: true.

## Interpretation boundaries

The same fixed workflows are compared within each workload; apps have different validation contracts. Do not compare their raw seconds as a software-quality ranking. Independent stage intervals establish scheduling; dependency-install log markers establish reuse. The source/output audit establishes the defined correctness chain. Negative observations remain in the medians, preparation runs are separate, and incomplete experiments are excluded explicitly.

A small difference inside a broad range may not justify complexity. A tiny workload can be dominated by process/image overhead. Publisher compression and output verification are sequential work that these two techniques do not remove. Cache-only is a reasonable option when parallel startup or CPU contention offsets its potential saving.

No production CI queue, internet-download savings, cloud cost, CPU-seconds or energy were measured. The publisher corpus is deterministic and synthetic. Further work and the exact contract are in DESIGN.md.
