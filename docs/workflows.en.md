# GitHub validation and publication

[Español](workflows.md) · [Goliat Forge](../README.md)

## Included workflows

| Workflow | Trigger | Permissions and result |
| --- | --- | --- |
| Validate product | PR, main and manual | Read-only source; API, JWT, PostgreSQL/MySQL/MongoDB, TFLint, mocked Terraform, Next.js and browser tests |
| Publish product website | Website/documentation changes on main or manual | Static artifact and github-pages environment deployment; no AWS access |
| Refresh public GitHub stars | Daily or manual | Public metadata only on github-stats/stars.json; no Pages rebuild |
| CodeQL | PR, main and weekly | JavaScript, Python and workflow security analysis |
| Dependabot | Weekly | SDK, Next/React, Terraform, Docker and Actions update proposals |

Actions are pinned by SHA, runners use ubuntu-24.04 and checkouts do not persist credentials. PRs receive no AWS keys. SQL integration uses a disposable database and test credentials, never the AWS account.

Validate product runs the suite on Node 24 and 26. The Node 26 job also builds the production Alpine image and tests the API, identity and adapters inside the container, without external network access or AWS credentials.

## Repository settings

In your fork, enable GitHub Pages with Actions, Dependabot alerts, secret scanning and main protection. Require the Validate product checks `checks (24)` and `checks (26)` and review before merge; block force pushes and deletion. Enable Discussions for questions if useful. Site builds derive the actual GitHub and Pages URLs from the repository. Local builds invent neither a repository nor a star count.

The first stars refresh creates a data branch containing only stars.json. Visible clients read this public snapshot on tab return and every minute. Stale snapshots are not presented as current. The schedule does not promise immediate refresh and GitHub can disable schedules on inactive repositories.

## AWS deployment

Included workflows deploy no infrastructure and incur no AWS charges. The local CLI uses SSO. For future automation, configure an OIDC role scoped to the repository and environment, a GitHub Environment with reviewers and an existing state backend; never store permanent access keys.

On an ephemeral runner, use ./forge configure and ./forge use-backend with the existing regional bucket and state KMS key before ./forge deploy. Generate and apply saved plans in the same job; never publish them as public artifacts. Securely back up the original bootstrap state outside the repository. Tailor operator permissions to the account and review OIDC trust before enabling billable automation.
