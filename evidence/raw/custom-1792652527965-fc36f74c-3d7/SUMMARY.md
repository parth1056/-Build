# Custom app: inventory-reservations

Status: completed. Scenario: code-change. Results are separate from the two-app demo website.

| Mode | n | Median s | Min–max s |
|---|---:|---:|---:|
| before | 3 | 14.50 | 14.44–14.52 |
| after | 3 | 9.03 | 9.01–9.06 |

Reduction: 37.7%. Descriptive small sample; not statistical significance.

Source matched: true. Adapter-defined output assertions are not an exhaustive correctness proof. Timer excludes setup, seeds and cleanup. Base downloads are outside the timer; Dockerfile dependency-network operations remain inside workspace builds.
