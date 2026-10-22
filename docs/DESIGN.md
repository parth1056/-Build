# Fresh two-app design and demonstration

This branch studies where the approved techniques help and where they are already in place. It contains no earlier three-app sources, generated workloads, old sample bundle or old result tables. Common execution/configuration utilities and CSS were reused deliberately; the applications, controls, workflow, UI logic, tests and measurements belong to this study.

## Problem and scope

A code change should reach a correctly checked, runnable image without unnecessarily repeating dependency preparation or serializing independent validation. Our work is an application of established techniques with an explicit experimental and correctness contract. It is not a novel cache algorithm or automatic optimization of arbitrary source code.

We chose two different useful applications rather than selecting dependency size or inserting long test loops to achieve a target percentage. Both use real current locked tools. The API needs runtime validation, routing, typing and tests; the dashboard needs React, production asset construction and status classification. Their execution is small enough for a lab but includes substantive application behavior. They are authored examples, so external validity to unrelated production systems remains limited.

The Inventory baseline is a simple maintainable pipeline: one dependency install, exact lockfile, pinned base, a package cache mount, ignored generated files, separate runtime artifacts and a non-root runtime. Its remaining weaknesses are a source-first install layer and serial checks. This represents a declared simple configuration, not a measured claim about how common that configuration is. After changes only the dependency-layer ordering and check scheduling. It does not change application logic, remove required checks or add an artificial delay to Before.

The StatusLens baseline already applies both techniques. `workspace.before` and `workspace.after` point to the same dependency-first Dockerfile, and both check concurrency values are three. Its effective plan hashes must match. We therefore show durations and ranges but attribute no optimization percentage. A better algorithm, architecture, base-image strategy or fewer orchestration steps might improve it in another study; 'already optimized' means this study's techniques are already applied sensibly.

## Application 1: Inventory Reservations API

The API exposes `/health`, `/inventory`, `/reorder` and POST `/reservations`. Availability equals on-hand stock minus reserved stock. Requests use a strict Zod schema. Positive integral quantities are bounded, missing SKUs are rejected, insufficient stock is rejected before mutation, and a repeated idempotency key returns the original reservation result without reserving twice. Reusing that key for a different request is a conflict. Returned stock lists are copied so a caller cannot alter internal state by mutating a result.

This is single-process in-memory storage. It does not claim database persistence, authentication, authorization, cross-process locking, cancellation, reservation expiry or distributed transaction safety. A restart resets the lab data. These are production extensions rather than hidden implemented features.

Nine tests cover the core stock formula, threshold boundary, idempotency, conflict, overselling, invalid quantities/fields/SKUs, mutation isolation, API contracts and status codes. Lint and TypeScript are separate required gates. The build bundles the API and Node HTTP adapter using esbuild. Only built files enter the non-root runtime image; development dependencies are not copied into it.

The measured source change raises `src/config.json`'s reorder threshold from 20 to 25. Four fixtures have available stock 5, 15, 22 and 40. Therefore the real `/reorder` endpoint changes from two matching products to three. It is an actual business-policy change, not an unrelated release-message edit. Runtime verification starts the packaged HTTP app on loopback, checks that response, creates a reservation, retries it and checks that overselling is blocked. It prints the observed JSON only after those requests succeed.

The failure fixture adds one to the available-stock formula. Existing unchanged tests must fail, and artifact build/package/verify must never start for that faulty candidate.

## Application 2: StatusLens Dashboard

This is a React application built with Vite. Four sample service observations contain latency, error rate and uptime. Zod validates data/configuration, duplicate names are rejected, and a service is degraded if either latency or error rate exceeds its configured threshold. Equality alone is not an exceedance. The page displays classifications and thresholds from the built `summary.json` dataset. It clearly labels the observations as demonstration data; it is not a live monitoring system or historical availability measurement.

Six tests cover healthy/degraded states, independent threshold exceedance, exact boundaries, configuration changes, invalid observations/configs, duplicate names and server-rendered presentation. Lint and TypeScript run independently. The build creates hashed/minified Vite assets, generates the validated status dataset and includes a small Node static server. It does not ship build tools in the runtime context. There is no needless runtime npm install for this bundled static application.

The measured change reduces the allowed error rate from 0.02 to 0.01. Payments (1.5% errors) now becomes degraded alongside Search (high latency), changing one degraded service to two. Runtime verification requests the built HTML, its referenced CSS/JS, checks that the JS consumes `/summary.json`, and asserts the served dataset's new classification. Component tests establish how that dataset is displayed. This is not a full browser accessibility or interaction test, and the smoke test is not claimed to prove every behavior of the React application.

The fault changes the classification's OR to AND. A latency-only or error-only violation would be missed; the existing tests must reject it. Before and After remain structurally identical in both successful comparison paths.

## Mechanisms and timing

BuildKit is used in both methods. Inventory Before copies source before `npm ci`, so a configuration/source edit invalidates the install layer. After copies `package.json` and its lockfile before installing and copies source afterward. Both have npm cache mounts. Reusing the installed-dependency layer avoids executing installation; reusing downloaded package data during a rerun is a different cache benefit. The marker `dependencyStep` identifies the actual installation RUN step whose `CACHED` status is recorded.

Checks run in fresh separate containers from the workspace image. They are independent read-only validations of the same source snapshot; their filesystem changes are not passed to one another or to the build container. Inventory Before runs them serially, After uses up to three workers. StatusLens uses three in both. Every started check is allowed to settle; all must pass before artifact construction. More concurrency uses more simultaneous CPU/memory and can lengthen individual checks due to contention. Lower wall-clock latency does not prove lower total resource usage.

The artifact build runs in another workspace container, its exit code must be zero, and `/app/dist` must contain files. Those files are copied and hashed. The runtime Dockerfile's context contains only those artifacts. Verification uses the loaded image's exact `sha256:` ID; a passing image build by itself is insufficient. Nonempty expected JSON keys/types/values must match actual HTTP-observed behavior. Release eligibility means these gates passed, not that anything was deployed.

Pipeline timing starts at workspace construction and ends after runtime verification. It includes checks, container commands, artifact copy/hash work, runtime image packaging/load and evidence journaling. Source snapshotting, builder creation/reset, pinned-base preparation/preload, successful seed pipelines and cleanup are excluded. Repository mode's layer-cache import/export happens inside workspace construction; promotion of an accepted cache directory happens after measurement. Dockerfile dependency downloads can occur inside timing, so network variability is a limitation of this new study. The earlier offline-input measurements are not reused or mixed with it.

Builder limits are four CPUs and 3 GiB. Each check/build/verify container has a 1 CPU/1 GiB cap. Parallel checks can collectively use up to three CPUs. A Linux x64 engine with containerd image storage is required for pinned OCI export/preload. Runtime and workspace base digests, builder digest, host resources and Docker/Buildx/Node versions are recorded. Identical per-container caps do not imply identical aggregate CPU demand between serial and concurrent scheduling.

## Comparison design and controls

For each method and repetition in a warm source-change study, discard that builder's project cache, preload pinned bases, seed the original version using that method, then measure the changed version. The measured source hashes must match across methods. Dependencies and required checks stay the same. Three observations per method give twelve pipelines per application: six seeds and six measurements. Method order alternates by repetition. The median and min/max range are descriptive; there is no significance test or claim of universal speedup.

Cold comparisons have no seeds; pinned base preparation is still excluded. Unchanged comparisons seed and rebuild the exact same source, so a source-first method may also reuse installation. Failure proofs seed a valid build then inject the defined bug. A proof passes only if a required check fails and no artifact build/package/verification follows. An infrastructure error is not accepted as evidence that the bug was correctly caught.

The full study includes cold comparisons and fault proofs for both apps, two repository cache integration builds, then the two repeated studies: 34 pipelines in eight campaigns. Development pilots are outside its manifest and performance tables. Negative reductions are retained. Invalid/incomplete/mismatched comparisons receive no attributed percentage. StatusLens has no attributed percentage regardless of direction because its plans are identical.

The portable-cache integration uses a fresh builder on each invocation. A saved local BuildKit layer cache is restored; checks and runtime verification still run. A candidate cache replaces the accepted cache only after all gates pass. GitHub Actions transports those layer directories between hosted CI runs; cache mounts themselves are not claimed to be exported by the layer-cache backend.

The final 34-pipeline dataset comes from one fresh hosted runner, identified in every record. Initial local development preflights, including the stopped local campaign, are preserved separately and excluded. This study measures the combined pipeline changes; it does not assign separate causal percentages to caching and concurrency. A future four-way ablation can evaluate their individual effects. The later fault-proof hardening requires the named test's application exit code and assertion marker; it does not change the successful build path or the recorded benchmark values. Auditing the retained historical proofs additionally verifies those real assertion logs.

## Website, CLI and Actions

The website is a local experiment console bound to loopback port 4180. Its API allowlists exactly the two demo app IDs and a small set of scenarios/sample counts. It cannot accept an arbitrary project path, command or upload. History opens retained results, not a rerun. Evidence exposes exact logs/configuration/Dockerfiles, representative common-scale timelines, all seeds/measurements/proofs and runtime JSON. CSV includes retained demo records. Custom CLI builds remain separate and invisible in website history.

The generic CLI accepts a trusted local folder plus explicit Docker adapter. It can run a current repository build, controlled comparisons, unchanged/cold conditions and declared failure fixtures. Commands are argument arrays, image bases are pinned, source paths are bounded, and symlinks/junctions are rejected. Source snapshots omit common generated directories and `.env` files but do not detect all secrets. It is not a security sandbox for malicious Dockerfiles, a Compose/database orchestrator, automatic optimizer or URL-cloning service. See the custom guide for every field and limitation.

GitHub Actions runs coordinator tests, ordinary optimized repository builds and intended-assertion fault proofs for both apps. It restores portable caches and uploads source/commands/results. This demonstrates actual CI, distinct from the controlled study; do not compare a local Before against a hosted After. Workflow setup, cache transport and artifact upload add costs outside the pipeline timer. Concurrent app checks run as containers within the same job and share the runner's resources. Manual workflow starts on the new branch, or an explicit `[study]` commit, additionally run the entire fresh study. Its dedicated job can publish audited results only back to this branch; ordinary pull-request builds receive read-only repository permissions. No Jenkins is used.

## Demonstration and questioning

Start the console, state the problem, select Inventory, explain its Before/After Dockerfile ordering and check scheduling, then run a preview. Explain all four pipelines before the audience sees the seeds. Inspect the exact installation log and timeline, then show the changed reorder threshold and HTTP-observed output. Present repeated saved evidence with ranges. Run the deliberate fault and show failed tests plus absent packaging.

Switch to StatusLens. Explain its existing good practices and identical effective plans. Show the changed status policy is genuinely delivered but that we claim no new optimization. Demonstrate its actual React page if desired by running a retained eligible runtime image locally on a separately bound port; the build console itself is not that application. Finally show the successful GitHub Actions job and explain how custom apps use the CLI contract.

If asked why the optimized app did not improve: the selected techniques were already applied. If asked why caching does not always help: fixed build/package/verify costs, cache transfer and noise may dominate. If asked why the API is not production-ready: persistence/authentication/distributed concurrency are declared outside its lab contract. If asked what we invented: the reproducible coordinator, evidence and gates around established techniques, not caching itself. If asked whether BuildKit's standalone contribution was measured: no, both methods use it. If asked whether three samples prove significance: no. If a new live After is slower, retain it and examine the stages rather than rerunning until a favorable number appears.

Future work includes more independent machines/repetitions, full-workflow wall time and CPU/storage measurements, stronger actual-browser tests, adapting an external repository, service-dependent apps and evaluating whether remaining startup/packaging work can be reduced without weakening checks.

## Mechanism references

Checked 22 October 2026: [Docker cache optimization](https://docs.docker.com/build/cache/optimize/), [Docker build best practices](https://docs.docker.com/build/building/best-practices/), [Node release status](https://nodejs.org/en/about/previous-releases), [GitHub cache reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching). The current LTS/build practices motivate the configurations; observed speedups come only from the fresh records in this branch.
