# What we are building, and why it is defensible

## Assessment and recovered context

This is the batch-wise DevOps **Lab CA mini project**, not the Theory IA. The user-provided notice specifies a maximum of three students, a title submission date of 16 September 2026 and implementation between 30 September and 3 October 2026. Those are the dates in the notice, not a newly verified deadline or evidence that an extension exists. The required final submission medium remains unconfirmed.

The supplied class workbook places Parth Dhande and Pushkar Rai under Batch 3, with the title **Reducing CI Pipeline Build Time Using Dependency Caching, Parallel Stages and Docker BuildKit**. The local workbook contains 110 nonempty project-title entries. The live Google sheet could not be retrieved during this review; peer comparisons refer to the supplied export, not a claim about its current online state.

Batch 3 peers include container deployment/scaling, an image-processing CI/CD pipeline, Kubernetes version management, resilience testing using Toxiproxy, and API health monitoring. Across batches, examples range from log rotation and backup scripts through GitOps, supply-chain security and self-hosted platforms. A Batch 6 title already covers parallel tests/build caching. Therefore this project cannot honestly claim topic uniqueness. Its distinction is a transparent experiment, executable demonstration and explicit negative controls, rather than a longer tool list. Titles indicate intended scope, not proof of peers' implementation quality.

The LMS Word file is SecureNotes, a completed report by Siddhant Shukla and Siddhant Raut about security gates and AI-assisted remediation. It shows an example of another group's depth and presentation. It does not establish that our assignment requires SonarCloud, Trivy, an LLM or the same report sections.

Original attachments were re-extracted. `context/source-inventory.json` records their hashes, PDF page count and the verified pre-redesign backup. `context/peer-topics.json` retains every extracted title and its sheet row. Statements in the exported ChatGPT conversation, including optimistic speedup estimates and a mistaken uniqueness claim, are historical suggestions, not facts or required targets.

## Problem and intended contribution

Software teams wait for CI to report whether a change can be packaged safely. Some of that waiting is useful validation; some is repeated dependency work caused by broad cache invalidation; some comes from independent checks being scheduled sequentially. Faster is useful only if the pipeline still checks the changed source and the resulting package.

We implement and evaluate two established engineering techniques: dependency-aware Docker layer ordering and concurrent scheduling of independent checks. Our contribution is their working application, controlled comparison, source/image/output traceability and a live console that exposes the actual execution. We are not inventing a new caching algorithm or claiming an automatic optimizer for arbitrary repositories.

Research questions:

1. Does moving installation ahead of source copying avoid unnecessary reinstalls after a source-only change?
2. Does overlapping independent checks reduce end-to-end waiting after including process/container overhead?
3. Do the answers differ across workloads, cold caches, dependency changes and an already optimized starting pipeline?
4. Are broken changes blocked, and does the packaged output demonstrably match the checked source?

## The demonstration is the experiment

The browser console starts real runner processes. Those invoke Docker BuildKit and validation containers. Stage status comes from command start/exit events; raw output and elapsed times are retained. It is not an animation with prefilled numbers.

An audience sees executable before/after plans, required checks, installation-layer reuse or execution, overlapping check intervals, exact-image verification, completed-run results and negative results. They can open raw logs and JSON. No taskboard interaction is needed.

The console and CLI invoke the same runner. This avoids a polished browser demonstration running a different process from the one measured. The service binds to loopback, runs one experiment at a time, validates all selections and does not accept arbitrary shell commands or repository paths.

The console plans are abbreviated for readability; the captured source contains the actual executable Dockerfile. Stage links expose actual command logs. A running command's completed log is available after it exits; console-started experiments also stream current output. Changing form selections does not change a running snapshot.

## Workloads and why they differ

| Workload | Useful application behavior | Required independent checks | Main reason to include it |
| --- | --- | --- | --- |
| Invoice engine | HTTP API computes integer-cent totals, discount and discounted tax; rejects malformed inputs | ESLint, TypeScript checking, invoice tests including 625 boundary combinations | Real runtime/development dependencies and toolchain work |
| Document publisher | Produces gzip and Brotli release assets and a content manifest | JSON/schema/hash validation, gzip round-trip, Brotli round-trip | Batch processing with independent data checks and unavoidable publishing/verification work |
| Release manifest validator | Rejects unsafe paths, duplicate files, invalid versions/checksums | Syntax, release contract, unit tests | Tiny dependency-free workload; less opportunity and proportionally more orchestration overhead |

The publisher corpus is **synthetic**, not customer or production data: 192 deterministic JSON documents, 13,183,268 uncompressed bytes, each containing 1,024 hash-like sections. Input hashes and files are retained. Fixed corpus size was chosen as a manageable reproducible batch, not calibrated until a speedup appeared. There are no sleep statements or deliberate timing delays in the workloads. Readiness polling in the invoice smoke check only waits for a real server to become available.

All three validate locked package metadata using npm ci. Two have no external dependencies; that is disclosed rather than manufacturing additional dependencies to inflate cache benefit. The common installation step itself has overhead. A future workload-specific pipeline could omit unnecessary package-manager invocation for dependency-free apps, which would change this experiment's common contract.

These purpose-built examples exercise distinct mechanisms. They are not a representative sample of all projects, and success across three does not establish industry-wide generalization.

The small validator checks manifest structure, path safety and checksum **format**, not the existence/content of every declared asset. Its checksum field is a schema fixture. Byte integrity is exercised by the publisher workload. Passing the small validator must not be described as an audit of an arbitrary real release package.

## What changes and what stays fixed

| Configuration | Installation layer placement | Check scheduling |
| --- | --- | --- |
| Before | COPY all source, then npm ci | Sequential |
| Cache only | COPY package manifests, npm ci, then source | Sequential |
| Parallel only | COPY all source, then npm ci | Concurrent |
| After | COPY package manifests, npm ci, then source | Concurrent |

The conventional baseline is valid, simple and explicitly underoptimized. Source-first copying is a documented Docker cache-invalidation pitfall. It is not asserted to be the best reasonable pipeline or the industry norm. We do not forcibly disable baseline caches or inject delays: both use BuildKit and the same npm cache mount. An unchanged build can reuse layers in the baseline too. The isolated caching intervention is **dependency layer placement**, not a measured download improvement or independent npm-cache benefit.

The **already optimized control** gives Before and After the same dependency-first, concurrent executable plan. Their plan hashes must match. Any measured difference is variability, not an additional method we applied. This directly addresses the criticism that we only selected a weak baseline.

The cache-only arm is also the dependency-first sequential comparison. Comparing it with After tests the additional scheduling change starting from a sensible cached pipeline.

Within each workload/condition, source hash, pinned base, package inputs, required checks, build command, output contract and verification remain fixed. Hashes describe source snapshots, not Git commits. Snapshot generation, not the student's working source, introduces each scenario.

## Scenarios

- **Source change:** a seed establishes prior build state; a constant in `src/release.ts` or `src/release.mjs` changes while the dependency lock stays fixed. The application imports that constant; it is bundled or copied into the runtime artifact and must appear in the verified output. A changed metadata label alone is insufficient. Development trials that preceded this stronger protocol remain excluded.
- **Unchanged:** seed and measured source are identical; validation still runs in fresh containers even if the workspace image is reused.
- **Cold / cache miss:** no project seed; installation must execute and correctness must not require a cache. Shared pinned-base availability is not a claim of a completely cold computer.
- **Dependency upgrade:** Invoice engine's real Zod dependency changes from 4.1.12 to 4.6.7 with its resolved lock; installation must rerun. This applies only to the workload using that dependency.
- **Failure:** after a seed, the invoice implementation adds an incorrect extra cent to every total. The original, unchanged invoice tests must catch it. The small validator's alternative fault rejects all valid manifests; the publisher's alternative corrupts one document ID. Even with reusable dependencies, a required check must fail and prevent packaging and release eligibility. This is disclosed fault injection, not a naturally occurring bug or an intentionally incorrect test assertion.

## Run mechanics and measurement

Each observation gets a reset project-owned BuildKit cache and shared base preload. Warm conditions get a separate seed pipeline using the same configuration. The measured source is then captured and built. Configurations rotate order by repetition. Experiments are serialized via a shared lock; no caches are shared between different observations by accident.

Timing begins immediately before workspace image build and ends after validation, artifact building/copying, runtime image export/load, identity lookup and verification. It includes Docker orchestration and journal/log overhead within this interval. Source generation/staging/hashing, builder creation/reset, base preload, seed duration, run-record final serialization and cleanup are excluded. Seed durations are retained, and the console warns that total experiment time exceeds measured pipeline time.

BuildKit is capped at four CPUs and 3 GB; each check gets one CPU and 1 GB, with at most three checks concurrently. Artifact building gets one CPU and 1 GB. Runtime verification uses one CPU and a workload-appropriate memory ceiling. Limits are the same across configurations within a workload. The host has other background activity outside our control; resource ceilings do not guarantee dedicated cores or equal system load.

Both methods consume the same pre-staged tarballs, whose integrity was verified. npm installation is offline and network-disabled. This isolates local installation/layer reuse and scheduling from public-registry variability. Initial download acceleration is not measured. Base images and BuildKit are pinned by digest; the exported local base avoids registry metadata lookup during measured builds.

End-to-end elapsed time is the headline. Stage durations locate bottlenecks. Overlapping durations are never summed into a fake total. Three repetitions show median, minimum and maximum and all individual values. One-run demos are preliminary. Negative improvements, failures, preparation runs and incomplete campaigns remain visible. No unsuccessful or partial campaign receives a headline median.

## Correctness chain

1. Capture source files and SHA-256 manifest.
2. Install the lockfile-selected packages in an isolated workspace image.
3. Run every required check against that snapshot, in fresh containers (not cached passing test results).
4. Build artifacts only after required checks pass.
5. Copy those exact built artifacts into the runtime image, rather than recompile after validation.
6. Verify the exact immutable image ID: Invoice API response and invalid input; publisher's count/bytes and decompressed SHA-256 identities; release manifest validity.
7. Compare runtime source hash and changed release message with the captured source metadata.
8. Set release eligibility only after all checks succeed. Eligibility is a recorded decision, not a production deployment.

`v2/audit.mjs` rereads every captured source file, checks hashes, gate outcomes, scheduling intervals, expected cache invalidation and source comparability. Unit tests additionally exercise bad inputs, stale comparisons, missing runs and reporting failures. These checks reduce measurement mistakes; they are not a formal proof that the entire harness is defect-free.

## Scope, alternatives and limitations

- GitHub Actions is the CI platform. Push/PR workflows run optimized CI with portable BuildKit cache import/export; manual workflows run controlled comparisons. The local console executes the same coordinator. No registry publishing or production CD is claimed. The previous Jenkins setup is legacy material, excluded from new timings.
- We chose an inspectable Node coordinator within one Actions job to keep scheduling and measurements explicit and use one host per comparison. Independent stages run in parallel Docker containers, not separate GitHub jobs on different machines. Pipeline timings exclude runner queue/tool setup and Actions cache/artifact transfer; full hosted job duration remains visible separately. See GITHUB-ACTIONS.md.
- We use three fresh check containers to isolate independent commands. One long-lived container could reduce startup overhead, but would be a separate execution design requiring fresh measurements.
- We measure wall-clock latency, not CPU-seconds, energy, monetary cost, deployment reliability or comprehensive security.
- A cache mount is not a dependency vulnerability update mechanism. Lockfile or base updates require deliberate input changes and fresh checks.
- Fewer seconds are useful, but a small difference within a wide observed range does not justify added complexity automatically. Cache-only can be preferable on resource-constrained agents.
- No new optimization should be claimed for the tuned control. Not improving an already efficient plan is a correct boundary of the proposed techniques.
- New-machine setup requires initial internet access and Linux x64 Docker with containerd image store. Canonical lockfiles, integrity hashes and toolchain pins are portable repository inputs; package archives and generated OCI layout are prepared under .lab, not committed. The workflow records actual machine resources; a CPU quota is a ceiling, not dedicated host capacity.
- A controlled stop is requested between commands and cleans up the experiment's resources. A forced process/engine shutdown can leave a stale lock or incomplete journal; those records cannot become a completed comparison. Recovery must verify the lock owner's process has ended before removing that lock and inspect only project-owned resources. Development failures in the retained history demonstrate this boundary. Windows atomic journal replacement retries brief file-lock contention; concurrent-reader behavior is tested.
- Regular Actions CI transports a portable BuildKit local cache with actions/cache. Controlled comparisons use reset caches and explicit seed builds instead, so unrelated prior runs cannot affect a comparison. Cache mounts are not exported; installation layers are. Cross-run transport overhead is visible in job duration and can outweigh pipeline savings.
- Additional experiments could use larger repeat counts, fresh independent machines, constrained CPUs, network-download scenarios and measured CPU/resource costs. These are extensions, not completed claims.

## References used for mechanisms

- Docker, [Optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/): supports dependency-first copying and cache mounts; its source-first example explains the baseline's invalidation problem.
- Docker, [Build cache invalidation](https://docs.docker.com/build/cache/invalidation/): supports reasoning about changed COPY inputs and rebuilding subsequent work.
- Docker, [BuildKit](https://docs.docker.com/build/buildkit/): builder/caching background. BuildKit is common to all configurations here, not an isolated intervention.
- npm, [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/): locked installation behavior.

Consulted 21 October 2026. These sources justify mechanisms; measured performance comes only from our own run records.
