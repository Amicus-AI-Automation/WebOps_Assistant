# Azure DevOps Sync — Configuration Guide

This document explains every variable, secret, and configuration parameter used in the
**Sync to Azure DevOps** GitHub Actions workflow (`.github/workflows/sync-to-azure-devops.yml`).

---

## 📋 Quick Setup Checklist

1. [ ] Create an Azure DevOps Personal Access Token (PAT)
2. [ ] Create the target repository in Azure DevOps
3. [ ] Add **secrets** to your GitHub repository
4. [ ] Add **variables** to your GitHub repository
5. [ ] (Optional) Create the `azure-devops` environment in GitHub Settings
6. [ ] Push to trigger the first sync

---

## 🔐 GitHub Repository Secrets

Configure these under: **GitHub Repo → Settings → Secrets and variables → Actions → Secrets**

| Secret Name | Required | Description |
|---|---|---|
| `AZURE_DEVOPS_PAT` | ✅ Yes | **Azure DevOps Personal Access Token**. Used to authenticate git push operations to Azure DevOps. Must have **Code: Read & Write** scope. PATs expire — set a reminder to rotate them. |
| `GITHUB_TOKEN` | 🔄 Auto | Automatically provided by GitHub Actions. Used to checkout the repository. No setup needed. |

### How to Create an Azure DevOps PAT

1. Sign in to [Azure DevOps](https://dev.azure.com/).
2. Click your **profile icon** (top right) → **Personal Access Tokens**.
3. Click **+ New Token**.
4. Configure:
   - **Name**: `github-sync-pat` (or any descriptive name)
   - **Organization**: Select your Azure DevOps organization
   - **Expiration**: Set an appropriate duration (max 1 year)
   - **Scopes**: Select **Custom Defined** → check **Code: Read & Write**
5. Click **Create** and copy the token immediately (it won't be shown again).
6. Add it as a GitHub secret named `AZURE_DEVOPS_PAT`.

---

## 📦 GitHub Repository Variables

Configure these under: **GitHub Repo → Settings → Secrets and variables → Actions → Variables**

| Variable Name | Required | Example Value | Description |
|---|---|---|---|
| `AZURE_DEVOPS_ORG` | ✅ Yes | `mycompany` | The name of your Azure DevOps **organization**. This is the first part of your Azure DevOps URL: `https://dev.azure.com/{org}`. |
| `AZURE_DEVOPS_PROJECT` | ✅ Yes | `WebOps` | The name of the Azure DevOps **project** that contains the target repository. Found at: `https://dev.azure.com/{org}/{project}`. |
| `AZURE_DEVOPS_REPO` | ✅ Yes | `WebOps_Assistant` | The name of the target **Git repository** inside the Azure DevOps project. Found at: `https://dev.azure.com/{org}/{project}/_git/{repo}`. |

### Example Azure DevOps URL Breakdown

```
https://dev.azure.com/mycompany/WebOps/_git/WebOps_Assistant
                     ─────────  ──────       ────────────────
                        ORG     PROJECT           REPO
```

---

## ⚙️ Workflow Parameters Explained

### Trigger Events (`on:`)

| Trigger | Description |
|---|---|
| `push.branches: ["**"]` | Fires on every push to **any branch**. Ensures all branch changes are mirrored. |
| `push.tags: ["**"]` | Fires on every tag push. Ensures version tags and releases are synced. |
| `pull_request.types: [closed]` | Fires when a PR to `main`/`master` is closed. The workflow checks if it was actually merged before syncing. |
| `release.types: [published]` | Fires when a GitHub Release is published. Ensures release metadata triggers a sync. |
| `repository_dispatch.types: [sync-to-azure]` | Allows external systems to trigger a sync via the GitHub API. Useful for CI/CD orchestration. |
| `workflow_dispatch` | Enables **manual triggering** from the GitHub Actions UI with optional inputs. |

### Manual Trigger Inputs (`workflow_dispatch.inputs`)

| Input | Type | Default | Description |
|---|---|---|---|
| `force_sync` | boolean | `false` | When `true`, forces a push to Azure DevOps, overwriting any divergent history. **Use with extreme caution** — this can cause data loss on the Azure DevOps side. |
| `dry_run` | boolean | `false` | When `true`, simulates the sync without actually pushing. Useful for verifying configuration before the first real sync. |

---

### Concurrency Control (`concurrency:`)

| Parameter | Value | Description |
|---|---|---|
| `group` | `azure-devops-sync` | All runs of this workflow share a single concurrency group. This means only **one sync can run at a time**. |
| `cancel-in-progress` | `false` | When a new run is queued, it **waits** for the current run to finish instead of canceling it. This prevents partial syncs. |

---

### Permissions (`permissions:`)

| Permission | Value | Description |
|---|---|---|
| `contents` | `read` | Grants read-only access to the repository contents. Required for `actions/checkout`. |
| `actions` | `read` | Grants read access to workflow artifacts. Minimal permission for operational safety. |

> **Best Practice**: Always use the **principle of least privilege**. This workflow only needs read access to the GitHub repo; write access to Azure DevOps is handled via the PAT.

---

### Environment Variables (`env:`)

| Variable | Description |
|---|---|
| `AZURE_DEVOPS_ORG` | Pulled from GitHub repository variables. The Azure DevOps organization name. |
| `AZURE_DEVOPS_PROJECT` | Pulled from GitHub repository variables. The Azure DevOps project name. |
| `AZURE_DEVOPS_REPO` | Pulled from GitHub repository variables. The Azure DevOps repository name. |
| `GIT_AUTHOR_NAME` | The git author name used for any sync operations. Set to "GitHub Actions Bot" for traceability. |
| `GIT_AUTHOR_EMAIL` | The git author email. Uses the standard GitHub Actions bot no-reply address. |

---

## 🔄 Jobs Breakdown

### Job 1: `validate` — Pre-flight Validation

**Purpose**: Ensures all required secrets and variables are configured before attempting the sync.

| Step | What it does |
|---|---|
| Validate required secrets and variables | Checks that `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_REPO`, and `AZURE_DEVOPS_PAT` are all set. Fails fast with clear error messages if any are missing. |
| Check if PR was merged | For `pull_request` events, verifies the PR was actually merged (not just closed). Skips sync if it wasn't. |

### Job 2: `sync` — Sync to Azure DevOps

**Purpose**: Performs the actual git mirror push from GitHub to Azure DevOps.

| Step | What it does |
|---|---|
| Checkout repository | Full clone with `fetch-depth: 0` to get complete history, all branches, and tags. |
| Configure git identity | Sets the git user name and email for the sync operations. |
| Fetch all remote refs | Ensures all branches and tags from `origin` are available locally for mirroring. |
| Configure Azure DevOps remote | Adds the Azure DevOps repository as a git remote named `azure`, using the PAT for authentication. |
| Dry run check | If `dry_run` input is `true`, shows what would be pushed without actually doing it. |
| Sync all branches and tags | Uses `git push --mirror` to push all refs. Includes retry logic with exponential backoff (3 attempts: 10s, 20s, 40s delays). |
| Verify sync | Prints a summary of branches and tags that were synced. |
| Cleanup | **Always runs** (even on failure). Removes the Azure DevOps remote to prevent PAT leakage. |

### Key Git Concepts

| Concept | Description |
|---|---|
| `git push --mirror` | Pushes **all refs** (branches, tags, notes) and **deletes** remote refs that no longer exist locally. Creates a true 1:1 mirror. |
| `fetch-depth: 0` | Clones the full git history instead of a shallow clone. Required for `--mirror` to work correctly. |
| Retry with backoff | If the push fails (e.g., network issue), it retries up to 3 times with increasing delays (10s → 20s → 40s). |

### Job 3: `notify-on-failure` — Failure Notification

**Purpose**: Creates a detailed failure summary in the GitHub Actions UI. Includes commented-out templates for Microsoft Teams and Slack webhooks.

### Job 4: `summary` — Success Summary

**Purpose**: Creates a success summary table in the GitHub Actions UI with links to the Azure DevOps repository.

---

## 🌍 Environment Protection (Optional)

The workflow references an environment named `azure-devops`. You can configure protection rules:

1. Go to **GitHub Repo → Settings → Environments**.
2. Create environment: `azure-devops`.
3. Optional protections:
   - **Required reviewers**: Require approval before sync runs.
   - **Wait timer**: Add a delay before the sync executes.
   - **Deployment branches**: Restrict which branches can trigger the sync.

---

## 🔧 Troubleshooting

| Issue | Solution |
|---|---|
| `remote: TF401019: The Git repository does not exist` | Verify `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, and `AZURE_DEVOPS_REPO` are correct. Ensure the repo exists in Azure DevOps. |
| `remote: TF400813: Resource not available` | The PAT may have expired or lack the **Code: Read & Write** scope. Regenerate it. |
| `fatal: Authentication failed` | The `AZURE_DEVOPS_PAT` secret is invalid, expired, or missing. Update the secret. |
| `error: failed to push some refs` | The Azure DevOps repo may have branch policies. Use `force_sync: true` or disable policies temporarily. |
| Sync runs but Azure DevOps repo is empty | Ensure `fetch-depth: 0` is set and the checkout step fetches the full history. |

---

## 📊 Architecture Diagram

```
┌──────────────┐     push / tag / PR merge     ┌────────────────────┐
│              │ ─────────────────────────────▶  │   GitHub Actions   │
│    GitHub    │                                │                    │
│  Repository  │     git push --mirror          │  sync-to-azure-    │
│              │ ◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  devops.yml        │
└──────────────┘                                └────────┬───────────┘
                                                         │
                                                         │ git push --mirror
                                                         │ (HTTPS + PAT)
                                                         ▼
                                                ┌────────────────────┐
                                                │   Azure DevOps     │
                                                │   Repository       │
                                                │   (Mirror)         │
                                                └────────────────────┘
```

---

## 🔒 Security Best Practices Implemented

1. **PAT as Secret**: The Azure DevOps PAT is stored as an encrypted GitHub secret, never exposed in logs.
2. **Least Privilege Permissions**: Workflow only requests `contents: read` and `actions: read`.
3. **Cleanup Step**: Always removes the Azure remote after sync to prevent PAT leakage.
4. **Concurrency Control**: Prevents race conditions from simultaneous syncs.
5. **Pre-flight Validation**: Fails fast if configuration is missing.
6. **No Hardcoded Secrets**: All sensitive values are referenced via `secrets.*` and `vars.*`.
7. **Timeout Limits**: Each job has a timeout to prevent runaway processes.
