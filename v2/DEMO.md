# The demonstration, in normal language

## Your opening

“When developers change code, they wait for checks and packaging before they know whether it is usable. We investigated two sources of wasted waiting: reinstalling unchanged dependencies and performing independent checks one after another. This console applies the changes and measures the real pipeline, including whether the final output is still correct.”

## What you actually do

1. Open `http://127.0.0.1:4180`. The saved comparison shows Before, After and Time Saved. Under Try it yourself, choose Invoice engine and point to the two short pipeline descriptions. Say: “Before reinstalls libraries after a source change and runs checks one by one. After reuses unchanged libraries and overlaps independent checks.” Technical plans are under More experiments & settings → Pipeline code.
2. Click **Compare builds**. Say: “This starts actual Docker builds, not a recorded animation. It first builds a previous version to establish the cache condition. That preparation is labeled separately.”
3. While it runs, point to **install**, then the required check stages. Open a completed stage log. Say: “A green check means the command exited successfully. It isn't a decoration or a cached test result. All required checks execute again.”
4. When the measured optimized run finishes, inspect the dependency-layer reuse indicator and exact-output record. Say: “A cache hit only proves work was reused. The total duration tells us whether the whole pipeline was faster. The output must also match the changed source hash and release message.”
5. Select the saved **completed repeated source-change study**, which contains all three workloads. Explain medians and ranges using its actual values. Say: “We ran three observations per method, kept every observation and used matched source. These are local results, not a promise for every app.”
6. Select the saved **already optimized** experiment. Change Starting pipeline to Already optimized to show the identical plans. Say: “We also tested the objection that our baseline is weak. When both techniques are already present, our system proposes no new structural change. Differences between those identical plans are variability.”
7. Select the saved **Broken-change test** or click **Test a broken change** for Invoice engine. The isolated source adds an incorrect extra cent to invoice totals; the original tests catch it. Open See how the builds ran for their actual expected/actual mismatch, missing packaging stage and blocked release. Say: “An optimization that silently accepts broken code is unacceptable. Here the intended result is rejection, so a failed pipeline can be a passed correctness demonstration.”
8. If asked about invalidation, select the saved dependency-upgrade proof. Show that installation executed rather than being reused. For cold correctness, use the empty-cache proof.

You do not need to wait through every experiment during a short faculty slot. Run one pair live and inspect clearly labeled retained repeated evidence for the broader study. Never describe saved history as if it is executing live.

## Questions faculty may reasonably ask

**What did you build, rather than merely use?** A coordinator that captures sources, resets/establishes cache conditions, constructs the four executable plans, runs and times their real commands, gates packaging, verifies immutable runtime images, retains raw evidence, audits results and provides an interactive experiment console. Docker's cache and concurrency techniques themselves already exist.

**Did you slow the baseline deliberately?** No sleeps, arbitrary waits or disabled baseline cache. Its source-first ordering is a real documented inefficiency and is explicitly an underoptimized starting point. Both methods have npm cache mounts and BuildKit. The cache-only arm is a sensible dependency-first sequential alternative; the already optimized control has identical before/after plans.

**Why three apps?** Dependencies, test/processing work and orchestration overhead contribute differently. The invoice API has a TypeScript/dependency toolchain; the publisher performs real work over a disclosed synthetic corpus; the small validator has little dependency work to save. They are contrasting examples, not proof of universal performance.

**Are you optimizing application response time?** No. Invoice response and published-content checks establish correctness of the delivered output. We optimize and measure the process that checks/builds/packages it.

**Why can a cache hit fail to improve total time?** Cache lookup, source transfer, image export/import, starting containers, remaining checks and verification still cost time. A small saved step may be outweighed by overhead or machine variability.

**Why doesn't parallel always win?** Three independently schedulable checks still need CPU, RAM and container/process startup. More simultaneous activity can increase each command's duration. The longest branch and sequential remainder limit total saving.

**Are cached checks skipped?** No. The dependency layer may be reused, but the commands checking source execute in fresh containers. The warm-cache failure proof challenges that boundary.

**What happens if dependencies change?** The package and lock change, invalidating the installation layer. A new installation and the same validations must succeed. A previous cached success is not accepted as evidence about the upgraded source.

**Where is Git integration?** GitHub Actions runs optimized CI on pushes/PRs and offers manual controlled studies. Open Actions → Pipeline Lab to show the real run, summary and evidence. The same coordinator powers the local console. Checks run in parallel containers inside one job to keep a comparison on one host. The normal CI job restores/saves portable BuildKit layers between fresh runners; the controlled study establishes each cache condition with explicit seed builds. No Jenkins service is used.

**Are you downloading the libraries during the timed build?** No. All methods receive the same verified local package files. This isolates installation/layer reuse from unreliable internet. We do not claim measured download savings.

**Does the preparation time erase the saving?** Preparation represents a previous successful build that a real repeat-build scenario already has. We repeat it deliberately to establish a controlled starting state for each observation. We do not claim the entire experiment, including its seed builds, was faster. A one-off build without prior cache is a separate cold-cache case.

**Doesn't npm's package cache already solve this?** A downloaded package cache can avoid fetching an archive while still requiring installation/unpacking. Reusing the unchanged Docker dependency layer skips that installation instruction altogether. Both methods have the same local archives and npm cache mount, so the added caching technique being tested is layer ordering/reuse.

**Do the before/after image IDs have to match?** No. We require matching source and behavior, not byte-identical images. Build metadata/timestamps can affect image identities. Each run's exact image ID is verified; we do not rebuild a different image afterward and assume it passed.

**Why not show a huge speedup?** We report whatever the controlled measurements show. A small or negative effect reveals a real limitation or bottleneck. A percentage without its baseline, workload, range and conditions would be misleading.

**Have you proven no bugs remain?** No. We have specific automated checks, runtime output checks and injected failures. They provide evidence for defined properties, not exhaustive correctness or security.

**What would you do next?** Reduce avoidable orchestration after measuring it, evaluate more independent projects and machines, increase repetitions, measure CPU/resource consumption, and quantify cache-transfer cost/benefit across many real commits. Each extension needs a new controlled experiment; none is a completed result here.

## One sentence to remember

“We changed how the same software is checked and packaged, measured the resulting waiting time, and tested that the shortcuts did not accept broken or stale output.”
