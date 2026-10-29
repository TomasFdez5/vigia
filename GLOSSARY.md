# Vigía

A private, open-source dashboard that shows, for each web project its operator already runs, whether it responds, how its last deployment went and which known vulnerabilities are open.

## Language

**Owner**:
The person who operates an instance of Vigía and the only account in it. The account is created by hand; there is no public sign-up and no anonymous access.
_Avoid_: User, admin, tenant

**Project**:
A web project the Owner has registered by hand to be watched: its public address, its repository and where it is hosted.
_Avoid_: Site, app, service, monitor

## Health

**Probe**:
A single attempt by Vigía to reach a Project's public address and observe how it answers.
_Avoid_: Ping, request, scan

**Probe outcome**:
What a Probe observed: either a response with a status code and a latency, or a failure with a closed reason. Never both, never neither.
_Avoid_: Probe result, response

**Health status**:
The classification of one Probe outcome as up, degraded or down. Up means an expected response given quickly; degraded means it answered but slowly or with an unexpected status below 500; down means no answer, a timeout or a server error.
_Avoid_: State, uptime status, availability status

**Health check**:
The recorded result of one Probe: its Health status, the outcome it came from and when it was observed.
_Avoid_: Ping, test, heartbeat

**Uptime**:
The share of Health checks in a window that were up or degraded. Shown as "no data" instead of a number when the window holds too few Health checks to be trusted. In code the result of the rule is named `Availability`: a ratio between 0 and 1, or no data; turning the ratio into a percentage is the interface's job.
_Avoid_: Availability percentage, SLA

## Freshness

**Observation**:
The moment Vigía read a piece of data about a Project, recorded by Vigía when it reads it; never the moment the thing the data describes happened (a deployment date is not an Observation). Staleness is counted from it.
_Avoid_: Timestamp, event time, deployed at

**Stale**:
Said of an observation that is missing, dated in the future, invalid, or older than a few times the frequency of the process that produces it. Age is counted from when Vigía observed the data, not from when the thing it describes happened.
_Avoid_: Old, outdated, expired

## Deployments and vulnerabilities

**Deployment status**:
The state of a Project's latest production deployment: building, ready, failed, or unknown when the host cannot say.
_Avoid_: Build status, release state

**Severity**:
How serious a known vulnerability is: low, medium, high or critical, in increasing order. A severity Vigía does not recognise is treated as high.
_Avoid_: Risk, priority, level

**Vulnerability sync**:
The latest attempt to read a Project's open vulnerability alerts, with its outcome: ok, not enabled, no access or error. Only an ok sync allows "no open alerts"; every other outcome means "no data", never "safe".
_Avoid_: Scan, security check

## Verdict

**Signal**:
The latest record of one aspect of a Project (its Health check, its Deployment status or its Vulnerability sync with the open severities) together with its Observation. Absent when Vigía has no record yet.
_Avoid_: Metric, input, data point

**Reason**:
A closed code that explains why a Verdict is not operational. A Verdict lists only the Reasons of its winning level, in a fixed order, and at most one no-data Reason per Signal.
_Avoid_: Cause, message, error

**Verdict**:
The single overall judgement of a Project: operational, degraded, down or no recent data, together with the reasons behind it. Known bad news always wins; missing or stale data only ever replaces operational, never a known degraded or down.
_Avoid_: Status, traffic light, colour, state
