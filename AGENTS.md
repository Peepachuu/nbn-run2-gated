# Gated AI development workflow

This file governs feature development from planning through human acceptance.
Follow the user's feature brief and acceptance criteria, use existing repository
patterns, and do not expand scope or add dependencies without explicit approval.
The broader lifecycle is documented in `docs/research/lifecycle-task-map.md`.

## Human approval gates

An initial request to build a feature authorizes inspection and planning only.
Advance through the stages below only after explicit human approval. Carry
forward approvals already given for the same stage and scope; do not request
them twice. Silence, AI review and passing checks are not human approval.

At each gate, identify the current stage, the artifact being reviewed, the
approved scope, and the approving human and approval reference when available.
A conversation message or PR review can serve as that reference; do not invent
an approval record. After interruption or handoff, reconstruct the current stage
from the available records before continuing. Ask only if required approval
cannot be established.

These gates apply to feature implementation. A read-only review authorizes
inspection and findings, not fixes. An explicit request to create or update
documentation authorizes that documentation work; it does not authorize feature
implementation or deployment.

The gates below take precedence over conflicting development sequences in other
repository guidance. Follow applicable package instructions as well. Report
conflicts that cannot be resolved without changing the approved scope.

## 1. Plan — no edits

Read the approved brief, relevant source files, tests, package instructions and
architecture documentation. Verify unfamiliar APIs against installed types or
current official documentation. Inspect the working tree and preserve unrelated
changes.

Produce a plan covering:

- Acceptance criteria, exclusions and the exact files expected to change.
- Data types, validation boundaries, authentication, authorization and ownership.
- Server entry points and any client access to stored data.
- Firestore schema, rules, queries and indexes, where applicable.
- Tests to write first, including failure paths and the evidence for each criterion.
- Relevant checks, preview verification, accessibility requirements and deployment effects.
- Dependencies, assumptions, risks and decisions needing human input.

If automated tests are not applicable, explain why and propose an alternative
verification method in the plan. Do not invent additional product requirements
or experiment measurements.

Do not create, edit or delete repository files during planning.
**Stop for human approval of the plan.**

## 2. Tests first

After plan approval, write or update tests for the agreed behavior using the
existing framework. Change only the tests, fixtures and test configuration
covered by the plan; do not implement production behavior yet.

Cover successful operations, validation boundaries, authentication failures,
authorization and ownership rejection, and storage or service failures where
applicable. Include accessibility checks required by the acceptance criteria.

Run the relevant tests and report their initial results. Where feasible, show
that the new tests fail because the approved behavior is missing. Distinguish
expected missing-implementation failures from unrelated setup errors or existing
failures. Explain tests that already pass; do not manufacture a failure.

If an alternative verification method was approved, present its concrete checks
and expected outcomes instead.

**Stop for human review of the tests or verification method and approval to implement.**

## 3. Implement and verify

After test approval, implement only the agreed plan.

- Enforce authentication and authorization in every server entry point. The
  Firebase Admin SDK bypasses Firestore rules.
- Derive ownership from the verified session or token, never from client-supplied
  identity fields. Validate input server-side and control protected fields there.
- Keep Firestore client access denied unless the approved architecture requires
  it. Where client access is permitted, enforce the approved restrictions in rules.
- Follow existing schema, error handling and UI conventions. Update affected
  schema or environment documentation within the approved scope.

Run from the repository root:

```sh
pnpm run typecheck
pnpm run lint
pnpm run test:all
pnpm run validate
```

Run the relevant package build before deployment. Check required CI results,
including secret scanning and dependency auditing. Use the repository's existing
security configuration; do not add exceptions without human approval.

`test:all` runs the frontend and backend unit suites. It does not establish
integration success, deployed Firestore rules or indexes, or preview success.
Run additional checks required by the approved plan or experiment protocol.
Coverage and mutation testing are conditional on those requirements; do not
invent thresholds.

Do not weaken tests, skip failures, lower thresholds or bypass checks to obtain
a pass. Report existing failures, blocked checks and unavailable tools separately
from passes. Fix failures caused by the approved change within its scope; seek
a human decision for unrelated remediation or a material contract change.

Present the diff, actual check results, criterion evidence and remaining issues.
**Stop for human review before advancing to deployment or acceptance.**

## 4. Review and correct

When asked to review, report findings without editing files. Check acceptance
criteria, test correctness, security, regressions, accessibility where required,
and scope. Give each actionable finding a location, impact and proposed correction.

Apply fixes only after the human authorizes the identified corrections. A single
approval may authorize a named set of fixes; do not request approval for each one.
If a correction materially changes the contract or scope, return to the relevant
approval gate before implementing it.

Rerun affected checks, update the evidence and report unresolved findings.
AI review provides evidence; the human decides whether findings are resolved.

## 5. Preview and acceptance

Before any action that triggers deployment, identify:

- The exact revision and target application environment.
- The Firebase project or other shared services the deployment will use.
- Rules, indexes, schema, configuration or data changes and their deployment order.
- The verification steps and applicable recovery or rollback steps.

Obtain explicit deployment approval unless it already covers that target and
scope. Before pushing, opening or updating a PR, or merging, identify automatic
deployments the action will trigger and ensure approval covers their effects.
Treat production promotion separately from preview approval and feature acceptance.

Do not assume a preview uses isolated data or that application deployment also
deploys database configuration. In this repository, the Firebase deployment
workflow deploys rules, not indexes; verify required indexes are ready in the
target project.

Match the actual preview deployment to the reviewed commit. Verify every
applicable acceptance criterion on that preview, including successful operations,
validation failures and authorization boundaries. Check persistence, error
handling and accessibility where required by the approved brief. Use approved
synthetic test data and identify any live checks that could not be completed.

Present an acceptance matrix linking each criterion to its automated tests,
preview observations, outcome and remaining limitations. Distinguish passing,
failing, partially verified and unverified results. Include the preview URL and
deployed revision. Identify anything requiring human verification.

**The human decides final acceptance. Follow the repository's required reviewer
and release-approval process; never approve your own change.**

## Working discipline

- Use pnpm and existing repository conventions. Work on an appropriate feature
  branch; do not commit directly to `main`.
- Preserve unrelated changes and keep secrets out of code, chat and tool output.
  Use approved synthetic data rather than real customer or operational data.
- Do not commit, push, merge or deploy without user authorization. Approval for
  one action does not automatically authorize the others or bypass repository controls.
- Complete the existing PR AI-use declaration and reviewer confidence information
  accurately, using only tool and model details actually available.
- Report actual commands, results and evidence; never invent a pass or treat
  unavailable evidence as success. Keep historical observations tied to their revision.
- Record only experiment measurements required by the user or approved protocol.
  Do not invent timings, token counts, model identities or extra metric requirements.
- These instructions guide agent behavior; they do not enforce platform controls.
  Do not claim gates are technically enforced without evidence from the relevant
  hooks, CI checks, repository rules or deployment settings.
