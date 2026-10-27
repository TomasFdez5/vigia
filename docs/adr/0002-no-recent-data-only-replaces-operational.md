---
status: accepted
---

# No recent data only ever replaces operational in the verdict

When a Project has a known bad signal (a down Health check, a failed deployment, an open critical or high vulnerability) and some other signal is stale or missing, the verdict keeps the known bad outcome and lists only the reasons of the winning level. "No recent data" is reached only when nothing known is bad, so stale or missing data can never make a Project look better, and a known problem is never hidden behind it. The alternative, where any stale signal forces "no recent data", is simpler to state but lets a stopped scheduler or a failed token mask a real outage or a critical alert. The cost is that a Project that is down with stale vulnerability data is shown as down, not as lacking data; the card still shows each signal's own freshness.
