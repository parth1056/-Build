# Custom app: inventory-reservations

Status: completed. Scenario: cold. Results are separate from the two-app demo website.

| Mode | n | Median s | Min–max s |
|---|---:|---:|---:|
| before | 1 | 21.46 | 21.46–21.46 |
| after | 1 | 18.46 | 18.46–18.46 |

Reduction: 13.9%. Single/short sample; preview, not a stable performance estimate.

Source matched: true. Adapter-defined output assertions are not an exhaustive correctness proof. Timer excludes setup, seeds and cleanup. Base downloads are outside the timer; Dockerfile dependency-network operations remain inside workspace builds.
