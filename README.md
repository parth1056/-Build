# Pipeline Lab

**Reducing CI Pipeline Build Time Using Dependency Caching, Parallel Stages and Docker BuildKit**

A live experiment console that runs real Docker builds, applies explicit pipeline changes, records elapsed times and verifies the exact output image. The demonstration is the build process, not taskboard buttons.

**Measured on GitHub Actions:** Invoice engine's median pipeline time fell from **13.60s to 8.39s (38.3%)** across three observations per method, for a warm source-change scenario against the stated source-first/sequential baseline. This excludes setup, seeds and cache transfer. Separate local three-application results show smaller reductions and a tuned control has no new optimization to attribute. See [hosted results and limitations](v2/HOSTED-RESULTS.md) and [the actual run](https://github.com/parth1056/-Build/actions/runs/39629666103). A second successful hosted CI run restored the first run's portable dependency layers and reran every check.

## Set up after cloning

This repository is private. The owner must invite your GitHub account under **Settings → Collaborators → Add people**; accept the invitation before cloning. A repository link alone does not grant access. See [GitHub's invitation instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository).

### 1. Install the tools

- [Git](https://git-scm.com/downloads) to clone/pull the project.
- [Node.js](https://nodejs.org/en/download): choose **Node 22, version 22.21.0 or newer within the 22.x family**. It includes npm. Close and reopen your terminal after installation.
- For **new builds**, [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) on a Windows x64 machine (Intel/AMD), with Linux containers. On Windows, use the WSL 2 engine. In Docker Desktop → Settings → General, enable **Use containerd for pulling and storing images**, then Apply/Restart if changed. See [Docker's containerd setting](https://docs.docker.com/desktop/features/containerd/). Linux x64 with a compatible Docker/containerd image store also works; the current harness rejects ARM/Apple Silicon engines.

A 16 GB machine with roughly 8 GB available to Docker is recommended for new experiments. Viewing saved results needs only Node. Initial Docker/input setup requires internet; the measured installation/check steps use prepared offline inputs. No Jenkins, Python, paid cloud deployment or custom secret is required for the normal demo.

### 2. Clone and open the project

In PowerShell, from the folder where you keep projects:

```powershell
git clone https://github.com/parth1056/-Build.git pipeline-lab
cd pipeline-lab
node --version
```

Sign in to your own GitHub account if Git requests authentication. The version command should print `v22.21.0` or a later `v22.x`. All remaining commands run **inside this cloned folder**. On Windows use `npm.cmd` as shown to avoid PowerShell blocking `npm.ps1`. On Linux use `npm` instead.

### 3. Load the existing demo results

```powershell
npm.cmd run lab:demo-data
npm.cmd test
```

The first command restores the included, integrity-checked GitHub evidence: one repeated before/after study and two real CI builds. It includes captured source, Dockerfiles, timings, logs and verified output. These are **saved measurements**, not builds on your machine. Loading them again is safe; differing existing evidence is never overwritten. The tests check the coordinator's comparison/reporting logic. There is no root dependency installation to perform: the console uses Node's built-in libraries.

To **only view** the existing demo now, run `npm.cmd run demo`, then open **http://127.0.0.1:4180**. Docker is not needed for viewing. Skip step 4 if you do not want to run fresh builds yet.

### 4. Prepare to run new builds

Start Docker Desktop and wait until its engine is running. If the demo is already open, stop its terminal with Ctrl+C before this first-time setup.

```powershell
docker info --format '{{.OSType}}/{{.Architecture}}'
npm.cmd run lab:setup
npm.cmd run lab:prepare
npm.cmd run demo
```

- Docker should report `linux/x86_64` or `linux/amd64`.
- `lab:setup` prepares the pinned Docker images and integrity-verified package archives. These downloads can take a few minutes.
- `lab:prepare` generates the three example applications from the committed source generators and lockfiles. No timings are invented.
- `demo` starts the control panel at **http://127.0.0.1:4180**. Keep its terminal open while using it.

Docker caches, package archives and generated applications are intentionally created on each teammate's machine, rather than copied from the original laptop. If you move the project directory, rerun setup and preparation because `.lab/environment.json` records absolute paths. Close other heavy applications before measurements. Your machine's timings may differ from the retained GitHub results.

### 5. What to do in the website

1. The initial **13.60s → 8.39s** comparison is the saved GitHub experiment. Open **See how the builds ran** for its actual evidence.
2. Under **Try it yourself**, choose **Invoice engine → Compare builds**. This starts new builds on your own Docker engine. Cache-preparation builds run before the timed comparison; allow a few minutes.
3. When finished, inspect Before, After and Time saved. One pair is a preview; it is not a repeated performance estimate.
4. Try **Test a broken change**. A deliberately incorrect invoice calculation should be rejected before packaging. The expected outcome is **Broken change caught. Output blocked.**
5. For the wider study, try the other applications or expand **More experiments & settings**. The four-method comparison runs three observations each and takes longer.

Never run two experiments on the same machine at once. A shared lock prevents overlap. Ctrl+C stops the console; if it started a build, allow it to finish the current command and clean up.

### Next time you open the project

```powershell
git pull
npm.cmd run demo
```

Start Docker first if running new builds. After changes to build inputs, rerun `lab:setup` and `lab:prepare` before comparing new results; this refreshes generated applications and package inputs. Keep old measurements as historical evidence. There is no need to reload sample data or repeat setup just to view saved results.

### Common setup problems

| Problem | What to do |
| --- | --- |
| Repository not found / access denied | Accept the private-repo invitation and authenticate as that GitHub account. |
| `node`, `git` or `docker` not recognized | Install the corresponding tool and reopen the terminal. |
| `npm.ps1` is blocked | Use `npm.cmd` in PowerShell. |
| Cannot connect to the Docker daemon | Open Docker Desktop and wait for its Linux engine. |
| Base export must be OCI format | Enable Docker's containerd image store. If setup left an incomplete `.lab/base-oci-*` directory, stop builds and rename that specific generated directory, then rerun `lab:setup`. Do not delete the entire `.lab` folder. |
| Port 4180 already in use | A demo may already be running; use that page, or stop its terminal before starting another. |
| Another experiment is active | Wait for its terminal/run to finish. Do not remove an active lock. |
| No saved results | Run `npm.cmd run lab:demo-data`, then refresh the page. |

## GitHub Actions

The CI platform is **GitHub Actions**. The committed workflow is `.github/workflows/pipeline-lab.yml`. Pushes run optimized CI with portable BuildKit caching and fresh parallel checks. Actions → Pipeline Lab → Run workflow starts a controlled experiment; choose an application and `3` observations. The `full` suite includes contrasting workloads, four configurations, a tuned control and failure/invalidation proofs. Each completed run has a summary and downloadable raw evidence. See [the concise Actions explanation](v2/GITHUB-ACTIONS.md) for what the two jobs demonstrate and what their timers include.

Local results and GitHub-hosted results identify their origin and are never pooled. Both execute the same coordinator; independent stages run as concurrent containers inside one Actions job so they share the same host. No Jenkins service is used.

## What to show

1. After loading demo data, the page opens with a saved comparison: **Before**, **After**, and **Time saved**. The selector beside The results switches between applications and experiments.
2. Under Try it yourself, select **Invoice engine** and click **Compare builds**. This runs real pipelines, with separate builds to prepare the cache. One observation each is a preview, not a final performance estimate.
3. Open **See how the builds ran** for stage timelines, ranges, source, Dockerfiles and raw logs. All runs, including preparation/failures, remain inspectable.
4. Open **More experiments & settings** and select **Already optimized pipeline** to compare identical plans. Use the saved control experiment to explain timing variation.
5. Click **Test a broken change** to inject a calculation regression into an isolated Invoice snapshot. Its original tests must catch the extra cent and block packaging. **Test without a cache**, under More experiments & settings, checks correctness without reusable project work.

The other workloads are **Document publisher** (real compression/verification over a disclosed synthetic corpus) and **Release manifest validator** (small dependency-free control). Try them to explain why workloads behave differently. A dependency-upgrade scenario is available for Invoice engine only.

Compare all 4 methods performs three observations each for Before, Cache only, Parallel only and After. It is substantially longer than a quick demo. Never run experiments concurrently; a shared lock prevents this. The browser and CLI use the same runner.

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

## What is included in the repository

The source code, simplified UI, GitHub Actions workflow, pinned toolchain/lockfiles, workload generators, tests, documentation, result summaries, figures and a ~600 KB bundle of verified GitHub evidence are committed. `v2/samples/manifest.json` identifies the bundled runs and archive hash. Loading it and generating fresh applications requires no files from the original laptop.

Machine-specific `.lab` caches, generated `v2/workloads`, new `v2/evidence` results, `node_modules`, private assessment attachments/chat and the old project backup are excluded. Those exclusions are intentional: setup regenerates the required inputs, and the included sample bundle supplies the shared historical demo. Original private context remains on the owner's machine; it is not needed to build or demonstrate this project.
