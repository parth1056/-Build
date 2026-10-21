# Custom CLI integration validation

Validated locally on 21 October 2026 with Linux x64 Docker Desktop. These are functional integration checks, not additional samples for the three-app performance study. See [validation-results.json](validation-results.json) for exact IDs, times, statuses, source/plan/artifact identities and stage intervals. Original raw logs and snapshots are retained locally in `.lab/custom-evidence/` and are not bundled into Git. The checked-in examples and validation driver allow new runs on another machine.

| Case | Required evidence |
| --- | --- |
| Initial Node repository build | Actual locked Zod installation, three fresh checks, copied runtime artifacts and exact-image output `{application:"shipping-quote",feeCents:900,release:"v1"}`. |
| Second Node repository build | A fresh builder imports the portable cache; dependency layer is CACHED; checks and final-image verification still execute. |
| Node code-change, Before and After | Separate original-version seeds; both measured revisions emit `v2` and 900 cents; measured source hashes match, plans differ. Before reruns dependency install; After reuses it. |
| Node deliberate bug | A passing seed followed by a one-cent bug; a required check fails, no artifact build/package/verify is reached, and release eligibility remains false. This expected rejection completes the proof. |
| Python cold build | Three checks, Python-created release artifacts, runtime packaging and exact-image output `{orders:3,totalCents:6000,release:"v1"}`. No host Python is used. |
| Wrong final-image expectation | Checks/build/package pass, but the configured expected quote is deliberately 901 cents while the real image emits 900. Verification fails, release eligibility remains false and the campaign exits with failures. |

The Node source-change preview measured **33.615 s Before and 29.377 s After (12.6%)**, with one observation each. This verifies that the comparison path works; it is not a stable speed estimate. The second cached repository build took **31.615 s**, versus **29.992 s** on the initial build despite a confirmed layer hit. That is useful evidence against promising that every cached run is faster. Network-dependent custom installation and Docker Desktop overhead differ from the website's offline-input studies.

The driver recomputes every run's copied-source and artifact-content hashes after execution, asserts expected statuses/output/cache behavior, and refuses to declare the matrix successful on a mismatch. The unit suite additionally passes **17 tests**, including six custom-adapter tests, without requiring Docker. Separately, all 25 recorded method summaries and recorded expected outcomes in `v2/report-data.json` were checked independently using Python medians/minima/maxima and the percentage formula; the report assembly had already rehashed 3,540 source files across 105 original pipelines.

## Repeat the checks

From the repository root, with Docker running:

```powershell
npm.cmd test
node custom/validate.mjs
```

The second command executes ten real pipelines, including setup/seed runs and two intentionally rejected candidates. It may take several minutes and download the pinned Python base on a fresh machine. It writes your new integration snapshot to `.lab/custom-validation-results.json`, preserving this committed historical snapshot. It leaves normal custom evidence/artifacts and final images for inspection. It uses only the included trusted examples; do not run another website/custom build concurrently.

Expected output ends with `CUSTOM INTEGRATION MATRIX PASSED`. Expected app failures are asserted by the driver, so they do not mean the matrix failed. A failed assertion, missing cache hit, unexpected app error or infrastructure problem stops validation. No timing threshold is asserted because execution speed varies by machine and load.

To study custom-app performance rather than basic integration, separately run the documented comparison with at least three repetitions, retain every result and describe the chosen machine, dependencies, revision and timing boundaries. Do not combine those timings with the original lab results.
