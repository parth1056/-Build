# Build your own app from the terminal

The website keeps its three controlled examples. This separate tool accepts a **local project folder with an explicit Docker adapter**. You supply how to check, build and verify your app; Pipeline Lab runs those operations, records evidence, reuses BuildKit layers and can compare two declared build plans.

It supports different languages through containers. It does not discover a random repository's requirements or automatically rewrite its Dockerfiles. An app is supported when it fits the contract below. An HTTP server can fit by including a verification command which starts it, exercises its endpoints, prints one JSON result and exits; the tool does not provide that probe automatically.

## Try the working examples

From this repository's root, with Node 22.21.0+ within 22.x and Docker running in Linux x64/containerd mode:

```powershell
npm.cmd run custom:build -- --project custom/examples/node --trust-project
```

This builds a shipping quote calculator, runs three required checks, builds its release files, packages them in a runtime image and checks that the exact image calculates a 900-cent express quote. The terminal prints stage events and a final evidence-folder path. No website is needed. `npm install` and `lab:prepare` are unnecessary for these custom examples. The BuildKit image pin comes from the committed `v2/inputs/toolchain.json`; missing pinned base images are downloaded automatically before timing.

Run the same command again. A new builder imports the previous successful run's portable cache. The app is still checked and its final image verified; cached dependencies do not mean cached test approval. A cache hit does not guarantee a shorter total time.

To compare a source edit using both build plans:

```powershell
npm.cmd run custom:build -- --project custom/examples/node --mode compare --scenario code-change --repeats 3 --trust-project
```

There are **12 actual pipelines**: each of three repetitions seeds and measures each method. Before uses source-first installation and sequential checks; After installs from dependency manifests before copying source and runs independent checks concurrently. Each method gets its own reset-and-seed sequence. The measured revision changes the app's actual release output from `v1` to `v2`; both methods must produce that changed output. Only the six measurements enter the comparison. Orders alternate by repetition. Use `--repeats 1` for a four-pipeline preview, not a dependable performance claim.

To prove a defect is blocked:

```powershell
npm.cmd run custom:build -- --project custom/examples/node --scenario failure --trust-project
```

It first seeds a passing version, then adds a one-cent calculation bug. The proof succeeds only when a required check fails, packaging is never started and the faulty run is ineligible for release. The individual run should say `failed`; the overall campaign should say `completed` with the expected rejection verified. An infrastructure error is not accepted as this proof.

For a different language:

```powershell
npm.cmd run custom:build -- --project custom/examples/python --scenario cold --trust-project
```

This Python app validates three CSV orders and reports a 6,000-cent total. Python runs inside its pinned Docker image, so host Python is unnecessary. It has no third-party packages: its empty requirements file tests adapter portability, not substantial dependency-cache savings. Its source-change and failure scenarios are also configured. The Node example has a real locked Zod dependency and tests standard/express prices and invalid inputs. Both examples are deliberately small integration fixtures, separate from the website's three performance workloads.

On Linux replace `npm.cmd` with `npm`. Paths with spaces need quotes. Commands are run from this repository; `--project` may point to an unrelated local folder. Clone a private external app yourself using your normal Git credentials, then pass its local path. Git credentials are not forwarded to containers.

## Every CLI option

| Option | Default | Meaning |
| --- | --- | --- |
| `--project <folder>` | Required | Local app folder containing the adapter and Dockerfiles. Relative to the current terminal directory. |
| `--config <file>` | `pipeline-lab.json` | Clean relative path inside that app folder. |
| `--trust-project` | Required | You reviewed and trust the app's Dockerfiles and commands. They execute project code. |
| `--mode after` | `after` | Use the optimized workspace Dockerfile and the configured check concurrency. |
| `--mode before` | — | Use an explicitly supplied baseline Dockerfile with sequential checks. |
| `--mode compare` | — | Run both plans; never invent a baseline automatically. |
| `--scenario repository` | `repository` | One After build of current source, importing/exporting a persistent local BuildKit cache. No fixture changes. |
| `--scenario code-change` | — | Reset, seed original source, apply declared change, measure changed source per method/repetition. |
| `--scenario unchanged` | — | Reset, seed original source, measure the same source again. No change fixture needed. |
| `--scenario cold` | — | Reset per method/repetition, no seed or external cache. Pinned base preload still excluded. |
| `--scenario failure` | — | One After seed followed by an explicitly faulty changed source; checks must block packaging. |
| `--repeats 1..5` | `1` | Measured repetitions per method; repository and failure require exactly one and mode After. |
| `--help` | — | Print options without building. |

Set `CUSTOM_VERBOSE=1` in your terminal environment to stream raw Docker output as well as stage events. Logs are retained regardless. Ctrl+C requests cancellation; the current Docker command may finish before cleanup. Forced process termination can leave a stale shared lock or owned Docker resources. Confirm the recorded PID has ended before removing a stale `.lab/active.lock`; do not delete a lock belonging to a running job. Website and custom builds cannot run simultaneously in this checkout.

Successful campaigns exit zero, including verified deliberate-failure proofs. Configuration errors, aborted campaigns and unexpected app/check/verification failures exit nonzero. Slower valid After measurements are retained with a negative reduction; they are not hidden or retried until fast.

## Adapt another project

Start from one example's `pipeline-lab.json` and three Dockerfiles, then change the commands and output assertions to suit the real app. Before comparing, establish that both plans use the same source, dependencies, required checks, build command, runtime packaging and correctness expectations. Change only the optimization being studied. Checks must be independent: one must not create files another needs. Each check runs in its own fresh workspace container, so they do not share writable container files.

The phases are:

1. **Workspace:** Docker builds a named target containing the app, dependencies and test tools. The After Dockerfile should put lockfiles/install before source copying. The Before Dockerfile is optional unless you request Before/Compare. Neither Dockerfile should run checks during image construction if those checks must be rerun on every pipeline.
2. **Required checks:** command arrays run inside separate containers created from that workspace image. Before runs them sequentially; After uses up to the configured parallelism. All must pass. There are no ignored optional failures.
3. **Build artifacts:** one fresh workspace container runs `build.command`. Its exit code must be zero. The tool copies only `build.output` to a host evidence folder; the directory must contain files. The build command must itself produce everything the runtime needs, including libraries if applicable. Files written by check containers are unavailable here.
4. **Package:** the runtime Dockerfile receives **only those copied artifacts as its build context**. It cannot COPY the original project or test directory unless the build deliberately put them in the artifacts. Use a non-root runtime user where supported.
5. **Verify:** the tool resolves the loaded runtime image ID and runs `verify.command` against that exact ID. Its successful combined stdout/stderr must be one JSON object satisfying the expected keys and types. An image build merely finishing is insufficient. Release eligibility means these configured gates passed, not that an image was deployed or published.

### Adapter fields

The examples are complete JSON you can copy. All paths within a project use `/`, not `\`, and must not contain `..`. Commands are argument arrays, such as `["npm","run","build"]`; a shell string is rejected. If a shell is genuinely needed, explicitly supply `["sh","-c","..."]` and accept that project's command semantics.

| Field | Required / default | Contract |
| --- | --- | --- |
| `schema` | `1` | Adapter version. |
| `name` | Required | Starts with a lowercase letter; lowercase letters/numbers/hyphens, maximum 48 characters. Names image tags and cache namespaces. |
| `baseImage` | Required | Workspace image reference pinned with `@sha256:` and a 64-character digest. No floating `latest` base. |
| `runtimeBaseImage` | Defaults to `baseImage` | Separate pinned runtime base if needed. |
| `workspace.after` | Required | Optimized workspace Dockerfile path. |
| `workspace.before` | Optional | Explicit baseline Dockerfile path. |
| `workspace.target` | `workspace` | Docker target stage containing build and check tools. |
| `checks` | Required, 1–8 | Objects with unique `name` and a `command` array. Names cannot shadow workspace/build/package/verify. |
| `build.command` | Required | Command to create release artifacts in a fresh workspace container. |
| `build.output` | Required | Dedicated absolute container directory, such as `/app/dist`. |
| `runtime.dockerfile` | Required | Artifact-only packaging Dockerfile. |
| `verify.command` | Required | Finite command inside the final image, prints one JSON object then exits zero. The current runner combines stdout/stderr; suppress other diagnostics during a successful probe. |
| `verify.expected` | Required | Nonempty expected JSON object. Declared object keys are checked recursively; extra actual keys are allowed. Arrays/scalars require exact value/type equality. |
| `verify.changedExpected` | Required with `change` | Nonempty assertions distinct from original expectations; used for code-change and failure revisions. |
| `change` | Optional | `{file,from,to}` exact text replacement. `from` must occur exactly once. Change actual observable source/behavior and assert it, not just an unrelated label file. |
| `failure` | Optional | A second `{file,from,to}` change applied after `change`, intended to fail a required check. Needed for failure proof. |
| `dependencyStep` | Optional | Text matching the actual dependency `RUN` instruction, e.g. `npm ci`. Enables a specific CACHED-step observation. No marker means unknown, not a claimed dependency hit. |
| `exclude` | `[]` | Additional relative path prefixes omitted from the copied source. Include generated output directories such as `dist`. |
| `options.parallelism` | `3` | 1–3 concurrent check containers in After. Cannot create independence where commands depend on one another. |
| `options.timeoutSeconds` | `300` | 10–600 seconds per external command, not a whole-campaign deadline. |
| `options.cpus` | `1` | 0.25–4 CPUs per check, artifact-build and verification container. |
| `options.memory` | `1g` | 128m–4096m or 1g–4g per such container. |
| `options.network` | `none` | `none` or `default` for check/build/verify containers. Dockerfile RUN network behavior remains controlled by that Dockerfile. |

Workspace and runtime Dockerfiles must use `ARG BASE_IMAGE` before `FROM ${BASE_IMAGE}`. Subsequent stages may reference preceding aliases; separate external FROM images are unsupported in this adapter version. The runner supplies the pinned image via an OCI build context, preloads its base outside the timer and uses the existing pinned BuildKit container image. For images requiring more bases or platform-specific tooling, extend the contract explicitly instead of substituting floating images.

The custom Node example installs from the public npm registry when a dependency layer must execute. Unlike the website's prepared offline archive study, that network work is inside its workspace timing. Do not mix the custom timing with the website's controlled measurements or describe their cold conditions as identical. BuildKit local layer exports also do not promise to export cache-mount contents: the demonstrated cross-run hit is the installed-dependency layer.

## What is recorded, retained and measured

Each campaign creates `.lab/custom-evidence/custom-<timestamp>-<id>/` with:

- `experiment.json`, `SUMMARY.md`, normalized `adapter.json`, original snapshot/manifest and captured coordinator/validator source;
- per-run copied source, `source-manifest.json`, `plan.json`, `result.json` and raw stage logs;
- copied release artifacts, file-content hashes, source/plan hashes, stage start/duration/status, actual runtime output, exact image ID, expected assertions and cache evidence;
- Docker/Buildx/Node versions, engine CPU/memory, builder image pin and resource settings.

The pipeline timer begins with workspace construction and ends after final-image verification. Container orchestration, artifact copying/hash calculation, runtime export/load and repository cache import/export are inside it. Initial base pull/export/preload, source staging, seed builds, final cleanup and cache-folder promotion are outside it. Full command wall-clock time will be longer.

Controlled scenarios discard the custom builder's cache between methods/repetitions and preload pinned bases. The CLI does not prune your global Docker cache. Repository mode imports a portable layer cache from `.lab/custom-cache/<name>-<adapter-hash>/` and promotes a new cache only after the final gate passes. A broken candidate cannot overwrite the last accepted cache. Changing the normalized adapter creates another cache namespace; incompatible source/lockfile inputs still invalidate layers within a namespace. Prepared base exports live in `.lab/custom-inputs/`.

Workspace images, temporary check/build/verify containers and the custom builder are cleaned after use. Final runtime images are retained under `labca-custom/<name>:<run-id>`; failed verification images may exist for diagnosis but are explicitly ineligible. Raw custom evidence is ignored by Git and is neither imported into the website nor automatically uploaded. Review snapshots/logs before sharing them; they may contain proprietary source or command output. Retained artifacts, OCI bases, layer caches and final images consume disk space. Remove only the campaign/cache/image paths you have identified once no build is using them.

Source identity covers sorted relative file paths and content hashes, not POSIX permissions, timestamps or empty directories. The same caveat applies to artifact manifests. An adapter that relies on execute bits should set permissions explicitly inside its Dockerfile/build, or invoke its interpreter explicitly. Manifests aid provenance; they do not cryptographically prove that a malicious app executed honest logic. Runtime assertions are only as strong as the project's tests and expected behavior.

## Boundaries and honest claims

This is a trusted local build tool, not isolation for hostile uploads. Dockerfiles and commands execute code. `--trust-project` is an acknowledgement, not a security sandbox. Container memory/CPU/network settings bound selected operations but do not make untrusted builds safe. Use only projects you trust and inspect their Dockerfiles, dependency scripts and commands.

Snapshots exclude `.git`, `.lab`, `node_modules`, `.venv`, `venv`, `__pycache__`, `.env` and `.env.*`, plus declared exclusions. The app's own `.dockerignore` further controls its workspace build context; it does not redact the retained source snapshot. Other secret files are not automatically detected. Symlinks/junctions and special files are rejected. Source limits are 20,000 files, 100 MiB per file and 256 MiB total. Do not edit source while a snapshot is being copied.

Version 1 requires a Linux x64 Docker engine with containerd image storage and Docker Buildx. It has no Compose/services orchestration, database lifecycle, GPU/ARM support, secret/SSH forwarding, private-registry configuration, interactive processes, automatic web probes, arbitrary URL cloning, registry push or deployment. Apps requiring these need deliberate adapter/runtime extensions. Production server apps often need a purpose-built finite smoke-test command. An app with no useful JSON output should add a verification wrapper that tests real behavior; printing a hardcoded success object is not a meaningful correctness check.

Identical effective plans, mismatched source, incomplete measurements and failed gates do not receive an attributed percentage. A legitimate negative speedup is possible: already optimized builds, small tasks, CPU contention, Docker startup and cache transfer can outweigh saved work. A useful result may be demonstrating the limit. The three-app website and the existing GitHub Actions workflow remain their established demo/study paths; this new adapter CLI is not automatically run by that workflow. It can be invoked from a separate Actions job once its app requirements and cache transport are configured.

See [validation evidence](VALIDATION.md) for what was actually exercised, and the [full project report](../PROJECT_REPORT.md) for the original experiments and their limitations.
