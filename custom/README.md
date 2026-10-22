# Custom apps — terminal only

The website accepts only Inventory and StatusLens. This CLI accepts another **trusted local Docker project** with a declared adapter. It does not infer a random repository's requirements or rewrite arbitrary code automatically.

```powershell
npm.cmd run custom:build -- --project "C:/your/app" --trust-project
```

Copy an included app's `pipeline-lab.json` and Dockerfiles as a starting contract. Both new app sources and complete adapters are under `apps/`. Run from the repository root; project paths may be absolute or relative. No root npm install is needed. Node 22.21+ and a Linux x64 Docker engine with containerd storage and Buildx are required. Initial downloads need internet. Commands in another language run inside its pinned image, not on the host.

## Options

| Option | Default | Meaning |
|---|---|---|
| `--project <folder>` | required | Local project directory; clone private apps yourself first. |
| `--config <relative.json>` | `pipeline-lab.json` | Adapter inside the project. |
| `--trust-project` | required | You trust the supplied build code and dependency scripts. This is not a sandbox. |
| `--mode after`, `before`, `compare` | `after` | After/current plan, explicit baseline, or both. Before/Compare require a supplied baseline. |
| `--scenario repository` | default | After once, current source, persistent portable layer cache. |
| `--scenario code-change` | — | Reset/seed each method, apply declared change, verify changed behavior. |
| `--scenario unchanged` | — | Reset/seed, then measure the same source. |
| `--scenario cold` | — | Reset, no seeds/external cache; base preload is still outside timing. |
| `--scenario failure` | — | One After valid seed plus injected change/bug; a required check must block packaging. |
| `--repeats 1..5` | `1` | Per method; repository/failure require one and mode After. |
| `--help` | — | Print help. |

Example controlled comparison:

```powershell
npm.cmd run custom:build -- --project apps/inventory --mode compare --scenario code-change --repeats 3 --trust-project
```

The full custom CLI retains the same generic functionality on this fresh branch, but old custom sample apps/measurements were removed. Set `CUSTOM_VERBOSE=1` to stream raw Docker output. Logs are retained either way. Ctrl+C cooperatively requests stopping and cleanup after the current operation.

## Every adapter field

| Field | Contract |
|---|---|
| `schema` | `1`. |
| `name` | Lowercase letter followed by lowercase letters/numbers/hyphens; maximum 48 characters. Names caches and image tags. |
| `baseImage` | Workspace base pinned with `@sha256:` and a full digest. |
| `runtimeBaseImage` | Optional separate pinned base; defaults to workspace base. |
| `workspace.after` | Optimized/current Dockerfile, required. |
| `workspace.before` | Optional explicit baseline Dockerfile; may equal After for an identical-plan control. |
| `workspace.target` | Workspace target stage, defaults to `workspace`. |
| `checks` | 1–8 unique named required checks, each `{name,command:[...args]}`; independent and safe in separate containers. Reserved stage names are rejected. |
| `build.command` | Argument array creating the release artifacts in a fresh workspace container. |
| `build.output` | Dedicated absolute artifact directory, such as `/app/dist`; must not be empty. |
| `runtime.dockerfile` | Runtime packaging Dockerfile; receives **only** the copied artifact context. |
| `verify.command` | Finite command in the exact final image, exits zero and emits one JSON object. Combined stdout/stderr must contain no other successful diagnostic output. |
| `verify.expected` | Nonempty expected JSON object; declared object fields checked recursively, extra actual keys allowed, scalar/array types and values exact. |
| `verify.changedExpected` | Required with `change`; distinct assertions for the changed app's observable behavior. |
| `change` | `{file,from,to}` exact-once source replacement. Declare a real behavioral change. |
| `failure` | Optional second exact-once replacement, applied after `change`, intended to fail a required check. |
| `dependencyStep` | Optional text identifying the actual installation `RUN`, e.g. `npm ci`, for a specific CACHED observation. Missing marker means unknown. |
| `exclude` | Extra relative path prefixes omitted from source snapshots. |
| `options.beforeParallelism` | 1–3, default 1; use 3 for a baseline already running three independent checks concurrently. |
| `options.parallelism` | 1–3, default 3, for After. |
| `options.timeoutSeconds` | 10–600, default 300, per external command rather than whole campaign. |
| `options.cpus` | 0.25–4, default 1, per check/build/verify container. |
| `options.memory` | 128m–4096m or 1g–4g, default 1g, per such container. |
| `options.network` | `none` by default or `default` for check/build/verify. Dockerfile RUN network behavior is controlled by the Dockerfile itself. |

Dockerfiles must declare `ARG BASE_IMAGE` and use `FROM ${BASE_IMAGE}`; later stages may use preceding aliases. Extra external FROM bases need a contract extension. Paths inside the project use `/` and cannot escape with absolute paths or `..`. Commands are arrays, not implicit host shell strings. Checks' filesystem changes are discarded; the artifact command starts from a fresh workspace and must produce everything needed for runtime. Server applications need a finite smoke-test command that starts the app, tests it and exits; a forever-running server by itself will time out.

## Evidence, caches and boundaries

Results are separate under `.lab/custom-evidence/`. Each campaign records source and plan hashes, normalized adapter, coordinator source, environment, raw logs, stage times/statuses, artifact hashes, image ID and actual/expected output. The exact final image is executed before release eligibility. Hashes cover sorted paths and content, not execute bits, empty directories or timestamps. Set permissions explicitly in Dockerfiles where necessary.

Repository mode imports/exports `.lab/custom-cache/<name>-<adapter-hash>/` and promotes a candidate cache only after all gates pass. Fresh builders demonstrate transport rather than relying on a persistent daemon cache. Controlled scenarios do not import that cache. The runner cleans its own builders/workspace images/check containers, retains final runtime images and keeps source/artifact evidence. It never globally prunes the Docker engine. A shared checkout lock prevents overlapping web/custom runs.

Setup/base preparation, snapshots, seeds and cleanup are outside pipeline timing. Workspace construction through exact-image verification is inside; repository cache import/export is inside workspace timing. Generic custom Dockerfiles may download dependencies inside that timer. A layer hit does not guarantee a faster total pipeline. Identical effective plans receive no attributed percentage; slowdowns remain negative values, failed/incomplete/mismatched results are not successful comparisons.

Default exclusions are `.git`, `.lab`, `node_modules`, `.venv`, `venv`, `__pycache__`, `.env` and `.env.*`. Other secret files are not detected. `.dockerignore` affects the workspace build context but does not redact the retained snapshot. Source limits are 20,000 files, 100 MiB/file and 256 MiB total. Symlinks/junctions/special files are unsupported. Do not edit source while a snapshot is being copied, and review logs/source before sharing.

No automatic URL cloning, untrusted public uploads, Compose/database lifecycle, secret/SSH forwarding, GPU/ARM support, registry publishing or deployment is provided. A pinned image is not an exhaustive supply-chain/security guarantee, and output contracts do not prove all application behavior. Custom CLI builds are not automatically added to the demo's Actions workflow; configure an app-specific job deliberately when needed.
